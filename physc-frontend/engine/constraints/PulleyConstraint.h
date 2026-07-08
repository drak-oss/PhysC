#pragma once
#include "Constraint.h"
#include "../physics/BodyManager.h"
#include <cmath>

namespace physics {

class PulleyConstraint : public Constraint {
public:
    Handle<Body> bodyA;
    Handle<Body> bodyB;
    
    Vec2 groundAnchorA;
    Vec2 groundAnchorB;
    Vec2 localAnchorA;
    Vec2 localAnchorB;
    
    float ratio;
    float restLength;
    float compliance;
    
    float lambda;

    PulleyConstraint(Handle<Body> bA, Handle<Body> bB, 
                     const Vec2& gA, const Vec2& gB, 
                     const Vec2& lA, const Vec2& lB, 
                     float r, float length, float comp = 0.0f)
        : bodyA(bA), bodyB(bB), 
          groundAnchorA(gA), groundAnchorB(gB), 
          localAnchorA(lA), localAnchorB(lB), 
          ratio(r), restLength(length), compliance(comp), lambda(0.0f) {}

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
        
        Vec2 dA = pA - groundAnchorA;
        Vec2 dB = pB - groundAnchorB;
        
        float lenA = dA.length();
        float lenB = dB.length();
        
        Vec2 nA(0.0f, 1.0f);
        if (lenA >= 1e-4f) {
            nA = dA * (1.0f / lenA);
        } else {
            lenA = 0.0f; 
        }
        
        Vec2 nB(0.0f, 1.0f);
        if (lenB >= 1e-4f) {
            nB = dB * (1.0f / lenB);
        } else {
            lenB = 0.0f;
        }
        
        float C = lenA + ratio * lenB - restLength;
        
        float rnA = rA.cross(nA);
        float rnB = rB.cross(nB);
        
        float wA = bA->invMass + rnA * rnA * bA->invInertia;
        float wB = bB->invMass + rnB * rnB * bB->invInertia;
        
        float wSum = wA + ratio * ratio * wB;
        if (wSum <= 0.0f) return;
        
        float alpha = compliance / (dt * dt);
        float dLambda = (-C - alpha * lambda) / (wSum + alpha);
        lambda += dLambda;
        
        Vec2 PA = nA * dLambda;
        Vec2 PB = nB * (ratio * dLambda);
        
        if (bA->type == BodyType::Dynamic) {
            bA->position += PA * bA->invMass;
            bA->rotation += rnA * dLambda * bA->invInertia;
        }
        if (bB->type == BodyType::Dynamic) {
            bB->position += PB * bB->invMass;
            bB->rotation += rnB * (ratio * dLambda) * bB->invInertia;
        }
    }
    
    void solveVelocity(float dt, BodyManager& bm) override {
        
    }
};

}
