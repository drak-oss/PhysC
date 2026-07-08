#include "DynamicTree.h"
#include <cmath>
#include <algorithm>

namespace physics {

DynamicTree::DynamicTree() {
    root = nullNode;
    nodeCapacity = 16;
    nodeCount = 0;
    nodes.resize(nodeCapacity);

    
    for (int i = 0; i < nodeCapacity - 1; ++i) {
        nodes[i].right = i + 1;
        nodes[i].height = -1;
    }
    nodes[nodeCapacity - 1].right = nullNode;
    nodes[nodeCapacity - 1].height = -1;
    freeList = 0;
}

DynamicTree::~DynamicTree() {
}

int DynamicTree::allocateNode() {
    if (freeList == nullNode) {
        int oldCapacity = nodeCapacity;
        nodeCapacity *= 2;
        nodes.resize(nodeCapacity);

        for (int i = oldCapacity; i < nodeCapacity - 1; ++i) {
            nodes[i].right = i + 1;
            nodes[i].height = -1;
        }
        nodes[nodeCapacity - 1].right = nullNode;
        nodes[nodeCapacity - 1].height = -1;
        freeList = oldCapacity;
    }

    int nodeId = freeList;
    freeList = nodes[nodeId].right;
    nodes[nodeId].parent = nullNode;
    nodes[nodeId].left = nullNode;
    nodes[nodeId].right = nullNode;
    nodes[nodeId].height = 0;
    ++nodeCount;
    return nodeId;
}

void DynamicTree::freeNode(int nodeId) {
    nodes[nodeId].right = freeList;
    nodes[nodeId].height = -1;
    freeList = nodeId;
    --nodeCount;
}

int DynamicTree::createProxy(const AABB& aabb, Handle<Body> bodyId) {
    int proxyId = allocateNode();

    
    Vec2 r(0.1f, 0.1f);
    nodes[proxyId].aabb.min = aabb.min - r;
    nodes[proxyId].aabb.max = aabb.max + r;
    nodes[proxyId].bodyId = bodyId;
    nodes[proxyId].height = 0;

    insertLeaf(proxyId);
    return proxyId;
}

void DynamicTree::destroyProxy(int proxyId) {
    removeLeaf(proxyId);
    freeNode(proxyId);
}

bool DynamicTree::moveProxy(int proxyId, const AABB& aabb, const Vec2& displacement) {
    if (nodes[proxyId].aabb.contains(aabb)) {
        return false;
    }

    removeLeaf(proxyId);

    
    AABB b = aabb;
    Vec2 r(0.1f, 0.1f);
    b.min = b.min - r;
    b.max = b.max + r;

    Vec2 d = displacement * 2.0f;
    if (d.x < 0.0f) b.min.x += d.x; else b.max.x += d.x;
    if (d.y < 0.0f) b.min.y += d.y; else b.max.y += d.y;

    nodes[proxyId].aabb = b;

    insertLeaf(proxyId);
    return true;
}

void DynamicTree::insertLeaf(int leaf) {
    if (root == nullNode) {
        root = leaf;
        nodes[root].parent = nullNode;
        return;
    }

    AABB leafAABB = nodes[leaf].aabb;
    int index = root;
    while (!nodes[index].isLeaf()) {
        int left = nodes[index].left;
        int right = nodes[index].right;

        float area = nodes[index].aabb.getPerimeter();

        AABB combinedAABB = AABB::combine(nodes[index].aabb, leafAABB);
        float combinedArea = combinedAABB.getPerimeter();

        float cost = 2.0f * combinedArea;
        float inheritanceCost = 2.0f * (combinedArea - area);

        float cost1;
        if (nodes[left].isLeaf()) {
            AABB aabb = AABB::combine(leafAABB, nodes[left].aabb);
            cost1 = aabb.getPerimeter() + inheritanceCost;
        } else {
            AABB aabb = AABB::combine(leafAABB, nodes[left].aabb);
            float oldArea = nodes[left].aabb.getPerimeter();
            float newArea = aabb.getPerimeter();
            cost1 = (newArea - oldArea) + inheritanceCost;
        }

        float cost2;
        if (nodes[right].isLeaf()) {
            AABB aabb = AABB::combine(leafAABB, nodes[right].aabb);
            cost2 = aabb.getPerimeter() + inheritanceCost;
        } else {
            AABB aabb = AABB::combine(leafAABB, nodes[right].aabb);
            float oldArea = nodes[right].aabb.getPerimeter();
            float newArea = aabb.getPerimeter();
            cost2 = (newArea - oldArea) + inheritanceCost;
        }

        if (cost < cost1 && cost < cost2) {
            break;
        }

        if (cost1 < cost2) {
            index = left;
        } else {
            index = right;
        }
    }

    int sibling = index;
    int oldParent = nodes[sibling].parent;
    int newParent = allocateNode();
    nodes[newParent].parent = oldParent;
    nodes[newParent].aabb = AABB::combine(leafAABB, nodes[sibling].aabb);
    nodes[newParent].height = std::max(nodes[sibling].height, nodes[leaf].height) + 1;

    if (oldParent != nullNode) {
        if (nodes[oldParent].left == sibling) {
            nodes[oldParent].left = newParent;
        } else {
            nodes[oldParent].right = newParent;
        }
        nodes[newParent].left = sibling;
        nodes[newParent].right = leaf;
        nodes[sibling].parent = newParent;
        nodes[leaf].parent = newParent;
    } else {
        nodes[newParent].left = sibling;
        nodes[newParent].right = leaf;
        nodes[sibling].parent = newParent;
        nodes[leaf].parent = newParent;
        root = newParent;
    }

    index = nodes[leaf].parent;
    while (index != nullNode) {
        index = balance(index);

        int left = nodes[index].left;
        int right = nodes[index].right;
        nodes[index].height = std::max(nodes[left].height, nodes[right].height) + 1;
        nodes[index].aabb = AABB::combine(nodes[left].aabb, nodes[right].aabb);

        index = nodes[index].parent;
    }
}

void DynamicTree::removeLeaf(int leaf) {
    if (leaf == root) {
        root = nullNode;
        return;
    }

    int parent = nodes[leaf].parent;
    int grandParent = nodes[parent].parent;
    int sibling;
    if (nodes[parent].left == leaf) {
        sibling = nodes[parent].right;
    } else {
        sibling = nodes[parent].left;
    }

    if (grandParent != nullNode) {
        if (nodes[grandParent].left == parent) {
            nodes[grandParent].left = sibling;
        } else {
            nodes[grandParent].right = sibling;
        }
        nodes[sibling].parent = grandParent;
        freeNode(parent);

        int index = grandParent;
        while (index != nullNode) {
            index = balance(index);
            int left = nodes[index].left;
            int right = nodes[index].right;
            nodes[index].aabb = AABB::combine(nodes[left].aabb, nodes[right].aabb);
            nodes[index].height = std::max(nodes[left].height, nodes[right].height) + 1;
            index = nodes[index].parent;
        }
    } else {
        root = sibling;
        nodes[sibling].parent = nullNode;
        freeNode(parent);
    }
}

int DynamicTree::balance(int iA) {
    if (nodes[iA].isLeaf() || nodes[iA].height < 2) {
        return iA;
    }

    int iB = nodes[iA].left;
    int iC = nodes[iA].right;

    int balance = nodes[iC].height - nodes[iB].height;

    if (balance > 1) {
        int iF = nodes[iC].left;
        int iG = nodes[iC].right;

        nodes[iC].left = iA;
        nodes[iC].parent = nodes[iA].parent;
        nodes[iA].parent = iC;

        if (nodes[iC].parent != nullNode) {
            if (nodes[nodes[iC].parent].left == iA) {
                nodes[nodes[iC].parent].left = iC;
            } else {
                nodes[nodes[iC].parent].right = iC;
            }
        } else {
            root = iC;
        }

        if (nodes[iF].height > nodes[iG].height) {
            nodes[iC].right = iF;
            nodes[iA].right = iG;
            nodes[iG].parent = iA;
            nodes[iA].aabb = AABB::combine(nodes[iB].aabb, nodes[iG].aabb);
            nodes[iC].aabb = AABB::combine(nodes[iA].aabb, nodes[iF].aabb);

            nodes[iA].height = std::max(nodes[iB].height, nodes[iG].height) + 1;
            nodes[iC].height = std::max(nodes[iA].height, nodes[iF].height) + 1;
        } else {
            nodes[iC].right = iG;
            nodes[iA].right = iF;
            nodes[iF].parent = iA;
            nodes[iA].aabb = AABB::combine(nodes[iB].aabb, nodes[iF].aabb);
            nodes[iC].aabb = AABB::combine(nodes[iA].aabb, nodes[iG].aabb);

            nodes[iA].height = std::max(nodes[iB].height, nodes[iF].height) + 1;
            nodes[iC].height = std::max(nodes[iA].height, nodes[iG].height) + 1;
        }

        return iC;
    }

    if (balance < -1) {
        int iD = nodes[iB].left;
        int iE = nodes[iB].right;

        nodes[iB].left = iA;
        nodes[iB].parent = nodes[iA].parent;
        nodes[iA].parent = iB;

        if (nodes[iB].parent != nullNode) {
            if (nodes[nodes[iB].parent].left == iA) {
                nodes[nodes[iB].parent].left = iB;
            } else {
                nodes[nodes[iB].parent].right = iB;
            }
        } else {
            root = iB;
        }

        if (nodes[iD].height > nodes[iE].height) {
            nodes[iB].right = iD;
            nodes[iA].left = iE;
            nodes[iE].parent = iA;
            nodes[iA].aabb = AABB::combine(nodes[iC].aabb, nodes[iE].aabb);
            nodes[iB].aabb = AABB::combine(nodes[iA].aabb, nodes[iD].aabb);

            nodes[iA].height = std::max(nodes[iC].height, nodes[iE].height) + 1;
            nodes[iB].height = std::max(nodes[iA].height, nodes[iD].height) + 1;
        } else {
            nodes[iB].right = iE;
            nodes[iA].left = iD;
            nodes[iD].parent = iA;
            nodes[iA].aabb = AABB::combine(nodes[iC].aabb, nodes[iD].aabb);
            nodes[iB].aabb = AABB::combine(nodes[iA].aabb, nodes[iE].aabb);

            nodes[iA].height = std::max(nodes[iC].height, nodes[iD].height) + 1;
            nodes[iB].height = std::max(nodes[iA].height, nodes[iE].height) + 1;
        }

        return iB;
    }

    return iA;
}

Handle<Body> DynamicTree::getBody(int proxyId) const {
    return nodes[proxyId].bodyId;
}

const AABB& DynamicTree::getFatAABB(int proxyId) const {
    return nodes[proxyId].aabb;
}

}
