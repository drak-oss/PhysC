#pragma once
#include "BodyManager.h"
#include "ShapeManager.h"
#include "../solver/XPBDSolver.h"
#include "../collision/CollisionManager.h"
#include "../core/Math.h"

namespace physics {
    class World {
        BodyManager bodyManager;
        ShapeManager shapeManager;
        XPBDSolver solver;
        CollisionManager collisionManager;
        Vec2 gravity;

    public:
        World() : gravity(0.0f, 981.0f) {}

        BodyManager& getBodyManager() { return bodyManager; }
        ShapeManager& getShapeManager() { return shapeManager; }
        XPBDSolver& getSolver() { return solver; }
        CollisionManager& getCollisionManager() { return collisionManager; }

        void setGravity(Vec2 g) { gravity = g; }
        Vec2 getGravity() const { return gravity; }

        void clear() {
            bodyManager.clear();
            shapeManager.clear();
            solver.clear();
            collisionManager.clear();
        }

        void step(float dt, int subSteps = 10) {
            if (subSteps <= 0) return;
            float subDt = dt / subSteps;

            for (int step = 0; step < subSteps; ++step) {
                
                bodyManager.forEach([&](Handle<Body> h, Body& b) {
                    if (b.type == BodyType::Dynamic && b.isAwake) {
                        b.addForce(gravity * b.mass);
                        
                        b.linearVelocity += b.forceAccumulator * b.invMass * subDt;
                        b.angularVelocity += b.torqueAccumulator * b.invInertia * subDt;

                        b.prevPosition = b.position;
                        b.prevRotation = b.rotation;

                        b.position += b.linearVelocity * subDt;
                        b.rotation += b.angularVelocity * subDt;
                        
                        
                        b.forceAccumulator = {0.0f, 0.0f};
                        b.torqueAccumulator = 0.0f;
                    } else if (b.type == BodyType::Kinematic) {
                        b.prevPosition = b.position;
                        b.prevRotation = b.rotation;
                        b.position += b.linearVelocity * subDt;
                        b.rotation += b.angularVelocity * subDt;
                    }
                });

                
                collisionManager.updateBroadphase(bodyManager, shapeManager);
                collisionManager.generateContacts(bodyManager, shapeManager);

                const auto& contacts = collisionManager.getContacts();

                
                solver.preSolve(subDt, contacts);

                
                solver.solvePositions(subDt, bodyManager, contacts);

                
                bodyManager.forEach([&](Handle<Body> h, Body& b) {
                    if (b.type == BodyType::Dynamic) {
                        b.linearVelocity = (b.position - b.prevPosition) / subDt;
                        b.angularVelocity = (b.rotation - b.prevRotation) / subDt;
                    }
                });

                
                solver.solveVelocities(subDt, bodyManager, contacts);
            }
            
            
            shapeManager.updateAABBs(bodyManager);
        }
    };
}
