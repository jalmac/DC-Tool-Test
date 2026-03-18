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
 * @param {Array<{x:number,y:number,label:string,type:string,rotation:number}>} existingRacks - existing racks to preserve properties from
 * @param {number} startingNumber - starting number for rack labels (0 or 1)
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
  doorOffset,
  doorFlipped = false,
  doorHingeRight = false,
  existingRacks = [],
  startingNumber = 1
) {
  const results = [];
  const racksPerRow = Math.ceil(numRacks / numRows);

  const ROW_GAP = 48; // consistent with legacy and your previous behavior

  const totalHeight = numRows * rackD + (numRows - 1) * ROW_GAP;
  const startY = Math.max((roomH - totalHeight) / 2, 0);

  let count = 0;
  let serverCount = startingNumber - 1; // Track server racks separately for numbering

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
          doorOffset,
          doorFlipped,
          doorHingeRight
        )
      ) {
        continue;
      }

      // Preserve properties from existing rack if available
      const existingRack = existingRacks[count];
      const type = existingRack?.type || "server";
      const rotation = existingRack?.rotation || 0;

      // Only number server racks, cooling racks get blank label
      let label;
      if (type === "cooling") {
        label = "";
      } else {
        serverCount++;
        label = `Rack\n${serverCount}`;
      }

      results.push({
        x,
        y,
        label,
        rotation,
        type,
        rowIndex: row,
        columnIndex: col,
      });

      count++;
      if (count === numRacks) return results;
    }
  }

  return results;
}

/**
 * Generate racks with custom counts per row, preserving gaps from deleted racks.
 * This allows configurations like [4, 3, 4] where middle row has fewer racks.
 *
 * @param {Array<number>} racksPerRowArray - Array of rack counts per row, e.g., [4, 3, 4]
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
 * @param {boolean} doorFlipped
 * @param {boolean} doorHingeRight
 * @param {Array<{x:number,y:number,label:string,type:string,rotation:number,rowIndex:number,columnIndex:number}>} existingRacks
 * @param {number} startingNumber
 * @returns {Array<{x:number,y:number,label:string,type:string,rotation:number,rowIndex:number,columnIndex:number}>}
 */
export function customLayoutRacks(
  racksPerRowArray,
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
  doorOffset,
  doorFlipped = false,
  doorHingeRight = false,
  existingRacks = [],
  startingNumber = 1,
  rightToLeft = false
) {
  const results = [];
  const numRows = racksPerRowArray.length;
  const ROW_GAP = 48;

  const totalHeight = numRows * rackD + (numRows - 1) * ROW_GAP;
  const startY = Math.max((roomH - totalHeight) / 2, 0);

  let serverCount = startingNumber - 1;

  for (let row = 0; row < numRows; row++) {
    const racksInThisRow = racksPerRowArray[row];

    const rowWidth =
      racksInThisRow * rackW +
      (racksInThisRow - 1) * (showCableManagers ? cableManagerPx : 0);

    const startX = Math.max((roomW - rowWidth) / 2, 0);

    // Collect all racks in this row first
    const rowRacks = [];
    for (let col = 0; col < racksInThisRow; col++) {
      const x = startX + col * (rackW + (showCableManagers ? cableManagerPx : 0));
      const y = startY + row * (rackD + ROW_GAP);

      const existingRack = existingRacks.find(
        r => r.rowIndex === row && r.columnIndex === col
      );

      const type = existingRack?.type || "server";
      const rotation = existingRack?.rotation || 0;

      rowRacks.push({
        x,
        y,
        type,
        rotation,
        rowIndex: row,
        columnIndex: col,
      });
    }

    // Count servers in this row and assign numbers
    const serverIndices = rowRacks
      .map((rack, idx) => (rack.type === "server" ? idx : -1))
      .filter(idx => idx !== -1);

    const serverNumbers = [];
    for (let i = 0; i < serverIndices.length; i++) {
      serverCount++;
      serverNumbers.push(serverCount);
    }

    // If right to left, reverse the server numbers
    if (rightToLeft) {
      serverNumbers.reverse();
    }

    // Apply labels to racks
    let serverIdx = 0;
    for (const rack of rowRacks) {
      let label;
      if (rack.type === "cooling") {
        label = "";
      } else {
        label = `Rack\n${serverNumbers[serverIdx]}`;
        serverIdx++;
      }

      results.push({
        ...rack,
        label,
      });
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
  doorOffset,
  doorFlipped = false,
  doorHingeRight = false
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
      doorOffset,
      doorFlipped,
      doorHingeRight
    )
  ) {
    return false;
  }

  return true;
}
