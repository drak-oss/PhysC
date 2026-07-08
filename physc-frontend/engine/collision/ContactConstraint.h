#pragma once
#include "../constraints/Constraint.h"
#include "Narrowphase.h"
#include <vector>
#include <algorithm>
#include <cmath>

namespace physics {

struct ContactPointState {
    Vec2 localA;
    Vec2 localB;
    float depth;
    
    
    float lambdaNormal = 0.0f;
    float lambdaTangent = 0.0f;
};

class ContactConstraint : public Constraint {
public:
    Handle<Body> bodyA;
    Handle<Body> bodyB;
    
    Vec2 normal;
    std::vector<ContactPointState> points;
    
    float friction;
    float rollingFriction;
    float restitution;
    float lambdaRolling = 0.0f;

    ContactConstraint(const ContactManifold& manifold, float friction, float restitution)
        : friction(friction), restitution(restitution), rollingFriction(0.01f) 
    {
        bodyA = manifold.bodyA;
        bodyB = manifold.bodyB;
        if (!manifold.contacts.empty()) {
            normal = manifold.contacts[0].normal;
        }
        for (const auto& cp : manifold.contacts) {
            points.push_back({cp.localA, cp.localB, cp.depth, 0.0f, 0.0f});
        }
    }

    void updateManifold(const ContactManifold& newManifold) {
        if (!newManifold.contacts.empty()) {
            normal = newManifold.contacts[0].normal;
        }
        std::vector<ContactPointState> newPoints;
        
        float minSqDist = 2.0f * 2.0f;
        
        for (const auto& newCp : newManifold.contacts) {
            ContactPointState state{newCp.localA, newCp.localB, newCp.depth, 0.0f, 0.0f};
            
            bool matched = false;
            for (const auto& oldCp : points) {
                float distSqA = (oldCp.localA - newCp.localA).lengthSq();
                float distSqB = (oldCp.localB - newCp.localB).lengthSq();
                
                if (distSqA < minSqDist && distSqB < minSqDist) {
                    state.lambdaNormal = oldCp.lambdaNormal;
                    state.lambdaTangent = oldCp.lambdaTangent;
                    matched = true;
                    break;
                }
            }
            newPoints.push_back(state);
        }
        points = newPoints;
    }

    void preSolve(float dt) override {
        Body* bA = bodyA.isValid() ? nullptr : nullptr; 
        Body* bB = bodyB.isValid() ? nullptr : nullptr;
        
        
        
        
        for (auto& pt : points) {
            pt.lambdaNormal = 0.0f;
            pt.lambdaTangent = 0.0f;
        }
        lambdaRolling = 0.0f;
    }

    void solvePosition(float dt, BodyManager& bm) override {
        Body* bA = bm.getBody(bodyA);
        Body* bB = bm.getBody(bodyB);
        if (!bA || !bB) return;

        
        for (auto& pt : points) {
            Vec2 rA = Vec2::rotate(pt.localA, bA->rotation);
            Vec2 rB = Vec2::rotate(pt.localB, bB->rotation);

            Vec2 pA = bA->position + rA;
            Vec2 pB = bB->position + rB;

            
            float C = (pB - pA).dot(normal) - pt.depth;

            if (C < 0.0f) {
                float rnA = rA.cross(normal);
                float rnB = rB.cross(normal);
                
                float wSum = bA->invMass + bB->invMass + rnA * rnA * bA->invInertia + rnB * rnB * bB->invInertia;
                if (wSum > 0.0f) {
                    float dLambda = -C / wSum;
                    
                    float newLambda = std::max(0.0f, pt.lambdaNormal + dLambda);
                    dLambda = newLambda - pt.lambdaNormal;
                    pt.lambdaNormal = newLambda;

                    Vec2 P = normal * dLambda;
                    if (bA->type == BodyType::Dynamic) {
                        bA->position -= P * bA->invMass;
                        bA->rotation -= rA.cross(P) * bA->invInertia;
                    }
                    if (bB->type == BodyType::Dynamic) {
                        bB->position += P * bB->invMass;
                        bB->rotation += rB.cross(P) * bB->invInertia;
                    }
                }
            } 
        } 
    }

