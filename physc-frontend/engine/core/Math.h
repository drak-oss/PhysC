#pragma once
#include <cmath>

namespace physics {
    struct Vec2 {
        float x = 0.0f;
        float y = 0.0f;
        
        Vec2() = default;
        Vec2(float x, float y) : x(x), y(y) {}
        
        Vec2 operator+(const Vec2& rhs) const { return {x + rhs.x, y + rhs.y}; }
        Vec2 operator-(const Vec2& rhs) const { return {x - rhs.x, y - rhs.y}; }
        Vec2 operator*(float scalar) const { return {x * scalar, y * scalar}; }
        Vec2 operator/(float scalar) const { return {x / scalar, y / scalar}; }
        Vec2 operator-() const { return {-x, -y}; }
        
        Vec2& operator+=(const Vec2& rhs) { x += rhs.x; y += rhs.y; return *this; }
        Vec2& operator-=(const Vec2& rhs) { x -= rhs.x; y -= rhs.y; return *this; }
        
        float dot(const Vec2& rhs) const { return x * rhs.x + y * rhs.y; }
        float cross(const Vec2& rhs) const { return x * rhs.y - y * rhs.x; }
        float lengthSq() const { return x * x + y * y; }
        float length() const { return std::sqrt(lengthSq()); }
        
        void normalize() {
            float len = length();
            if (len > 1e-6f) {
                x /= len;
                y /= len;
            }
        }
        
        Vec2 normalized() const {
            Vec2 v = *this;
            v.normalize();
            return v;
        }

        static Vec2 rotate(const Vec2& v, float angle) {
            float c = std::cos(angle);
            float s = std::sin(angle);
            return {v.x * c - v.y * s, v.x * s + v.y * c};
        }
    };

    struct Mat22 {
        float m00 = 1.0f, m01 = 0.0f;
        float m10 = 0.0f, m11 = 1.0f;
        
        Mat22() = default;
        Mat22(float m00, float m01, float m10, float m11) : m00(m00), m01(m01), m10(m10), m11(m11) {}

        Vec2 operator*(const Vec2& v) const {
            return {m00 * v.x + m01 * v.y, m10 * v.x + m11 * v.y};
        }

        Mat22 inverse() const {
            float det = m00 * m11 - m01 * m10;
            if (det != 0.0f) {
                float invDet = 1.0f / det;
                return {m11 * invDet, -m01 * invDet, -m10 * invDet, m00 * invDet};
            }
            return {0.0f, 0.0f, 0.0f, 0.0f};
        }
    };
}
