#pragma once
#include "Constraint.h"
#include "../core/Math.h"
#include "../core/Handle.h"
#include "../physics/BodyManager.h"

namespace physics {
    class DistanceConstraint : public Constraint {
    public:
        Handle<Body> bodyA;
        Handle<Body> bodyB;
        Vec2 localAnchorA;
        Vec2 localAnchorB;
        
        float restLength;
        float compliance; 
        
        
        float lambda;
        
        DistanceConstraint(Handle<Body> a, Handle<Body> b, Vec2 anchorA, Vec2 anchorB, float length, float compliance = 0.0f)
            : bodyA(a), bodyB(b), localAnchorA(anchorA), localAnchorB(anchorB), restLength(length), compliance(compliance), lambda(0.0f) {}

        void preSolve(float dt) override {
            lambda = 0.0f; 
        }

        void solvePosition(float dt, BodyManager& bm) override {
            Body* bA = bm.getBody(bodyA);
            Body* bB = bm.getBody(bodyB);
            
            if (!bA || !bB) return;

            
            Vec2 rA = Vec2::rotate(localAnchorA, bA->rotation);
            Vec2 rB = Vec2::rotate(localAnchorB, bB->rotation);
            
            Vec2 pA = bA->position + rA;
            Vec2 pB = bB->position + rB;
            
            Vec2 n = pB - pA;
            float currentLen = n.length();
            if (currentLen < 1e-6f) return;
            n = n / currentLen;
            
            
            float C = currentLen - restLength;
            
            
            
            float rnA = rA.cross(n);
            float rnB = rB.cross(n);
            
            float wA = bA->invMass + rnA * rnA * bA->invInertia;
            float wB = bB->invMass + rnB * rnB * bB->invInertia;
            
            float wSum = wA + wB;
            if (wSum == 0.0f) return;
            
            float alphaTilde = compliance / (dt * dt);
            
            
            float deltaLambda = (-C - alphaTilde * lambda) / (wSum + alphaTilde);
            lambda += deltaLambda;
            
            
            Vec2 P = n * deltaLambda;
            
            if (bA->type == BodyType::Dynamic) {
                bA->position -= P * bA->invMass;
                bA->rotation -= rnA * deltaLambda * bA->invInertia;
            }
            if (bB->type == BodyType::Dynamic) {
                bB->position += P * bB->invMass;
                bB->rotation += rnB * deltaLambda * bB->invInertia;
            }
        }

        void solveVelocity(float dt, BodyManager& bm) override {
            
            
            
            
        }
    };
}
