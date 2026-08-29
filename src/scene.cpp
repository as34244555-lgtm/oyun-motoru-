#include "blokmotor/scene.hpp"

#include <algorithm>
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

Vec3 GameObject::halfExtents() const {
    switch (mesh) {
        case MeshType::Plane:
            return {0.5f * transform.scale.x, 0.02f * std::max(0.1f, transform.scale.y), 0.5f * transform.scale.z};
        case MeshType::Pyramid:
            return {0.5f * transform.scale.x, 0.5f * transform.scale.y, 0.5f * transform.scale.z};
        case MeshType::Sphere:
            return {0.5f * transform.scale.x, 0.5f * transform.scale.y, 0.5f * transform.scale.z};
        case MeshType::Cube:
        default:
            return {0.5f * transform.scale.x, 0.5f * transform.scale.y, 0.5f * transform.scale.z};
    }
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

Json Scene::toJson() const {
    Json root = Json::object();
    Json cam = Json::object();
    cam["position"] = vecToJson(camera.position);
    cam["target"] = vecToJson(camera.target);
    cam["fov"] = camera.fov;
    root["camera"] = cam;
    root["gravity"] = gravity;
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
    }
    scene.gravity = json["gravity"].asFloat(scene.gravity);
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
            scene.objects.push_back(object);
        }
    }
    return scene;
}

Scene Scene::makeDefault() {
    Scene scene;

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

    return scene;
}

}  // namespace blok
