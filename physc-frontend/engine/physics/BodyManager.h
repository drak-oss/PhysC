#pragma once
#include <vector>
#include "../core/Math.h"
#include "../core/Handle.h"
#include "../core/Pool.h"

namespace physics {
    struct Shape;

    enum class BodyType {
        Static,    
        Kinematic, 
        Dynamic    
    };

    struct BodyDef {
        Vec2 position{0.0f, 0.0f};
        float rotation = 0.0f;
        Vec2 linearVelocity{0.0f, 0.0f};
        float angularVelocity = 0.0f;
        float linearDamping = 0.0f;
        float angularDamping = 0.0f;
        BodyType type = BodyType::Dynamic;
        bool allowSleep = true;
        bool isAwake = true;
    };

    struct Body {
        Vec2 prevPosition;
        float prevRotation;

        Vec2 position;
        float rotation;
        
        Vec2 linearVelocity;
        float angularVelocity;
        
        Vec2 forceAccumulator{0.0f, 0.0f};
        float torqueAccumulator = 0.0f;

        float linearDamping;
        float angularDamping;

        float mass = 0.0f;
        float invMass = 0.0f;
        float inertia = 0.0f;
        float invInertia = 0.0f;

        BodyType type;
        
        
        bool allowSleep;
        bool isAwake;
        float sleepTimer = 0.0f;

        
        Handle<Shape> shapeList;

        
        void addForce(const Vec2& force);
        void addForceAtPoint(const Vec2& force, const Vec2& point);
        void addTorque(float torque);
        void addLinearImpulse(const Vec2& impulse);
        void addAngularImpulse(float impulse);
        
        Vec2 worldToLocal(const Vec2& worldPoint) const {
            return Vec2::rotate(worldPoint - position, -rotation);
        }
        
        Vec2 localToWorld(const Vec2& localPoint) const {
            return position + Vec2::rotate(localPoint, rotation);
        }
        
        void setMassData(float newMass, float newInertia);
        void setType(BodyType newType);
        void setAwake(bool flag);
    };

    class BodyManager {
        Pool<Body> bodyPool;
    public:
        void clear() { bodyPool.clear(); }
        Handle<Body> createBody(const BodyDef& def);
        void destroyBody(Handle<Body> handle);
        
        Body* getBody(Handle<Body> handle);
        const Body* getBody(Handle<Body> handle) const;
        
        void clearForces();
        
        template<typename Func>
        void forEach(Func&& func) {
            bodyPool.forEach(func);
        }

        uint32_t getGeneration(uint32_t index) const { return bodyPool.getGeneration(index); }
        size_t getBodyCount() const { return bodyPool.activeCount(); }
    };
}
