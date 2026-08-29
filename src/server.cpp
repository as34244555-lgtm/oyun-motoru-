#include "blokmotor/server.hpp"

#include <arpa/inet.h>
#include <netinet/in.h>
#include <sys/socket.h>
#include <unistd.h>

#include <cctype>
#include <cstring>
#include <fstream>
#include <sstream>
#include <thread>
#include <unordered_set>
#include <vector>

namespace blok {
namespace {

std::string urlDecode(const std::string& in) {
    std::string out;
    out.reserve(in.size());
    for (size_t i = 0; i < in.size(); ++i) {
        if (in[i] == '%' && i + 2 < in.size()) {
            const auto hex = [](char c) {
                if (c >= '0' && c <= '9') return c - '0';
                if (c >= 'a' && c <= 'f') return c - 'a' + 10;
                if (c >= 'A' && c <= 'F') return c - 'A' + 10;
                return 0;
            };
            out.push_back(static_cast<char>((hex(in[i + 1]) << 4) | hex(in[i + 2])));
            i += 2;
        } else if (in[i] == '+') {
            out.push_back(' ');
        } else {
            out.push_back(in[i]);
        }
    }
    return out;
}

std::string mimeType(const std::string& path) {
    if (path.size() >= 5 && path.substr(path.size() - 5) == ".html") return "text/html; charset=utf-8";
    if (path.size() >= 4 && path.substr(path.size() - 4) == ".css") return "text/css; charset=utf-8";
    if (path.size() >= 3 && path.substr(path.size() - 3) == ".js") return "application/javascript; charset=utf-8";
    if (path.size() >= 5 && path.substr(path.size() - 5) == ".json") return "application/json; charset=utf-8";
    if (path.size() >= 4 && path.substr(path.size() - 4) == ".svg") return "image/svg+xml";
    if (path.size() >= 4 && path.substr(path.size() - 4) == ".png") return "image/png";
    if (path.size() >= 4 && path.substr(path.size() - 4) == ".bmp") return "image/bmp";
    return "application/octet-stream";
}

bool readFile(const std::string& path, std::string& out) {
    std::ifstream in(path, std::ios::binary);
    if (!in) return false;
    out.assign(std::istreambuf_iterator<char>(in), std::istreambuf_iterator<char>());
    return true;
}

std::string normalizePath(const std::string& raw) {
    std::string path = raw.empty() ? "/" : raw;
    const auto q = path.find('?');
    if (q != std::string::npos) path = path.substr(0, q);
    path = urlDecode(path);
    if (path.empty()) path = "/";
    return path;
}

bool safeJoin(const std::string& root, const std::string& rel, std::string& out) {
    if (rel.find("..") != std::string::npos) return false;
    out = root;
    if (!out.empty() && out.back() == '/') out.pop_back();
    if (rel == "/") {
        out += "/index.html";
        return true;
    }
    out += rel;
    return true;
}

void sendAll(int fd, const char* data, size_t n) {
    size_t sent = 0;
    while (sent < n) {
        const ssize_t k = ::send(fd, data + sent, n - sent, MSG_NOSIGNAL);
        if (k <= 0) return;
        sent += static_cast<size_t>(k);
    }
}

void sendResponse(int fd, int status, const char* statusText, const std::string& mime, const std::string& body,
                  bool binary = false) {
    (void)binary;
    std::ostringstream head;
    head << "HTTP/1.1 " << status << ' ' << statusText
         << "\r\nAccess-Control-Allow-Origin: *\r\nAccess-Control-Allow-Methods: GET,POST,PUT,PATCH,DELETE,OPTIONS\r\n"
            "Access-Control-Allow-Headers: Content-Type\r\nCache-Control: no-store\r\nContent-Type: "
         << mime << "\r\nContent-Length: " << body.size() << "\r\nConnection: close\r\n\r\n";
    const std::string h = head.str();
    sendAll(fd, h.data(), h.size());
    sendAll(fd, body.data(), body.size());
}

void sendJson(int fd, int status, const Json& json) {
    sendResponse(fd, status, status == 200 ? "OK" : "Error", "application/json; charset=utf-8", json.dump());
}

void sendError(int fd, int status, const std::string& message) {
    Json j = Json::object();
    j["error"] = message;
    sendJson(fd, status, j);
}

bool readRequest(int fd, std::string& method, std::string& path, std::string& body) {
    std::string raw;
    char buf[4096];
    while (raw.find("\r\n\r\n") == std::string::npos) {
        const ssize_t n = ::recv(fd, buf, sizeof(buf), 0);
        if (n <= 0) return false;
        raw.append(buf, static_cast<size_t>(n));
        if (raw.size() > 8 * 1024 * 1024) return false;
    }
    const size_t headerEnd = raw.find("\r\n\r\n");
    std::istringstream first(raw.substr(0, raw.find("\r\n")));
    first >> method >> path;
    if (method.empty() || path.empty()) return false;

    size_t contentLength = 0;
    std::string headers = raw.substr(0, headerEnd);
    std::istringstream hs(headers);
    std::string line;
    std::getline(hs, line);
    while (std::getline(hs, line)) {
        if (!line.empty() && line.back() == '\r') line.pop_back();
        const auto colon = line.find(':');
        if (colon == std::string::npos) continue;
        std::string key = line.substr(0, colon);
        std::string value = line.substr(colon + 1);
        while (!value.empty() && (value.front() == ' ' || value.front() == '\t')) value.erase(value.begin());
        for (char& c : key) c = static_cast<char>(std::tolower(static_cast<unsigned char>(c)));
        if (key == "content-length") {
            try {
                contentLength = static_cast<size_t>(std::stoul(value));
            } catch (...) {
                contentLength = 0;
            }
        }
    }

    body = raw.substr(headerEnd + 4);
    while (body.size() < contentLength) {
        const ssize_t n = ::recv(fd, buf, sizeof(buf), 0);
        if (n <= 0) break;
        body.append(buf, static_cast<size_t>(n));
    }
    if (body.size() > contentLength) body.resize(contentLength);
    return true;
}

std::string lastSegment(const std::string& path) {
    const auto slash = path.find_last_of('/');
    return slash == std::string::npos ? path : path.substr(slash + 1);
}

}  // namespace

EditorServer::EditorServer(Engine& engine, std::string webRoot, int port)
    : engine_(engine), webRoot_(std::move(webRoot)), port_(port) {}

bool EditorServer::start() {
    listenFd_ = ::socket(AF_INET, SOCK_STREAM, 0);
    if (listenFd_ < 0) return false;
    int opt = 1;
    ::setsockopt(listenFd_, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt));
    sockaddr_in addr{};
    addr.sin_family = AF_INET;
    addr.sin_addr.s_addr = htonl(INADDR_ANY);
    addr.sin_port = htons(static_cast<uint16_t>(port_));
    if (::bind(listenFd_, reinterpret_cast<sockaddr*>(&addr), sizeof(addr)) < 0) {
        ::close(listenFd_);
        listenFd_ = -1;
        return false;
    }
    if (::listen(listenFd_, 32) < 0) {
        ::close(listenFd_);
        listenFd_ = -1;
        return false;
    }
    running_ = true;
    std::thread([this] { acceptLoop(); }).detach();
    return true;
}

