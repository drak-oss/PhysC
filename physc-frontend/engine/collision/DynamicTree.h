#pragma once
#include "AABB.h"
#include "../core/Handle.h"
#include "../physics/BodyManager.h"
#include <vector>
#include <stack>

namespace physics {

#define nullNode (-1)

struct TreeNode {
    AABB aabb;
    Handle<Body> bodyId;
    int parent;
    int left;
    int right;
    int height;

    bool isLeaf() const {
        return right == nullNode;
    }
};

class DynamicTree {
private:
    int root;
    std::vector<TreeNode> nodes;
    int nodeCount;
    int nodeCapacity;
    int freeList;

    int allocateNode();
    void freeNode(int nodeId);
    void insertLeaf(int leaf);
    void removeLeaf(int leaf);
    int balance(int iA);

public:
    DynamicTree();
    ~DynamicTree();

    int createProxy(const AABB& aabb, Handle<Body> bodyId);
    void destroyProxy(int proxyId);
    bool moveProxy(int proxyId, const AABB& aabb, const Vec2& displacement);
    
    Handle<Body> getBody(int proxyId) const;
    const AABB& getFatAABB(int proxyId) const;

    template <typename T>
    void query(const AABB& aabb, T& callback) const {
        std::stack<int> stack;
        stack.push(root);

        while (!stack.empty()) {
            int nodeId = stack.top();
            stack.pop();
            
            if (nodeId == nullNode) continue;
            
            const TreeNode* node = &nodes[nodeId];
            if (node->aabb.overlaps(aabb)) {
                if (node->isLeaf()) {
                    bool proceed = callback(nodeId);
                    if (!proceed) return;
                } else {
                    stack.push(node->left);
                    stack.push(node->right);
                }
            }
        }
    }
};

}
