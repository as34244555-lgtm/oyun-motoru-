#pragma once

#include "blokmotor/scene.hpp"

#include <cstdint>
#include <string>
#include <vector>

namespace blok {

struct Image {
    int width = 0;
    int height = 0;
    std::vector<std::uint8_t> rgb;

    std::string toBmp() const;
};

class SoftwareRenderer {
public:
    SoftwareRenderer(int width = 640, int height = 360);

    Image render(const Scene& scene) const;
    void setSize(int width, int height);

    int width() const { return width_; }
    int height() const { return height_; }

private:
    int width_;
    int height_;
};

}  // namespace blok
