#pragma once
#include "Constraint.h"
#include "../core/Math.h"
#include "../core/Handle.h"
#include "../physics/BodyManager.h"
#include <algorithm>

namespace physics {
    class SliderConstraint : public Constraint {
    public:
        Handle<Body> bodyA;
        Handle<Body> bodyB;
        Vec2 localAnchorA;
        Vec2 localAnchorB;
        Vec2 localAxisA; 
        float refAngle;
        
        bool enableLimit = false;
        float minLimit = 0.0f;
        float maxLimit = 0.0f;
        
        float lambdaTranslation = 0.0f;
        float lambdaRotation = 0.0f;
        float complianceTranslation = 0.0f;
        float complianceRotation = 0.0f;
        
        
        float lambdaLimit = 0.0f;
        float limitRestitution = 0.0f;
        
        SliderConstraint(Handle<Body> a, Handle<Body> b, Vec2 anchorA, Vec2 anchorB, Vec2 axisA, float refAng)
            : bodyA(a), bodyB(b), localAnchorA(anchorA), localAnchorB(anchorB), localAxisA(axisA), refAngle(refAng) {}

        void setLimits(float minL, float maxL, float restitution = 0.0f) {
            minLimit = minL;
            maxLimit = maxL;
            limitRestitution = restitution;
            enableLimit = true;
        }

        void preSolve(float dt) override {
            lambdaTranslation = 0.0f;
            lambdaRotation = 0.0f;
            lambdaLimit = 0.0f;
        }

        void solvePosition(float dt, BodyManager& bm) override {
            Body* bA = bm.getBody(bodyA);
            Body* bB = bm.getBody(bodyB);
            if (!bA || !bB) return;

            
            float C2 = bB->rotation - bA->rotation - refAngle;
            float w2 = bA->invInertia + bB->invInertia;
            if (w2 > 0.0f) {
                float alpha2 = complianceRotation / (dt * dt);
                float dLambda2 = (-C2 - alpha2 * lambdaRotation) / (w2 + alpha2);
                lambdaRotation += dLambda2;
                
                if (bA->type == BodyType::Dynamic) bA->rotation -= dLambda2 * bA->invInertia;
                if (bB->type == BodyType::Dynamic) bB->rotation += dLambda2 * bB->invInertia;
            }

            
            Vec2 rA = Vec2::rotate(localAnchorA, bA->rotation);
            Vec2 rB = Vec2::rotate(localAnchorB, bB->rotation);
            Vec2 pA = bA->position + rA;
            Vec2 pB = bB->position + rB;
            
            Vec2 d = Vec2::rotate(localAxisA, bA->rotation);
            Vec2 n(-d.y, d.x);
            
            float C1 = n.dot(pB - pA);
            float rnA = (pB - bA->position).cross(n);
            float rnB = rB.cross(n);
            
            float w1 = bA->invMass + rnA * rnA * bA->invInertia + bB->invMass + rnB * rnB * bB->invInertia;
                       
            if (w1 > 0.0f) {
                float alpha1 = complianceTranslation / (dt * dt);
                float dLambda1 = (-C1 - alpha1 * lambdaTranslation) / (w1 + alpha1);
                lambdaTranslation += dLambda1;
                
                Vec2 P = n * dLambda1;
                if (bA->type == BodyType::Dynamic) {
                    bA->position -= P * bA->invMass;
                    bA->rotation -= rnA * dLambda1 * bA->invInertia;
                }
                if (bB->type == BodyType::Dynamic) {
                    bB->position += P * bB->invMass;
                    bB->rotation += rnB * dLambda1 * bB->invInertia;
                }
            }

            
            if (enableLimit) {
                rA = Vec2::rotate(localAnchorA, bA->rotation);
                rB = Vec2::rotate(localAnchorB, bB->rotation);
                pA = bA->position + rA;
                pB = bB->position + rB;
                d = Vec2::rotate(localAxisA, bA->rotation);
                
                float t = d.dot(pB - pA);
                float C_limit = 0.0f;
                float sign = 1.0f;
                
                if (t < minLimit) {
                    C_limit = t - minLimit; 
                    sign = 1.0f; 
                } else if (t > maxLimit) {
                    C_limit = maxLimit - t; 
                    sign = -1.0f; 
                }
                
                if (C_limit < 0.0f) {
                    Vec2 limitNormal = d * sign;
                    float rdA = (pB - bA->position).cross(limitNormal);
                    float rdB = rB.cross(limitNormal);
                    
                    float wLimit = bA->invMass + rdA * rdA * bA->invInertia + bB->invMass + rdB * rdB * bB->invInertia;
                                   
                    if (wLimit > 0.0f) {
                        float dLambdaLimit = -C_limit / wLimit;
                        
                        
                        float newLambda = std::max(0.0f, lambdaLimit + dLambdaLimit);
                        dLambdaLimit = newLambda - lambdaLimit;
                        lambdaLimit = newLambda;
                        
                        Vec2 P = limitNormal * dLambdaLimit;
                        
                        if (bA->type == BodyType::Dynamic) {
                            bA->position -= P * bA->invMass;
                            bA->rotation -= rdA * dLambdaLimit * bA->invInertia;
                        }
                        if (bB->type == BodyType::Dynamic) {
                            bB->position += P * bB->invMass;
                            bB->rotation += rdB * dLambdaLimit * bB->invInertia;
                        }
                    }
                }
            }
        }

