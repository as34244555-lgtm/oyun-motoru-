#pragma once

#include "blokmotor/json.hpp"
#include "blokmotor/math.hpp"

#include <string>
#include <vector>

namespace blok {

enum class MeshType { Cube, Sphere, Plane, Pyramid };

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
    }
    return "cube";
}

inline MeshType meshTypeFromName(const std::string& name) {
    if (name == "sphere") return MeshType::Sphere;
    if (name == "plane") return MeshType::Plane;
    if (name == "pyramid") return MeshType::Pyramid;
    return MeshType::Cube;
}

struct Transform {
    Vec3 position{0, 0, 0};
    Vec3 rotation{0, 0, 0};
    Vec3 scale{1, 1, 1};
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

    Vec3 halfExtents() const;
};

struct Camera {
    Vec3 position{5.4f, 3.6f, 5.8f};
    Vec3 target{0.2f, 0.45f, 0.0f};
    float fov = 50.0f;
};

class Scene {
public:
    std::vector<GameObject> objects;
    Camera camera;
    Vec3 lightDir{-0.35f, -1.0f, -0.45f};
    Color ambient{0.16f, 0.17f, 0.22f};
    float gravity = -20.0f;

    GameObject* find(const std::string& id);
    const GameObject* find(const std::string& id) const;
    GameObject* findByName(const std::string& name);

    GameObject& add(const GameObject& object);
    bool remove(const std::string& id);
    void clear();

    Json toJson() const;
    static Scene fromJson(const Json& json);
    static Scene makeDefault();
};

}  // namespace blok
