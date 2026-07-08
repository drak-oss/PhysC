#include "ShapeManager.h"
#include "BodyManager.h"
#include <algorithm>

namespace physics {

    void Shape::computeMassProperties() {
        if (density <= 0.0f) {
            mass = 0.0f;
            localInertia = 0.0f;
            localCenterOfMass = {0.0f, 0.0f};
            return;
        }

        if (type == ShapeType::Circle) {
            mass = density * 3.14159265f * circle.radius * circle.radius;
            localCenterOfMass = circle.offset;
            
            localInertia = 0.5f * mass * circle.radius * circle.radius;
            localInertia += mass * localCenterOfMass.lengthSq();
        } else if (type == ShapeType::Polygon) {
            
            Vec2 centroid{0.0f, 0.0f};
            float area = 0.0f;
            float inertiaInt = 0.0f;
            
            for (int i = 0; i < polygon.vertexCount; ++i) {
                Vec2 p1 = polygon.vertices[i];
                Vec2 p2 = polygon.vertices[(i + 1) % polygon.vertexCount];
                
                float d = p1.cross(p2);
                float triangleArea = 0.5f * d;
                
                area += triangleArea;
                centroid += (p1 + p2) * (triangleArea / 3.0f);
                
                float intx2 = p1.x * p1.x + p1.x * p2.x + p2.x * p2.x;
                float inty2 = p1.y * p1.y + p1.y * p2.y + p2.y * p2.y;
                inertiaInt += (0.25f / 3.0f) * d * (intx2 + inty2);
            }
            
            if (area > 0.0f) {
                localCenterOfMass = centroid / area;
            } else {
                localCenterOfMass = {0.0f, 0.0f};
            }
            
            mass = density * area;
            localInertia = density * inertiaInt;
        }
    }

    void Shape::computeAABB(const Vec2& bodyPos, float bodyRot) {
        float cosA = std::cos(bodyRot);
        float sinA = std::sin(bodyRot);
        
        auto transform = [&](const Vec2& v) -> Vec2 {
            float x = cosA * v.x - sinA * v.y;
            float y = sinA * v.x + cosA * v.y;
            return {bodyPos.x + x, bodyPos.y + y};
        };

        if (type == ShapeType::Circle) {
            Vec2 center = transform(circle.offset);
            aabbMin = {center.x - circle.radius, center.y - circle.radius};
            aabbMax = {center.x + circle.radius, center.y + circle.radius};
        } else if (type == ShapeType::Polygon) {
            Vec2 v0 = transform(polygon.vertices[0]);
            aabbMin = v0;
            aabbMax = v0;
            for (int i = 1; i < polygon.vertexCount; ++i) {
                Vec2 v = transform(polygon.vertices[i]);
                aabbMin.x = std::min(aabbMin.x, v.x);
                aabbMin.y = std::min(aabbMin.y, v.y);
                aabbMax.x = std::max(aabbMax.x, v.x);
                aabbMax.y = std::max(aabbMax.y, v.y);
            }
        }
    }

    Handle<Shape> ShapeManager::createShape(const CircleDef& def) {
        Shape shape;
        shape.type = ShapeType::Circle;
        shape.density = def.density;
        shape.friction = def.friction;
        shape.restitution = def.restitution;
        shape.categoryBits = def.categoryBits;
        shape.maskBits = def.maskBits;
        
        shape.circle.radius = def.radius;
        shape.circle.offset = def.offset;
        
        shape.computeMassProperties();
        return shapePool.insert(shape);
    }

    Handle<Shape> ShapeManager::createShape(const BoxDef& def) {
        Shape shape;
        shape.type = ShapeType::Polygon;
        shape.density = def.density;
        shape.friction = def.friction;
        shape.restitution = def.restitution;
        shape.categoryBits = def.categoryBits;
        shape.maskBits = def.maskBits;
        
        shape.polygon.vertexCount = 4;
        float hx = def.width / 2.0f;
        float hy = def.height / 2.0f;
        shape.polygon.vertices[0] = {def.offset.x - hx, def.offset.y - hy};
        shape.polygon.vertices[1] = {def.offset.x + hx, def.offset.y - hy};
        shape.polygon.vertices[2] = {def.offset.x + hx, def.offset.y + hy};
        shape.polygon.vertices[3] = {def.offset.x - hx, def.offset.y + hy};
        
        shape.polygon.normals[0] = {0.0f, -1.0f};
        shape.polygon.normals[1] = {1.0f, 0.0f};
        shape.polygon.normals[2] = {0.0f, 1.0f};
        shape.polygon.normals[3] = {-1.0f, 0.0f};
        
        shape.computeMassProperties();
        return shapePool.insert(shape);
    }

    void ShapeManager::destroyShape(Handle<Shape> handle) {
        
        shapePool.remove(handle);
    }

    Shape* ShapeManager::getShape(Handle<Shape> handle) {
        return shapePool.get(handle);
    }

    const Shape* ShapeManager::getShape(Handle<Shape> handle) const {
        return shapePool.get(handle);
    }

    void ShapeManager::attachToBody(Handle<Shape> shapeHandle, Handle<Body> bodyHandle, BodyManager& bodyManager) {
        Shape* shape = getShape(shapeHandle);
        Body* body = bodyManager.getBody(bodyHandle);
        if (!shape || !body) return;

        
        shape->bodyId = bodyHandle;
        shape->nextShape = body->shapeList;
        body->shapeList = shapeHandle;

        
        float totalMass = 0.0f;
        float totalInertia = 0.0f;
        Vec2 centerOfMass = {0.0f, 0.0f};

        Handle<Shape> currHandle = body->shapeList;
        while (currHandle.isValid()) {
            Shape* s = getShape(currHandle);
            totalMass += s->mass;
            centerOfMass += s->localCenterOfMass * s->mass;
            totalInertia += s->localInertia;
            currHandle = s->nextShape;
        }

        if (totalMass > 0.0f) {
            centerOfMass = centerOfMass / totalMass;
            
            
            
        }

        body->setMassData(totalMass, totalInertia);
        
        
        body->setAwake(true);
    }

    void ShapeManager::updateAABBs(const BodyManager& bodyManager) {
        shapePool.forEach([&](Handle<Shape> h, Shape& s) {
            if (s.bodyId.isValid()) {
                const Body* b = bodyManager.getBody(s.bodyId);
                if (b) {
                    s.computeAABB(b->position, b->rotation);
                }
            }
        });
    }
}
