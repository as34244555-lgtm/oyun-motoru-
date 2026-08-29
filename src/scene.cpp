#include "blokmotor/scene.hpp"

#include <algorithm>
#include <cmath>
#include <cstdio>
#include <sstream>

namespace blok {
namespace {

std::string nextId(const char* prefix) {
    static int counter = 1;
    std::ostringstream out;
    out << prefix << '_' << counter++;
    return out.str();
}

Color colorFromJson(const Json& json, Color fallback) {
    if (json.isString()) return Color::fromHex(json.asString());
    if (!json.isObject()) return fallback;
    return {json["r"].asFloat(fallback.r), json["g"].asFloat(fallback.g), json["b"].asFloat(fallback.b)};
}

Json colorToJson(const Color& color) {
    Json j = Json::object();
    j["r"] = color.r;
    j["g"] = color.g;
    j["b"] = color.b;
    j["hex"] = color.toHex();
    return j;
}

Vec3 vecFromJson(const Json& json, Vec3 fallback) {
    if (!json.isObject()) return fallback;
    return {json["x"].asFloat(fallback.x), json["y"].asFloat(fallback.y), json["z"].asFloat(fallback.z)};
}

Json vecToJson(const Vec3& v) {
    Json j = Json::object();
    j["x"] = v.x;
    j["y"] = v.y;
    j["z"] = v.z;
    return j;
}

int hexDigit(char c) {
    if (c >= '0' && c <= '9') return c - '0';
    if (c >= 'a' && c <= 'f') return c - 'a' + 10;
    if (c >= 'A' && c <= 'F') return c - 'A' + 10;
    return 0;
}

}  // namespace

Color Color::fromHex(const std::string& hex) {
    std::string h = hex;
    if (!h.empty() && h[0] == '#') h.erase(h.begin());
    if (h.size() == 3) {
        h = std::string{h[0], h[0], h[1], h[1], h[2], h[2]};
    }
    if (h.size() < 6) return {1, 1, 1};
    const float r = (hexDigit(h[0]) * 16 + hexDigit(h[1])) / 255.0f;
    const float g = (hexDigit(h[2]) * 16 + hexDigit(h[3])) / 255.0f;
    const float b = (hexDigit(h[4]) * 16 + hexDigit(h[5])) / 255.0f;
    return {r, g, b};
}

std::string Color::toHex() const {
    char buf[8];
    std::snprintf(buf, sizeof(buf), "#%02x%02x%02x",
                  static_cast<int>(clampf(r, 0, 1) * 255.0f + 0.5f),
                  static_cast<int>(clampf(g, 0, 1) * 255.0f + 0.5f),
                  static_cast<int>(clampf(b, 0, 1) * 255.0f + 0.5f));
    return buf;
}

void Camera::refreshOrbit() {
    pitch = clampf(pitch, -80.0f, 80.0f);
    distance = std::max(1.2f, distance);
    const float pr = radians(pitch);
    const float yr = radians(yaw);
    position.x = target.x + distance * std::cos(pr) * std::sin(yr);
    position.y = target.y + distance * std::sin(pr);
    position.z = target.z + distance * std::cos(pr) * std::cos(yr);
}

const char* characterKindOf(const std::string& catalogId) {
    if (catalogId == "kedi" || catalogId == "kopek" || catalogId == "tavsan" || catalogId == "ayi" ||
        catalogId == "tilki" || catalogId == "dinozor" || catalogId == "kurbaga" || catalogId == "karinca") {
        return "quadruped";
    }
    if (catalogId == "kus" || catalogId == "kelebek" || catalogId == "ari" || catalogId == "melek" ||
        catalogId == "peri" || catalogId == "ejderha" || catalogId == "yarasa" || catalogId == "penguen" ||
        catalogId == "baykus") {
        return "flyer";
    }
    if (catalogId == "top" || catalogId == "kabak" || catalogId == "yildiz" || catalogId == "balik") {
        return "round";
    }
    return "humanoid";
}

void GameObject::nextCostume() {
    if (costumes.empty()) return;
    costumeIndex = (costumeIndex + 1) % static_cast<int>(costumes.size());
}

void GameObject::setCostume(int index) {
    if (costumes.empty()) return;
    const int n = static_cast<int>(costumes.size());
    costumeIndex = ((index % n) + n) % n;
}

Vec3 GameObject::halfExtents() const {
    const float s = std::max(0.15f, size / 100.0f);
    switch (mesh) {
        case MeshType::Plane:
            return {0.5f * transform.scale.x, 0.02f * std::max(0.1f, transform.scale.y), 0.5f * transform.scale.z};
        case MeshType::Sprite:
        case MeshType::Character:
            return {0.35f * transform.scale.x * s, 0.55f * transform.scale.y * s, 0.2f * transform.scale.z * s};
        case MeshType::Capsule:
            return {0.28f * transform.scale.x * s, 0.5f * transform.scale.y * s, 0.28f * transform.scale.z * s};
        case MeshType::Pyramid:
        case MeshType::Sphere:
        case MeshType::Cube:
        default:
            return {0.5f * transform.scale.x * s, 0.5f * transform.scale.y * s, 0.5f * transform.scale.z * s};
    }
}

Color catalogColor(const std::string& catalogId) {
    unsigned h = 2166136261u;
    for (unsigned char c : catalogId) h = (h ^ c) * 16777619u;
    const float hue = (h % 360) / 360.0f;
    auto f = [&](float p, float q, float t) {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1.0f / 6) return p + (q - p) * 6 * t;
        if (t < 0.5f) return q;
        if (t < 2.0f / 3) return p + (q - p) * (2.0f / 3 - t) * 6;
        return p;
    };
    const float s = 0.62f, l = 0.55f;
    const float q = l < 0.5f ? l * (1 + s) : l + s - l * s;
    const float p = 2 * l - q;
    return {f(p, q, hue + 1.0f / 3), f(p, q, hue), f(p, q, hue - 1.0f / 3)};
}

