#include "BodyManager.h"

namespace physics {

    void Body::addForce(const Vec2& force) {
        if (type != BodyType::Dynamic) return;
        forceAccumulator += force;
        setAwake(true);
    }

    void Body::addForceAtPoint(const Vec2& force, const Vec2& point) {
        if (type != BodyType::Dynamic) return;
        forceAccumulator += force;
        Vec2 r = point - position;
        torqueAccumulator += r.cross(force);
        setAwake(true);
    }

    void Body::addTorque(float torque) {
        if (type != BodyType::Dynamic) return;
        torqueAccumulator += torque;
        setAwake(true);
    }

    void Body::addLinearImpulse(const Vec2& impulse) {
        if (type != BodyType::Dynamic) return;
        linearVelocity += impulse * invMass;
        setAwake(true);
    }

    void Body::addAngularImpulse(float impulse) {
        if (type != BodyType::Dynamic) return;
        angularVelocity += impulse * invInertia;
        setAwake(true);
    }

    void Body::setMassData(float newMass, float newInertia) {
        if (type == BodyType::Static || type == BodyType::Kinematic) {
            mass = 0.0f;
            invMass = 0.0f;
            inertia = 0.0f;
            invInertia = 0.0f;
            return;
        }

        mass = newMass;
        invMass = (newMass > 0.0f) ? (1.0f / newMass) : 0.0f;

        inertia = newInertia;
        invInertia = (newInertia > 0.0f) ? (1.0f / newInertia) : 0.0f;
    }

    void Body::setType(BodyType newType) {
        type = newType;
        if (type != BodyType::Dynamic) {
            linearVelocity = {0.0f, 0.0f};
            angularVelocity = 0.0f;
            forceAccumulator = {0.0f, 0.0f};
            torqueAccumulator = 0.0f;
        }
        setMassData(mass, inertia); 
        setAwake(true);
    }

    void Body::setAwake(bool flag) {
        if (type == BodyType::Static) return;
        
        if (flag) {
            isAwake = true;
            sleepTimer = 0.0f;
        } else {
            isAwake = false;
            sleepTimer = 0.0f;
            linearVelocity = {0.0f, 0.0f};
            angularVelocity = 0.0f;
            forceAccumulator = {0.0f, 0.0f};
            torqueAccumulator = 0.0f;
        }
    }

    Handle<Body> BodyManager::createBody(const BodyDef& def) {
        Body body;
        body.position = def.position;
        body.rotation = def.rotation;
        body.linearVelocity = def.linearVelocity;
        body.angularVelocity = def.angularVelocity;
        body.linearDamping = def.linearDamping;
        body.angularDamping = def.angularDamping;
        body.type = def.type;
        body.allowSleep = def.allowSleep;
        body.isAwake = def.isAwake;
        
        body.setMassData(0.0f, 0.0f); 
        
        return bodyPool.insert(body);
    }

    void BodyManager::destroyBody(Handle<Body> handle) {
        
        bodyPool.remove(handle);
    }

    Body* BodyManager::getBody(Handle<Body> handle) {
        return bodyPool.get(handle);
    }
    
    const Body* BodyManager::getBody(Handle<Body> handle) const {
        return bodyPool.get(handle);
    }

    void BodyManager::clearForces() {
        bodyPool.forEach([](Handle<Body> h, Body& b) {
            b.forceAccumulator = {0.0f, 0.0f};
            b.torqueAccumulator = 0.0f;
        });
    }

}
