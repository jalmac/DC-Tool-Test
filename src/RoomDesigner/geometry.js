
// geometry.js — FINAL VERSION (CHUNK 1/4)
// Full geometry engine for polygon rooms, door dragging, AC/rack placement,
// continuous wall snapping, and collision logic.

/* -----------------------------------------------------------
 *  POLYGON SCALING
 * --------------------------------------------------------- */

/**
 * Uniformly scale polygon to new width/height.
 */
export function scalePolygon(points, targetW, targetH) {
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);

  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);

  const oldW = maxX - minX || 1;
  const oldH = maxY - minY || 1;

  const scaleX = targetW / oldW;
  const scaleY = targetH / oldH;

  return points.map(([x, y]) => [
    (x - minX) * scaleX,
    (y - minY) * scaleY,
  ]);
}
/* -----------------------------------------------------------
 *  POINT & BOX INSIDE POLYGON
 * --------------------------------------------------------- */

/**
 * Ray-casting point-in-polygon test.
 */
export function pointInsidePolygon([px, py], poly) {
  let inside = false;

  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];

    const intersect =
      yi > py !== yj > py &&
      px < ((xj - xi) * (py - yi)) / (yj - yi || 1) + xi;

    if (intersect) inside = !inside;
  }

  return inside;
}

/**
 * Check if rectangle is fully inside polygon.
 */
export function boxInsidePolygon(x, y, w, h, poly) {
  return (
    pointInsidePolygon([x, y], poly) &&
    pointInsidePolygon([x + w, y], poly) &&
    pointInsidePolygon([x, y + h], poly) &&
    pointInsidePolygon([x + w, y + h], poly)
  );
}
/* -----------------------------------------------------------
 *  SIMPLE RECTANGULAR WALL SNAP (fallback for racks)
 * --------------------------------------------------------- */

export function snapToWall(px, py, wPx, hPx, roomW, roomH) {
  const dists = [
    { side: "top", dist: py },
    { side: "bottom", dist: roomH - py - hPx },
    { side: "left", dist: px },
    { side: "right", dist: roomW - px - wPx },
  ];

  dists.sort((a, b) => a.dist - b.dist);
  const nearest = dists[0].side;

  let offset = 0;
  if (nearest === "top" || nearest === "bottom") {
    offset = px / (roomW - wPx);
  } else {
    offset = py / (roomH - hPx);
  }

  return {
    side: nearest,
    offset: Math.max(0, Math.min(1, offset)),
  };
}

/**
 * Convert wall side + offset → pixel coordinate.
 */
export function getWallPosition(side, offset, width, height, roomW, roomH) {
  let x = 0,
    y = 0;

  if (side === "top") {
    x = offset * (roomW - width);
    y = 0;
  }
  if (side === "bottom") {
    x = offset * (roomW - width);
    y = roomH - height;
  }
  if (side === "left") {
    x = 0;
    y = offset * (roomH - height);
  }
  if (side === "right") {
    x = roomW - width;
    y = offset * (roomH - height);
  }

  return [x, y];
}

/* -----------------------------------------------------------
 *  DOOR GEOMETRY + SWING COLLISION
 * --------------------------------------------------------- */

export function computeDoorGeometry(
  polygon,
  doorSide,
  door,
  roomW,
  roomH,
  doorOffset = 50
) {
  if (!polygon || polygon.length < 3) return null;

  // Determine which wall to anchor door
  const center = [roomW / 2, roomH / 2];
  let target = center;

  if (doorSide === "top") target = [center[0], 0];
  if (doorSide === "bottom") target = [center[0], roomH];
  if (doorSide === "left") target = [0, center[1]];
  if (doorSide === "right") target = [roomW, center[1]];

  // Find closest edge midpoint
  let best = { dist: 1e12, edgeIdx: 0, p1: null, p2: null, mid: null };

  polygon.forEach((p1, i) => {
    const p2 = polygon[(i + 1) % polygon.length];
    const mx = (p1[0] + p2[0]) / 2;
    const my = (p1[1] + p2[1]) / 2;

    const d = Math.hypot(mx - target[0], my - target[1]);
    if (d < best.dist) {
      best = { dist: d, edgeIdx: i, p1, p2, mid: [mx, my] };
    }
  });

  const [p1, p2] = [best.p1, best.p2];
  const [mx, my] = best.mid;

  const angle = Math.atan2(p2[1] - p1[1], p2[0] - p1[0]);
  const half = door.width / 2;

  const gx = half * Math.cos(angle);
  const gy = half * Math.sin(angle);

  const gapStart = [mx - gx, my - gy];
  const gapEnd = [mx + gx, my + gy];

  const leafAngle = angle - Math.PI / 2;
  const leaf = [
    gapStart[0],
    gapStart[1],
    gapStart[0] + door.leaf * Math.cos(leafAngle),
    gapStart[1] + door.leaf * Math.sin(leafAngle),
  ];

  return {
    gapStart,
    gapEnd,
    leaf,
    anchor: [mx, my],
    edgeIdx: best.edgeIdx,
  };
}

export function isInDoorSwing(
  x,
  y,
  w,
  h,
  doorSide,
  door,
  roomW,
  roomH,
  polygon,
  doorOffset
) {
  const g = computeDoorGeometry(
    polygon,
    doorSide,
    door,
    roomW,
    roomH,
    doorOffset
  );
  if (!g) return false;

  const cx = x + w / 2;
  const cy = y + h / 2;

  const gx = (g.gapStart[0] + g.gapEnd[0]) / 2;
  const gy = (g.gapStart[1] + g.gapEnd[1]) / 2;

  return Math.hypot(cx - gx, cy - gy) < Math.max(w, h);
}
/* -----------------------------------------------------------
 *  POLYGON EDIT HELPERS
 * --------------------------------------------------------- */

/**
 * Clamp a point inside room bounds.
 */
export function clampPoint(x, y, roomW, roomH) {
  return [
    Math.max(0, Math.min(roomW, x)),
    Math.max(0, Math.min(roomH, y)),
  ];
}

/**
 * Move polygon vertex safely, keeping it within bounds.
 */
export function movePolygonPoint(points, index, x, y, roomW, roomH) {
  const [cx, cy] = clampPoint(x, y, roomW, roomH);
  return points.map((p, i) => (i === index ? [cx, cy] : p));
}

/**
 * Insert midpoint between vertex index and next vertex.
 */
export function addPolygonPoint(points, index) {
  const next = (index + 1) % points.length;
  const [x1, y1] = points[index];
  const [x2, y2] = points[next];

  const mid = [(x1 + x2) / 2, (y1 + y2) / 2];

  const out = [...points];
  out.splice(index + 1, 0, mid);
  return out;
}

/**
 * Remove a polygon vertex (minimum 3 vertices required).
 */
export function removePolygonPoint(points, index) {
  if (points.length <= 3) return points;
  return points.filter((_, i) => i !== index);
}
