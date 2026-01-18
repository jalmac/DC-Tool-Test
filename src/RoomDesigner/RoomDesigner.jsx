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
} from "./geometry";

import {
  autoPackRacks,
  snapRackToGrid,
  rackPositionIsValid,
} from "./racks";

import {
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

  const [cameras, setCameras] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState(null);

  const [upsUnits, setUpsUnits] = useState([]);
  const [selectedUPS, setSelectedUPS] = useState(null);

  const [labels, setLabels] = useState([]);
  const [selectedLabel, setSelectedLabel] = useState(null);

  const [measurements, setMeasurements] = useState([]);
  const [measurementMode, setMeasurementMode] = useState(false);
  const [measurementStart, setMeasurementStart] = useState(null);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

    const ac = {
      id: Date.now() + Math.random(),
      x: px,
      y: py,
      width: widthPx,
      height: heightPx,
      rotation: 0,
    };

    setAcUnits((prev) => [...prev, ac]);
    setSelectedAC(ac.id);
  }

  // ------------------ AC DRAG END ------------------

  function onACDragEnd(ac, canvasX, canvasY) {
    const px = (canvasX - offsetX) / scaleToFit;
    const py = (canvasY - offsetY) / scaleToFit;

    setAcUnits((prev) =>
      prev.map((u) =>
        u.id === ac.id ? { ...u, x: px, y: py } : u
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
          ? { ...u, rotation: (u.rotation + 45) % 360 }
          : u
      )
    );
  }

  // ------------------ CAMERA FUNCTIONS ------------------

  function addCameraCanvasCoords(canvasX, canvasY) {
    const px = (canvasX - offsetX) / scaleToFit;
    const py = (canvasY - offsetY) / scaleToFit;

    const camera = {
      id: Date.now() + Math.random(),
      x: px,
      y: py,
      size: 35, // Default size in room units
      rotation: 0,
    };

    setCameras((prev) => [...prev, camera]);
    setSelectedCamera(camera.id);
  }

  function onCameraDragEnd(camera, canvasX, canvasY) {
    const px = (canvasX - offsetX) / scaleToFit;
    const py = (canvasY - offsetY) / scaleToFit;

    setCameras((prev) =>
      prev.map((c) =>
        c.id === camera.id ? { ...c, x: px, y: py } : c
      )
    );
  }

  function deleteCamera(id) {
    setCameras((prev) => prev.filter((c) => c.id !== id));
    if (selectedCamera === id) setSelectedCamera(null);
  }

  function updateCameraSize(id, size) {
    setCameras((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, size: Math.max(10, size) } : c
      )
    );
  }

  function rotateCamera(id) {
    setCameras((prev) =>
      prev.map((c) =>
        c.id === id
          ? { ...c, rotation: (c.rotation + 45) % 360 }
          : c
      )
    );
  }

  // ------------------ UPS FUNCTIONS ------------------

  function addUPSCanvasCoords(canvasX, canvasY) {
    const px = (canvasX - offsetX) / scaleToFit;
    const py = (canvasY - offsetY) / scaleToFit;

    const ups = {
      id: Date.now() + Math.random(),
      x: px,
      y: py,
      size: 35, // Default size in room units
      rotation: 0,
    };

    setUpsUnits((prev) => [...prev, ups]);
    setSelectedUPS(ups.id);
  }

  function onUPSDragEnd(ups, canvasX, canvasY) {
    const px = (canvasX - offsetX) / scaleToFit;
    const py = (canvasY - offsetY) / scaleToFit;

    setUpsUnits((prev) =>
      prev.map((u) =>
        u.id === ups.id ? { ...u, x: px, y: py } : u
      )
    );
  }

  function deleteUPS(id) {
    setUpsUnits((prev) => prev.filter((u) => u.id !== id));
    if (selectedUPS === id) setSelectedUPS(null);
  }

  function updateUPSSize(id, size) {
    setUpsUnits((prev) =>
      prev.map((u) =>
        u.id === id ? { ...u, size: Math.max(10, size) } : u
      )
    );
  }

  function rotateUPS(id) {
    setUpsUnits((prev) =>
      prev.map((u) =>
        u.id === id
          ? { ...u, rotation: (u.rotation + 45) % 360 }
          : u
      )
    );
  }

  // ------------------ LABEL FUNCTIONS ------------------

  function addLabelCanvasCoords(canvasX, canvasY) {
    const px = (canvasX - offsetX) / scaleToFit;
    const py = (canvasY - offsetY) / scaleToFit;

    const label = {
      id: Date.now() + Math.random(),
      x: px,
      y: py,
      text: "Label",
      fontSize: 16,
      color: "#000000",
    };

    setLabels((prev) => [...prev, label]);
    setSelectedLabel(label.id);
  }

  function onLabelDragEnd(label, canvasX, canvasY) {
    const px = (canvasX - offsetX) / scaleToFit;
    const py = (canvasY - offsetY) / scaleToFit;

    setLabels((prev) =>
      prev.map((l) =>
        l.id === label.id ? { ...l, x: px, y: py } : l
      )
    );
  }

  function deleteLabel(id) {
    setLabels((prev) => prev.filter((l) => l.id !== id));
    if (selectedLabel === id) setSelectedLabel(null);
  }

  function updateLabelText(id, text) {
    setLabels((prev) =>
      prev.map((l) =>
        l.id === id ? { ...l, text } : l
      )
    );
  }

  function updateLabelFontSize(id, fontSize) {
    setLabels((prev) =>
      prev.map((l) =>
        l.id === id ? { ...l, fontSize: Math.max(8, fontSize) } : l
      )
    );
  }

  function updateLabelColor(id, color) {
    setLabels((prev) =>
      prev.map((l) =>
        l.id === id ? { ...l, color } : l
      )
    );
  }

  // ------------------ MEASUREMENT FUNCTIONS ------------------

  function toggleMeasurementMode() {
    setMeasurementMode((prev) => !prev);
    setMeasurementStart(null);
  }

  function handleMeasurementClick(e) {
    if (!measurementMode) return;

    const stage = e.target.getStage();
    const point = stage.getPointerPosition();
    const px = (point.x - offsetX) / scaleToFit;
    const py = (point.y - offsetY) / scaleToFit;

    if (!measurementStart) {
      // First click - set start point
      setMeasurementStart({ x: px, y: py });
    } else {
      // Second click - create measurement
      const distance = Math.sqrt(
        Math.pow(px - measurementStart.x, 2) +
        Math.pow(py - measurementStart.y, 2)
      );

      const measurement = {
        id: Date.now() + Math.random(),
        x1: measurementStart.x,
        y1: measurementStart.y,
        x2: px,
        y2: py,
        distance: distance / scale, // Convert to physical units
      };

      setMeasurements((prev) => [...prev, measurement]);
      setMeasurementStart(null);
    }
  }

  function deleteMeasurement(id) {
    setMeasurements((prev) => prev.filter((m) => m.id !== id));
  }

  function clearAllMeasurements() {
    setMeasurements([]);
    setMeasurementStart(null);
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
          selectedCamera={selectedCamera}
          cameraSize={cameras.find((c) => c.id === selectedCamera)?.size || null}
          deleteCamera={deleteCamera}
          updateCameraSize={updateCameraSize}
          rotateCamera={rotateCamera}
          selectedUPS={selectedUPS}
          upsSize={upsUnits.find((u) => u.id === selectedUPS)?.size || null}
          deleteUPS={deleteUPS}
          updateUPSSize={updateUPSSize}
          rotateUPS={rotateUPS}
          selectedLabel={selectedLabel}
          labelText={labels.find((l) => l.id === selectedLabel)?.text || ""}
          labelFontSize={labels.find((l) => l.id === selectedLabel)?.fontSize || 16}
          labelColor={labels.find((l) => l.id === selectedLabel)?.color || "#000000"}
          updateLabelText={updateLabelText}
          updateLabelFontSize={updateLabelFontSize}
          updateLabelColor={updateLabelColor}
          deleteLabel={deleteLabel}
          measurementMode={measurementMode}
          toggleMeasurementMode={toggleMeasurementMode}
          measurementsCount={measurements.length}
          clearAllMeasurements={clearAllMeasurements}
          exportPNG={exportPNG}
          exportJPG={exportJPG}
          exportPDF={exportPDF}
          resetRacks={resetRacks}
        />
      </div>

      {/* RIGHT SIDE (Canvas + asset palette) */}
      <div style={{ flex: 1, display: "flex", gap: 20 }}>
        {/* Canvas container */}
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
            const rect = e.currentTarget.getBoundingClientRect();
            if (type === "ACUnit") {
              addACCanvasCoords(
                e.clientX - rect.left,
                e.clientY - rect.top
              );
            } else if (type === "Camera") {
              addCameraCanvasCoords(
                e.clientX - rect.left,
                e.clientY - rect.top
              );
            } else if (type === "UPS") {
              addUPSCanvasCoords(
                e.clientX - rect.left,
                e.clientY - rect.top
              );
            } else if (type === "Label") {
              addLabelCanvasCoords(
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
              if (measurementMode) {
                handleMeasurementClick(e);
              } else if (e.target === e.target.getStage()) {
                setSelectedAC(null);
                setSelectedCamera(null);
                setSelectedUPS(null);
                setSelectedLabel(null);
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
                const sx = ac.x * scaleToFit + offsetX;
                const sy = ac.y * scaleToFit + offsetY;
                const w = ac.width * scaleToFit;
                const h = ac.height * scaleToFit;
                const isSelected = selectedAC === ac.id;

                return (
                  <Group
                    key={ac.id}
                    x={sx}
                    y={sy}
                    rotation={ac.rotation || 0}
                    draggable={!exporting}
                    onDragEnd={(e) =>
                      onACDragEnd(ac, e.target.x(), e.target.y())
                    }
                    onClick={() => {
                      setSelectedAC(ac.id);
                      setSelectedCamera(null);
                      setSelectedUPS(null);
                    }}
                  >
                    {/* Main AC body - white/light gray like typical wall ACs */}
                    <Rect
                      width={w}
                      height={h}
                      fill="#f5f5f5"
                      stroke={isSelected ? "#d32f2f" : "#9e9e9e"}
                      strokeWidth={isSelected ? 3 : 2}
                      cornerRadius={4}
                    />

                    {/* Top panel - darker gray */}
                    <Rect
                      width={w}
                      height={h * 0.2}
                      fill="#e0e0e0"
                      cornerRadius={4}
                    />

                    {/* Air outlet vents - horizontal louvers */}
                    {[0.35, 0.45, 0.55, 0.65, 0.75, 0.85].map((ratio, i) => (
                      <Line
                        key={`vent-${i}`}
                        points={[w * 0.1, h * ratio, w * 0.9, h * ratio]}
                        stroke="#bdbdbd"
                        strokeWidth={2}
                      />
                    ))}

                    {/* "AC" Label - top left */}
                    <Text
                      text="AC"
                      x={w * 0.05}
                      y={h * 0.03}
                      fontSize={Math.min(w, h) * 0.15}
                      fill="#757575"
                      fontStyle="bold"
                    />

                    {/* Power indicator light */}
                    <Circle
                      x={w * 0.85}
                      y={h * 0.1}
                      radius={Math.min(w, h) * 0.04}
                      fill="#4caf50"
                    />

                    {/* Airflow indicator arrows */}
                    {[0, 1, 2].map((i) => {
                      const startY = h * 0.45;
                      const arrowX = w * (0.3 + i * 0.2);
                      return (
                        <Group key={`arrow-${i}`}>
                          <Line
                            points={[
                              arrowX, startY,
                              arrowX, startY + h * 0.25
                            ]}
                            stroke="#64b5f6"
                            strokeWidth={1.5}
                          />
                          <Line
                            points={[
                              arrowX - 3, startY + h * 0.2,
                              arrowX, startY + h * 0.25,
                              arrowX + 3, startY + h * 0.2
                            ]}
                            stroke="#64b5f6"
                            strokeWidth={1.5}
                          />
                        </Group>
                      );
                    })}

                    {/* Direction indicator */}
                    <Circle
                      x={w / 2}
                      y={h * 0.95}
                      radius={3}
                      fill={isSelected ? "#d32f2f" : "#64b5f6"}
                    />
                  </Group>
                );
              })}

              {/* CAMERAS */}
              {cameras.map((camera) => {
                const sx = camera.x * scaleToFit + offsetX;
                const sy = camera.y * scaleToFit + offsetY;
                const size = camera.size;
                const isSelected = selectedCamera === camera.id;

                return (
                  <Group
                    key={camera.id}
                    x={sx}
                    y={sy}
                    rotation={camera.rotation}
                    draggable={!exporting}
                    onDragEnd={(e) =>
                      onCameraDragEnd(camera, e.target.x(), e.target.y())
                    }
                    onClick={() => {
                      setSelectedCamera(camera.id);
                      setSelectedAC(null);
                    }}
                  >
                    {/* Camera body */}
                    <Rect
                      x={-size / 2}
                      y={-size / 2}
                      width={size}
                      height={size * 0.7}
                      fill="#2e7d32"
                      stroke={isSelected ? "#d32f2f" : "#1b5e20"}
                      strokeWidth={isSelected ? 3 : 2}
                      cornerRadius={4}
                    />

                    {/* Camera lens */}
                    <Circle
                      x={0}
                      y={0}
                      radius={size * 0.25}
                      fill="#424242"
                      stroke="#616161"
                      strokeWidth={1.5}
                    />

                    {/* Lens reflection */}
                    <Circle
                      x={-size * 0.08}
                      y={-size * 0.08}
                      radius={size * 0.1}
                      fill="rgba(255, 255, 255, 0.6)"
                    />

                    {/* Direction indicator */}
                    <Circle
                      x={0}
                      y={-size * 0.5}
                      radius={3}
                      fill={isSelected ? "#d32f2f" : "#ff5252"}
                    />
                  </Group>
                );
              })}

              {/* UPS UNITS */}
              {upsUnits.map((ups) => {
                const sx = ups.x * scaleToFit + offsetX;
                const sy = ups.y * scaleToFit + offsetY;
                const size = ups.size;
                const isSelected = selectedUPS === ups.id;

                return (
                  <Group
                    key={ups.id}
                    x={sx}
                    y={sy}
                    rotation={ups.rotation}
                    draggable={!exporting}
                    onDragEnd={(e) =>
                      onUPSDragEnd(ups, e.target.x(), e.target.y())
                    }
                    onClick={() => {
                      setSelectedUPS(ups.id);
                      setSelectedAC(null);
                      setSelectedCamera(null);
                    }}
                  >
                    {/* UPS body */}
                    <Rect
                      x={-size / 2}
                      y={-size / 2}
                      width={size}
                      height={size * 0.8}
                      fill="#ff6f00"
                      stroke={isSelected ? "#d32f2f" : "#e65100"}
                      strokeWidth={isSelected ? 3 : 2}
                      cornerRadius={3}
                    />

                    {/* Battery indicator bars */}
                    <Rect
                      x={-size * 0.3}
                      y={-size * 0.25}
                      width={size * 0.6}
                      height={size * 0.15}
                      fill="#4caf50"
                      cornerRadius={1}
                    />
                    <Rect
                      x={-size * 0.3}
                      y={-size * 0.05}
                      width={size * 0.6}
                      height={size * 0.15}
                      fill="#4caf50"
                      cornerRadius={1}
                    />
                    <Rect
                      x={-size * 0.3}
                      y={size * 0.15}
                      width={size * 0.6}
                      height={size * 0.15}
                      fill="#4caf50"
                      cornerRadius={1}
                    />

                    {/* Power symbol */}
                    <Circle
                      x={0}
                      y={-size * 0.35}
                      radius={size * 0.08}
                      stroke="#ffffff"
                      strokeWidth={2}
                    />
                    <Line
                      points={[0, -size * 0.35, 0, -size * 0.45]}
                      stroke="#ffffff"
                      strokeWidth={2}
                    />

                    {/* Direction indicator */}
                    <Circle
                      x={0}
                      y={size * 0.45}
                      radius={3}
                      fill={isSelected ? "#d32f2f" : "#ffb300"}
                    />
                  </Group>
                );
              })}

              {/* TEXT LABELS */}
              {labels.map((label) => {
                const sx = label.x * scaleToFit + offsetX;
                const sy = label.y * scaleToFit + offsetY;
                const isSelected = selectedLabel === label.id;

                return (
                  <Text
                    key={label.id}
                    x={sx}
                    y={sy}
                    text={label.text}
                    fontSize={label.fontSize}
                    fill={label.color}
                    fontStyle="bold"
                    draggable={!exporting}
                    onDragEnd={(e) =>
                      onLabelDragEnd(label, e.target.x(), e.target.y())
                    }
                    onClick={() => {
                      setSelectedLabel(label.id);
                      setSelectedAC(null);
                      setSelectedCamera(null);
                      setSelectedUPS(null);
                    }}
                    stroke={isSelected ? "#d32f2f" : "transparent"}
                    strokeWidth={isSelected ? 1 : 0}
                  />
                );
              })}

              {/* MEASUREMENTS */}
              {measurements.map((measurement) => {
                const sx1 = measurement.x1 * scaleToFit + offsetX;
                const sy1 = measurement.y1 * scaleToFit + offsetY;
                const sx2 = measurement.x2 * scaleToFit + offsetX;
                const sy2 = measurement.y2 * scaleToFit + offsetY;
                const midX = (sx1 + sx2) / 2;
                const midY = (sy1 + sy2) / 2;

                return (
                  <Group key={measurement.id}>
                    {/* Measurement line */}
                    <Line
                      points={[sx1, sy1, sx2, sy2]}
                      stroke="#ff9800"
                      strokeWidth={2}
                      dash={[5, 5]}
                    />

                    {/* Start point */}
                    <Circle
                      x={sx1}
                      y={sy1}
                      radius={4}
                      fill="#ff9800"
                    />

                    {/* End point */}
                    <Circle
                      x={sx2}
                      y={sy2}
                      radius={4}
                      fill="#ff9800"
                    />

                    {/* Distance label */}
                    <Group x={midX} y={midY - 15}>
                      <Rect
                        x={-30}
                        y={0}
                        width={60}
                        height={20}
                        fill="white"
                        stroke="#ff9800"
                        strokeWidth={1}
                        cornerRadius={3}
                      />
                      <Text
                        x={-30}
                        y={3}
                        width={60}
                        text={`${measurement.distance.toFixed(1)} ${unit}`}
                        fontSize={11}
                        fill="#ff9800"
                        align="center"
                        fontStyle="bold"
                      />
                    </Group>

                    {/* Delete button (only when not exporting) */}
                    {!exporting && (
                      <Group
                        x={sx2 + 10}
                        y={sy2 - 10}
                        onClick={(e) => {
                          e.cancelBubble = true;
                          deleteMeasurement(measurement.id);
                        }}
                      >
                        <Circle
                          radius={8}
                          fill="#d32f2f"
                          opacity={0.8}
                        />
                        <Line
                          points={[-3, -3, 3, 3]}
                          stroke="white"
                          strokeWidth={2}
                        />
                        <Line
                          points={[-3, 3, 3, -3]}
                          stroke="white"
                          strokeWidth={2}
                        />
                      </Group>
                    )}
                  </Group>
                );
              })}

              {/* Measurement preview line (during measurement) */}
              {measurementMode && measurementStart && !exporting && (
                <Group>
                  <Circle
                    x={measurementStart.x * scaleToFit + offsetX}
                    y={measurementStart.y * scaleToFit + offsetY}
                    radius={5}
                    fill="#ff9800"
                    stroke="white"
                    strokeWidth={2}
                  />
                </Group>
              )}

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

        {/* Asset Palette */}
        <RackAssetPalette />
      </div>
    </div>
  );
}