    void solveVelocity(float dt, BodyManager& bm) override {
        Body* bA = bm.getBody(bodyA);
        Body* bB = bm.getBody(bodyB);
        if (!bA || !bB) return;

        for (auto& pt : points) {
            Vec2 rA = Vec2::rotate(pt.localA, bA->rotation);
            Vec2 rB = Vec2::rotate(pt.localB, bB->rotation);

            Vec2 vA = bA->linearVelocity + Vec2(-bA->angularVelocity * rA.y, bA->angularVelocity * rA.x);
            Vec2 vB = bB->linearVelocity + Vec2(-bB->angularVelocity * rB.y, bB->angularVelocity * rB.x);

            Vec2 relativeVelocity = vB - vA;
            float normalVelocity = relativeVelocity.dot(normal);

            
            if (restitution > 0.0f) {
                float bounceSlop = 5.0f; 
                if (normalVelocity < -bounceSlop) {
                    float rnA = rA.cross(normal);
                    float rnB = rB.cross(normal);
                    float wSum = bA->invMass + bB->invMass + rnA * rnA * bA->invInertia + rnB * rnB * bB->invInertia;
                    if (wSum > 0.0f) {
                        float j = -(1.0f + restitution) * normalVelocity / wSum;
                        if (j > 0.0f) {
                            Vec2 impulse = normal * j;
                            if (bA->type == BodyType::Dynamic) {
                                bA->linearVelocity -= impulse * bA->invMass;
                                bA->angularVelocity -= rA.cross(impulse) * bA->invInertia;
                            }
                            if (bB->type == BodyType::Dynamic) {
                                bB->linearVelocity += impulse * bB->invMass;
                                bB->angularVelocity += rB.cross(impulse) * bB->invInertia;
                            }
                            
                            
                            vA = bA->linearVelocity + Vec2(-bA->angularVelocity * rA.y, bA->angularVelocity * rA.x);
                            vB = bB->linearVelocity + Vec2(-bB->angularVelocity * rB.y, bB->angularVelocity * rB.x);
                            relativeVelocity = vB - vA;
                        }
                    }
                }
            }

            
            if (pt.lambdaNormal > 0.0f && friction > 0.0f) {
                Vec2 tangent(-normal.y, normal.x);
                float vTangent = relativeVelocity.dot(tangent);
                
                float rtA = rA.cross(tangent);
                float rtB = rB.cross(tangent);
                float wSumT = bA->invMass + bB->invMass + rtA * rtA * bA->invInertia + rtB * rtB * bB->invInertia;
                
                if (wSumT > 0.0f) {
                    float jTangent = -vTangent / wSumT;
                    
                    
                    float normalImpulse = pt.lambdaNormal / dt;
                    float maxFriction = friction * normalImpulse;
                    
                    jTangent = std::clamp(jTangent, -maxFriction, maxFriction);
                    
                    Vec2 impulseT = tangent * jTangent;
                    if (bA->type == BodyType::Dynamic) {
                        bA->linearVelocity -= impulseT * bA->invMass;
                        bA->angularVelocity -= rA.cross(impulseT) * bA->invInertia;
                    }
                    if (bB->type == BodyType::Dynamic) {
                        bB->linearVelocity += impulseT * bB->invMass;
                        bB->angularVelocity += rB.cross(impulseT) * bB->invInertia;
                    }
                }
            }

            
            if (pt.lambdaNormal > 0.0f && rollingFriction > 0.0f) {
                float wRel = bB->angularVelocity - bA->angularVelocity;
                float wSumR = bA->invInertia + bB->invInertia;
                if (wSumR > 0.0f) {
                    float jRolling = -wRel / wSumR;
                    
                    float normalImpulse = pt.lambdaNormal / dt;
                    float maxRolling = rollingFriction * normalImpulse;
                    
                    jRolling = std::clamp(jRolling, -maxRolling, maxRolling);
                    
                    if (bA->type == BodyType::Dynamic) bA->angularVelocity -= jRolling * bA->invInertia;
                    if (bB->type == BodyType::Dynamic) bB->angularVelocity += jRolling * bB->invInertia;
                }
            }
        } 
    }
};

}