GameObject* Scene::find(const std::string& id) {
    for (auto& object : objects) {
        if (object.id == id) return &object;
    }
    return nullptr;
}

const GameObject* Scene::find(const std::string& id) const {
    for (const auto& object : objects) {
        if (object.id == id) return &object;
    }
    return nullptr;
}

GameObject* Scene::findByName(const std::string& name) {
    for (auto& object : objects) {
        if (object.name == name) return &object;
    }
    return nullptr;
}

GameObject& Scene::add(const GameObject& object) {
    objects.push_back(object);
    if (objects.back().id.empty()) objects.back().id = nextId("obj");
    if (objects.back().name.empty()) objects.back().name = objects.back().id;
    return objects.back();
}

bool Scene::remove(const std::string& id) {
    const auto before = objects.size();
    objects.erase(std::remove_if(objects.begin(), objects.end(), [&](const GameObject& o) { return o.id == id; }),
                  objects.end());
    return objects.size() != before;
}

void Scene::clear() { objects.clear(); }

void Scene::applyBackdrop(const std::string& id) {
    backdropId = id;
    struct Sky {
        const char* name;
        Color color;
    };
    static const Sky skies[] = {
        {"cayir", {0.45f, 0.72f, 0.95f}},
        {"gece", {0.05f, 0.07f, 0.16f}},
        {"gunbatimi", {0.72f, 0.32f, 0.22f}},
        {"uzay", {0.04f, 0.04f, 0.08f}},
        {"deniz", {0.18f, 0.42f, 0.62f}},
        {"col", {0.86f, 0.70f, 0.38f}},
        {"kar", {0.78f, 0.86f, 0.94f}},
        {"sehir", {0.22f, 0.26f, 0.34f}},
        {"orman", {0.16f, 0.32f, 0.18f}},
        {"magara", {0.12f, 0.10f, 0.09f}},
        {"kale", {0.28f, 0.30f, 0.38f}},
        {"sahne", {0.10f, 0.08f, 0.14f}},
        {"sualti", {0.05f, 0.22f, 0.38f}},
        {"volkan", {0.28f, 0.08f, 0.05f}},
        {"bulutlar", {0.70f, 0.80f, 0.92f}},
        {"ay", {0.12f, 0.12f, 0.14f}},
        {"ciftlik", {0.55f, 0.72f, 0.42f}},
        {"stadyum", {0.20f, 0.38f, 0.22f}},
        {"sinif", {0.62f, 0.58f, 0.48f}},
        {"labirent", {0.18f, 0.20f, 0.16f}},
        {"neon", {0.10f, 0.04f, 0.22f}},
        {"sonbahar", {0.72f, 0.42f, 0.18f}},
        {"gol", {0.32f, 0.52f, 0.62f}},
        {"dag", {0.40f, 0.52f, 0.68f}},
    };
    sky = {0.07f, 0.09f, 0.14f};
    for (const auto& item : skies) {
        if (id == item.name) {
            sky = item.color;
            break;
        }
    }
}

