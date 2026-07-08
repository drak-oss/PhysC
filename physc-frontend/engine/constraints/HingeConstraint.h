#pragma once
#include "Constraint.h"
#include "../core/Math.h"
#include "../core/Handle.h"
#include "../physics/BodyManager.h"

namespace physics {
    class HingeConstraint : public Constraint {
    public:
        Handle<Body> bodyA;
        Handle<Body> bodyB;
        Vec2 localAnchorA;
        Vec2 localAnchorB;
        
        float compliance;
        Vec2 lambda;
        
        HingeConstraint(Handle<Body> a, Handle<Body> b, Vec2 anchorA, Vec2 anchorB, float compliance = 0.0f)
            : bodyA(a), bodyB(b), localAnchorA(anchorA), localAnchorB(anchorB), compliance(compliance), lambda(0.0f, 0.0f) {}

        void preSolve(float dt) override {
            lambda = {0.0f, 0.0f};
        }

        void solvePosition(float dt, BodyManager& bm) override {
            Body* bA = bm.getBody(bodyA);
            Body* bB = bm.getBody(bodyB);
            
            if (!bA || !bB) return;

            Vec2 rA = Vec2::rotate(localAnchorA, bA->rotation);
            Vec2 rB = Vec2::rotate(localAnchorB, bB->rotation);
            
            Vec2 pA = bA->position + rA;
            Vec2 pB = bB->position + rB;
            
            
            Vec2 C = pA - pB;
            
            
            float m1 = bA->invMass;
            float m2 = bB->invMass;
            float i1 = bA->invInertia;
            float i2 = bB->invInertia;
            
            Mat22 K;
            K.m00 = m1 + m2 + rA.y * rA.y * i1 + rB.y * rB.y * i2;
            K.m01 = -rA.x * rA.y * i1 - rB.x * rB.y * i2;
            K.m10 = K.m01;
            K.m11 = m1 + m2 + rA.x * rA.x * i1 + rB.x * rB.x * i2;
            
            float alphaTilde = compliance / (dt * dt);
            K.m00 += alphaTilde;
            K.m11 += alphaTilde;
            
            Mat22 K_inv = K.inverse();
            
            Vec2 rhs = (C * -1.0f) - (lambda * alphaTilde);
            Vec2 deltaLambda = K_inv * rhs;
            lambda += deltaLambda;
            
            
            Vec2 P = deltaLambda;
            
            if (bA->type == BodyType::Dynamic) {
                bA->position += P * m1;
                bA->rotation += (rA.x * P.y - rA.y * P.x) * i1;
            }
            if (bB->type == BodyType::Dynamic) {
                bB->position -= P * m2;
                bB->rotation -= (rB.x * P.y - rB.y * P.x) * i2;
            }
        }

        void solveVelocity(float dt, BodyManager& bm) override {}
    };
}
