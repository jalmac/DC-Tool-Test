// RoomDesigner.jsx — FINAL, CLEAN, COMPLETE VERSION

import React, { useState, useRef, useEffect } from "react";
import { Stage, Layer, Line, Rect, Text, Group, Circle } from "react-konva";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

import {
  scalePolygon,
  movePolygonPoint,
  addPolygonPoint,
  removePolygonPoint,
  boxInsidePolygon,
  computeDoorGeometry,
  isInDoorSwing,
  snapPointToPolygonEdges,
} from "./geometry";

import {
  autoPackRacks,
  snapRackToGrid,
  rackPositionIsValid,
} from "./racks";

import {
  getACPixelPosition,
  resolveACDrag,
  resizeAC,
} from "./acUnits";

import { ControlsPanel } from "./ui.jsx";
import RackAssetPalette from "./RackAssetPalette.jsx";

const PREVIEW_W = 900;
const PREVIEW_H = 500;

const UNIT_SCALES = {
  feet: 15,
  meters: 50,
};

const MIN_ROOM = 5;
const MAX_ROOM = 100;

function clampRoom(v) {
  if (!v || v < MIN_ROOM) return MIN_ROOM;
  if (v > MAX_ROOM) return MAX_ROOM;
  return v;
}

export default function RoomDesigner() {
  const stageRef = useRef(null);

  // ------------------ CORE STATE ------------------

  const [unit, setUnit] = useState("feet");
  const [roomWidth, setRoomWidth] = useState(40);
  const [roomLength, setRoomLength] = useState(25);

  const [polygon, setPolygon] = useState(
    scalePolygon(
      [
        [0, 0],
        [60, 0],
        [60, 30],
        [0, 30],
      ],
      40 * UNIT_SCALES.feet,
      25 * UNIT_SCALES.feet
    )
  );

  const [editPolygon, setEditPolygon] = useState(false);

  const [doorSide, setDoorSide] = useState("top");
  const [doorOffset, setDoorOffset] = useState(50);

  const [numRacks, setNumRacks] = useState(4);
  const [numRows, setNumRows] = useState(1);
  const [rackWidthPhysical, setRackWidthPhysical] = useState(2);
  const [rackDepthPhysical, setRackDepthPhysical] = useState(4);
  const [showCableManagers, setShowCableManagers] = useState(false);
  const [cableManagerWidth, setCableManagerWidth] = useState(0.2);
  const [snapToRacks, setSnapToRacks] = useState(true);
  const [showGrid, setShowGrid] = useState(false);
  const [racks, setRacks] = useState([]);

  const [acUnits, setAcUnits] = useState([]);
  const [selectedAC, setSelectedAC] = useState(null);

  const [exporting, setExporting] = useState(false);

  // ------------------ DERIVED GEOMETRY ------------------

  const scale = UNIT_SCALES[unit];
  const roomW = clampRoom(roomWidth) * scale;
  const roomH = clampRoom(roomLength) * scale;

  const rackW = rackWidthPhysical * scale;
  const rackD = rackDepthPhysical * scale;
  const cableManagerPx = cableManagerWidth * scale;

  const scaleToFit = Math.min(PREVIEW_W / roomW, PREVIEW_H / roomH, 1);

  const offsetX = (PREVIEW_W - roomW * scaleToFit) / 2;
  const offsetY = (PREVIEW_H - roomH * scaleToFit) / 2;

  const door = {
    width: 3 * scale,
    leaf: 3 * scale,
  };

  // ------------------ HELPERS ------------------

  const rackInsidePoly = (x, y, w, h, poly) =>
    boxInsidePolygon(x, y, w, h, poly);

  const rackDoorBlocked = (
    x,
    y,
    w,
    h,
    doorSideArg,
    doorArg,
    roomWArg,
    roomHArg,
    polygonArg,
    doorOffsetArg
  ) =>
    isInDoorSwing(
      x,
      y,
      w,
      h,
      doorSideArg,
      doorArg,
      roomWArg,
      roomHArg,
      polygonArg,
      doorOffsetArg
    );

  // ------------------ EFFECT: SCALE POLYGON ------------------

  useEffect(() => {
    setPolygon((prev) => scalePolygon(prev, roomW, roomH));
  }, [roomW, roomH]);

  // ------------------ EFFECT: AUTO-PACK RACKS ------------------

  useEffect(() => {
    const packed = autoPackRacks(
      numRacks,
      numRows,
      roomW,
      roomH,
      rackW,
      rackD,
      showCableManagers,
      cableManagerPx,
      rackInsidePoly,
      rackDoorBlocked,
      polygon,
      doorSide,
      door,
      doorOffset
    );

    setRacks(packed);
  }, [
    numRacks,
    numRows,
    roomW,
    roomH,
    rackW,
    rackD,
    showCableManagers,
    cableManagerPx,
    doorSide,
    doorOffset,
  ]);

  // ------------------ EFFECT: REPOSITION INVALID RACKS ------------------

  useEffect(() => {
    if (racks.length === 0) return;

    let hasChanges = false;
    const updated = racks.map((rack) => {
      // Check if current position is still valid
      const isValid = rackPositionIsValid(
        rack.x,
        rack.y,
        rackW,
        rackD,
        polygon,
        rackInsidePoly,
        rackDoorBlocked,
        doorSide,
        door,
        roomW,
        roomH,
        doorOffset
      );

      if (isValid) return rack;

      hasChanges = true;

      // Try to find nearby valid position
      const searchRadius = 50;
      const searchSteps = 12;

      for (let r = searchRadius; r <= searchRadius * 4; r += searchRadius) {
        for (let i = 0; i < searchSteps; i++) {
          const angle = (i / searchSteps) * Math.PI * 2;
          const testX = rack.x + Math.cos(angle) * r;
          const testY = rack.y + Math.sin(angle) * r;

          if (
            rackPositionIsValid(
              testX,
              testY,
              rackW,
              rackD,
              polygon,
              rackInsidePoly,
              rackDoorBlocked,
              doorSide,
              door,
              roomW,
              roomH,
              doorOffset
            )
          ) {
            return { ...rack, x: testX, y: testY };
          }
        }
      }

      // If no nearby position found, try to find any valid position
      const gridSteps = 10;
      for (let gx = 0; gx < gridSteps; gx++) {
        for (let gy = 0; gy < gridSteps; gy++) {
          const testX = (roomW / gridSteps) * gx;
          const testY = (roomH / gridSteps) * gy;

          if (
            rackPositionIsValid(
              testX,
              testY,
              rackW,
              rackD,
              polygon,
              rackInsidePoly,
              rackDoorBlocked,
              doorSide,
              door,
              roomW,
              roomH,
              doorOffset
            )
          ) {
            return { ...rack, x: testX, y: testY };
          }
        }
      }

      // Keep rack at current position if no valid position found
      return rack;
    });

    // Only update if positions actually changed
    if (hasChanges) {
      setRacks(updated);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [polygon]);

  // ------------------ AC UNIT ADD ------------------

  function addACCanvasCoords(canvasX, canvasY) {
    const px = (canvasX - offsetX) / scaleToFit;
    const py = (canvasY - offsetY) / scaleToFit;

    const widthPx = 3 * scale;
    const heightPx = 1 * scale;

    const best = snapPointToPolygonEdges(px, py, widthPx, heightPx, polygon);

    const p1 = polygon[best.edgeIdx];
    const p2 = polygon[(best.edgeIdx + 1) % polygon.length];
    const dx = p2[0] - p1[0];
    const dy = p2[1] - p1[1];

    let side;
    if (Math.abs(dx) >= Math.abs(dy)) {
      side = best.ey < roomH / 2 ? "top" : "bottom";
    } else {
      side = best.ex < roomW / 2 ? "left" : "right";
    }

    const provisional = {
      id: Date.now() + Math.random(),
      side,
      offset: best.t,
      width: widthPx,
      height: heightPx,
      rotation: 0,
    };

    const after = resolveACDrag(
      [],
      provisional,
      { side, offset: best.t },
      polygon,
      roomW,
      roomH,
      doorSide,
      door,
      doorOffset
    );

    const finalAC = after[0] || provisional;
    setAcUnits((prev) => [...prev, finalAC]);
    setSelectedAC(finalAC.id);
  }

  // ------------------ AC DRAG END ------------------

  function onACDragEnd(ac, canvasX, canvasY) {
    // Account for rotation offset
    const rotation = ac.rotation || 0;
    const w = ac.width * scaleToFit;
    const h = ac.height * scaleToFit;

    // Adjust canvas position if rotated
    let adjustedX = canvasX;
    let adjustedY = canvasY;

    if (rotation === 90) {
      // When rotated, the Group x,y is at center, so adjust back to top-left
      adjustedX = canvasX - w / 2;
      adjustedY = canvasY - h / 2;
    }

    const px = (adjustedX - offsetX) / scaleToFit;
    const py = (adjustedY - offsetY) / scaleToFit;

    const best = snapPointToPolygonEdges(px, py, ac.width, ac.height, polygon);

    const p1 = polygon[best.edgeIdx];
    const p2 = polygon[(best.edgeIdx + 1) % polygon.length];
    const dx = p2[0] - p1[0];
    const dy = p2[1] - p1[1];

    let side;
    if (Math.abs(dx) >= Math.abs(dy)) {
      side = best.ey < roomH / 2 ? "top" : "bottom";
    } else {
      side = best.ex < roomW / 2 ? "left" : "right";
    }

    // Directly update side and offset without validation
    setAcUnits((prev) =>
      prev.map((u) =>
        u.id === ac.id
          ? { ...u, side, offset: best.t * 100 }
          : u
      )
    );
  }

  // ------------------ DELETE / RESIZE AC ------------------

  function deleteAC(id) {
    setAcUnits((prev) => prev.filter((a) => a.id !== id));
    if (selectedAC === id) setSelectedAC(null);
  }

  function updateACSize(id, wPhysical, hPhysical) {
    setAcUnits((prev) =>
      resizeAC(prev, id, wPhysical * scale, hPhysical * scale)
    );
  }

  function rotateAC(id) {
    setAcUnits((prev) =>
      prev.map((u) =>
        u.id === id
          ? { ...u, rotation: u.rotation === 90 ? 0 : 90 }
          : u
      )
    );
  }

  // ------------------ RACK DRAG END ------------------

  function onRackDragEnd(index, canvasX, canvasY) {
    let x = (canvasX - offsetX) / scaleToFit;
    let y = (canvasY - offsetY) / scaleToFit;

    // Rack-to-rack snapping
    const SNAP_THRESHOLD = 20; // pixels in room space
    const ALIGNMENT_THRESHOLD = 15; // for Y-axis alignment

    // Check proximity to other racks
    racks.forEach((otherRack, otherIndex) => {
      if (otherIndex === index) return; // Skip self

      // Snap to Y-axis alignment (same row)
      const yDiff = Math.abs(y - otherRack.y);
      if (yDiff < ALIGNMENT_THRESHOLD) {
        y = otherRack.y;
      }

      // Snap to right side of other rack (with cable manager space if enabled)
      const cableSpace = showCableManagers ? cableManagerPx : 0;
      const rightSnapX = otherRack.x + rackW + cableSpace;
      const xDiffRight = Math.abs(x - rightSnapX);
      if (xDiffRight < SNAP_THRESHOLD && yDiff < ALIGNMENT_THRESHOLD) {
        x = rightSnapX;
      }

      // Snap to left side of other rack
      const leftSnapX = otherRack.x - rackW - cableSpace;
      const xDiffLeft = Math.abs(x - leftSnapX);
      if (xDiffLeft < SNAP_THRESHOLD && yDiff < ALIGNMENT_THRESHOLD) {
        x = leftSnapX;
      }
    });

    // Grid snapping (existing functionality)
    if (snapToRacks && racks.length > 0) {
      const snapped = snapRackToGrid(
        index,
        racks,
        rackW,
        rackD,
        showCableManagers,
        cableManagerPx,
        numRacks,
        numRows
      );
      // Only use grid snap if we didn't already snap to another rack
      const didRackSnap = racks.some((r, i) => {
        if (i === index) return false;
        return Math.abs(y - r.y) < 1; // Check if we snapped to Y
      });
      if (!didRackSnap) {
        x = snapped.x;
        y = snapped.y;
      }
    }

    const valid = rackPositionIsValid(
      x,
      y,
      rackW,
      rackD,
      polygon,
      rackInsidePoly,
      rackDoorBlocked,
      doorSide,
      door,
      roomW,
      roomH,
      doorOffset
    );

    if (!valid) return;

    setRacks((prev) =>
      prev.map((r, i) => (i === index ? { ...r, x, y } : r))
    );
  }

  function resetRacks() {
    // Force repack by temporarily clearing racks, then setting new packed positions
    setRacks([]);
    setTimeout(() => {
      const packed = autoPackRacks(
        numRacks,
        numRows,
        roomW,
        roomH,
        rackW,
        rackD,
        showCableManagers,
        cableManagerPx,
        rackInsidePoly,
        rackDoorBlocked,
        polygon,
        doorSide,
        door,
        doorOffset
      );
      setRacks(packed);
    }, 0);
  }

  // ------------------ DOOR DRAG ------------------

  function handleDoorDragMove(e) {
    const canvasX = e.target.x();
    const canvasY = e.target.y();

    const ax = (canvasX - offsetX) / scaleToFit;
    const ay = (canvasY - offsetY) / scaleToFit;

    let best = { dist: 1e12, idx: 0, t: 0 };

    polygon.forEach((p1, i) => {
      const p2 = polygon[(i + 1) % polygon.length];
      const vx = p2[0] - p1[0];
      const vy = p2[1] - p1[1];
      const len2 = Math.max(vx * vx + vy * vy, 1);

      const proj = ((ax - p1[0]) * vx + (ay - p1[1]) * vy) / len2;
      const t = Math.max(0, Math.min(1, proj));
      const ex = p1[0] + vx * t;
      const ey = p1[1] + vy * t;

      const d = Math.hypot(ax - ex, ay - ey);
      if (d < best.dist) best = { dist: d, idx: i, t, ex, ey };
    });

    const p1 = polygon[best.idx];
    const p2 = polygon[(best.idx + 1) % polygon.length];
    const dx = p2[0] - p1[0];
    const dy = p2[1] - p1[1];

    let side;
    if (Math.abs(dx) >= Math.abs(dy)) {
      side = best.ey < roomH / 2 ? "top" : "bottom";
    } else {
      side = best.ex < roomW / 2 ? "left" : "right";
    }

    setDoorSide(side);
    setDoorOffset(best.t * 100);
  }

  function handleDoorDragEnd(e) {
    handleDoorDragMove(e);
  }

  // ------------------ POLYGON EDIT ------------------

  function handleVertexDragMove(index, e) {
    const canvasX = e.target.x();
    const canvasY = e.target.y();
    const x = (canvasX - offsetX) / scaleToFit;
    const y = (canvasY - offsetY) / scaleToFit;

    setPolygon((prev) => movePolygonPoint(prev, index, x, y, roomW, roomH));
  }

  function handleVertexDoubleClick(index) {
    setPolygon((prev) => removePolygonPoint(prev, index));
  }

  function handleAddPoint(index) {
    setPolygon((prev) => addPolygonPoint(prev, index));
  }

  function handleResetPolygon() {
    setPolygon([
      [0, 0],
      [roomW, 0],
      [roomW, roomH],
      [0, roomH],
    ]);
  }

  // ------------------ EXPORT ------------------

  function exportPNG() {
    if (!stageRef.current) return;
    setExporting(true);
    setTimeout(() => {
      html2canvas(stageRef.current.container()).then((canvas) => {
        setExporting(false);
        const a = document.createElement("a");
        a.href = canvas.toDataURL("image/png");
        a.download = "layout.png";
        a.click();
      });
    }, 20);
  }

  function exportJPG() {
    if (!stageRef.current) return;
    setExporting(true);
    setTimeout(() => {
      html2canvas(stageRef.current.container()).then((canvas) => {
        setExporting(false);
        const a = document.createElement("a");
        a.href = canvas.toDataURL("image/jpeg");
        a.download = "layout.jpg";
        a.click();
      });
    }, 20);
  }

  function exportPDF() {
    if (!stageRef.current) return;
    setExporting(true);
    setTimeout(() => {
      html2canvas(stageRef.current.container()).then((canvas) => {
        setExporting(false);
        const img = canvas.toDataURL("image/jpeg");
        const pdf = new jsPDF({
          orientation: roomW > roomH ? "l" : "p",
          unit: "pt",
          format: [roomW, roomH],
        });
        pdf.addImage(img, "JPEG", 0, 0, roomW, roomH);
        pdf.save("layout.pdf");
      });
    }, 20);
  }

  // ------------------ RENDER ------------------

  return (
    <div style={{ display: "flex", gap: 24 }}>
      {/* LEFT SIDEBAR */}
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <RackAssetPalette />
        <ControlsPanel
          unit={unit}
          setUnit={setUnit}
          roomWidth={roomWidth}
          roomLength={roomLength}
          setRoomWidth={setRoomWidth}
          setRoomLength={setRoomLength}
          numRacks={numRacks}
          setNumRacks={setNumRacks}
          numRows={numRows}
          setNumRows={setNumRows}
          rackWidth={rackWidthPhysical}
          rackDepth={rackDepthPhysical}
          setRackWidth={setRackWidthPhysical}
          setRackDepth={setRackDepthPhysical}
          showCableManagers={showCableManagers}
          setShowCableManagers={setShowCableManagers}
          cableManagerWidth={cableManagerWidth}
          setCableManagerWidth={setCableManagerWidth}
          snapToRacks={snapToRacks}
          setSnapToRacks={setSnapToRacks}
          showGrid={showGrid}
          setShowGrid={setShowGrid}
          selectedAC={selectedAC}
          acWidth={
            acUnits.find((a) => a.id === selectedAC)?.width / scale || null
          }
          acHeight={
            acUnits.find((a) => a.id === selectedAC)?.height / scale || null
          }
          deleteAC={deleteAC}
          updateACSize={updateACSize}
          rotateAC={rotateAC}
          exportPNG={exportPNG}
          exportJPG={exportJPG}
          exportPDF={exportPDF}
          resetRacks={resetRacks}
        />
      </div>

      {/* RIGHT SIDE (Canvas + tools) */}
      <div style={{ flex: 1 }}>
        {/* Polygon edit toolbar */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
            marginBottom: 8,
          }}
        >
          <button
            onClick={() => setEditPolygon((v) => !v)}
            style={{
              padding: "6px 12px",
              borderRadius: 6,
              border: "1px solid #b7cbe0",
              background: editPolygon ? "#007dc3" : "#ffffff",
              color: editPolygon ? "#fff" : "#003a66",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            {editPolygon ? "Done Editing Room" : "Edit Room Shape"}
          </button>

          <button
            onClick={handleResetPolygon}
            style={{
              padding: "6px 12px",
              borderRadius: 6,
              border: "1px solid #b7cbe0",
              background: "#ffffff",
              color: "#003a66",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Reset Polygon
          </button>
        </div>

        {/* CANVAS BOX */}
        <div
          style={{
            borderRadius: 12,
            background: "#ffffff",
            border: "1px solid #d5e1ef",
            boxShadow: "0 4px 10px rgba(0,0,0,0.06)",
            padding: 16,
            width: PREVIEW_W,
            height: PREVIEW_H,
          }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const type = e.dataTransfer.getData("asset-type");
            if (type === "ACUnit") {
              const rect = e.currentTarget.getBoundingClientRect();
              addACCanvasCoords(
                e.clientX - rect.left,
                e.clientY - rect.top
              );
            }
          }}
        >
          <Stage
            width={PREVIEW_W}
            height={PREVIEW_H}
            ref={stageRef}
            onMouseDown={(e) => {
              if (e.target === e.target.getStage()) {
                setSelectedAC(null);
              }
            }}
          >
            <Layer>
              {/* GRID LINES */}
              {showGrid && !exporting && (() => {
                const gridSize = scale * scaleToFit; // Grid in screen pixels
                const lines = [];

                // Vertical lines - cover entire canvas width
                for (let x = 0; x <= PREVIEW_W; x += gridSize) {
                  lines.push(
                    <Line
                      key={`v-${x}`}
                      points={[x, 0, x, PREVIEW_H]}
                      stroke="#cccccc"
                      strokeWidth={1}
                      dash={[5, 5]}
                    />
                  );
                }

                // Horizontal lines - cover entire canvas height
                for (let y = 0; y <= PREVIEW_H; y += gridSize) {
                  lines.push(
                    <Line
                      key={`h-${y}`}
                      points={[0, y, PREVIEW_W, y]}
                      stroke="#cccccc"
                      strokeWidth={1}
                      dash={[5, 5]}
                    />
                  );
                }

                return lines;
              })()}

              {/* ROOM POLYGON */}
              <Line
                points={polygon.flatMap(([x, y]) => [
                  x * scaleToFit + offsetX,
                  y * scaleToFit + offsetY,
                ])}
                closed
                stroke="#1976d2"
                strokeWidth={2}
                fill="#f4f8ff"
              />

              {/* DOOR */}
              {(() => {
                const g = computeDoorGeometry(
                  polygon,
                  doorSide,
                  door,
                  roomW,
                  roomH,
                  doorOffset
                );
                if (!g) return null;

                const ax = g.anchor[0] * scaleToFit + offsetX;
                const ay = g.anchor[1] * scaleToFit + offsetY;

                return (
                  <>
                    <Line
                      points={[
                        g.gapStart[0] * scaleToFit + offsetX,
                        g.gapStart[1] * scaleToFit + offsetY,
                        g.gapEnd[0] * scaleToFit + offsetX,
                        g.gapEnd[1] * scaleToFit + offsetY,
                      ]}
                      stroke="#ffffff"
                      strokeWidth={6}
                    />

                    <Line
                      points={[
                        g.leaf[0] * scaleToFit + offsetX,
                        g.leaf[1] * scaleToFit + offsetY,
                        g.leaf[2] * scaleToFit + offsetX,
                        g.leaf[3] * scaleToFit + offsetY,
                      ]}
                      stroke="#444"
                      strokeWidth={3}
                    />

                    {!exporting && (
                      <Circle
                        x={ax}
                        y={ay}
                        radius={7}
                        fill="#007dc3"
                        stroke="#ffffff"
                        strokeWidth={2}
                        draggable
                        onDragMove={handleDoorDragMove}
                        onDragEnd={handleDoorDragEnd}
                      />
                    )}
                  </>
                );
              })()}

              {/* RACKS */}
              {racks.map((rk, i) => {
                const x = rk.x * scaleToFit + offsetX;
                const y = rk.y * scaleToFit + offsetY;

                return (
                  <Group
                    key={i}
                    x={x}
                    y={y}
                    draggable={!exporting}
                    onDragEnd={(e) =>
                      onRackDragEnd(i, e.target.x(), e.target.y())
                    }
                  >
                    <Rect
                      width={rackW * scaleToFit}
                      height={rackD * scaleToFit}
                      fill="#e8f1fb"
                      stroke="#1976d2"
                      strokeWidth={2}
                      cornerRadius={6}
                    />
                    <Text
                      text={rk.label}
                      width={rackW * scaleToFit}
                      height={rackD * scaleToFit}
                      align="center"
                      verticalAlign="middle"
                      fill="#003a66"
                      fontSize={12}
                    />
                  </Group>
                );
              })}

              {/* CABLE MANAGERS */}
              {showCableManagers &&
                racks.map((rk, i) => {
                  // Show cable manager on right side of each rack (except last)
                  if (i >= racks.length - 1) return null;

                  const cmX = (rk.x + rackW) * scaleToFit + offsetX;
                  const cmY = rk.y * scaleToFit + offsetY;

                  return (
                    <Rect
                      key={`cm-${i}`}
                      x={cmX}
                      y={cmY}
                      width={cableManagerPx * scaleToFit}
                      height={rackD * scaleToFit}
                      fill="#d2e8ff"
                      stroke="#1976d2"
                      strokeWidth={1}
                      cornerRadius={4}
                    />
                  );
                })}

              {/* AC UNITS */}
              {acUnits.map((ac) => {
                const [ax, ay] = getACPixelPosition(ac, roomW, roomH);
                const sx = ax * scaleToFit + offsetX;
                const sy = ay * scaleToFit + offsetY;
                const w = ac.width * scaleToFit;
                const h = ac.height * scaleToFit;
                const isSelected = selectedAC === ac.id;

                // Use rotation from AC unit property (default to 0 if not set)
                const rotation = ac.rotation || 0;

                // Adjust offset for rotation center
                const offsetForRotation = rotation === 90 ? {
                  offsetX: w / 2,
                  offsetY: h / 2,
                  x: sx + w / 2,
                  y: sy + h / 2
                } : {
                  offsetX: 0,
                  offsetY: 0,
                  x: sx,
                  y: sy
                };

                return (
                  <Group
                    key={ac.id}
                    x={offsetForRotation.x}
                    y={offsetForRotation.y}
                    offsetX={offsetForRotation.offsetX}
                    offsetY={offsetForRotation.offsetY}
                    rotation={rotation}
                    draggable={!exporting}
                    onDragEnd={(e) =>
                      onACDragEnd(ac, e.target.x(), e.target.y())
                    }
                    onClick={() => setSelectedAC(ac.id)}
                  >
                    {/* Shadow/Depth layer */}
                    {!isSelected && (
                      <Rect
                        x={2}
                        y={2}
                        width={w}
                        height={h}
                        fill="rgba(0, 0, 0, 0.15)"
                        cornerRadius={8}
                      />
                    )}

                    {/* Main background */}
                    <Rect
                      width={w}
                      height={h}
                      fill="#0077be"
                      stroke={isSelected ? "#d32f2f" : "#005a8f"}
                      strokeWidth={isSelected ? 4 : 2}
                      cornerRadius={8}
                    />

                    {/* Lighter gradient overlay */}
                    <Rect
                      width={w}
                      height={h / 2}
                      fill="rgba(255, 255, 255, 0.15)"
                      cornerRadius={8}
                    />

                    {/* Vent lines - horizontal grill pattern */}
                    {[...Array(Math.floor(h / 12))].map((_, i) => (
                      <Line
                        key={`vent-${i}`}
                        points={[
                          w * 0.15,
                          (i + 1) * 12,
                          w * 0.85,
                          (i + 1) * 12,
                        ]}
                        stroke="rgba(255, 255, 255, 0.25)"
                        strokeWidth={1}
                      />
                    ))}

                    {/* Fan/Cooling icon - center circle */}
                    <Circle
                      x={w / 2}
                      y={h / 2}
                      radius={Math.min(w, h) * 0.15}
                      fill="rgba(255, 255, 255, 0.3)"
                      stroke="rgba(255, 255, 255, 0.6)"
                      strokeWidth={2}
                    />

                    {/* Fan blades - 4 small lines radiating from center */}
                    {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => {
                      const rad = (angle * Math.PI) / 180;
                      const innerRadius = Math.min(w, h) * 0.08;
                      const outerRadius = Math.min(w, h) * 0.2;
                      return (
                        <Line
                          key={`blade-${i}`}
                          points={[
                            w / 2 + Math.cos(rad) * innerRadius,
                            h / 2 + Math.sin(rad) * innerRadius,
                            w / 2 + Math.cos(rad) * outerRadius,
                            h / 2 + Math.sin(rad) * outerRadius,
                          ]}
                          stroke="rgba(255, 255, 255, 0.5)"
                          strokeWidth={1.5}
                        />
                      );
                    })}

                    {/* AC Unit Label */}
                    <Rect
                      y={h - 18}
                      width={w}
                      height={18}
                      fill="rgba(0, 0, 0, 0.4)"
                      cornerRadius={8}
                    />
                    <Text
                      text="AC UNIT"
                      y={h - 18}
                      width={w}
                      height={18}
                      align="center"
                      verticalAlign="middle"
                      fill="#ffffff"
                      fontSize={10}
                      fontStyle="bold"
                      letterSpacing={0.5}
                    />
                  </Group>
                );
              })}

              {/* POLYGON EDIT HANDLES */}
              {editPolygon &&
                polygon.map(([x, y], i) => {
                  const vx = x * scaleToFit + offsetX;
                  const vy = y * scaleToFit + offsetY;

                  const next = polygon[(i + 1) % polygon.length];
                  const mx =
                    ((x + next[0]) / 2) * scaleToFit + offsetX;
                  const my =
                    ((y + next[1]) / 2) * scaleToFit + offsetY;

                  return (
                    <React.Fragment key={i}>
                      <Circle
                        x={vx}
                        y={vy}
                        radius={6}
                        fill="#ffffff"
                        stroke="#007dc3"
                        strokeWidth={2}
                        draggable
                        onDragMove={(e) => handleVertexDragMove(i, e)}
                        onDblClick={() => handleVertexDoubleClick(i)}
                      />

                      <Circle
                        x={mx}
                        y={my}
                        radius={4}
                        fill="#007dc3"
                        stroke="#ffffff"
                        strokeWidth={1}
                        onClick={() => handleAddPoint(i)}
                      />
                    </React.Fragment>
                  );
                })}
            </Layer>
          </Stage>
        </div>
      </div>
    </div>
  );
}
