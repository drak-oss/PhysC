function _circleCircle(ax, ay, ar, bx, by, br) {
  return Math.hypot(bx - ax, by - ay) < ar + br - 0.5;
}

function _circleBox(cx, cy, cr, bx, by, bhw, bhh, bRot) {
  const cos = Math.cos(-bRot), sin = Math.sin(-bRot);
  const dx = cx - bx, dy = cy - by;
  const lx = dx * cos - dy * sin;
  const ly = dx * sin + dy * cos;
  const nearX = Math.max(-bhw, Math.min(bhw, lx));
  const nearY = Math.max(-bhh, Math.min(bhh, ly));
  return Math.hypot(lx - nearX, ly - nearY) < cr - 0.5;
}

function _projectOBB(hw, hh, rot, ax, ay) {
  const cos = Math.cos(rot), sin = Math.sin(rot);
  return hw * Math.abs(ax * cos + ay * sin) + hh * Math.abs(-ax * sin + ay * cos);
}

function _boxBox(ax, ay, ahw, ahh, aRot, bx, by, bhw, bhh, bRot) {
  const dx = bx - ax, dy = by - ay;
  const axes = [
    [Math.cos(aRot), Math.sin(aRot)],
    [-Math.sin(aRot), Math.cos(aRot)],
    [Math.cos(bRot), Math.sin(bRot)],
    [-Math.sin(bRot), Math.cos(bRot)],
  ];
  for (const [nx, ny] of axes) {
    const d   = Math.abs(dx * nx + dy * ny);
    const ra  = _projectOBB(ahw, ahh, aRot, nx, ny);
    const rb  = _projectOBB(bhw, bhh, bRot, nx, ny);
    if (d >= ra + rb - 0.5) return false;
  }
  return true;
}

export function bodiesOverlap(a, b) {
  const ar  = a.props?.radius ?? 40;
  const ahw = (a.props?.width  ?? 80) / 2;
  const ahh = (a.props?.height ?? 40) / 2;
  const aRot = a.rotation ?? 0;
  const br  = b.props?.radius ?? 40;
  const bhw = (b.props?.width  ?? 80) / 2;
  const bhh = (b.props?.height ?? 40) / 2;
  const bRot = b.rotation ?? 0;

  if (a.type === 'disk' && b.type === 'disk')  return _circleCircle(a.x, a.y, ar, b.x, b.y, br);
  if (a.type === 'disk' && b.type === 'block') return _circleBox(a.x, a.y, ar, b.x, b.y, bhw, bhh, bRot);
  if (a.type === 'block' && b.type === 'disk') return _circleBox(b.x, b.y, br, a.x, a.y, ahw, ahh, aRot);
  return _boxBox(a.x, a.y, ahw, ahh, aRot, b.x, b.y, bhw, bhh, bRot);
}
