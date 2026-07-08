#pragma once
#include "../core/Math.h"
#include "../core/Handle.h"
#include "../core/Pool.h"

namespace physics {

    class BodyManager;
    struct Body;

    enum class ShapeType {
        Circle,
        Polygon
    };

    struct CircleData {
        float radius;
        Vec2 offset;
    };

    struct PolygonData {
        static constexpr int MAX_VERTICES = 8;
        Vec2 vertices[MAX_VERTICES];
        Vec2 normals[MAX_VERTICES];
        int vertexCount;
    };

    struct ShapeDef {
        ShapeType type;
        float density = 1.0f;
        float friction = 0.2f;
        float restitution = 0.0f;
        uint16_t categoryBits = 0x0001;
        uint16_t maskBits = 0xFFFF;
        bool isSensor = false;
        
        ShapeDef(ShapeType t) : type(t) {}
    };

    struct CircleDef : public ShapeDef {
        float radius = 1.0f;
        Vec2 offset{0.0f, 0.0f};
        
        CircleDef() : ShapeDef(ShapeType::Circle) {}
    };

    struct BoxDef : public ShapeDef {
        float width = 1.0f;
        float height = 1.0f;
        Vec2 offset{0.0f, 0.0f};
        
        BoxDef() : ShapeDef(ShapeType::Polygon) {}
    };

    struct Shape {
        ShapeType type;
        Handle<Body> bodyId; 
        Handle<Shape> nextShape; 
        
        float density;
        float friction;
        float restitution;
        
        float mass;
        float localInertia;
        Vec2 localCenterOfMass;

        
        Vec2 aabbMin;
        Vec2 aabbMax;
        
        int proxyId = -1; 

        uint16_t categoryBits = 0x0001;
        uint16_t maskBits = 0xFFFF;

        union {
            CircleData circle;
            PolygonData polygon;
        };
        
        Shape() {
            type = ShapeType::Circle; 
        }

        void computeMassProperties();
        void computeAABB(const Vec2& bodyPos, float bodyRot);
    };

    class ShapeManager {
        Pool<Shape> shapePool;
    public:
        void clear() { shapePool.clear(); }

        Handle<Shape> createShape(const CircleDef& def);
        Handle<Shape> createShape(const BoxDef& def);
        void destroyShape(Handle<Shape> handle);

        Shape* getShape(Handle<Shape> handle);
        const Shape* getShape(Handle<Shape> handle) const;
        
        size_t capacity() const { return shapePool.capacity(); }
        uint32_t getGeneration(uint32_t index) const { return shapePool.getGeneration(index); }

    public:
        void attachToBody(Handle<Shape> shapeHandle, Handle<Body> bodyHandle, BodyManager& bodyManager);
        
        
        void updateAABBs(const BodyManager& bodyManager);

        template<typename Func>
        void forEach(Func&& func) {
            shapePool.forEach(func);
        }

        template<typename Func>
        void forEach(Func&& func) const {
            
            const_cast<Pool<Shape>&>(shapePool).forEach(func);
        }
    };
}
