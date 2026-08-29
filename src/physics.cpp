#include "blokmotor/physics.hpp"

#include <algorithm>
#include <cmath>

namespace blok {
namespace {

bool overlaps(const GameObject& a, const GameObject& b) {
    const Vec3 ah = a.halfExtents();
    const Vec3 bh = b.halfExtents();
    const Vec3 ap = a.transform.position;
    const Vec3 bp = b.transform.position;
    return std::fabs(ap.x - bp.x) < ah.x + bh.x && std::fabs(ap.y - bp.y) < ah.y + bh.y &&
           std::fabs(ap.z - bp.z) < ah.z + bh.z;
}

void separate(GameObject& a, GameObject& b) {
    const Vec3 ah = a.halfExtents();
    const Vec3 bh = b.halfExtents();
    const float ox = ah.x + bh.x - std::fabs(a.transform.position.x - b.transform.position.x);
    const float oy = ah.y + bh.y - std::fabs(a.transform.position.y - b.transform.position.y);
    const float oz = ah.z + bh.z - std::fabs(a.transform.position.z - b.transform.position.z);
    if (ox <= 0 || oy <= 0 || oz <= 0) return;

    if (ox < oy && ox < oz) {
        const float dir = a.transform.position.x >= b.transform.position.x ? 1.0f : -1.0f;
        if (a.dynamic && b.dynamic) {
            a.transform.position.x += dir * ox * 0.5f;
            b.transform.position.x -= dir * ox * 0.5f;
            std::swap(a.velocity.x, b.velocity.x);
        } else if (a.dynamic) {
            a.transform.position.x += dir * ox;
            a.velocity.x *= -0.3f;
        } else {
            b.transform.position.x -= dir * ox;
            b.velocity.x *= -0.3f;
        }
    } else if (oy < oz) {
        const float dir = a.transform.position.y >= b.transform.position.y ? 1.0f : -1.0f;
        if (a.dynamic && b.dynamic) {
            a.transform.position.y += dir * oy * 0.5f;
            b.transform.position.y -= dir * oy * 0.5f;
            std::swap(a.velocity.y, b.velocity.y);
        } else if (a.dynamic) {
            a.transform.position.y += dir * oy;
            if (dir > 0) {
                a.velocity.y = std::max(0.0f, a.velocity.y);
                a.grounded = true;
            } else {
                a.velocity.y = std::min(0.0f, a.velocity.y);
            }
        } else {
            b.transform.position.y -= dir * oy;
            if (dir < 0) {
                b.velocity.y = std::max(0.0f, b.velocity.y);
                b.grounded = true;
            }
        }
    } else {
        const float dir = a.transform.position.z >= b.transform.position.z ? 1.0f : -1.0f;
        if (a.dynamic && b.dynamic) {
            a.transform.position.z += dir * oz * 0.5f;
            b.transform.position.z -= dir * oz * 0.5f;
            std::swap(a.velocity.z, b.velocity.z);
        } else if (a.dynamic) {
            a.transform.position.z += dir * oz;
            a.velocity.z *= -0.3f;
        } else {
            b.transform.position.z -= dir * oz;
            b.velocity.z *= -0.3f;
        }
    }
}

}  // namespace

void Physics::step(Scene& scene, float dt) const {
    dt = clampf(dt, 0.0f, 0.05f);
    for (auto& object : scene.objects) {
        if (!object.dynamic) {
            object.grounded = true;
            continue;
        }
        object.grounded = false;
        object.velocity.y += scene.gravity * dt;
        object.transform.position += object.velocity * dt;

        const float floor = object.halfExtents().y;
        if (object.transform.position.y <= floor + 0.002f) {
            object.transform.position.y = floor;
            if (object.velocity.y < 0) object.velocity.y = 0;
            object.grounded = true;
            object.velocity.x *= 0.86f;
            object.velocity.z *= 0.86f;
            if (std::fabs(object.velocity.x) < 0.02f) object.velocity.x = 0;
            if (std::fabs(object.velocity.z) < 0.02f) object.velocity.z = 0;
        }
    }

    for (size_t i = 0; i < scene.objects.size(); ++i) {
        for (size_t j = i + 1; j < scene.objects.size(); ++j) {
            auto& a = scene.objects[i];
            auto& b = scene.objects[j];
            if (!a.dynamic && !b.dynamic) continue;
            if (overlaps(a, b)) separate(a, b);
        }
    }
}

}  // namespace blok
