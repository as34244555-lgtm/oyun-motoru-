#pragma once

#include "blokmotor/scene.hpp"

namespace blok {

class Physics {
public:
    void step(Scene& scene, float dt) const;
};

}  // namespace blok
