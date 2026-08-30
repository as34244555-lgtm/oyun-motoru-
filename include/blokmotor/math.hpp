#pragma once

#include <algorithm>
#include <cmath>
#include <string>

namespace blok {

constexpr float kPi = 3.14159265358979323846f;

inline float radians(float degrees) { return degrees * (kPi / 180.0f); }
inline float degrees(float radians) { return radians * (180.0f / kPi); }
inline float clampf(float v, float lo, float hi) { return std::max(lo, std::min(hi, v)); }

struct Vec3 {
    float x = 0;
    float y = 0;
    float z = 0;

    Vec3() = default;
    Vec3(float x_, float y_, float z_) : x(x_), y(y_), z(z_) {}

    Vec3 operator+(const Vec3& o) const { return {x + o.x, y + o.y, z + o.z}; }
    Vec3 operator-(const Vec3& o) const { return {x - o.x, y - o.y, z - o.z}; }
    Vec3 operator*(float s) const { return {x * s, y * s, z * s}; }
    Vec3 operator/(float s) const { return {x / s, y / s, z / s}; }
    Vec3 operator-() const { return {-x, -y, -z}; }
    Vec3& operator+=(const Vec3& o) {
        x += o.x;
        y += o.y;
        z += o.z;
        return *this;
    }
    Vec3& operator*=(float s) {
        x *= s;
        y *= s;
        z *= s;
        return *this;
    }

    float dot(const Vec3& o) const { return x * o.x + y * o.y + z * o.z; }
    Vec3 cross(const Vec3& o) const {
        return {y * o.z - z * o.y, z * o.x - x * o.z, x * o.y - y * o.x};
    }
    float lengthSq() const { return dot(*this); }
    float length() const { return std::sqrt(lengthSq()); }
    Vec3 normalized() const {
        const float len = length();
        return len > 1e-8f ? (*this) / len : Vec3{};
    }
};

inline Vec3 operator*(float s, const Vec3& v) { return v * s; }

struct Vec4 {
    float x = 0;
    float y = 0;
    float z = 0;
    float w = 0;
};

struct Color {
    float r = 1;
    float g = 1;
    float b = 1;

    static Color fromHex(const std::string& hex);
    std::string toHex() const;
};

struct Mat4 {
    float m[16]{};

    static Mat4 identity() {
        Mat4 r;
        r.m[0] = r.m[5] = r.m[10] = r.m[15] = 1;
        return r;
    }

    static Mat4 translation(const Vec3& t) {
        Mat4 r = identity();
        r.m[12] = t.x;
        r.m[13] = t.y;
        r.m[14] = t.z;
        return r;
    }

    static Mat4 scale(const Vec3& s) {
        Mat4 r;
        r.m[0] = s.x;
        r.m[5] = s.y;
        r.m[10] = s.z;
        r.m[15] = 1;
        return r;
    }

    static Mat4 rotationX(float deg) {
        const float a = radians(deg);
        const float c = std::cos(a);
        const float s = std::sin(a);
        Mat4 r = identity();
        r.m[5] = c;
        r.m[6] = s;
        r.m[9] = -s;
        r.m[10] = c;
        return r;
    }

    static Mat4 rotationY(float deg) {
        const float a = radians(deg);
        const float c = std::cos(a);
        const float s = std::sin(a);
        Mat4 r = identity();
        r.m[0] = c;
        r.m[2] = -s;
        r.m[8] = s;
        r.m[10] = c;
        return r;
    }

    static Mat4 rotationZ(float deg) {
        const float a = radians(deg);
        const float c = std::cos(a);
        const float s = std::sin(a);
        Mat4 r = identity();
        r.m[0] = c;
        r.m[1] = s;
        r.m[4] = -s;
        r.m[5] = c;
        return r;
    }

    static Mat4 rotationEuler(const Vec3& deg) {
        return rotationY(deg.y) * rotationX(deg.x) * rotationZ(deg.z);
    }

    static Mat4 perspective(float fovDeg, float aspect, float nearPlane, float farPlane) {
        Mat4 r;
        const float f = 1.0f / std::tan(radians(fovDeg) * 0.5f);
        r.m[0] = f / aspect;
        r.m[5] = f;
        r.m[10] = (farPlane + nearPlane) / (nearPlane - farPlane);
        r.m[11] = -1;
        r.m[14] = (2 * farPlane * nearPlane) / (nearPlane - farPlane);
        return r;
    }

    static Mat4 lookAt(const Vec3& eye, const Vec3& target, const Vec3& up) {
        const Vec3 f = (target - eye).normalized();
        const Vec3 s = f.cross(up).normalized();
        const Vec3 u = s.cross(f);
        Mat4 r = identity();
        r.m[0] = s.x;
        r.m[4] = s.y;
        r.m[8] = s.z;
        r.m[1] = u.x;
        r.m[5] = u.y;
        r.m[9] = u.z;
        r.m[2] = -f.x;
        r.m[6] = -f.y;
        r.m[10] = -f.z;
        r.m[12] = -s.dot(eye);
        r.m[13] = -u.dot(eye);
        r.m[14] = f.dot(eye);
        return r;
    }

    Mat4 operator*(const Mat4& o) const {
        Mat4 r;
        for (int col = 0; col < 4; ++col) {
            for (int row = 0; row < 4; ++row) {
                r.m[col * 4 + row] = m[0 * 4 + row] * o.m[col * 4 + 0] + m[1 * 4 + row] * o.m[col * 4 + 1] +
                                     m[2 * 4 + row] * o.m[col * 4 + 2] + m[3 * 4 + row] * o.m[col * 4 + 3];
            }
        }
        return r;
    }

    Vec4 mulVec4(const Vec4& v) const {
        return {m[0] * v.x + m[4] * v.y + m[8] * v.z + m[12] * v.w,
                m[1] * v.x + m[5] * v.y + m[9] * v.z + m[13] * v.w,
                m[2] * v.x + m[6] * v.y + m[10] * v.z + m[14] * v.w,
                m[3] * v.x + m[7] * v.y + m[11] * v.z + m[15] * v.w};
    }

    Vec3 transformPoint(const Vec3& p) const {
        const Vec4 r = mulVec4({p.x, p.y, p.z, 1});
        return {r.x, r.y, r.z};
    }

    Vec3 transformDirection(const Vec3& d) const {
        const Vec4 r = mulVec4({d.x, d.y, d.z, 0});
        return {r.x, r.y, r.z};
    }
};

}  // namespace blok