        void solveVelocity(float dt, BodyManager& bm) override {
            if (!enableLimit || limitRestitution <= 0.0f) return;

            Body* bA = bm.getBody(bodyA);
            Body* bB = bm.getBody(bodyB);
            if (!bA || !bB) return;

            Vec2 rA = Vec2::rotate(localAnchorA, bA->rotation);
            Vec2 rB = Vec2::rotate(localAnchorB, bB->rotation);
            Vec2 pA = bA->position + rA;
            Vec2 pB = bB->position + rB;
            Vec2 d = Vec2::rotate(localAxisA, bA->rotation);
            
            float t = d.dot(pB - pA);
            float sign = 0.0f;
            
            
            float slop = 1.0f;
            if (t < minLimit + slop) {
                sign = 1.0f;
            } else if (t > maxLimit - slop) {
                sign = -1.0f;
            }
            
            if (sign != 0.0f) {
                Vec2 limitNormal = d * sign;
                
                Vec2 vA = bA->linearVelocity + Vec2(-bA->angularVelocity * rA.y, bA->angularVelocity * rA.x);
                Vec2 vB = bB->linearVelocity + Vec2(-bB->angularVelocity * rB.y, bB->angularVelocity * rB.x);
                Vec2 relativeVelocity = vB - vA;
                
                float normalVelocity = relativeVelocity.dot(limitNormal);
                
                float bounceSlop = 5.0f;
                if (normalVelocity < -bounceSlop) {
                    float rdA = (pB - bA->position).cross(limitNormal);
                    float rdB = rB.cross(limitNormal);
                    float wLimit = bA->invMass + rdA * rdA * bA->invInertia + bB->invMass + rdB * rdB * bB->invInertia;
                    
                    if (wLimit > 0.0f) {
                        float j = -(1.0f + limitRestitution) * normalVelocity / wLimit;
                        if (j < 0.0f) j = 0.0f;
                        
                        Vec2 impulse = limitNormal * j;
                        if (bA->type == BodyType::Dynamic) {
                            bA->linearVelocity -= impulse * bA->invMass;
                            bA->angularVelocity -= rdA * j * bA->invInertia;
                        }
                        if (bB->type == BodyType::Dynamic) {
                            bB->linearVelocity += impulse * bB->invMass;
                            bB->angularVelocity += rdB * j * bB->invInertia;
                        }
                    }
                }
            }
        }
    };
}
