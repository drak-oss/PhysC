#pragma once
#include "Constraint.h"
#include "../core/Math.h"
#include "../core/Handle.h"
#include "../physics/BodyManager.h"
#include <algorithm>
#include <cmath>

namespace physics {
    class MotorConstraint : public Constraint {
    public:
        Handle<Body> bodyA;
        Handle<Body> bodyB;
        
        float targetSpeed; 
        float maxTorque;   
        
        
        float lambda = 0.0f;

        MotorConstraint(Handle<Body> a, Handle<Body> b, float speed, float maxTorque = -1.0f)
            : bodyA(a), bodyB(b), targetSpeed(speed), maxTorque(maxTorque) {}

        void preSolve(float dt) override {
            lambda = 0.0f;
        }

        void solvePosition(float dt, BodyManager& bm) override {
            Body* bA = bm.getBody(bodyA);
            Body* bB = bm.getBody(bodyB);
            if (!bA || !bB) return;

            float currentDelta = (bB->rotation - bB->prevRotation) - (bA->rotation - bA->prevRotation);
            float targetDelta = targetSpeed * dt;
            float error = currentDelta - targetDelta;

            float w = bA->invInertia + bB->invInertia;
            if (w <= 0.0f) return;

            float deltaLambda = -error / w;
            
            if (maxTorque > 0.0f) {
                float maxL = maxTorque * dt * dt;
                float newLambda = std::clamp(lambda + deltaLambda, -maxL, maxL);
                deltaLambda = newLambda - lambda;
                lambda = newLambda;
            }

            if (bA->type == BodyType::Dynamic) bA->rotation -= deltaLambda * bA->invInertia;
            if (bB->type == BodyType::Dynamic) bB->rotation += deltaLambda * bB->invInertia;
        }

        void solveVelocity(float dt, BodyManager& bm) override {
            
        }
    };
}
