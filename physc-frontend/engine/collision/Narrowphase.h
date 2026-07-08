#pragma once
#include "../core/Math.h"
#include "../physics/ShapeManager.h"
#include "../physics/BodyManager.h"
#include <vector>

namespace physics {

struct ContactPoint {
    Vec2 localA;
    Vec2 localB;
    Vec2 position; 
    float depth;
    Vec2 normal;   
};

struct ContactManifold {
    Handle<Body> bodyA;
    Handle<Body> bodyB;
    Handle<Shape> shapeA;
    Handle<Shape> shapeB;
    
    std::vector<ContactPoint> contacts;
};

class Narrowphase {
public:
    static bool collide(const Body* bA, const Shape* sA, const Body* bB, const Shape* sB, ContactManifold& manifold);

private:
    static bool collideCircleCircle(const Body* bA, const Shape* sA, const Body* bB, const Shape* sB, ContactManifold& manifold);
    static bool collidePolygonPolygon(const Body* bA, const Shape* sA, const Body* bB, const Shape* sB, ContactManifold& manifold);
    static bool collideCirclePolygon(const Body* bA, const Shape* sA, const Body* bB, const Shape* sB, ContactManifold& manifold);
    static bool collidePolygonCircle(const Body* bA, const Shape* sA, const Body* bB, const Shape* sB, ContactManifold& manifold);
};

}
