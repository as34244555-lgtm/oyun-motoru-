#pragma once

#include "blokmotor/physics.hpp"
#include "blokmotor/renderer.hpp"
#include "blokmotor/scene.hpp"
#include "blokmotor/vm.hpp"

#include <mutex>
#include <string>
#include <unordered_set>

namespace blok {

class Engine {
public:
    Engine();

    Json sceneJson() const;
    Json stateJson() const;
    bool applyScene(const Json& json, std::string& error);
    Json addObject(const std::string& meshName);
    Json addObjectFromSpec(const Json& spec);
    bool updateObject(const std::string& id, const Json& patch, std::string& error);
    bool removeObject(const std::string& id);
    Json cloneObject(const std::string& id);

    Json scriptsJson() const;
    bool setScripts(const Json& json, std::string& error);
    Json projectJson() const;
    bool loadProject(const Json& json, std::string& error);
    bool setBackdrop(const std::string& id);
    bool updateCamera(const Json& patch, std::string& error);

    void play();
    void stop();
    bool playing() const;
    void setKeys(const std::unordered_set<std::string>& keys);
    void tick(float dt);

    Image renderFrame() const;
    void resetToDefault();

private:
    mutable std::mutex mutex_;
    Scene scene_;
    Scene snapshot_;
    BlockVM vm_;
    Physics physics_;
    SoftwareRenderer renderer_;
    bool playing_ = false;
    std::unordered_set<std::string> keys_;
};

}  // namespace blok
