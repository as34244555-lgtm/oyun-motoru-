#include "blokmotor/json.hpp"

#include <cctype>
#include <cmath>
#include <sstream>
#include <stdexcept>

namespace blok {
namespace {

struct Parser {
    const std::string& text;
    size_t i = 0;
    std::string error;

    explicit Parser(const std::string& t) : text(t) {}

    void skip() {
        while (i < text.size() && std::isspace(static_cast<unsigned char>(text[i]))) ++i;
    }

    bool consume(char c) {
        skip();
        if (i < text.size() && text[i] == c) {
            ++i;
            return true;
        }
        return false;
    }

    bool parse(Json& out) {
        skip();
        if (i >= text.size()) {
            error = "unexpected end of json";
            return false;
        }
        const char c = text[i];
        if (c == 'n') return parseLiteral(out, "null", Json(nullptr));
        if (c == 't') return parseLiteral(out, "true", Json(true));
        if (c == 'f') return parseLiteral(out, "false", Json(false));
        if (c == '"') return parseString(out);
        if (c == '[') return parseArray(out);
        if (c == '{') return parseObject(out);
        if (c == '-' || std::isdigit(static_cast<unsigned char>(c))) return parseNumber(out);
        error = "unexpected character";
        return false;
    }

    bool parseLiteral(Json& out, const char* lit, Json value) {
        for (size_t n = 0; lit[n]; ++n) {
            if (i >= text.size() || text[i] != lit[n]) {
                error = "invalid literal";
                return false;
            }
            ++i;
        }
        out = std::move(value);
        return true;
    }

    bool parseString(Json& out) {
        if (!consume('"')) {
            error = "expected string";
            return false;
        }
        std::string s;
        while (i < text.size()) {
            const char c = text[i++];
            if (c == '"') {
                out = Json(std::move(s));
                return true;
            }
            if (c == '\\') {
                if (i >= text.size()) {
                    error = "unterminated escape";
                    return false;
                }
                const char e = text[i++];
                switch (e) {
                    case '"':
                    case '\\':
                    case '/':
                        s.push_back(e);
                        break;
                    case 'b':
                        s.push_back('\b');
                        break;
                    case 'f':
                        s.push_back('\f');
                        break;
                    case 'n':
                        s.push_back('\n');
                        break;
                    case 'r':
                        s.push_back('\r');
                        break;
                    case 't':
                        s.push_back('\t');
                        break;
                    case 'u': {
                        if (i + 4 > text.size()) {
                            error = "bad unicode escape";
                            return false;
                        }
                        unsigned code = 0;
                        for (int k = 0; k < 4; ++k) {
                            const char h = text[i++];
                            code <<= 4;
                            if (h >= '0' && h <= '9') code += static_cast<unsigned>(h - '0');
                            else if (h >= 'a' && h <= 'f') code += static_cast<unsigned>(h - 'a' + 10);
                            else if (h >= 'A' && h <= 'F') code += static_cast<unsigned>(h - 'A' + 10);
                            else {
                                error = "bad unicode escape";
                                return false;
                            }
                        }
                        if (code < 0x80) {
                            s.push_back(static_cast<char>(code));
                        } else if (code < 0x800) {
                            s.push_back(static_cast<char>(0xC0 | (code >> 6)));
                            s.push_back(static_cast<char>(0x80 | (code & 0x3F)));
                        } else {
                            s.push_back(static_cast<char>(0xE0 | (code >> 12)));
                            s.push_back(static_cast<char>(0x80 | ((code >> 6) & 0x3F)));
                            s.push_back(static_cast<char>(0x80 | (code & 0x3F)));
                        }
                        break;
                    }
                    default:
                        error = "unknown escape";
                        return false;
                }
            } else {
                s.push_back(c);
            }
        }
        error = "unterminated string";
        return false;
    }

    bool parseNumber(Json& out) {
        skip();
        const size_t start = i;
        if (i < text.size() && text[i] == '-') ++i;
        if (i >= text.size() || !std::isdigit(static_cast<unsigned char>(text[i]))) {
            error = "invalid number";
            return false;
        }
        if (text[i] == '0') {
            ++i;
        } else {
            while (i < text.size() && std::isdigit(static_cast<unsigned char>(text[i]))) ++i;
        }
        if (i < text.size() && text[i] == '.') {
            ++i;
            if (i >= text.size() || !std::isdigit(static_cast<unsigned char>(text[i]))) {
                error = "invalid number";
                return false;
            }
            while (i < text.size() && std::isdigit(static_cast<unsigned char>(text[i]))) ++i;
        }
        if (i < text.size() && (text[i] == 'e' || text[i] == 'E')) {
            ++i;
            if (i < text.size() && (text[i] == '+' || text[i] == '-')) ++i;
            if (i >= text.size() || !std::isdigit(static_cast<unsigned char>(text[i]))) {
                error = "invalid number";
                return false;
            }
            while (i < text.size() && std::isdigit(static_cast<unsigned char>(text[i]))) ++i;
        }
        try {
            out = Json(std::stod(text.substr(start, i - start)));
        } catch (...) {
            error = "invalid number";
            return false;
        }
        return true;
    }

