#pragma once
#include "Constraint.h"
#include "../core/Math.h"
#include "../core/Handle.h"
#include "../physics/BodyManager.h"

namespace physics {
    class WeldConstraint : public Constraint {
    public:
        Handle<Body> bodyA;
        Handle<Body> bodyB;
        Vec2 localAnchorA;
        Vec2 localAnchorB;
        float referenceAngle;
        
        float complianceTranslation;
        float complianceRotation;
        
        float lambdaTranslation = 0.0f;
        float lambdaRotation = 0.0f;
        
        WeldConstraint(Handle<Body> a, Handle<Body> b, Vec2 anchorA, Vec2 anchorB, float refAngle, float complianceTrans = 0.0f, float complianceRot = 0.0f)
            : bodyA(a), bodyB(b), localAnchorA(anchorA), localAnchorB(anchorB), referenceAngle(refAngle),
              complianceTranslation(complianceTrans), complianceRotation(complianceRot) {}

        void preSolve(float dt) override {
            lambdaTranslation = 0.0f;
            lambdaRotation = 0.0f;
        }

        void solvePosition(float dt, BodyManager& bm) override {
            Body* bA = bm.getBody(bodyA);
            Body* bB = bm.getBody(bodyB);
            if (!bA || !bB) return;

            
            Vec2 rA = Vec2::rotate(localAnchorA, bA->rotation);
            Vec2 rB = Vec2::rotate(localAnchorB, bB->rotation);
            
            Vec2 pA = bA->position + rA;
            Vec2 pB = bB->position + rB;
            
            Vec2 C_trans = pB - pA;
            float len = C_trans.length();
            
            if (len > 1e-6f) {
                Vec2 n = C_trans / len;
                float rnA = rA.cross(n);
                float rnB = rB.cross(n);
                
                float wTrans = bA->invMass + bB->invMass + rnA * rnA * bA->invInertia + rnB * rnB * bB->invInertia;
                
                if (wTrans > 0.0f) {
                    float alphaTrans = complianceTranslation / (dt * dt);
                    float dLambdaTrans = (-len - alphaTrans * lambdaTranslation) / (wTrans + alphaTrans);
                    lambdaTranslation += dLambdaTrans;
                    
                    Vec2 P = n * dLambdaTrans;
                    
                    if (bA->type == BodyType::Dynamic) {
                        bA->position -= P * bA->invMass;
                        bA->rotation -= rnA * dLambdaTrans * bA->invInertia;
                    }
                    if (bB->type == BodyType::Dynamic) {
                        bB->position += P * bB->invMass;
                        bB->rotation += rnB * dLambdaTrans * bB->invInertia;
                    }
                }
            }

            
            float C_rot = bB->rotation - bA->rotation - referenceAngle;
            
            
            const float PI_F = 3.1415926535f;
            C_rot = std::remainder(C_rot, 2.0f * PI_F);
            
            float wRot = bA->invInertia + bB->invInertia;
            
            if (wRot > 0.0f) {
                float alphaRot = complianceRotation / (dt * dt);
                float dLambdaRot = (-C_rot - alphaRot * lambdaRotation) / (wRot + alphaRot);
                lambdaRotation += dLambdaRot;
                
                if (bA->type == BodyType::Dynamic) bA->rotation -= dLambdaRot * bA->invInertia;
                if (bB->type == BodyType::Dynamic) bB->rotation += dLambdaRot * bB->invInertia;
            }
        }

        void solveVelocity(float dt, BodyManager& bm) override {}
    };
}
