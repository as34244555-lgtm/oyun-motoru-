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
        case MeshType::Sprite:
            return "Karakter";
        case MeshType::Character:
            return "Figuran";
        case MeshType::Capsule:
            return "Kapsul";
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
    } else if (mesh == MeshType::Sprite || mesh == MeshType::Character || mesh == MeshType::Capsule) {
        object.transform.position.y = 0.55f;
        object.costumes = {{"dur", ""}, {"adim1", ""}, {"adim2", ""}};
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

    Json catAnim = Json::object();
    catAnim["target"] = "cat";
    catAnim["hat"] = "when_start";
    Json catStack = Json::array();
    Json startA = Json::object();
    startA["op"] = "start_anim";
    Json startArgs = Json::object();
    startArgs["fps"] = "8";
    startA["args"] = startArgs;
    catStack.push(startA);
    Json say = Json::object();
    say["op"] = "say";
    Json sayArgs = Json::object();
    sayArgs["text"] = "Merhaba! Ben 3D Kedi.";
    sayArgs["seconds"] = "3";
    say["args"] = sayArgs;
    catStack.push(say);
    Json follow = Json::object();
    follow["op"] = "camera_follow";
    Json followArgs = Json::object();
    followArgs["name"] = "cat";
    follow["args"] = followArgs;
    catStack.push(follow);
    catAnim["stack"] = catStack;
    list.push(catAnim);

    Json catWalk = Json::object();
    catWalk["target"] = "cat";
    catWalk["hat"] = "every_frame";
    Json catWalkStack = Json::array();
    auto catKey = [&](const char* key, float x, float z) {
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
    catWalkStack.push(catKey("KeyA", -0.07f, 0));
    catWalkStack.push(catKey("KeyD", 0.07f, 0));
    catWalkStack.push(catKey("KeyW", 0, -0.07f));
    catWalkStack.push(catKey("KeyS", 0, 0.07f));
    catWalk["stack"] = catWalkStack;
    list.push(catWalk);

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
    root["runtime"] = vm_.varsJson();
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
    Json spec = Json::object();
    spec["mesh"] = meshName;
    return addObjectFromSpec(spec);
}

Json Engine::addObjectFromSpec(const Json& spec) {
    std::lock_guard<std::mutex> lock(mutex_);
    GameObject object = makeObject(meshTypeFromName(spec["mesh"].asString("cube")));
    if (spec["name"].isString()) object.name = spec["name"].asString();
    if (spec["catalogId"].isString()) {
        object.catalogId = spec["catalogId"].asString();
        object.color = catalogColor(object.catalogId);
        if (object.mesh == MeshType::Cube || object.mesh == MeshType::Sprite) object.mesh = MeshType::Character;
    }
    if (spec["color"].isString()) object.color = Color::fromHex(spec["color"].asString());
    if (spec["costumes"].isArray()) {
        object.costumes.clear();
        for (const auto& c : spec["costumes"].arrayItems()) {
            object.costumes.push_back({c["name"].asString("kostum"), c["image"].asString()});
        }
    }
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
    if (patch["catalogId"].isString()) object->catalogId = patch["catalogId"].asString();
    if (patch["costumeIndex"].isNumber()) object->setCostume(patch["costumeIndex"].asInt());
    if (patch["opacity"].isNumber()) object->opacity = patch["opacity"].asFloat(1);
    if (patch["size"].isNumber()) object->size = patch["size"].asFloat(100);
    if (patch["animating"].isBool()) object->animating = patch["animating"].asBool();
    if (patch["animFps"].isNumber()) object->animFps = patch["animFps"].asFloat(6);
    if (patch["sayText"].isString()) object->sayText = patch["sayText"].asString();
    if (patch["costumes"].isArray()) {
        object->costumes.clear();
        for (const auto& c : patch["costumes"].arrayItems()) {
            object->costumes.push_back({c["name"].asString("kostum"), c["image"].asString()});
        }
        if (object->costumeIndex >= static_cast<int>(object->costumes.size())) object->costumeIndex = 0;
    }
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

Json Engine::cloneObject(const std::string& id) {
    std::lock_guard<std::mutex> lock(mutex_);
    GameObject* src = scene_.find(id);
    if (!src) return Json::object();
    GameObject copy = *src;
    copy.id.clear();
    copy.name = src->name + " kopya";
    copy.isClone = true;
    copy.cloneOf = src->id;
    copy.transform.position.x += 0.6f;
    GameObject& added = scene_.add(copy);
    const auto saved = vm_.save();
    Json extra = Json::object();
    extra["scripts"] = Json::array();
    for (const auto& script : saved["scripts"].arrayItems()) {
        if (script["target"].asString() == src->id || script["target"].asString() == src->name) {
            Json s = script;
            s["target"] = added.id;
            extra["scripts"].push(s);
        }
    }
    Json merged = saved;
    for (const auto& s : extra["scripts"].arrayItems()) merged["scripts"].push(s);
    vm_.load(merged);
    Json out = Json::object();
    out["id"] = added.id;
    return out;
}

Json Engine::projectJson() const {
    std::lock_guard<std::mutex> lock(mutex_);
    Json root = scene_.toJson();
    root["scripts"] = vm_.save()["scripts"];
    root["runtime"] = vm_.varsJson();
    return root;
}

bool Engine::loadProject(const Json& json, std::string& error) {
    try {
        Scene next = Scene::fromJson(json);
        std::lock_guard<std::mutex> lock(mutex_);
        scene_ = std::move(next);
        snapshot_ = scene_;
        playing_ = false;
        vm_.load(json);
        return true;
    } catch (const std::exception& ex) {
        error = ex.what();
        return false;
    }
}

bool Engine::updateCamera(const Json& patch, std::string& error) {
    std::lock_guard<std::mutex> lock(mutex_);
    auto applyVec = [](Vec3& target, const Json& v) {
        if (!v.isObject()) return;
        if (v.has("x")) target.x = v["x"].asFloat(target.x);
        if (v.has("y")) target.y = v["y"].asFloat(target.y);
        if (v.has("z")) target.z = v["z"].asFloat(target.z);
    };
    applyVec(scene_.camera.target, patch["target"]);
    applyVec(scene_.camera.position, patch["position"]);
    if (patch["fov"].isNumber()) scene_.camera.fov = patch["fov"].asFloat(scene_.camera.fov);
    if (patch["yaw"].isNumber()) scene_.camera.yaw = patch["yaw"].asFloat(scene_.camera.yaw);
    if (patch["pitch"].isNumber()) scene_.camera.pitch = patch["pitch"].asFloat(scene_.camera.pitch);
    if (patch["distance"].isNumber()) scene_.camera.distance = patch["distance"].asFloat(scene_.camera.distance);
    if (patch["follow"].isString()) scene_.camera.follow = patch["follow"].asString();
    if (patch["preset"].isString()) {
        const std::string p = patch["preset"].asString();
        if (p == "on" || p == "front") {
            scene_.camera.yaw = 0;
            scene_.camera.pitch = 8;
            scene_.camera.distance = 8;
        } else if (p == "yan" || p == "side") {
            scene_.camera.yaw = 90;
            scene_.camera.pitch = 10;
            scene_.camera.distance = 8;
        } else if (p == "ust" || p == "top") {
            scene_.camera.yaw = 0;
            scene_.camera.pitch = 80;
            scene_.camera.distance = 12;
        } else if (p == "fps") {
            scene_.camera.yaw = 0;
            scene_.camera.pitch = 5;
            scene_.camera.distance = 2.2f;
        } else {
            scene_.camera.yaw = 45;
            scene_.camera.pitch = 28;
            scene_.camera.distance = 9.2f;
        }
    }
    scene_.camera.refreshOrbit();
    if (!playing_) snapshot_.camera = scene_.camera;
    (void)error;
    return true;
}

bool Engine::setBackdrop(const std::string& id) {
    std::lock_guard<std::mutex> lock(mutex_);
    scene_.applyBackdrop(id);
    if (!playing_) snapshot_.applyBackdrop(id);
    return true;
}

void Engine::tick(float dt) {
    std::lock_guard<std::mutex> lock(mutex_);
    if (!playing_) return;
    vm_.tick(scene_, dt, keys_);
    physics_.step(scene_, dt);
    if (!scene_.camera.follow.empty()) {
        GameObject* tracked = scene_.find(scene_.camera.follow);
        if (!tracked) tracked = scene_.findByName(scene_.camera.follow);
        if (tracked) scene_.camera.target = tracked->transform.position;
    }
    scene_.camera.refreshOrbit();
    const auto pending = scene_.pendingClones;
    scene_.pendingClones.clear();
    for (const auto& sourceId : pending) {
        GameObject* src = scene_.find(sourceId);
        if (!src) continue;
        GameObject copy = *src;
        copy.id.clear();
        copy.name = src->name + " kopya";
        copy.isClone = true;
        copy.cloneOf = src->id;
        copy.transform.position.x += 0.45f;
        GameObject& added = scene_.add(copy);
        Json saved = vm_.save();
        Json extras = Json::array();
        for (const auto& script : saved["scripts"].arrayItems()) {
            if (script["target"].asString() == src->id || script["target"].asString() == src->name) {
                Json copyScript = script;
                copyScript["target"] = added.id;
                extras.push(copyScript);
            }
        }
        for (const auto& item : extras.arrayItems()) saved["scripts"].push(item);
        vm_.load(saved);
    }
}

Image Engine::renderFrame() const {
    std::lock_guard<std::mutex> lock(mutex_);
    return renderer_.render(scene_);
}

}  // namespace blok
