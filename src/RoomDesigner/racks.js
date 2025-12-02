// racks.js — FINAL VERSION
// Modern, stable, polygon-aware rack engine.
// Provides strict auto-pack (Option A), grid snapping, cable manager spacing,
// door swing avoidance, and polygon boundary constraints.

/**
 * Auto-pack racks into rows, centered, respecting polygon boundaries.
 *
 * @param {number} numRacks
 * @param {number} numRows
 * @param {number} roomW
 * @param {number} roomH
 * @param {number} rackW
 * @param {number} rackD
 * @param {boolean} showCableManagers
 * @param {number} cableManagerPx
 * @param {function} insidePoly
 * @param {function} doorBlocked
 * @param {Array<[number, number]>} polygon
 * @param {string} doorSide
 * @param {{width:number, leaf:number}} door
 * @param {number} doorOffset
 * @returns {Array<{x:number,y:number,label:string}>}
 */
export function autoPackRacks(
  numRacks,
  numRows,
  roomW,
  roomH,
  rackW,
  rackD,
  showCableManagers,
  cableManagerPx,
  insidePoly,
  doorBlocked,
  polygon,
  doorSide,
  door,
  doorOffset
) {
  const results = [];
  const racksPerRow = Math.ceil(numRacks / numRows);

  const ROW_GAP = 48; // consistent with legacy and your previous behavior

  const totalHeight = numRows * rackD + (numRows - 1) * ROW_GAP;
  const startY = Math.max((roomH - totalHeight) / 2, 0);

  let count = 0;

  for (let row = 0; row < numRows; row++) {
    const racksInThisRow =
      row === numRows - 1
        ? numRacks - racksPerRow * (numRows - 1)
        : racksPerRow;

    const rowWidth =
      racksInThisRow * rackW +
      (racksInThisRow - 1) *
        (showCableManagers ? cableManagerPx : 0);

    const startX = Math.max((roomW - rowWidth) / 2, 0);

    for (let col = 0; col < racksInThisRow; col++) {
      const x =
        startX +
        col *
          (rackW + (showCableManagers ? cableManagerPx : 0));
      const y = startY + row * (rackD + ROW_GAP);

      // Must be fully inside the polygon
      if (!insidePoly(x, y, rackW, rackD, polygon)) continue;

      // Must not block door swing
      if (
        doorBlocked(
          x,
          y,
          rackW,
          rackD,
          doorSide,
          door,
          roomW,
          roomH,
          polygon,
          doorOffset
        )
      ) {
        continue;
      }

      results.push({
        x,
        y,
        label: `Rack\n${count + 1}`,
      });

      count++;
      if (count === numRacks) return results;
    }
  }

  return results;
}

/**
 * Grid-snaps a rack to exact row/column position.
 * This restores your OLD tool’s rack-snapping behavior.
 *
 * @returns {{x:number,y:number}}
 */
export function snapRackToGrid(
  index,
  racks,
  rackW,
  rackD,
  showCableManagers,
  cableManagerPx,
  numRacks,
  numRows
) {
  if (!racks.length) return { x: 0, y: 0 };

  const racksPerRow = Math.ceil(numRacks / numRows);
  const col = index % racksPerRow;
  const row = Math.floor(index / racksPerRow);

  const first = racks[0]; // anchor position

  const ROW_GAP = 48;

  const x =
    first.x +
    col *
      (rackW + (showCableManagers ? cableManagerPx : 0));

  const y = first.y + row * (rackD + ROW_GAP);

  return { x, y };
}

/**
 * Validate rack placement (polygon + door swing).
 */
export function rackPositionIsValid(
  x,
  y,
  rackW,
  rackD,
  polygon,
  insidePoly,
  doorBlocked,
  doorSide,
  door,
  roomW,
  roomH,
  doorOffset
) {
  if (!insidePoly(x, y, rackW, rackD, polygon)) return false;

  if (
    doorBlocked(
      x,
      y,
      rackW,
      rackD,
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
