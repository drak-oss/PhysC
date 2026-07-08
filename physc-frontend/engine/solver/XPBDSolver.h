#pragma once
#include <vector>
#include <memory>
#include "../constraints/Constraint.h"
#include "../collision/ContactConstraint.h"
#include "../physics/BodyManager.h"

namespace physics {
    class XPBDSolver {
        std::vector<std::unique_ptr<Constraint>> constraints;
    public:
        void addConstraint(std::unique_ptr<Constraint> c) {
            constraints.push_back(std::move(c));
        }

        void clear() {
            constraints.clear();
        }

        const std::vector<std::unique_ptr<Constraint>>& getConstraints() const {
            return constraints;
        }

        std::vector<std::unique_ptr<Constraint>>& getConstraints() {
            return constraints;
        }

        void preSolve(float dt, const std::vector<ContactConstraint*>& contacts) {
            for (auto& c : constraints) {
                c->preSolve(dt);
            }
            for (auto c : contacts) {
                c->preSolve(dt);
            }
        }

        void solvePositions(float dt, BodyManager& bm, const std::vector<ContactConstraint*>& contacts) {
            
            const int positionIterations = 4;
            for (int i = 0; i < positionIterations; ++i) {
                for (auto& c : constraints) {
                    c->solvePosition(dt, bm);
                }
                for (auto c : contacts) {
                    c->solvePosition(dt, bm);
                }
            }
        }

        void solveVelocities(float dt, BodyManager& bm, const std::vector<ContactConstraint*>& contacts) {
            for (auto& c : constraints) {
                c->solveVelocity(dt, bm);
            }
            for (auto c : contacts) {
                c->solveVelocity(dt, bm);
            }
        }
    };
}
