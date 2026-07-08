#ifdef __EMSCRIPTEN__
#include <emscripten/bind.h>
#include <emscripten/val.h>
#include "../physics/World.h"
#include "../constraints/DistanceConstraint.h"
#include "../constraints/HingeConstraint.h"
#include "../constraints/SliderConstraint.h"
#include "../constraints/MotorConstraint.h"
#include "../constraints/WeldConstraint.h"
#include "../constraints/PulleyConstraint.h"
#include "../constraints/GearConstraint.h"
#include <vector>

using namespace emscripten;
using namespace physics;

class SimulationAPI {
    World world;
    std::vector<float> renderData;
public:
    SimulationAPI() {
        
        world.setGravity({0.0f, 981.0f}); 
    }

    void step(float dt, int iterations) {
        world.step(dt, iterations);
    }

    void clearScene() {
        world.clear();
    }

    uint32_t addCircle(
        int type, float x, float y, float rotation, 
        float vx, float vy, float angularVelocity,
        float density, float friction, float restitution, 
        uint16_t categoryBits, uint16_t maskBits, 
        float radius
    ) {
        BodyDef bDef;
        bDef.type = static_cast<BodyType>(type);
        bDef.position = {x, y};
        bDef.rotation = rotation;
        bDef.linearVelocity = {vx, vy};
        bDef.angularVelocity = angularVelocity;
        Handle<Body> bHandle = world.getBodyManager().createBody(bDef);

        CircleDef sDef;
        sDef.radius = radius;
        sDef.density = density;
        sDef.friction = friction;
        sDef.restitution = restitution;
        sDef.categoryBits = categoryBits;
        sDef.maskBits = maskBits;
        Handle<Shape> sHandle = world.getShapeManager().createShape(sDef);
        
        world.getShapeManager().attachToBody(sHandle, bHandle, world.getBodyManager());
        return bHandle.index;
    }

    uint32_t addBox(
        int type, float x, float y, float rotation, 
        float vx, float vy, float angularVelocity,
        float density, float friction, float restitution, 
        uint16_t categoryBits, uint16_t maskBits, 
        float w, float h
    ) {
        BodyDef bDef;
        bDef.type = static_cast<BodyType>(type);
        bDef.position = {x, y};
        bDef.rotation = rotation;
        bDef.linearVelocity = {vx, vy};
        bDef.angularVelocity = angularVelocity;
        Handle<Body> bHandle = world.getBodyManager().createBody(bDef);

        BoxDef sDef;
        sDef.width = w;
        sDef.height = h;
        sDef.density = density;
        sDef.friction = friction;
        sDef.restitution = restitution;
        sDef.categoryBits = categoryBits;
        sDef.maskBits = maskBits;
        Handle<Shape> sHandle = world.getShapeManager().createShape(sDef);
        
        world.getShapeManager().attachToBody(sHandle, bHandle, world.getBodyManager());
        return bHandle.index;
    }

    void setPosition(uint32_t bodyIdx, float x, float y) {
        Handle<Body> h = { bodyIdx, world.getBodyManager().getGeneration(bodyIdx) };
        Body* body = world.getBodyManager().getBody(h);
        if (body) {
            body->position = {x, y};
            body->prevPosition = {x, y};
        }
    }

    void setCollisionFilter(uint32_t bodyIdx, uint16_t categoryBits, uint16_t maskBits) {
        auto& sm = world.getShapeManager();
        for (size_t i = 0; i < sm.capacity(); ++i) {
            Handle<Shape> h = { (uint32_t)i, sm.getGeneration(i) };
            Shape* shape = sm.getShape(h);
            if (shape && shape->bodyId.index == bodyIdx) {
                shape->categoryBits = categoryBits;
                shape->maskBits = maskBits;
            }
        }
    }

    void addIgnorePair(uint32_t bodyA_idx, uint32_t bodyB_idx) {
        world.getCollisionManager().addIgnorePair(bodyA_idx, bodyB_idx);
    }