Json Scene::toJson() const {
    Json root = Json::object();
    Json cam = Json::object();
    cam["position"] = vecToJson(camera.position);
    cam["target"] = vecToJson(camera.target);
    cam["fov"] = camera.fov;
    cam["yaw"] = camera.yaw;
    cam["pitch"] = camera.pitch;
    cam["distance"] = camera.distance;
    cam["follow"] = camera.follow;
    root["camera"] = cam;
    root["gravity"] = gravity;
    root["backdrop"] = backdropId;
    root["timer"] = timer;
    root["volume"] = volume;
    root["lastSound"] = lastSound;
    root["lastBroadcast"] = lastBroadcast;
    root["sky"] = colorToJson(sky);
    Json list = Json::array();
    for (const auto& object : objects) {
        Json j = Json::object();
        j["id"] = object.id;
        j["name"] = object.name;
        j["mesh"] = meshTypeName(object.mesh);
        j["position"] = vecToJson(object.transform.position);
        j["rotation"] = vecToJson(object.transform.rotation);
        j["scale"] = vecToJson(object.transform.scale);
        j["color"] = colorToJson(object.color);
        j["velocity"] = vecToJson(object.velocity);
        j["visible"] = object.visible;
        j["dynamic"] = object.dynamic;
        j["grounded"] = object.grounded;
        j["catalogId"] = object.catalogId;
        j["costumeIndex"] = object.costumeIndex;
        j["opacity"] = object.opacity;
        j["size"] = object.size;
        j["layer"] = object.layer;
        j["sayText"] = object.sayText;
        j["sayTime"] = object.sayTime;
        j["animating"] = object.animating;
        j["animFps"] = object.animFps;
        j["isClone"] = object.isClone;
        j["cloneOf"] = object.cloneOf;
        Json costumes = Json::array();
        for (const auto& costume : object.costumes) {
            Json c = Json::object();
            c["name"] = costume.name;
            c["image"] = costume.image;
            costumes.push(c);
        }
        j["costumes"] = costumes;
        list.push(j);
    }
    root["objects"] = list;
    return root;
}

