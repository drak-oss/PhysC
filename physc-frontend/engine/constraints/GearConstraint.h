#pragma once
#include "Constraint.h"
#include "../physics/BodyManager.h"
#include <cmath>

namespace physics {

class GearConstraint : public Constraint {
public:
    Handle<Body> bodyA;
    Handle<Body> bodyB;
    
    float ratio;
    float referenceAngle;
    float compliance;
    
    float lambda;

    GearConstraint(Handle<Body> bA, Handle<Body> bB, float r, float refAngle = 0.0f, float comp = 0.0f)
        : bodyA(bA), bodyB(bB), ratio(r), referenceAngle(refAngle), compliance(comp), lambda(0.0f) {}

    void preSolve(float dt) override {
        lambda = 0.0f;
    }

    void solvePosition(float dt, BodyManager& bm) override {
        Body* bA = bm.getBody(bodyA);
        Body* bB = bm.getBody(bodyB);
        
        if (!bA || !bB) return;
        
        
        float C = bB->rotation + ratio * bA->rotation - referenceAngle;
        
        
        
        
        
        
        float wA = bA->invInertia * ratio * ratio;
        float wB = bB->invInertia * 1.0f * 1.0f;
        
        float wSum = wA + wB;
        if (wSum == 0.0f) return;
        
        float alphaTilde = compliance / (dt * dt);
        float dLambda = (-C - alphaTilde * lambda) / (wSum + alphaTilde);
        
        if (bA->type == BodyType::Dynamic) {
            bA->rotation += dLambda * ratio * bA->invInertia;
        }
        
        if (bB->type == BodyType::Dynamic) {
            bB->rotation += dLambda * bB->invInertia;
        }
        
        lambda += dLambda;
    }

    void solveVelocity(float dt, BodyManager& bm) override {
        
    }
};

}