    void addDistanceConstraint(uint32_t bodyA_idx, uint32_t bodyB_idx, float anchor1X, float anchor1Y, float anchor2X, float anchor2Y, float distance, float compliance) {
        Handle<Body> hA{bodyA_idx, world.getBodyManager().getGeneration(bodyA_idx)};
        Handle<Body> hB{bodyB_idx, world.getBodyManager().getGeneration(bodyB_idx)};
        
        const Body* bA = world.getBodyManager().getBody(hA);
        const Body* bB = world.getBodyManager().getBody(hB);
        if(!bA || !bB) return;

        Vec2 localA = bA->worldToLocal({anchor1X, anchor1Y});
        Vec2 localB = bB->worldToLocal({anchor2X, anchor2Y});

        auto constraint = std::make_unique<DistanceConstraint>(
            hA, hB, localA, localB, distance, compliance
        );
        world.getSolver().addConstraint(std::move(constraint));
    }

    void addHingeConstraint(uint32_t bodyA_idx, uint32_t bodyB_idx, float anchorX, float anchorY, float compliance) {
        Handle<Body> hA{bodyA_idx, world.getBodyManager().getGeneration(bodyA_idx)};
        Handle<Body> hB{bodyB_idx, world.getBodyManager().getGeneration(bodyB_idx)};
        
        const Body* bA = world.getBodyManager().getBody(hA);
        const Body* bB = world.getBodyManager().getBody(hB);
        
        if(!bA || !bB) return;

        
        Vec2 anchor(anchorX, anchorY);
        Vec2 localA = Vec2::rotate(anchor - bA->position, -bA->rotation);
        Vec2 localB = Vec2::rotate(anchor - bB->position, -bB->rotation);

        auto constraint = std::make_unique<HingeConstraint>(
            hA, hB, localA, localB, compliance
        );
        world.getSolver().addConstraint(std::move(constraint));
    }

    void addSliderConstraint(uint32_t bodyA_idx, uint32_t bodyB_idx,
        float ax1, float ay1,
        float ax2, float ay2,
        float axisX, float axisY,
        float minLimit, float maxLimit,
        float limitRestitution)
    {
        Handle<Body> hA{bodyA_idx, world.getBodyManager().getGeneration(bodyA_idx)};
        Handle<Body> hB{bodyB_idx, world.getBodyManager().getGeneration(bodyB_idx)};

        const Body* bA = world.getBodyManager().getBody(hA);
        const Body* bB = world.getBodyManager().getBody(hB);
        if (!bA || !bB) return;

        Vec2 localA = Vec2::rotate({ax1 - bA->position.x, ay1 - bA->position.y}, -bA->rotation);
        Vec2 localB = Vec2::rotate({ax2 - bB->position.x, ay2 - bB->position.y}, -bB->rotation);

        Vec2 axis(axisX, axisY);
        axis.normalize();
        Vec2 localAxisA = Vec2::rotate(axis, -bA->rotation);

        float refAngle = bB->rotation - bA->rotation;

        auto constraint = std::make_unique<SliderConstraint>(hA, hB, localA, localB, localAxisA, refAngle);
        if (std::isfinite(minLimit) && std::isfinite(maxLimit)) {
            constraint->setLimits(minLimit, maxLimit, limitRestitution);
        }
        world.getSolver().addConstraint(std::move(constraint));
    }

    void addMotorConstraint(uint32_t bodyA_idx, uint32_t bodyB_idx, float speed, float maxTorque) {
        Handle<Body> hA{bodyA_idx, world.getBodyManager().getGeneration(bodyA_idx)};
        Handle<Body> hB{bodyB_idx, world.getBodyManager().getGeneration(bodyB_idx)};
        
        const Body* bA = world.getBodyManager().getBody(hA);
        const Body* bB = world.getBodyManager().getBody(hB);
        if(!bA || !bB) return;

        auto constraint = std::make_unique<MotorConstraint>(hA, hB, speed, maxTorque);
        world.getSolver().addConstraint(std::move(constraint));
    }

