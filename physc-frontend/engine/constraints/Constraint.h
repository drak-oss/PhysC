#pragma once
#include "../physics/BodyManager.h"

namespace physics {
    class Constraint {
    public:
        virtual ~Constraint() = default;
        
        
        virtual void preSolve(float dt) = 0;
        
        
        virtual void solvePosition(float dt, BodyManager& bm) = 0;
        
        
        virtual void solveVelocity(float dt, BodyManager& bm) = 0;
    };
}