    bool parseArray(Json& out) {
        if (!consume('[')) {
            error = "expected array";
            return false;
        }
        out = Json::array();
        skip();
        if (consume(']')) return true;
        while (true) {
            Json item;
            if (!parse(item)) return false;
            out.push(std::move(item));
            skip();
            if (consume(']')) return true;
            if (!consume(',')) {
                error = "expected comma in array";
                return false;
            }
        }
    }

    bool parseObject(Json& out) {
        if (!consume('{')) {
            error = "expected object";
            return false;
        }
        out = Json::object();
        skip();
        if (consume('}')) return true;
        while (true) {
            Json key;
            if (!parseString(key)) return false;
            if (!consume(':')) {
                error = "expected colon";
                return false;
            }
            Json value;
            if (!parse(value)) return false;
            out[key.asString()] = std::move(value);
            skip();
            if (consume('}')) return true;
            if (!consume(',')) {
                error = "expected comma in object";
                return false;
            }
        }
    }
};

void dumpValue(const Json& json, std::ostringstream& out, int indent, int level) {
    auto pad = [&](int n) {
        if (indent <= 0) return;
        out << '\n' << std::string(static_cast<size_t>(n * indent), ' ');
    };

    switch (json.type()) {
        case Json::Type::Null:
            out << "null";
            break;
        case Json::Type::Bool:
            out << (json.asBool() ? "true" : "false");
            break;
        case Json::Type::Number: {
            const double v = json.asNumber();
            if (std::isfinite(v) && std::floor(v) == v && std::fabs(v) < 1e15) {
                out << static_cast<long long>(v);
            } else {
                out << v;
            }
            break;
        }
        case Json::Type::String: {
            out << '"';
            for (unsigned char c : json.asString()) {
                switch (c) {
                    case '"':
                        out << "\\\"";
                        break;
                    case '\\':
                        out << "\\\\";
                        break;
                    case '\n':
                        out << "\\n";
                        break;
                    case '\r':
                        out << "\\r";
                        break;
                    case '\t':
                        out << "\\t";
                        break;
                    default:
                        if (c < 0x20) {
                            out << "\\u00";
                            const char* hex = "0123456789abcdef";
                            out << hex[c >> 4] << hex[c & 15];
                        } else {
                            out << static_cast<char>(c);
                        }
                }
            }
            out << '"';
            break;
        }
        case Json::Type::Array: {
            out << '[';
            const auto& items = json.arrayItems();
            for (size_t n = 0; n < items.size(); ++n) {
                if (indent) pad(level + 1);
                dumpValue(items[n], out, indent, level + 1);
                if (n + 1 < items.size()) out << ',';
            }
            if (indent && !items.empty()) pad(level);
            out << ']';
            break;
        }
        case Json::Type::Object: {
            out << '{';
            const auto& items = json.objectItems();
            size_t n = 0;
            for (const auto& kv : items) {
                if (indent) pad(level + 1);
                Json key(kv.first);
                dumpValue(key, out, 0, 0);
                out << (indent ? ": " : ":");
                dumpValue(kv.second, out, indent, level + 1);
                if (++n < items.size()) out << ',';
            }
            if (indent && !items.empty()) pad(level);
            out << '}';
            break;
        }
    }
}

}  // namespace

std::string Json::dump(int indent) const {
    std::ostringstream out;
    dumpValue(*this, out, indent, 0);
    return out.str();
}

bool Json::tryParse(const std::string& text, Json& out, std::string* error) {
    Parser parser(text);
    if (!parser.parse(out)) {
        if (error) *error = parser.error;
        return false;
    }
    parser.skip();
    if (parser.i != text.size()) {
        if (error) *error = "trailing characters";
        return false;
    }
    return true;
}

Json Json::parse(const std::string& text) {
    Json out;
    std::string error;
    if (!tryParse(text, out, &error)) {
        throw std::runtime_error(error);
    }
    return out;
}

}  // namespace blok