void EditorServer::stop() {
    running_ = false;
    if (listenFd_ >= 0) {
        ::shutdown(listenFd_, SHUT_RDWR);
        ::close(listenFd_);
        listenFd_ = -1;
    }
}

void EditorServer::acceptLoop() {
    while (running_) {
        const int fd = ::accept(listenFd_, nullptr, nullptr);
        if (fd < 0) {
            if (!running_) return;
            continue;
        }
        std::thread([this, fd] { handleClient(fd); }).detach();
    }
}

void EditorServer::handleClient(int fd) {
    std::string method, path, body;
    if (!readRequest(fd, method, path, body)) {
        ::close(fd);
        return;
    }
    path = normalizePath(path);

    if (method == "OPTIONS") {
        sendResponse(fd, 204, "No Content", "text/plain", "");
        ::close(fd);
        return;
    }

    auto parseBody = [&](Json& out) -> bool {
        if (body.empty()) {
            out = Json::object();
            return true;
        }
        std::string error;
        if (!Json::tryParse(body, out, &error)) {
            sendError(fd, 400, error);
            return false;
        }
        return true;
    };

    if (path == "/api/state" && method == "GET") {
        sendJson(fd, 200, engine_.stateJson());
    } else if (path == "/api/scene" && method == "GET") {
        sendJson(fd, 200, engine_.sceneJson());
    } else if (path == "/api/scene" && (method == "PUT" || method == "POST")) {
        Json json;
        if (!parseBody(json)) {
            ::close(fd);
            return;
        }
        std::string error;
        if (!engine_.applyScene(json, error)) {
            sendError(fd, 400, error);
        } else {
            sendJson(fd, 200, engine_.sceneJson());
        }
    } else if (path == "/api/objects" && method == "POST") {
        Json json;
        if (!parseBody(json)) {
            ::close(fd);
            return;
        }
        sendJson(fd, 200, engine_.addObjectFromSpec(json));
    } else if (path.rfind("/api/objects/", 0) == 0 && (method == "PATCH" || method == "PUT")) {
        Json json;
        if (!parseBody(json)) {
            ::close(fd);
            return;
        }
        std::string error;
        if (!engine_.updateObject(lastSegment(path), json, error)) sendError(fd, 404, error);
        else sendJson(fd, 200, engine_.sceneJson());
    } else if (path.rfind("/api/objects/", 0) == 0 && method == "DELETE") {
        if (!engine_.removeObject(lastSegment(path))) sendError(fd, 404, "nesne yok");
        else sendJson(fd, 200, engine_.sceneJson());
    } else if (path == "/api/scripts" && method == "GET") {
        sendJson(fd, 200, engine_.scriptsJson());
    } else if (path == "/api/scripts" && (method == "PUT" || method == "POST")) {
        Json json;
        if (!parseBody(json)) {
            ::close(fd);
            return;
        }
        std::string error;
        if (!engine_.setScripts(json, error)) sendError(fd, 400, error);
        else sendJson(fd, 200, engine_.scriptsJson());
    } else if (path == "/api/play" && method == "POST") {
        Json json;
        if (!parseBody(json)) {
            ::close(fd);
            return;
        }
        if (json.has("scripts") || json.has("stack") || json.isArray()) {
            std::string error;
            engine_.setScripts(json, error);
        }
        engine_.play();
        Json ok = Json::object();
        ok["playing"] = true;
        sendJson(fd, 200, ok);
    } else if (path == "/api/stop" && method == "POST") {
        engine_.stop();
        Json ok = Json::object();
        ok["playing"] = false;
        sendJson(fd, 200, ok);
    } else if (path == "/api/input" && method == "POST") {
        Json json;
        if (!parseBody(json)) {
            ::close(fd);
            return;
        }
        std::unordered_set<std::string> keys;
        if (json["keys"].isArray()) {
            for (const auto& k : json["keys"].arrayItems()) keys.insert(k.asString());
        }
        engine_.setKeys(keys);
        Json ok = Json::object();
        ok["ok"] = true;
        sendJson(fd, 200, ok);
    } else if (path == "/api/project" && method == "GET") {
        sendJson(fd, 200, engine_.projectJson());
    } else if (path == "/api/project" && (method == "PUT" || method == "POST")) {
        Json json;
        if (!parseBody(json)) {
            ::close(fd);
            return;
        }
        std::string error;
        if (!engine_.loadProject(json, error)) sendError(fd, 400, error);
        else sendJson(fd, 200, engine_.projectJson());
    } else if (path == "/api/backdrop" && method == "POST") {
        Json json;
        if (!parseBody(json)) {
            ::close(fd);
            return;
        }
        engine_.setBackdrop(json["id"].asString("cayir"));
        sendJson(fd, 200, engine_.stateJson());
    } else if (path.rfind("/api/clone/", 0) == 0 && method == "POST") {
        sendJson(fd, 200, engine_.cloneObject(lastSegment(path)));
    } else if (path == "/api/reset" && method == "POST") {
        engine_.resetToDefault();
        sendJson(fd, 200, engine_.stateJson());
    } else if (path == "/api/frame.bmp" && method == "GET") {
        const Image image = engine_.renderFrame();
        sendResponse(fd, 200, "OK", "image/bmp", image.toBmp(), true);
    } else if (method == "GET") {
        std::string file;
        if (!safeJoin(webRoot_, path, file) || !readFile(file, body)) {
            sendResponse(fd, 404, "Not Found", "text/plain; charset=utf-8", "bulunamadi");
        } else {
            sendResponse(fd, 200, "OK", mimeType(file), body);
        }
    } else {
        sendError(fd, 404, "bilinmeyen yol");
    }
    ::close(fd);
}

}  // namespace blok
