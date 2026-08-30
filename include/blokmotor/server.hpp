#pragma once

#include "blokmotor/engine.hpp"

#include <atomic>
#include <string>

namespace blok {

class EditorServer {
public:
    EditorServer(Engine& engine, std::string webRoot, int port = 8080);
    bool start();
    void stop();
    int port() const { return port_; }

private:
    Engine& engine_;
    std::string webRoot_;
    int port_;
    std::atomic<bool> running_{false};
    int listenFd_ = -1;

    void acceptLoop();
    void handleClient(int fd);
};

}  // namespace blok