    void addWeldConstraint(uint32_t bodyA_idx, uint32_t bodyB_idx, float anchorX, float anchorY, float complianceTrans, float complianceRot) {
        Handle<Body> hA{bodyA_idx, world.getBodyManager().getGeneration(bodyA_idx)};
        Handle<Body> hB{bodyB_idx, world.getBodyManager().getGeneration(bodyB_idx)};
        
        const Body* bA = world.getBodyManager().getBody(hA);
        const Body* bB = world.getBodyManager().getBody(hB);
        if(!bA || !bB) return;

        Vec2 localA = bA->worldToLocal({anchorX, anchorY});
        Vec2 localB = bB->worldToLocal({anchorX, anchorY});
        float refAngle = bB->rotation - bA->rotation;

        auto constraint = std::make_unique<WeldConstraint>(
            hA, hB, localA, localB, refAngle, complianceTrans, complianceRot
        );
        world.getSolver().addConstraint(std::move(constraint));
    }

    void addPulleyConstraint(uint32_t bodyA_idx, uint32_t bodyB_idx, 
                             float gAx, float gAy, float gBx, float gBy,
                             float aAx, float aAy, float aBx, float aBy,
                             float ratio, float compliance) {
        Handle<Body> hA{bodyA_idx, world.getBodyManager().getGeneration(bodyA_idx)};
        Handle<Body> hB{bodyB_idx, world.getBodyManager().getGeneration(bodyB_idx)};
        const Body* bA = world.getBodyManager().getBody(hA);
        const Body* bB = world.getBodyManager().getBody(hB);
        if (!bA || !bB) return;

        Vec2 gA(gAx, gAy);
        Vec2 gB(gBx, gBy);
        Vec2 localA = bA->worldToLocal({aAx, aAy});
        Vec2 localB = bB->worldToLocal({aBx, aBy});

        float initialLengthA = (Vec2(aAx, aAy) - gA).length();
        float initialLengthB = (Vec2(aBx, aBy) - gB).length();
        float restLength = initialLengthA + ratio * initialLengthB;

        world.getSolver().addConstraint(std::make_unique<PulleyConstraint>(
            hA, hB, gA, gB, localA, localB, ratio, restLength, compliance
        ));
    }

    void addGearConstraint(uint32_t bodyA_idx, uint32_t bodyB_idx, float ratio, float compliance) {
        Handle<Body> hA{bodyA_idx, world.getBodyManager().getGeneration(bodyA_idx)};
        Handle<Body> hB{bodyB_idx, world.getBodyManager().getGeneration(bodyB_idx)};
        const Body* bA = world.getBodyManager().getBody(hA);
        const Body* bB = world.getBodyManager().getBody(hB);
        if (!bA || !bB) return;

        float refAngle = bB->rotation + ratio * bA->rotation;

        world.getSolver().addConstraint(std::make_unique<GearConstraint>(
            hA, hB, ratio, refAngle, compliance
        ));
    }

    void setBodyMaterial(uint32_t bodyIdx, float density, float friction, float restitution) {
        Handle<Body> h{bodyIdx, world.getBodyManager().getGeneration(bodyIdx)};
        Body* body = world.getBodyManager().getBody(h);
        if (!body) return;

        float totalMass = 0.0f;
        float totalInertia = 0.0f;

        Handle<Shape> currHandle = body->shapeList;
        while (currHandle.isValid()) {
            Shape* s = world.getShapeManager().getShape(currHandle);
            if (!s) break;
            s->density     = density;
            s->friction    = friction;
            s->restitution = restitution;
            s->computeMassProperties();
            totalMass    += s->mass;
            totalInertia += s->localInertia;
            currHandle    = s->nextShape;
        }

        body->setMassData(totalMass, totalInertia);
    }

    void setMotorParams(uint32_t bodyA_idx, float speed, float newMaxTorque) {
        for (auto& c : world.getSolver().getConstraints()) {
            if (auto* mc = dynamic_cast<MotorConstraint*>(c.get())) {
                if (mc->bodyA.index == bodyA_idx) {
                    mc->targetSpeed = speed;
                    mc->maxTorque   = newMaxTorque;
                    return;
                }
            }
        }
    }

