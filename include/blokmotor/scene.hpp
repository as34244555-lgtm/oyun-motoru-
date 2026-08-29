#pragma once

#include "blokmotor/json.hpp"
#include "blokmotor/math.hpp"

#include <string>
#include <vector>

namespace blok {

enum class MeshType { Cube, Sphere, Plane, Pyramid, Sprite, Character, Capsule };

inline const char* meshTypeName(MeshType type) {
    switch (type) {
        case MeshType::Cube:
            return "cube";
        case MeshType::Sphere:
            return "sphere";
        case MeshType::Plane:
            return "plane";
        case MeshType::Pyramid:
            return "pyramid";
        case MeshType::Sprite:
            return "sprite";
        case MeshType::Character:
            return "character";
        case MeshType::Capsule:
            return "capsule";
    }
    return "cube";
}

inline MeshType meshTypeFromName(const std::string& name) {
    if (name == "sphere") return MeshType::Sphere;
    if (name == "plane") return MeshType::Plane;
    if (name == "pyramid") return MeshType::Pyramid;
    if (name == "sprite") return MeshType::Sprite;
    if (name == "character") return MeshType::Character;
    if (name == "capsule") return MeshType::Capsule;
    return MeshType::Cube;
}

struct Transform {
    Vec3 position{0, 0, 0};
    Vec3 rotation{0, 0, 0};
    Vec3 scale{1, 1, 1};
};

struct Costume {
    std::string name;
    std::string image;
};

struct GameObject {
    std::string id;
    std::string name;
    MeshType mesh = MeshType::Cube;
    Transform transform;
    Color color{0.90f, 0.32f, 0.22f};
    Vec3 velocity{0, 0, 0};
    bool visible = true;
    bool dynamic = true;
    bool grounded = false;
    std::string catalogId;
    std::vector<Costume> costumes;
    int costumeIndex = 0;
    float opacity = 1;
    float size = 100;
    int layer = 0;
    std::string sayText;
    float sayTime = 0;
    bool animating = false;
    float animTimer = 0;
    float animFps = 6;
    bool isClone = false;
    std::string cloneOf;
    bool penDown = false;
    Color penColor{0.1f, 0.2f, 0.9f};
    float penSize = 3;

    Vec3 halfExtents() const;
    void nextCostume();
    void setCostume(int index);
};

struct Camera {
    Vec3 position{6.2f, 4.2f, 6.6f};
    Vec3 target{0.2f, 0.5f, 0.0f};
    float fov = 50.0f;
    float yaw = 45.0f;
    float pitch = 28.0f;
    float distance = 9.2f;
    std::string follow;
    void refreshOrbit();
};

const char* characterKindOf(const std::string& catalogId);

class Scene {
public:
    std::vector<GameObject> objects;
    Camera camera;
    Vec3 lightDir{-0.35f, -1.0f, -0.45f};
    Color ambient{0.16f, 0.17f, 0.22f};
    float gravity = -20.0f;
    std::string backdropId = "cayir";
    float timer = 0;
    std::string lastBroadcast;
    std::vector<std::string> pendingBroadcasts;
    std::vector<std::string> pendingClones;
    std::string lastSound;
    float volume = 80;
    Color sky{0.07f, 0.09f, 0.14f};

    GameObject* find(const std::string& id);
    const GameObject* find(const std::string& id) const;
    GameObject* findByName(const std::string& name);

    GameObject& add(const GameObject& object);
    bool remove(const std::string& id);
    void clear();
    void applyBackdrop(const std::string& id);

    Json toJson() const;
    static Scene fromJson(const Json& json);
    static Scene makeDefault();
};

Color catalogColor(const std::string& catalogId);

}  // namespace blok
