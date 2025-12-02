// acUnits.js — FINAL VERSION
// AC placement engine supporting polygon-edge snapping,
// door swing avoidance, polygon bounds, and fallback placement.

import {
  boxInsidePolygon,
  isInDoorSwing,
  snapPointToPolygonEdges,
  getWallPosition,
} from "./geometry";

/* -----------------------------------------------------------
 *  GET AC PIXEL POSITION
 * --------------------------------------------------------- */

/**
 * Convert AC {side, offset} into real pixel coordinates.
 */
export function getACPixelPosition(ac, roomW, roomH) {
  return getWallPosition(
    ac.side,
    ac.offset,
    ac.width,
    ac.height,
    roomW,
    roomH
  );
}

/* -----------------------------------------------------------
 *  SNAP VALIDATION
 * --------------------------------------------------------- */

export function acSnapIsValid(
  snap,
  ac,
  polygon,
  roomW,
  roomH,
  doorSide,
  door,
  doorOffset
) {
  const test = {
    ...ac,
    side: snap.side,
    offset: snap.offset,
  };

  const [x, y] = getACPixelPosition(test, roomW, roomH);

  // AC must remain inside the polygon
  if (!boxInsidePolygon(x, y, ac.width, ac.height, polygon)) return false;

  // AC must not block the door swing
  if (
    isInDoorSwing(
      x,
      y,
      ac.width,
      ac.height,
      doorSide,
      door,
      roomW,
      roomH,
      polygon,
      doorOffset
    )
  ) {
    return false;
  }

  return true;
}

/* -----------------------------------------------------------
 *  FALLBACK OFFSET SEARCH (same wall)
 * --------------------------------------------------------- */

export function findFallbackOffset(
  ac,
  polygon,
  roomW,
  roomH,
  doorSide,
  door,
  doorOffset
) {
  const STEPS = 100;

  for (let i = 0; i <= STEPS; i++) {
    const offset = i / STEPS;

    const test = { ...ac, offset };
    const [x, y] = getACPixelPosition(test, roomW, roomH);

    if (!boxInsidePolygon(x, y, ac.width, ac.height, polygon)) continue;

    const blocked = isInDoorSwing(
      x,
      y,
      ac.width,
      ac.height,
      doorSide,
      door,
      roomW,
      roomH,
      polygon,
      doorOffset
    );

    if (!blocked) return offset;
  }

  return null;
}

/* -----------------------------------------------------------
 *  FINALIZE AC DRAG END
 * --------------------------------------------------------- */

export function resolveACDrag(
  acUnits,
  ac,
  snap,
  polygon,
  roomW,
  roomH,
  doorSide,
  door,
  doorOffset
) {
  // Primary attempt
  const ok = acSnapIsValid(
    snap,
    ac,
    polygon,
    roomW,
    roomH,
    doorSide,
    door,
    doorOffset
  );

  if (ok) {
    return acUnits.map((u) =>
      u.id === ac.id
        ? { ...u, side: snap.side, offset: snap.offset }
        : u
    );
  }

  // Fallback scan along the same wall
  const fallbackOffset = findFallbackOffset(
    ac,
    polygon,
    roomW,
    roomH,
    doorSide,
    door,
    doorOffset
  );

  if (fallbackOffset !== null) {
    return acUnits.map((u) =>
      u.id === ac.id ? { ...u, offset: fallbackOffset } : u
    );
  }

  // No valid position found → leave AC where it was
  return acUnits;
}

/* -----------------------------------------------------------
 *  AC RESIZING (FORM-ONLY)
 * --------------------------------------------------------- */

export function resizeAC(acUnits, acId, newW, newH) {
  return acUnits.map((u) =>
    u.id === acId
      ? {
          ...u,
          width: Math.max(16, newW),
          height: Math.max(16, newH),
        }
      : u
  );
}
