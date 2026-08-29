#include "blokmotor/engine.hpp"
#include "blokmotor/server.hpp"

#include <algorithm>
#include <atomic>
#include <chrono>
#include <csignal>
#include <cstdlib>
#include <fstream>
#include <iostream>
#include <string>
#include <thread>
#include <vector>

namespace {

std::atomic<bool> gRunning{true};

void handleSignal(int) { gRunning = false; }

std::string findWebRoot(const std::string& argv0) {
    const std::vector<std::string> candidates = {
        "web",
        "./web",
        "../web",
        argv0.substr(0, argv0.find_last_of("/\\") == std::string::npos ? 0 : argv0.find_last_of("/\\")) + "/../web",
        "/workspace/web",
    };
    for (const auto& path : candidates) {
        std::ifstream in(path + "/index.html");
        if (in) return path;
    }
    return "web";
}

}  // namespace

int main(int argc, char** argv) {
    int port = 8080;
    bool headless = false;
    int frames = 0;
    std::string frameOut;

    for (int i = 1; i < argc; ++i) {
        const std::string arg = argv[i];
        if ((arg == "--port" || arg == "-p") && i + 1 < argc) {
            port = std::atoi(argv[++i]);
        } else if (arg == "--headless") {
            headless = true;
        } else if (arg == "--frames" && i + 1 < argc) {
            frames = std::atoi(argv[++i]);
        } else if (arg == "--out" && i + 1 < argc) {
            frameOut = argv[++i];
        } else if (arg == "--help" || arg == "-h") {
            std::cout << "BlokMotor — blok tabanli 3D oyun motoru\n"
                         "  ./blokmotor [--port 8080]\n"
                         "  ./blokmotor --headless --frames 1 --out frame.bmp\n";
            return 0;
        }
    }

    blok::Engine engine;

    if (headless) {
        engine.play();
        for (int i = 0; i < std::max(1, frames); ++i) engine.tick(1.0f / 30.0f);
        const auto image = engine.renderFrame();
        const std::string path = frameOut.empty() ? "frame.bmp" : frameOut;
        std::ofstream out(path, std::ios::binary);
        const std::string bmp = image.toBmp();
        out.write(bmp.data(), static_cast<std::streamsize>(bmp.size()));
        std::cout << "yazildi " << path << " " << image.width << "x" << image.height << "\n";
        return out ? 0 : 1;
    }

    const std::string webRoot = findWebRoot(argc > 0 ? argv[0] : "");
    blok::EditorServer server(engine, webRoot, port);
    if (!server.start()) {
        std::cerr << "blokmotor: " << port << " portu acilamadi\n";
        return 1;
    }

    std::signal(SIGINT, handleSignal);
    std::signal(SIGTERM, handleSignal);
    std::cout << "BlokMotor hazir: http://127.0.0.1:" << port << "  (web: " << webRoot << ")\n";

    auto last = std::chrono::steady_clock::now();
    while (gRunning) {
        const auto now = std::chrono::steady_clock::now();
        const float dt = std::chrono::duration<float>(now - last).count();
        last = now;
        engine.tick(dt);
        std::this_thread::sleep_for(std::chrono::milliseconds(16));
    }
    server.stop();
    return 0;
}
