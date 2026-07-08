#include "CollisionManager.h"
#include <limits>
#include <cmath>

namespace physics {

CollisionManager::CollisionManager() {}
CollisionManager::~CollisionManager() {}

AABB CollisionManager::computeAABB(const Body* body, const Shape* shape) const {
    AABB aabb;
    if (shape->type == ShapeType::Circle) {
        Vec2 center = body->position + Vec2::rotate(shape->circle.offset, body->rotation);
        float r = shape->circle.radius;
        aabb.min = center - Vec2(r, r);
        aabb.max = center + Vec2(r, r);
    } else if (shape->type == ShapeType::Polygon) {
        float minX = std::numeric_limits<float>::max();
        float minY = std::numeric_limits<float>::max();
        float maxX = std::numeric_limits<float>::lowest();
        float maxY = std::numeric_limits<float>::lowest();
        
        for (int i = 0; i < shape->polygon.vertexCount; ++i) {
            Vec2 p = body->position + Vec2::rotate(shape->polygon.vertices[i], body->rotation);
            if (p.x < minX) minX = p.x;
            if (p.y < minY) minY = p.y;
            if (p.x > maxX) maxX = p.x;
            if (p.y > maxY) maxY = p.y;
        }
        aabb.min = Vec2(minX, minY);
        aabb.max = Vec2(maxX, maxY);
    }
    return aabb;
}

void CollisionManager::updateBroadphase(BodyManager& bm, ShapeManager& sm) {
    for (size_t i = 0; i < sm.capacity(); ++i) {
        Handle<Shape> h = { (uint32_t)i, sm.getGeneration((uint32_t)i) };
        Shape* shape = sm.getShape(h);
        if (!shape || !shape->bodyId.isValid()) continue; 
        
        Body* body = bm.getBody(shape->bodyId);
        if (!body) continue;
        
        AABB aabb = computeAABB(body, shape);
        shape->aabbMin = aabb.min;
        shape->aabbMax = aabb.max;

        if (shape->proxyId == -1) {
            Handle<Body> shapeHandleHack = Handle<Body>{(uint32_t)i, 0};
            shape->proxyId = broadphase.createProxy(aabb, shapeHandleHack);
        } else {
            Vec2 displacement = body->position - body->prevPosition;
            broadphase.moveProxy(shape->proxyId, aabb, displacement);
        }
    }
}

void CollisionManager::generateContacts(BodyManager& bm, ShapeManager& sm) {
    activeContacts.clear();
    
    
    std::vector<std::pair<uint32_t, uint32_t>> updatedKeys;
    
    for (size_t i = 0; i < sm.capacity(); ++i) {
        Handle<Shape> hA = { (uint32_t)i, sm.getGeneration((uint32_t)i) };
        Shape* shapeA = sm.getShape(hA);
        if (!shapeA || !shapeA->bodyId.isValid()) continue;
        
        Body* bodyA = bm.getBody(shapeA->bodyId);
        if (!bodyA) continue;
        
        AABB aabbA(shapeA->aabbMin, shapeA->aabbMax);
        
        auto queryCallback = [&](int proxyId) -> bool {
            if (proxyId == shapeA->proxyId) return true;
            
            Handle<Body> proxyData = broadphase.getBody(proxyId);
            uint32_t shapeBIndex = proxyData.index;
            if (shapeBIndex <= i) return true; 
            
            Handle<Shape> hB = { shapeBIndex, sm.getGeneration(shapeBIndex) };
            Shape* shapeB = sm.getShape(hB);
            if (!shapeB || !shapeB->bodyId.isValid()) return true;
            
            if ((shapeA->categoryBits & shapeB->maskBits) == 0 ||
                (shapeB->categoryBits & shapeA->maskBits) == 0) {
                return true;
            }

            Body* bodyB = bm.getBody(shapeB->bodyId);
            if (!bodyB) return true;
            
            if (bodyA->type == BodyType::Static && bodyB->type == BodyType::Static) return true;
            
            uint32_t idxA = shapeA->bodyId.index;
            uint32_t idxB = shapeB->bodyId.index;
            if (idxA > idxB) std::swap(idxA, idxB);
            for (const auto& p : ignorePairs) {
                if (p.first == idxA && p.second == idxB) return true;
            }
            
            ContactManifold manifold;
            manifold.bodyA = shapeA->bodyId;
            manifold.bodyB = shapeB->bodyId;
            manifold.shapeA = hA;
            manifold.shapeB = hB;

            if (Narrowphase::collide(bodyA, shapeA, bodyB, shapeB, manifold)) {
                if (!manifold.contacts.empty()) {
                    float combinedFriction = std::sqrt(shapeA->friction * shapeB->friction);
                    float combinedRestitution = std::max(shapeA->restitution, shapeB->restitution);
                    
                    auto key = std::make_pair((uint32_t)i, shapeBIndex);
                    auto it = contactCache.find(key);
                    
                    if (it != contactCache.end()) {
                        
                        it->second->friction = combinedFriction;
                        it->second->restitution = combinedRestitution;
                        it->second->updateManifold(manifold);
                        activeContacts.push_back(it->second.get());
                    } else {
                        
                        auto constraint = std::make_unique<ContactConstraint>(manifold, combinedFriction, combinedRestitution);
                        activeContacts.push_back(constraint.get());
                        contactCache[key] = std::move(constraint);
                    }
                    updatedKeys.push_back(key);
                }
            }
            
            return true;
        };
        
        broadphase.query(aabbA, queryCallback);
    }
    
    
    if (contactCache.size() > activeContacts.size()) {
        std::unordered_map<std::pair<uint32_t, uint32_t>, std::unique_ptr<ContactConstraint>, PairHash> newCache;
        for (const auto& key : updatedKeys) {
            newCache[key] = std::move(contactCache[key]);
        }
        contactCache = std::move(newCache);
    }
}

}
