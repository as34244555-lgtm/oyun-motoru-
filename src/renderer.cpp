#include "blokmotor/renderer.hpp"

#include <algorithm>
#include <cmath>
#include <cstdint>
#include <cstring>
#include <vector>

namespace blok {
namespace {

struct Vertex {
    Vec3 p;
    Vec3 n;
};

struct Triangle {
    Vertex v[3];
};

void addTri(std::vector<Triangle>& out, const Vec3& a, const Vec3& b, const Vec3& c, const Vec3& n) {
    Triangle t;
    t.v[0] = {a, n};
    t.v[1] = {b, n};
    t.v[2] = {c, n};
    out.push_back(t);
}

void addQuad(std::vector<Triangle>& out, const Vec3& a, const Vec3& b, const Vec3& c, const Vec3& d, const Vec3& n) {
    addTri(out, a, b, c, n);
    addTri(out, a, c, d, n);
}

std::vector<Triangle> makeCube() {
    std::vector<Triangle> t;
    addQuad(t, {-0.5f, -0.5f, 0.5f}, {0.5f, -0.5f, 0.5f}, {0.5f, 0.5f, 0.5f}, {-0.5f, 0.5f, 0.5f}, {0, 0, 1});
    addQuad(t, {0.5f, -0.5f, -0.5f}, {-0.5f, -0.5f, -0.5f}, {-0.5f, 0.5f, -0.5f}, {0.5f, 0.5f, -0.5f}, {0, 0, -1});
    addQuad(t, {-0.5f, -0.5f, -0.5f}, {-0.5f, -0.5f, 0.5f}, {-0.5f, 0.5f, 0.5f}, {-0.5f, 0.5f, -0.5f}, {-1, 0, 0});
    addQuad(t, {0.5f, -0.5f, 0.5f}, {0.5f, -0.5f, -0.5f}, {0.5f, 0.5f, -0.5f}, {0.5f, 0.5f, 0.5f}, {1, 0, 0});
    addQuad(t, {-0.5f, 0.5f, 0.5f}, {0.5f, 0.5f, 0.5f}, {0.5f, 0.5f, -0.5f}, {-0.5f, 0.5f, -0.5f}, {0, 1, 0});
    addQuad(t, {-0.5f, -0.5f, -0.5f}, {0.5f, -0.5f, -0.5f}, {0.5f, -0.5f, 0.5f}, {-0.5f, -0.5f, 0.5f}, {0, -1, 0});
    return t;
}

std::vector<Triangle> makePlane() {
    std::vector<Triangle> t;
    addQuad(t, {-0.5f, 0, 0.5f}, {0.5f, 0, 0.5f}, {0.5f, 0, -0.5f}, {-0.5f, 0, -0.5f}, {0, 1, 0});
    return t;
}

std::vector<Triangle> makePyramid() {
    std::vector<Triangle> t;
    const Vec3 apex{0, 0.5f, 0};
    const Vec3 bl{-0.5f, -0.5f, 0.5f};
    const Vec3 br{0.5f, -0.5f, 0.5f};
    const Vec3 tr{0.5f, -0.5f, -0.5f};
    const Vec3 tl{-0.5f, -0.5f, -0.5f};
    addQuad(t, bl, br, tr, tl, {0, -1, 0});
    auto face = [&](const Vec3& a, const Vec3& b) {
        const Vec3 n = (b - a).cross(apex - a).normalized();
        addTri(t, a, b, apex, n);
    };
    face(bl, br);
    face(br, tr);
    face(tr, tl);
    face(tl, bl);
    return t;
}

std::vector<Triangle> makeSphere() {
    std::vector<Triangle> t;
    const int stacks = 10;
    const int slices = 16;
    auto point = [&](int i, int j) {
        const float v = static_cast<float>(i) / stacks;
        const float u = static_cast<float>(j) / slices;
        const float theta = v * kPi;
        const float phi = u * kPi * 2;
        const Vec3 p{0.5f * std::sin(theta) * std::cos(phi), 0.5f * std::cos(theta),
                     0.5f * std::sin(theta) * std::sin(phi)};
        return p;
    };
    for (int i = 0; i < stacks; ++i) {
        for (int j = 0; j < slices; ++j) {
            const Vec3 a = point(i, j);
            const Vec3 b = point(i + 1, j);
            const Vec3 c = point(i + 1, j + 1);
            const Vec3 d = point(i, j + 1);
            if (i != 0) addTri(t, a, b, d, a.normalized());
            if (i != stacks - 1) addTri(t, d, b, c, c.normalized());
        }
    }
    return t;
}

const std::vector<Triangle>& meshOf(MeshType type) {
    static const auto cube = makeCube();
    static const auto sphere = makeSphere();
    static const auto plane = makePlane();
    static const auto pyramid = makePyramid();
    switch (type) {
        case MeshType::Sphere:
            return sphere;
        case MeshType::Plane:
            return plane;
        case MeshType::Pyramid:
            return pyramid;
        case MeshType::Cube:
        default:
            return cube;
    }
}

struct ScreenVert {
    float x = 0;
    float y = 0;
    float z = 0;
    Vec3 n;
};

bool project(const Mat4& mvp, const Vertex& v, int width, int height, ScreenVert& out) {
    const Vec4 clip = mvp.mulVec4({v.p.x, v.p.y, v.p.z, 1});
    if (clip.w <= 0.08f) return false;
    const float inv = 1.0f / clip.w;
    const float ndcX = clip.x * inv;
    const float ndcY = clip.y * inv;
    const float ndcZ = clip.z * inv;
    out.x = (ndcX * 0.5f + 0.5f) * static_cast<float>(width);
    out.y = (1.0f - (ndcY * 0.5f + 0.5f)) * static_cast<float>(height);
    out.z = ndcZ;
    out.n = v.n;
    return true;
}

float edge(const ScreenVert& a, const ScreenVert& b, const ScreenVert& c) {
    return (c.x - a.x) * (b.y - a.y) - (c.y - a.y) * (b.x - a.x);
}

}  // namespace

SoftwareRenderer::SoftwareRenderer(int width, int height) : width_(width), height_(height) {}

void SoftwareRenderer::setSize(int width, int height) {
    width_ = std::max(16, width);
    height_ = std::max(16, height);
}

Image SoftwareRenderer::render(const Scene& scene) const {
    Image image;
    image.width = width_;
    image.height = height_;
    image.rgb.assign(static_cast<size_t>(width_ * height_ * 3), 0);
    std::vector<float> zbuf(static_cast<size_t>(width_ * height_), 2.0f);

    for (int y = 0; y < height_; ++y) {
        const float t = static_cast<float>(y) / static_cast<float>(height_ - 1);
        const std::uint8_t r = static_cast<std::uint8_t>(18 + (38 - 18) * t);
        const std::uint8_t g = static_cast<std::uint8_t>(20 + (48 - 20) * t);
        const std::uint8_t b = static_cast<std::uint8_t>(28 + (62 - 28) * t);
        for (int x = 0; x < width_; ++x) {
            const size_t i = static_cast<size_t>((y * width_ + x) * 3);
            image.rgb[i] = r;
            image.rgb[i + 1] = g;
            image.rgb[i + 2] = b;
        }
    }

    const float aspect = static_cast<float>(width_) / static_cast<float>(height_);
    const Mat4 proj = Mat4::perspective(scene.camera.fov, aspect, 0.1f, 80.0f);
    const Mat4 view = Mat4::lookAt(scene.camera.position, scene.camera.target, {0, 1, 0});
    const Mat4 vp = proj * view;
    const Vec3 light = scene.lightDir.normalized();

    for (const auto& object : scene.objects) {
        if (!object.visible) continue;
        const Mat4 model = Mat4::translation(object.transform.position) *
                           Mat4::rotationEuler(object.transform.rotation) * Mat4::scale(object.transform.scale);
        const Mat4 mvp = vp * model;
        for (const auto& tri : meshOf(object.mesh)) {
            ScreenVert sv[3];
            bool ok = true;
            Vertex world[3];
            for (int i = 0; i < 3; ++i) {
                world[i].p = model.transformPoint(tri.v[i].p);
                world[i].n = model.transformDirection(tri.v[i].n).normalized();
                if (world[i].n.lengthSq() < 1e-8f) world[i].n = tri.v[i].n;
                if (!project(mvp, world[i], width_, height_, sv[i])) ok = false;
            }
            if (!ok) continue;

            const float area = edge(sv[0], sv[1], sv[2]);
            if (area >= 0) continue;

            int minX = static_cast<int>(std::floor(std::min({sv[0].x, sv[1].x, sv[2].x})));
            int maxX = static_cast<int>(std::ceil(std::max({sv[0].x, sv[1].x, sv[2].x})));
            int minY = static_cast<int>(std::floor(std::min({sv[0].y, sv[1].y, sv[2].y})));
            int maxY = static_cast<int>(std::ceil(std::max({sv[0].y, sv[1].y, sv[2].y})));
            minX = std::max(minX, 0);
            minY = std::max(minY, 0);
            maxX = std::min(maxX, width_ - 1);
            maxY = std::min(maxY, height_ - 1);

            const Vec3 n = (world[1].p - world[0].p).cross(world[2].p - world[0].p).normalized();
            const float ndot = std::max(0.12f, -n.dot(light));
            const float shade = clampf(scene.ambient.r + 0.22f + ndot * 0.9f, 0.0f, 1.25f);
            const std::uint8_t cr = static_cast<std::uint8_t>(clampf(object.color.r * shade, 0, 1) * 255);
            const std::uint8_t cg = static_cast<std::uint8_t>(clampf(object.color.g * shade, 0, 1) * 255);
            const std::uint8_t cb = static_cast<std::uint8_t>(clampf(object.color.b * shade, 0, 1) * 255);

            for (int y = minY; y <= maxY; ++y) {
                for (int x = minX; x <= maxX; ++x) {
                    ScreenVert p{static_cast<float>(x) + 0.5f, static_cast<float>(y) + 0.5f, 0, {}};
                    const float w0 = edge(sv[1], sv[2], p);
                    const float w1 = edge(sv[2], sv[0], p);
                    const float w2 = edge(sv[0], sv[1], p);
                    if (w0 > 0 || w1 > 0 || w2 > 0) continue;
                    const float inv = 1.0f / area;
                    const float z = (w0 * sv[0].z + w1 * sv[1].z + w2 * sv[2].z) * inv;
                    const size_t idx = static_cast<size_t>(y * width_ + x);
                    if (z >= zbuf[idx]) continue;
                    zbuf[idx] = z;
                    image.rgb[idx * 3] = cr;
                    image.rgb[idx * 3 + 1] = cg;
                    image.rgb[idx * 3 + 2] = cb;
                }
            }
        }
    }
    return image;
}

std::string Image::toBmp() const {
    const int rowStride = ((width * 3 + 3) / 4) * 4;
    const int pixelBytes = rowStride * height;
    const int fileSize = 54 + pixelBytes;
    std::string out(static_cast<size_t>(fileSize), '\0');
    auto put16 = [&](int o, int v) {
        out[o] = static_cast<char>(v & 255);
        out[o + 1] = static_cast<char>((v >> 8) & 255);
    };
    auto put32 = [&](int o, int v) {
        out[o] = static_cast<char>(v & 255);
        out[o + 1] = static_cast<char>((v >> 8) & 255);
        out[o + 2] = static_cast<char>((v >> 16) & 255);
        out[o + 3] = static_cast<char>((v >> 24) & 255);
    };
    out[0] = 'B';
    out[1] = 'M';
    put32(2, fileSize);
    put32(10, 54);
    put32(14, 40);
    put32(18, width);
    put32(22, height);
    put16(26, 1);
    put16(28, 24);
    put32(34, pixelBytes);
    for (int y = 0; y < height; ++y) {
        const int srcY = height - 1 - y;
        for (int x = 0; x < width; ++x) {
            const size_t s = static_cast<size_t>((srcY * width + x) * 3);
            const size_t d = static_cast<size_t>(54 + y * rowStride + x * 3);
            out[d] = static_cast<char>(rgb[s + 2]);
            out[d + 1] = static_cast<char>(rgb[s + 1]);
            out[d + 2] = static_cast<char>(rgb[s]);
        }
    }
    return out;
}

}  // namespace blok