    void setLinearVelocity(uint32_t bodyA_idx, float vx, float vy) {
        Handle<Body> h{bodyA_idx, world.getBodyManager().getGeneration(bodyA_idx)};
        Body* b = world.getBodyManager().getBody(h);
        if (b) b->linearVelocity = {vx, vy};
    }

    void setRotation(uint32_t bodyA_idx, float angle) {
        Handle<Body> h{bodyA_idx, world.getBodyManager().getGeneration(bodyA_idx)};
        Body* b = world.getBodyManager().getBody(h);
        if (b) {
            b->rotation = angle;
            b->prevRotation = angle;
        }
    }

    float getPositionX(uint32_t bodyA_idx) {
        Handle<Body> h{bodyA_idx, world.getBodyManager().getGeneration(bodyA_idx)};
        const Body* b = world.getBodyManager().getBody(h);
        return b ? b->position.x : 0.0f;
    }

    emscripten::val getRenderData() {
        renderData.clear();
        
        int count = 0;
        world.getShapeManager().forEach([&](Handle<Shape> h, const Shape& s) {
            count++;
        });

        renderData.push_back(static_cast<float>(count));

        world.getShapeManager().forEach([&](Handle<Shape> h, const Shape& s) {
            const Body* b = world.getBodyManager().getBody(s.bodyId);
            if (!b) return;

            renderData.push_back(static_cast<float>(s.type));
            renderData.push_back(b->position.x);
            renderData.push_back(b->position.y);
            renderData.push_back(b->rotation);
            
            if (s.type == ShapeType::Circle) {
                renderData.push_back(s.circle.radius);
                renderData.push_back(0.0f); 
            } else {
                float width  = s.polygon.vertices[1].x - s.polygon.vertices[0].x;
                float height = s.polygon.vertices[2].y - s.polygon.vertices[1].y;
                renderData.push_back(width);
                renderData.push_back(height);
            }
            
            renderData.push_back(b->linearVelocity.x);
            renderData.push_back(b->linearVelocity.y);
            renderData.push_back(b->angularVelocity);
            renderData.push_back(static_cast<float>(s.bodyId.index));
        });

        
        size_t segmentCountIdx = renderData.size();
        renderData.push_back(0.0f); 

        auto& constraints = world.getSolver().getConstraints();
        int segmentCount = 0;
        for (const auto& c : constraints) {
            Vec2 pA, pB;
            
            if (auto* dc = dynamic_cast<DistanceConstraint*>(c.get())) {
                const Body* bA = world.getBodyManager().getBody(dc->bodyA);
                const Body* bB = world.getBodyManager().getBody(dc->bodyB);
                if (bA && bB) {
                    pA = bA->position + Vec2::rotate(dc->localAnchorA, bA->rotation);
                    pB = bB->position + Vec2::rotate(dc->localAnchorB, bB->rotation);
                }
            } else if (auto* hc = dynamic_cast<HingeConstraint*>(c.get())) {
                const Body* bA = world.getBodyManager().getBody(hc->bodyA);
                const Body* bB = world.getBodyManager().getBody(hc->bodyB);
                if (bA && bB) {
                    pA = bA->position + Vec2::rotate(hc->localAnchorA, bA->rotation);
                    pB = bB->position + Vec2::rotate(hc->localAnchorB, bB->rotation);
                }
            } else if (auto* sc = dynamic_cast<SliderConstraint*>(c.get())) {
                const Body* bA = world.getBodyManager().getBody(sc->bodyA);
                const Body* bB = world.getBodyManager().getBody(sc->bodyB);
                if (bA && bB) {
                    Vec2 railOrigin = bB->position + Vec2::rotate(sc->localAnchorB, bB->rotation);
                    Vec2 d = Vec2::rotate(sc->localAxisA, bA->rotation);
                    pA = railOrigin + d * sc->minLimit;
                    pB = railOrigin + d * sc->maxLimit;
                }
            } else if (auto* wc = dynamic_cast<WeldConstraint*>(c.get())) {
                const Body* bA = world.getBodyManager().getBody(wc->bodyA);
                const Body* bB = world.getBodyManager().getBody(wc->bodyB);
                if (bA && bB) {
                    pA = bA->position + Vec2::rotate(wc->localAnchorA, bA->rotation);
                    pB = bB->position + Vec2::rotate(wc->localAnchorB, bB->rotation);
                }
            } else if (auto* pc = dynamic_cast<PulleyConstraint*>(c.get())) {
                const Body* bA = world.getBodyManager().getBody(pc->bodyA);
                const Body* bB = world.getBodyManager().getBody(pc->bodyB);
                if (bA && bB) {
                    
                    
                    
                    Vec2 wA = bA->position + Vec2::rotate(pc->localAnchorA, bA->rotation);
                    Vec2 wB = bB->position + Vec2::rotate(pc->localAnchorB, bB->rotation);
                    
                    
                    renderData.push_back(wA.x); renderData.push_back(wA.y);
                    renderData.push_back(pc->groundAnchorA.x); renderData.push_back(pc->groundAnchorA.y);
                    
                    
                    renderData.push_back(pc->groundAnchorA.x); renderData.push_back(pc->groundAnchorA.y);
                    renderData.push_back(pc->groundAnchorB.x); renderData.push_back(pc->groundAnchorB.y);
                    
                    
                    renderData.push_back(pc->groundAnchorB.x); renderData.push_back(pc->groundAnchorB.y);
                    renderData.push_back(wB.x); renderData.push_back(wB.y);
                    
                    segmentCount += 3;
                    continue; 
                }
            }
            
            renderData.push_back(pA.x);
            renderData.push_back(pA.y);
            renderData.push_back(pB.x);
            renderData.push_back(pB.y);
            segmentCount += 1;
        }

        renderData[segmentCountIdx] = static_cast<float>(segmentCount);

        return emscripten::val(emscripten::typed_memory_view(renderData.size(), renderData.data()));
    }

