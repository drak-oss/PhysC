export function computeLocalAnchors(bodies, constraints) {
    const la = {};
    for (const c of constraints) {
        const bA = bodies.find(b => b.id === c.bodyA);
        const bB = bodies.find(b => b.id === c.bodyB);

        if (c.type === 'Hinge' || c.type === 'Motor') {
            if (!bA) continue;
            const cos = Math.cos(-bA.rotation), sin = Math.sin(-bA.rotation);
            const dxA = c.ax1 - bA.x, dyA = c.ay1 - bA.y;
            const axA = dxA * cos - dyA * sin, ayA = dxA * sin + dyA * cos;
            let axB = 0, ayB = 0;
            if (bB) {
                const cosB = Math.cos(-bB.rotation), sinB = Math.sin(-bB.rotation);
                const dxB = c.ax2 - bB.x, dyB = c.ay2 - bB.y;
                axB = dxB * cosB - dyB * sinB; ayB = dxB * sinB + dyB * cosB;
            }
            la[c.id] = { axA, ayA, axB, ayB };
        } else if (c.type === 'Weld') {
            if (!bA) continue;
            const cos = Math.cos(-bA.rotation), sin = Math.sin(-bA.rotation);
            const dxA = c.anchorX - bA.x, dyA = c.anchorY - bA.y;
            const axA = dxA * cos - dyA * sin, ayA = dxA * sin + dyA * cos;
            let axB = 0, ayB = 0;
            if (bB) {
                const cosB = Math.cos(-bB.rotation), sinB = Math.sin(-bB.rotation);
                const dxB = c.anchorX - bB.x, dyB = c.anchorY - bB.y;
                axB = dxB * cosB - dyB * sinB; ayB = dxB * sinB + dyB * cosB;
            }
            la[c.id] = { axA, ayA, axB, ayB };
        } else if (c.type === 'Distance' || c.type === 'Spring' || c.type === 'Rod') {
            if (!bA) continue;
            const cosA = Math.cos(-bA.rotation), sinA = Math.sin(-bA.rotation);
            const dxA = c.ax1 - bA.x, dyA = c.ay1 - bA.y;
            const axA = dxA * cosA - dyA * sinA;
            const ayA = dxA * sinA + dyA * cosA;
            let axB = 0, ayB = 0;
            if (bB) {
                const cosB = Math.cos(-bB.rotation), sinB = Math.sin(-bB.rotation);
                const dxB = c.ax2 - bB.x, dyB = c.ay2 - bB.y;
                axB = dxB * cosB - dyB * sinB;
                ayB = dxB * sinB + dyB * cosB;
            }
            la[c.id] = { axA, ayA, axB, ayB };
        } else if (c.type === 'Slider') {
            
            
            let axA = 0, ayA = 0;
            if (bA) {
                const cosA = Math.cos(-bA.rotation), sinA = Math.sin(-bA.rotation);
                const dxA = c.ax1 - bA.x, dyA = c.ay1 - bA.y;
                axA = dxA * cosA - dyA * sinA; ayA = dxA * sinA + dyA * cosA;
            }
            let axB = 0, ayB = 0;
            if (bB) {
                const cosB = Math.cos(-bB.rotation), sinB = Math.sin(-bB.rotation);
                const dxB = c.ax2 - bB.x, dyB = c.ay2 - bB.y;
                axB = dxB * cosB - dyB * sinB; ayB = dxB * sinB + dyB * cosB;
            }
            la[c.id] = { axA, ayA, axB, ayB };
        } else if (c.type === 'Pulley') {
            let axA = 0, ayA = 0, axB = 0, ayB = 0;
            if (bA) {
                const cosA = Math.cos(-bA.rotation), sinA = Math.sin(-bA.rotation);
                const dxA = (c.localAx ?? bA.x) - bA.x, dyA = (c.localAy ?? bA.y) - bA.y;
                axA = dxA * cosA - dyA * sinA; ayA = dxA * sinA + dyA * cosA;
            }
            if (bB) {
                const cosB = Math.cos(-bB.rotation), sinB = Math.sin(-bB.rotation);
                const dxB = (c.localBx ?? bB.x) - bB.x, dyB = (c.localBy ?? bB.y) - bB.y;
                axB = dxB * cosB - dyB * sinB; ayB = dxB * sinB + dyB * cosB;
            }
            la[c.id] = { axA, ayA, axB, ayB };
        }
    }
    return la;
}
