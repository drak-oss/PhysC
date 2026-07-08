#include "Narrowphase.h"
#include <limits>

namespace physics {

bool Narrowphase::collide(const Body* bA, const Shape* sA, const Body* bB, const Shape* sB, ContactManifold& manifold) {
    if (sA->type == ShapeType::Circle && sB->type == ShapeType::Circle) {
        return collideCircleCircle(bA, sA, bB, sB, manifold);
    } else if (sA->type == ShapeType::Polygon && sB->type == ShapeType::Polygon) {
        return collidePolygonPolygon(bA, sA, bB, sB, manifold);
    } else if (sA->type == ShapeType::Circle && sB->type == ShapeType::Polygon) {
        return collideCirclePolygon(bA, sA, bB, sB, manifold);
    } else if (sA->type == ShapeType::Polygon && sB->type == ShapeType::Circle) {
        return collidePolygonCircle(bA, sA, bB, sB, manifold);
    }
    return false;
}

bool Narrowphase::collideCircleCircle(const Body* bA, const Shape* sA, const Body* bB, const Shape* sB, ContactManifold& manifold) {
    Vec2 pA = bA->position + Vec2::rotate(sA->circle.offset, bA->rotation);
    Vec2 pB = bB->position + Vec2::rotate(sB->circle.offset, bB->rotation);

    Vec2 d = pB - pA;
    float distSq = d.x * d.x + d.y * d.y;
    float r = sA->circle.radius + sB->circle.radius;

    if (distSq > r * r) {
        return false;
    }

    float dist = std::sqrt(distSq);
    Vec2 n;
    if (dist == 0.0f) {
        n = Vec2(0.0f, 1.0f);
        dist = 0.001f;
    } else {
        n = d * (1.0f / dist);
    }

    float depth = r - dist;

    ContactPoint cp;
    cp.normal = n;
    cp.depth = depth;
    cp.position = pB - n * sB->circle.radius;
    cp.localA = bA->worldToLocal(cp.position);
    cp.localB = bB->worldToLocal(cp.position);

    manifold.contacts.push_back(cp);
    return true;
}

static void projectPolygon(const Vec2* vertices, int count, const Vec2& pos, float rot, const Vec2& axis, float& minProj, float& maxProj) {
    minProj = std::numeric_limits<float>::max();
    maxProj = std::numeric_limits<float>::lowest();
    for (int i = 0; i < count; ++i) {
        Vec2 p = pos + Vec2::rotate(vertices[i], rot);
        float proj = p.dot(axis);
        if (proj < minProj) minProj = proj;
        if (proj > maxProj) maxProj = proj;
    }
}

static float findMinPenetration(const Body* bA, const Shape* sA, const Body* bB, const Shape* sB, int& bestIndex) {
    float bestDist = std::numeric_limits<float>::lowest();
    bestIndex = -1;

    for (int i = 0; i < sA->polygon.vertexCount; ++i) {
        Vec2 n = Vec2::rotate(sA->polygon.normals[i], bA->rotation);
        
        float minB, maxB;
        projectPolygon(sB->polygon.vertices, sB->polygon.vertexCount, bB->position, bB->rotation, n, minB, maxB);
        
        float minA, maxA;
        projectPolygon(sA->polygon.vertices, sA->polygon.vertexCount, bA->position, bA->rotation, n, minA, maxA);

        float dist = minB - maxA; 
        if (dist > 0.0f) {
            return dist; 
        }
        
        if (dist > bestDist) {
            bestDist = dist;
            bestIndex = i;
        }
    }
    return bestDist;
}

static void findIncidentFace(Vec2* v, const Body* refBody, const Shape* refShape, int refIndex, const Body* incBody, const Shape* incShape) {
    Vec2 refNormal = Vec2::rotate(refShape->polygon.normals[refIndex], refBody->rotation);
    
    int incFace = 0;
    float minDot = std::numeric_limits<float>::max();
    for (int i = 0; i < incShape->polygon.vertexCount; ++i) {
        Vec2 incNormal = Vec2::rotate(incShape->polygon.normals[i], incBody->rotation);
        float d = refNormal.dot(incNormal);
        if (d < minDot) {
            minDot = d;
            incFace = i;
        }
    }
    
    v[0] = incBody->position + Vec2::rotate(incShape->polygon.vertices[incFace], incBody->rotation);
    v[1] = incBody->position + Vec2::rotate(incShape->polygon.vertices[(incFace + 1) % incShape->polygon.vertexCount], incBody->rotation);
}

static int clipSegmentToLine(Vec2 vOut[2], Vec2 vIn[2], const Vec2& normal, float offset) {
    int numOut = 0;
    float d0 = normal.dot(vIn[0]) - offset;
    float d1 = normal.dot(vIn[1]) - offset;
    
    if (d0 <= 0.0f) vOut[numOut++] = vIn[0];
    if (d1 <= 0.0f) vOut[numOut++] = vIn[1];
    
    if (d0 * d1 < 0.0f) {
        float interp = d0 / (d0 - d1);
        vOut[numOut++] = vIn[0] + (vIn[1] - vIn[0]) * interp;
    }
    return numOut;
}

bool Narrowphase::collidePolygonPolygon(const Body* bA, const Shape* sA, const Body* bB, const Shape* sB, ContactManifold& manifold) {
    int faceA;
    float penA = findMinPenetration(bA, sA, bB, sB, faceA);
    if (penA > 0.0f) return false;

    int faceB;
    float penB = findMinPenetration(bB, sB, bA, sA, faceB);
    if (penB > 0.0f) return false;

    bool flip = false;
    const Body* refBody;
    const Shape* refShape;
    const Body* incBody;
    const Shape* incShape;
    int refIndex;
    
    if (penB > penA + 0.001f) {
        refBody = bB; refShape = sB;
        incBody = bA; incShape = sA;
        refIndex = faceB;
        flip = true;
    } else {
        refBody = bA; refShape = sA;
        incBody = bB; incShape = sB;
        refIndex = faceA;
    }

    Vec2 incFace[2];
    findIncidentFace(incFace, refBody, refShape, refIndex, incBody, incShape);

    Vec2 v1 = refBody->position + Vec2::rotate(refShape->polygon.vertices[refIndex], refBody->rotation);
    Vec2 v2 = refBody->position + Vec2::rotate(refShape->polygon.vertices[(refIndex + 1) % refShape->polygon.vertexCount], refBody->rotation);

    Vec2 refNormal = Vec2::rotate(refShape->polygon.normals[refIndex], refBody->rotation);
    Vec2 refTangent = Vec2(-refNormal.y, refNormal.x);
    
    float refC = refNormal.dot(v1);
    float negSide = -refTangent.dot(v1);
    float posSide =  refTangent.dot(v2);

    Vec2 clipPoints1[2];
    int np = clipSegmentToLine(clipPoints1, incFace, -refTangent, negSide);
    if (np < 2) return false;

    Vec2 clipPoints2[2];
    np = clipSegmentToLine(clipPoints2, clipPoints1, refTangent, posSide);
    if (np < 2) return false;

    for (int i = 0; i < 2; ++i) {
        float separation = refNormal.dot(clipPoints2[i]) - refC;
        if (separation <= 0.0f) {
            ContactPoint cp;
            cp.normal = flip ? -refNormal : refNormal;
            cp.depth = -separation;
            cp.position = clipPoints2[i]; 
            cp.localA = bA->worldToLocal(cp.position);
            cp.localB = bB->worldToLocal(cp.position);
            manifold.contacts.push_back(cp);
        }
    }

    return manifold.contacts.size() > 0;
}

bool Narrowphase::collideCirclePolygon(const Body* bA, const Shape* sA, const Body* bB, const Shape* sB, ContactManifold& manifold) {
    Vec2 center = bA->position + Vec2::rotate(sA->circle.offset, bA->rotation);
    Vec2 localCenter = bB->worldToLocal(center);

    float maxPen = std::numeric_limits<float>::lowest();
    int bestFace = -1;

    for (int i = 0; i < sB->polygon.vertexCount; ++i) {
        float d = sB->polygon.normals[i].dot(localCenter - sB->polygon.vertices[i]);
        if (d > sA->circle.radius) {
            return false;
        }
        if (d > maxPen) {
            maxPen = d;
            bestFace = i;
        }
    }

    if (bestFace == -1) return false;
    
    Vec2 v1 = sB->polygon.vertices[bestFace];
    Vec2 v2 = sB->polygon.vertices[(bestFace + 1) % sB->polygon.vertexCount];

    float dot1 = (localCenter - v1).dot(v2 - v1);
    float dot2 = (localCenter - v2).dot(v1 - v2);
    
    Vec2 localClosest;
    if (dot1 <= 0.0f) {
        localClosest = v1;
    } else if (dot2 <= 0.0f) {
        localClosest = v2;
    } else {
        localClosest = localCenter - sB->polygon.normals[bestFace] * maxPen;
    }

    Vec2 globalClosest = bB->position + Vec2::rotate(localClosest, bB->rotation);
    Vec2 d = center - globalClosest;
    float distSq = d.x * d.x + d.y * d.y;

    if (distSq > sA->circle.radius * sA->circle.radius) {
        return false;
    }

    float dist = std::sqrt(distSq);
    Vec2 n;
    if (dist == 0.0f) {
        n = Vec2::rotate(sB->polygon.normals[bestFace], bB->rotation);
        dist = 0.001f;
    } else {
        n = d * (1.0f / dist);
    }

    ContactPoint cp;
    
    
    cp.normal = -n;
    cp.depth = sA->circle.radius - dist;
    cp.position = globalClosest; 
    cp.localA = bA->worldToLocal(cp.position);
    cp.localB = bB->worldToLocal(cp.position);

    manifold.contacts.push_back(cp);
    return true;
}

bool Narrowphase::collidePolygonCircle(const Body* bA, const Shape* sA, const Body* bB, const Shape* sB, ContactManifold& manifold) {
    bool hit = collideCirclePolygon(bB, sB, bA, sA, manifold);
    if (hit) {
        for (auto& cp : manifold.contacts) {
            cp.normal = -cp.normal; 
            Vec2 temp = cp.localA; 
            cp.localA = cp.localB;
            cp.localB = temp;
        }
    }
    return hit;
}

}
