#pragma once
#include "DynamicTree.h"
#include "Narrowphase.h"
#include "ContactConstraint.h"
#include "../physics/BodyManager.h"
#include "../physics/ShapeManager.h"
#include <vector>
#include <memory>
#include <unordered_map>

namespace physics {

class World; 

struct CollisionPair {
    Handle<Shape> shapeA;
    Handle<Shape> shapeB;
};

struct PairHash {
    std::size_t operator()(const std::pair<uint32_t, uint32_t>& p) const {
        
        
        return (uint64_t(p.first) << 32) ^ p.second;
    }
};

class CollisionManager {
private:
    DynamicTree broadphase;
    std::vector<ContactConstraint*> activeContacts;
    
    
    std::unordered_map<std::pair<uint32_t, uint32_t>, std::unique_ptr<ContactConstraint>, PairHash> contactCache;

    std::vector<std::pair<uint32_t, uint32_t>> ignorePairs;

    
    AABB computeAABB(const Body* body, const Shape* shape) const;

public:
    void addIgnorePair(uint32_t a, uint32_t b) {
        if (a > b) std::swap(a, b);
        ignorePairs.push_back({a, b});
    }
    CollisionManager();
    ~CollisionManager();

    void clear() {
        activeContacts.clear();
        contactCache.clear();
        ignorePairs.clear();
        
        
    }

    
    void updateBroadphase(BodyManager& bm, ShapeManager& sm);

    
    void generateContacts(BodyManager& bm, ShapeManager& sm);

    
    const std::vector<ContactConstraint*>& getContacts() const {
        return activeContacts;
    }
};

}
