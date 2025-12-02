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
    polygon,
    doorSide,
    doorOffset,
  ]);

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
    const px = (canvasX - offsetX) / scaleToFit;
    const py = (canvasY - offsetY) / scaleToFit;

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

    const snap = { side, offset: best.t };

    const updated = resolveACDrag(
      acUnits,
      ac,
      snap,
      polygon,
      roomW,
      roomH,
      doorSide,
      door,
      doorOffset
    );

    setAcUnits(updated);
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

  // ------------------ RACK DRAG END ------------------

  function onRackDragEnd(index, canvasX, canvasY) {
    let x = (canvasX - offsetX) / scaleToFit;
    let y = (canvasY - offsetY) / scaleToFit;

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
      x = snapped.x;
      y = snapped.y;
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
  }

  // ------------------ DOOR DRAG END ------------------

  function handleDoorDragEnd(e) {
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

      const proj = ((ax - p1[0]) * vx + (ay - p1[1])) / len2;
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

  // ------------------ POLYGON EDIT ------------------

  function handleVertexDragMove(index, e) {
    const canvasX = e.target.x();
    const canvasY = e.target.y();
    const x = (canvasX - offsetX) / scaleToFit;
    const y = (canvasY - offsetY) / scaleToFit;

    setPolygon((prev) => movePolygonPoint(prev, index, x, y, roomW, roomH));
    resetRacks();
  }

  function handleVertexDoubleClick(index) {
    setPolygon((prev) => removePolygonPoint(prev, index));
    resetRacks();
  }

  function handleAddPoint(index) {
    setPolygon((prev) => addPolygonPoint(prev, index));
    resetRacks();
  }

  function handleResetPolygon() {
    setPolygon([
      [0, 0],
      [roomW, 0],
      [roomW, roomH],
      [0, roomH],
    ]);
    resetRacks();
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
          selectedAC={selectedAC}
          acWidth={
            acUnits.find((a) => a.id === selectedAC)?.width / scale || null
          }
          acHeight={
            acUnits.find((a) => a.id === selectedAC)?.height / scale || null
          }
          deleteAC={deleteAC}
          updateACSize={updateACSize}
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

                    <Circle
                      x={ax}
                      y={ay}
                      radius={7}
                      fill="#007dc3"
                      stroke="#ffffff"
                      strokeWidth={2}
                      draggable
                      onDragEnd={handleDoorDragEnd}
                    />
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
                racks.slice(0, -1).map((rk, i) => {
                  const cmX =
                    (rk.x + rackW) * scaleToFit +
                    offsetX +
                    (cableManagerPx * scaleToFit) / 2;
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

                return (
                  <Group
                    key={ac.id}
                    x={sx}
                    y={sy}
                    draggable={!exporting}
                    onDragEnd={(e) =>
                      onACDragEnd(ac, e.target.x(), e.target.y())
                    }
                    onClick={() => setSelectedAC(ac.id)}
                  >
                    <Rect
                      width={ac.width * scaleToFit}
                      height={ac.height * scaleToFit}
                      fill="#e8f3ff"
                      stroke={selectedAC === ac.id ? "#d32f2f" : "#007dc3"}
                      strokeWidth={selectedAC === ac.id ? 4 : 2}
                      cornerRadius={6}
                    />

                    <Text
                      text="AC Unit"
                      width={ac.width * scaleToFit}
                      height={ac.height * scaleToFit}
                      align="center"
                      verticalAlign="middle"
                      fill="#003a66"
                      fontSize={12}
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
