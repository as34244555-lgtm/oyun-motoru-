#include "blokmotor/engine.hpp"

#include <sstream>
#include <stdexcept>

namespace blok {
namespace {

int gObjectSerial = 1;

std::string makeId(const std::string& prefix) {
    std::ostringstream out;
    out << prefix << '_' << ++gObjectSerial;
    return out.str();
}

std::string prettyName(MeshType mesh) {
    switch (mesh) {
        case MeshType::Sphere:
            return "Kure";
        case MeshType::Plane:
            return "Zemin";
        case MeshType::Pyramid:
            return "Piramit";
        case MeshType::Cube:
        default:
            return "Kup";
    }
}

GameObject makeObject(MeshType mesh) {
    GameObject object;
    object.id = makeId(meshTypeName(mesh));
    object.name = prettyName(mesh);
    object.mesh = mesh;
    object.dynamic = mesh != MeshType::Plane;
    if (mesh == MeshType::Plane) {
        object.transform.scale = {10, 1, 10};
        object.color = {0.22f, 0.34f, 0.28f};
    } else if (mesh == MeshType::Sphere) {
        object.color = {0.25f, 0.65f, 0.95f};
        object.transform.position.y = 0.5f;
    } else if (mesh == MeshType::Pyramid) {
        object.color = {0.97f, 0.76f, 0.20f};
        object.transform.position.y = 0.5f;
    } else {
        object.transform.position.y = 0.5f;
    }
    return object;
}

}  // namespace

Engine::Engine() : renderer_(720, 405) { resetToDefault(); }

void Engine::resetToDefault() {
    std::lock_guard<std::mutex> lock(mutex_);
    scene_ = Scene::makeDefault();
    snapshot_ = scene_;
    playing_ = false;
    keys_.clear();
    Json scripts = Json::object();
    Json list = Json::array();

    Json rotate = Json::object();
    rotate["target"] = "cube";
    rotate["hat"] = "every_frame";
    Json rotateStack = Json::array();
    Json rot = Json::object();
    rot["op"] = "rotate";
    Json rotArgs = Json::object();
    rotArgs["axis"] = "y";
    rotArgs["degrees"] = "80";
    rot["args"] = rotArgs;
    rotateStack.push(rot);
    rotate["stack"] = rotateStack;
    list.push(rotate);

    Json jump = Json::object();
    jump["target"] = "cube";
    jump["hat"] = "every_frame";
    Json jumpStack = Json::array();
    Json ifb = Json::object();
    ifb["op"] = "if";
    Json cond = Json::object();
    cond["op"] = "key_down";
    Json condArgs = Json::object();
    condArgs["key"] = "Space";
    cond["args"] = condArgs;
    ifb["cond"] = cond;
    Json thenStack = Json::array();
    Json jmp = Json::object();
    jmp["op"] = "jump";
    Json jmpArgs = Json::object();
    jmpArgs["force"] = "8";
    jmp["args"] = jmpArgs;
    thenStack.push(jmp);
    ifb["then"] = thenStack;
    jumpStack.push(ifb);
    jump["stack"] = jumpStack;
    list.push(jump);

    Json move = Json::object();
    move["target"] = "sphere";
    move["hat"] = "every_frame";
    Json moveStack = Json::array();
    auto keyMove = [&](const char* key, float x, float z) {
        Json block = Json::object();
        block["op"] = "if";
        Json c = Json::object();
        c["op"] = "key_down";
        Json a = Json::object();
        a["key"] = key;
        c["args"] = a;
        block["cond"] = c;
        Json th = Json::array();
        Json ch = Json::object();
        ch["op"] = "change_position";
        Json cha = Json::object();
        cha["x"] = std::to_string(x);
        cha["y"] = "0";
        cha["z"] = std::to_string(z);
        ch["args"] = cha;
        th.push(ch);
        block["then"] = th;
        return block;
    };
    moveStack.push(keyMove("ArrowLeft", -0.08f, 0));
    moveStack.push(keyMove("ArrowRight", 0.08f, 0));
    moveStack.push(keyMove("ArrowUp", 0, -0.08f));
    moveStack.push(keyMove("ArrowDown", 0, 0.08f));
    move["stack"] = moveStack;
    list.push(move);

    scripts["scripts"] = list;
    vm_.load(scripts);
}

Json Engine::sceneJson() const {
    std::lock_guard<std::mutex> lock(mutex_);
    return scene_.toJson();
}

Json Engine::stateJson() const {
    std::lock_guard<std::mutex> lock(mutex_);
    Json root = scene_.toJson();
    root["playing"] = playing_;
    return root;
}

bool Engine::applyScene(const Json& json, std::string& error) {
    try {
        Scene next = Scene::fromJson(json);
        std::lock_guard<std::mutex> lock(mutex_);
        scene_ = std::move(next);
        if (!playing_) snapshot_ = scene_;
        return true;
    } catch (const std::exception& ex) {
        error = ex.what();
        return false;
    }
}

Json Engine::addObject(const std::string& meshName) {
    std::lock_guard<std::mutex> lock(mutex_);
    GameObject object = makeObject(meshTypeFromName(meshName));
    const float offset = static_cast<float>(scene_.objects.size()) * 0.15f;
    if (object.mesh != MeshType::Plane) {
        object.transform.position.x += offset;
        object.transform.position.z += offset * 0.4f;
    }
    scene_.add(object);
    if (!playing_) snapshot_ = scene_;
    Json out = Json::object();
    out["id"] = object.id;
    out["name"] = object.name;
    return out;
}

bool Engine::updateObject(const std::string& id, const Json& patch, std::string& error) {
    std::lock_guard<std::mutex> lock(mutex_);
    GameObject* object = scene_.find(id);
    if (!object) {
        error = "nesne bulunamadi";
        return false;
    }
    if (patch["name"].isString()) object->name = patch["name"].asString();
    if (patch["mesh"].isString()) object->mesh = meshTypeFromName(patch["mesh"].asString());
    if (patch["visible"].isBool()) object->visible = patch["visible"].asBool();
    if (patch["dynamic"].isBool()) object->dynamic = patch["dynamic"].asBool();
    if (patch["color"].isString()) object->color = Color::fromHex(patch["color"].asString());
    if (patch["color"].isObject() && patch["color"]["hex"].isString()) {
        object->color = Color::fromHex(patch["color"]["hex"].asString());
    }
    auto applyVec = [](Vec3& target, const Json& v) {
        if (!v.isObject()) return;
        if (v.has("x")) target.x = v["x"].asFloat(target.x);
        if (v.has("y")) target.y = v["y"].asFloat(target.y);
        if (v.has("z")) target.z = v["z"].asFloat(target.z);
    };
    applyVec(object->transform.position, patch["position"]);
    applyVec(object->transform.rotation, patch["rotation"]);
    applyVec(object->transform.scale, patch["scale"]);
    applyVec(object->velocity, patch["velocity"]);
    if (!playing_) snapshot_ = scene_;
    return true;
}

bool Engine::removeObject(const std::string& id) {
    std::lock_guard<std::mutex> lock(mutex_);
    const bool ok = scene_.remove(id);
    if (ok && !playing_) snapshot_ = scene_;
    return ok;
}

Json Engine::scriptsJson() const {
    std::lock_guard<std::mutex> lock(mutex_);
    return vm_.save();
}

bool Engine::setScripts(const Json& json, std::string& error) {
    try {
        std::lock_guard<std::mutex> lock(mutex_);
        vm_.load(json);
        return true;
    } catch (const std::exception& ex) {
        error = ex.what();
        return false;
    }
}

void Engine::play() {
    std::lock_guard<std::mutex> lock(mutex_);
    snapshot_ = scene_;
    vm_.resetRuntime();
    playing_ = true;
    keys_.clear();
}

void Engine::stop() {
    std::lock_guard<std::mutex> lock(mutex_);
    scene_ = snapshot_;
    playing_ = false;
    keys_.clear();
    vm_.resetRuntime();
}

bool Engine::playing() const {
    std::lock_guard<std::mutex> lock(mutex_);
    return playing_;
}

void Engine::setKeys(const std::unordered_set<std::string>& keys) {
    std::lock_guard<std::mutex> lock(mutex_);
    keys_ = keys;
}

void Engine::tick(float dt) {
    std::lock_guard<std::mutex> lock(mutex_);
    if (!playing_) return;
    vm_.tick(scene_, dt, keys_);
    physics_.step(scene_, dt);
}

Image Engine::renderFrame() const {
    std::lock_guard<std::mutex> lock(mutex_);
    return renderer_.render(scene_);
}

}  // namespace blok
