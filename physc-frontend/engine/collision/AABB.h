#pragma once
#include "../core/Math.h"
#include <algorithm>

namespace physics {

struct AABB {
    Vec2 min;
    Vec2 max;

    AABB() : min(1e5f, 1e5f), max(-1e5f, -1e5f) {}
    AABB(const Vec2& min, const Vec2& max) : min(min), max(max) {}

    bool isValid() const {
        return max.x >= min.x && max.y >= min.y;
    }

    Vec2 getCenter() const {
        return (min + max) * 0.5f;
    }

    Vec2 getExtents() const {
        return (max - min) * 0.5f;
    }

    float getPerimeter() const {
        float wx = max.x - min.x;
        float wy = max.y - min.y;
        return 2.0f * (wx + wy);
    }

    float getArea() const {
        float wx = max.x - min.x;
        float wy = max.y - min.y;
        return wx * wy;
    }

    void combine(const AABB& other) {
        min.x = std::min(min.x, other.min.x);
        min.y = std::min(min.y, other.min.y);
        max.x = std::max(max.x, other.max.x);
        max.y = std::max(max.y, other.max.y);
    }

    static AABB combine(const AABB& a, const AABB& b) {
        AABB c;
        c.min.x = std::min(a.min.x, b.min.x);
        c.min.y = std::min(a.min.y, b.min.y);
        c.max.x = std::max(a.max.x, b.max.x);
        c.max.y = std::max(a.max.y, b.max.y);
        return c;
    }

    bool contains(const AABB& other) const {
        bool result = true;
        result = result && min.x <= other.min.x;
        result = result && min.y <= other.min.y;
        result = result && other.max.x <= max.x;
        result = result && other.max.y <= max.y;
        return result;
    }

    bool overlaps(const AABB& other) const {
        if (max.x < other.min.x || min.x > other.max.x) return false;
        if (max.y < other.min.y || min.y > other.max.y) return false;
        return true;
    }
};

}