    float getTotalEnergy() {
        float energy = 0.0f;
        Vec2 g = world.getGravity();

        world.getBodyManager().forEach([&](Handle<Body> h, Body& b) {
            if (b.type == BodyType::Dynamic) {
                float keLinear = 0.5f * b.mass * b.linearVelocity.lengthSq();
                float keAngular = 0.5f * b.inertia * b.angularVelocity * b.angularVelocity;
                
                
                float pe = -b.mass * (g.x * b.position.x + g.y * b.position.y);
                
                energy += keLinear + keAngular + pe;
            }
        });
        return energy;
    }
};

EMSCRIPTEN_BINDINGS(physics_engine) {
    class_<SimulationAPI>("SimulationAPI")
        .constructor<>()
        .function("step", &SimulationAPI::step)
        .function("clearScene", &SimulationAPI::clearScene)
        .function("addCircle", &SimulationAPI::addCircle)
        .function("addBox", &SimulationAPI::addBox)
        .function("addDistanceConstraint", &SimulationAPI::addDistanceConstraint)
        .function("addHingeConstraint", &SimulationAPI::addHingeConstraint)
        .function("addSliderConstraint", &SimulationAPI::addSliderConstraint)
        .function("addMotorConstraint", &SimulationAPI::addMotorConstraint)
        .function("addWeldConstraint", &SimulationAPI::addWeldConstraint)
        .function("addPulleyConstraint", &SimulationAPI::addPulleyConstraint)
        .function("addGearConstraint", &SimulationAPI::addGearConstraint)
        .function("setCollisionFilter", &SimulationAPI::setCollisionFilter)
        .function("addIgnorePair", &SimulationAPI::addIgnorePair)
        .function("setBodyMaterial", &SimulationAPI::setBodyMaterial)
        .function("setMotorParams", &SimulationAPI::setMotorParams)
        .function("setLinearVelocity", &SimulationAPI::setLinearVelocity)
        .function("setRotation", &SimulationAPI::setRotation)
        .function("setPosition", &SimulationAPI::setPosition)
        .function("getPositionX", &SimulationAPI::getPositionX)
        .function("getRenderData", &SimulationAPI::getRenderData)
        .function("getTotalEnergy", &SimulationAPI::getTotalEnergy);
}
#endif