Scene Scene::fromJson(const Json& json) {
    Scene scene = makeDefault();
    scene.objects.clear();
    if (json["camera"].isObject()) {
        scene.camera.position = vecFromJson(json["camera"]["position"], scene.camera.position);
        scene.camera.target = vecFromJson(json["camera"]["target"], scene.camera.target);
        scene.camera.fov = json["camera"]["fov"].asFloat(scene.camera.fov);
        scene.camera.yaw = json["camera"]["yaw"].asFloat(scene.camera.yaw);
        scene.camera.pitch = json["camera"]["pitch"].asFloat(scene.camera.pitch);
        scene.camera.distance = json["camera"]["distance"].asFloat(scene.camera.distance);
        scene.camera.follow = json["camera"]["follow"].asString();
        scene.camera.refreshOrbit();
    }
    scene.gravity = json["gravity"].asFloat(scene.gravity);
    if (json["backdrop"].isString()) scene.applyBackdrop(json["backdrop"].asString());
    scene.timer = json["timer"].asFloat(0);
    scene.volume = json["volume"].asFloat(80);
    if (json["objects"].isArray()) {
        for (const auto& item : json["objects"].arrayItems()) {
            GameObject object;
            object.id = item["id"].asString(nextId("obj"));
            object.name = item["name"].asString(object.id);
            object.mesh = meshTypeFromName(item["mesh"].asString("cube"));
            object.transform.position = vecFromJson(item["position"], {});
            object.transform.rotation = vecFromJson(item["rotation"], {});
            object.transform.scale = vecFromJson(item["scale"], {1, 1, 1});
            object.color = colorFromJson(item["color"], object.color);
            object.velocity = vecFromJson(item["velocity"], {});
            object.visible = item["visible"].asBool(true);
            object.dynamic = item["dynamic"].asBool(object.mesh != MeshType::Plane);
            object.grounded = item["grounded"].asBool(false);
            object.catalogId = item["catalogId"].asString();
            object.costumeIndex = item["costumeIndex"].asInt(0);
            object.opacity = item["opacity"].asFloat(1);
            object.size = item["size"].asFloat(100);
            object.layer = item["layer"].asInt(0);
            object.sayText = item["sayText"].asString();
            object.animating = item["animating"].asBool(false);
            object.animFps = item["animFps"].asFloat(6);
            object.isClone = item["isClone"].asBool(false);
            object.cloneOf = item["cloneOf"].asString();
            if (item["costumes"].isArray()) {
                for (const auto& c : item["costumes"].arrayItems()) {
                    object.costumes.push_back({c["name"].asString("kostum"), c["image"].asString()});
                }
            }
            scene.objects.push_back(object);
        }
    }
    return scene;
}

Scene Scene::makeDefault() {
    Scene scene;
    scene.applyBackdrop("cayir");
    scene.camera.refreshOrbit();

    GameObject ground;
    ground.id = "ground";
    ground.name = "Zemin";
    ground.mesh = MeshType::Plane;
    ground.transform.position = {0, 0, 0};
    ground.transform.scale = {14, 1, 14};
    ground.color = {0.28f, 0.42f, 0.34f};
    ground.dynamic = false;
    scene.objects.push_back(ground);

    GameObject cube;
    cube.id = "cube";
    cube.name = "Kup";
    cube.mesh = MeshType::Cube;
    cube.transform.position = {0, 0.5f, 0};
    cube.color = {0.93f, 0.33f, 0.22f};
    scene.objects.push_back(cube);

    GameObject sphere;
    sphere.id = "sphere";
    sphere.name = "Kure";
    sphere.mesh = MeshType::Sphere;
    sphere.transform.position = {2.4f, 0.5f, 0.2f};
    sphere.color = {0.22f, 0.62f, 0.95f};
    scene.objects.push_back(sphere);

    GameObject pyramid;
    pyramid.id = "pyramid";
    pyramid.name = "Piramit";
    pyramid.mesh = MeshType::Pyramid;
    pyramid.transform.position = {-2.3f, 0.5f, -0.4f};
    pyramid.color = {0.98f, 0.78f, 0.22f};
    scene.objects.push_back(pyramid);

    GameObject cat;
    cat.id = "cat";
    cat.name = "Kedi";
    cat.mesh = MeshType::Character;
    cat.catalogId = "kedi";
    cat.transform.position = {0.8f, 0.55f, 1.6f};
    cat.color = {0.96f, 0.62f, 0.28f};
    cat.costumes = {{"dur", ""}, {"adim1", ""}, {"adim2", ""}};
    scene.objects.push_back(cat);

    return scene;
}

}  // namespace blok
