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
  customLayoutRacks,
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
  const canvasContainerRef = useRef(null);
  const [stageSize, setStageSize] = useState({ width: PREVIEW_W, height: PREVIEW_H });

  // Resize observer to make canvas fill available space
  useEffect(() => {
    const el = canvasContainerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setStageSize({ width: Math.floor(width), height: Math.floor(height) });
        }
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // ------------------ CORE STATE ------------------

  const [unit, setUnit] = useState("meters");
  const [roomWidth, setRoomWidth] = useState(7);
  const [roomLength, setRoomLength] = useState(4);

  const [polygon, setPolygon] = useState(
    scalePolygon(
      [
        [0, 0],
        [60, 0],
        [60, 30],
        [0, 30],
      ],
      7 * UNIT_SCALES.meters,
      4 * UNIT_SCALES.meters
    )
  );

  const [editPolygon, setEditPolygon] = useState(false);

  const [doorSide, setDoorSide] = useState("top");
  const [doorOffset, setDoorOffset] = useState(50);
  const [doorFlipped, setDoorFlipped] = useState(false);
  const [doorHingeRight, setDoorHingeRight] = useState(false);

  const [numRacks, setNumRacks] = useState(2);
  const [numRows, setNumRows] = useState(1);
  const [rackWidthPhysical, setRackWidthPhysical] = useState(1.5);
  const [rackDepthPhysical, setRackDepthPhysical] = useState(2);
  const [showCableManagers, setShowCableManagers] = useState(false);
  const [cableManagerWidth, setCableManagerWidth] = useState(0.2);
  const [snapToRacks, setSnapToRacks] = useState(true);
  const [showGrid, setShowGrid] = useState(false);
  const [rackNumberingStartsAtZero, setRackNumberingStartsAtZero] = useState(false);
  const [rackNumberingRightToLeft, setRackNumberingRightToLeft] = useState(false);
  const [useCustomLayout, setUseCustomLayout] = useState(false);
  const [customRacksPerRow, setCustomRacksPerRow] = useState(""); // e.g., "4, 3, 4"
  const [racks, setRacks] = useState([]);
  const [selectedRacks, setSelectedRacks] = useState([]);
  const [zoomLevel, setZoomLevel] = useState(1);

  const [acUnits, setAcUnits] = useState([]);
  const [selectedAC, setSelectedAC] = useState(null);

  const [cameras, setCameras] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState(null);

  const [upsUnits, setUpsUnits] = useState([]);
  const [selectedUPS, setSelectedUPS] = useState(null);

  const [labels, setLabels] = useState([]);
  const [selectedLabel, setSelectedLabel] = useState(null);

  const [aisles, setAisles] = useState([]);
  const [selectedAisle, setSelectedAisle] = useState(null);

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

  const scaleToFit = Math.min(stageSize.width / roomW, stageSize.height / roomH, 1) * zoomLevel;

  const offsetX = (stageSize.width - roomW * scaleToFit) / 2;
  const offsetY = (stageSize.height - roomH * scaleToFit) / 2;

  const door = {
    width: 1.5 * scale,
    leaf: 1.5 * scale,
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
    doorOffsetArg,
    doorFlippedArg,
    doorHingeRightArg
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
      doorOffsetArg,
      doorFlippedArg,
      doorHingeRightArg
    );

  // ------------------ EFFECT: SCALE POLYGON ------------------

  useEffect(() => {
    setPolygon((prev) => scalePolygon(prev, roomW, roomH));
  }, [roomW, roomH]);

  // ------------------ EFFECT: AUTO-PACK RACKS ------------------

  useEffect(() => {
    // Skip auto-packing in custom layout mode
    if (useCustomLayout) return;

    // Compute the up-to-date polygon for the current roomW/roomH.
    // This avoids a race condition where the polygon state is stale when roomW/roomH
    // changes at the same time (the scale-polygon effect runs concurrently).
    const currentPoly = scalePolygon(polygon, roomW, roomH);

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
      currentPoly,
      doorSide,
      door,
      doorOffset,
      doorFlipped,
      doorHingeRight,
      racks, // Pass existing racks to preserve their properties
      rackNumberingStartsAtZero ? 0 : 1
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
    rackNumberingStartsAtZero,
    useCustomLayout,
  ]);

  // ------------------ EFFECT: CUSTOM LAYOUT RACKS ------------------

  useEffect(() => {
    if (!useCustomLayout || !customRacksPerRow) return;

    // Parse the custom racks per row string (e.g., "4, 3, 4")
    const racksPerRowArray = customRacksPerRow
      .split(',')
      .map(s => parseInt(s.trim()))
      .filter(n => !isNaN(n) && n > 0);

    if (racksPerRowArray.length === 0) return;

    const currentPoly = scalePolygon(polygon, roomW, roomH);

    const packed = customLayoutRacks(
      racksPerRowArray,
      roomW,
      roomH,
      rackW,
      rackD,
      showCableManagers,
      cableManagerPx,
      rackInsidePoly,
      rackDoorBlocked,
      currentPoly,
      doorSide,
      door,
      doorOffset,
      doorFlipped,
      doorHingeRight,
      racks, // Pass existing racks to preserve their properties
      rackNumberingStartsAtZero ? 0 : 1,
      rackNumberingRightToLeft
    );

    setRacks(packed);
    setNumRows(racksPerRowArray.length);
    setNumRacks(racksPerRowArray.reduce((sum, n) => sum + n, 0));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    useCustomLayout,
    customRacksPerRow,
    roomW,
    roomH,
    rackW,
    rackD,
    showCableManagers,
    cableManagerPx,
    rackNumberingStartsAtZero,
    rackNumberingRightToLeft,
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
        doorOffset,
        doorFlipped,
        doorHingeRight
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
              doorOffset,
              doorFlipped,
              doorHingeRight
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
              doorOffset,
              doorFlipped,
              doorHingeRight
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

    const widthPx = 2 * scale;
    const heightPx = 0.5 * scale;

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

  // ------------------ AISLE FUNCTIONS ------------------

  function addAisleCanvasCoords(canvasX, canvasY, aisleType) {
    const px = (canvasX - offsetX) / scaleToFit;
    const py = (canvasY - offsetY) / scaleToFit;

    const widthPx = 8 * scale; // Default width: 8 meters/feet
    const heightPx = 0.8 * scale; // Height: 0.8 meters/feet

    const aisle = {
      id: Date.now() + Math.random(),
      x: px,
      y: py,
      width: widthPx,
      height: heightPx,
      type: aisleType, // "hot" or "cold"
    };

    setAisles((prev) => [...prev, aisle]);
    setSelectedAisle(aisle.id);
  }

  function onAisleDragEnd(aisle, canvasX, canvasY) {
    const px = (canvasX - offsetX) / scaleToFit;
    const py = (canvasY - offsetY) / scaleToFit;

    setAisles((prev) =>
      prev.map((a) =>
        a.id === aisle.id ? { ...a, x: px, y: py } : a
      )
    );
  }

  function deleteAisle(id) {
    setAisles((prev) => prev.filter((a) => a.id !== id));
    if (selectedAisle === id) setSelectedAisle(null);
  }

  function updateAisleSize(id, wPhysical, hPhysical) {
    setAisles((prev) =>
      prev.map((a) =>
        a.id === id
          ? { ...a, width: wPhysical * scale, height: hPhysical * scale }
          : a
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

  // ------------------ KEYBOARD EVENT LISTENER ------------------

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Delete or Backspace key to delete selected racks
      if ((e.key === "Delete" || e.key === "Backspace") && selectedRacks.length > 0) {
        // Prevent default only if we're actually deleting racks
        // (don't interfere with input fields)
        if (document.activeElement.tagName !== "INPUT" && document.activeElement.tagName !== "TEXTAREA") {
          e.preventDefault();
          deleteSelectedRacks();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedRacks, rackNumberingStartsAtZero]); // eslint-disable-line react-hooks/exhaustive-deps

  // ------------------ RACK ROTATION ------------------

  function rotateSelectedRacks() {
    setRacks((prev) => {
      // First, rotate the selected racks
      const rotated = prev.map((r, i) =>
        selectedRacks.includes(i)
          ? { ...r, rotation: (r.rotation || 0) + 90 }
          : r
      );

      // Then adjust positions to prevent overlapping
      // Sort selected racks by x position (left to right)
      const selectedIndices = [...selectedRacks].sort((a, b) => prev[a].x - prev[b].x);

      if (selectedIndices.length > 1) {
        // Check if racks are rotated to vertical orientation (90° or 270°)
        const firstRack = rotated[selectedIndices[0]];
        const firstRotation = (firstRack.rotation || 0) % 360;
        const isVertical = firstRotation === 90 || firstRotation === 270;

        // Adjust positions for each selected rack after the first
        for (let i = 1; i < selectedIndices.length; i++) {
          const currentIdx = selectedIndices[i];
          const prevIdx = selectedIndices[i - 1];

          const currentRack = rotated[currentIdx];
          const prevRack = rotated[prevIdx];

          // Calculate effective dimensions after rotation
          const prevRotation = (prevRack.rotation || 0) % 360;
          const prevIsRotated = prevRotation === 90 || prevRotation === 270;
          const prevEffectiveW = prevIsRotated ? rackD : rackW;
          const prevEffectiveH = prevIsRotated ? rackW : rackD;

          const currentRotation = (currentRack.rotation || 0) % 360;
          const currentIsRotated = currentRotation === 90 || currentRotation === 270;
          const currentEffectiveW = currentIsRotated ? rackD : rackW;
          const currentEffectiveH = currentIsRotated ? rackW : rackD;

          const cableSpace = showCableManagers ? cableManagerPx : 0;

          if (isVertical) {
            // Stack vertically (one below the other)
            const newY = prevRack.y + prevEffectiveH + cableSpace;

            // Check if this position is valid and doesn't exceed room bounds
            if (newY + currentEffectiveH <= roomH) {
              rotated[currentIdx] = { ...currentRack, x: prevRack.x, y: newY };
            }
          } else {
            // Position horizontally (side by side)
            const newX = prevRack.x + prevEffectiveW + cableSpace;

            // Check if this position is valid and doesn't exceed room bounds
            if (newX + currentEffectiveW <= roomW) {
              rotated[currentIdx] = { ...currentRack, x: newX, y: prevRack.y };
            }
          }
        }
      }

      return rotated;
    });
  }

  // ------------------ RACK DRAG HANDLERS ------------------

  function onRackDragMove(index, canvasX, canvasY) {
    // If this rack is part of a group selection, move all selected racks together
    if (selectedRacks.includes(index) && selectedRacks.length > 1) {
      const originalRack = racks[index];
      // canvasX, canvasY is the center position (Group positioned at center)
      // Convert to top-left logical coordinates
      const newX = (canvasX - offsetX) / scaleToFit - rackW / 2;
      const newY = (canvasY - offsetY) / scaleToFit - rackD / 2;

      const deltaX = newX - originalRack.x;
      const deltaY = newY - originalRack.y;

      setRacks((prev) =>
        prev.map((r, i) => {
          if (selectedRacks.includes(i)) {
            return { ...r, x: r.x + deltaX, y: r.y + deltaY };
          }
          return r;
        })
      );
    }
  }

  function onRackDragEnd(index, canvasX, canvasY) {
    // canvasX, canvasY is the center position (Group positioned at center)
    // Convert to top-left logical coordinates
    let x = (canvasX - offsetX) / scaleToFit - rackW / 2;
    let y = (canvasY - offsetY) / scaleToFit - rackD / 2;

    const originalRack = racks[index];
    const isGroupDrag = selectedRacks.includes(index) && selectedRacks.length > 1;

    // Rack-to-rack snapping - only snap if racks are already roughly aligned
    const HORIZONTAL_SNAP_DISTANCE = 50; // How close horizontally to trigger snap
    const VERTICAL_ALIGNMENT_REQUIRED = 40; // Racks must be within this Y distance to snap

    let snapped = false;

    // Check proximity to other racks (excluding selected racks)
    racks.forEach((otherRack, otherIndex) => {
      if (otherIndex === index) return; // Skip self
      if (selectedRacks.includes(otherIndex)) return; // Skip other selected racks
      if (snapped) return; // Already snapped to another rack

      // Account for rotation: when rotated 90° or 270°, width and depth swap
      const currentRackRotation = (racks[index].rotation || 0) % 360;
      const otherRackRotation = (otherRack.rotation || 0) % 360;

      const currentIsRotated = currentRackRotation === 90 || currentRackRotation === 270;
      const otherIsRotated = otherRackRotation === 90 || otherRackRotation === 270;

      // Only need effective width for horizontal snapping
      const currentEffectiveW = currentIsRotated ? rackD : rackW;
      const otherEffectiveW = otherIsRotated ? rackD : rackW;

      const yDiff = Math.abs(y - otherRack.y);

      // IMPORTANT: Only snap horizontally if racks are already roughly aligned vertically
      if (yDiff >= VERTICAL_ALIGNMENT_REQUIRED) return;

      const cableSpace = showCableManagers ? cableManagerPx : 0;

      // Try to snap to right side of other rack
      const rightSnapX = otherRack.x + otherEffectiveW + cableSpace;
      const xDiffRight = Math.abs(x - rightSnapX);

      if (xDiffRight < HORIZONTAL_SNAP_DISTANCE) {
        x = rightSnapX;
        y = otherRack.y; // Force perfect Y alignment
        snapped = true;
        return;
      }

      // Try to snap to left side of other rack
      const leftSnapX = otherRack.x - currentEffectiveW - cableSpace;
      const xDiffLeft = Math.abs(x - leftSnapX);

      if (xDiffLeft < HORIZONTAL_SNAP_DISTANCE) {
        x = leftSnapX;
        y = otherRack.y; // Force perfect Y alignment
        snapped = true;
        return;
      }
    });

    // Grid snapping (existing functionality) - only if rack-to-rack snap didn't work
    if (!snapped && snapToRacks && racks.length > 0) {
      const gridSnap = snapRackToGrid(
        index,
        racks,
        rackW,
        rackD,
        showCableManagers,
        cableManagerPx,
        numRacks,
        numRows
      );
      x = gridSnap.x;
      y = gridSnap.y;
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
      doorOffset,
      doorFlipped,
      doorHingeRight
    );

    if (!valid) return;

    // If group drag, move all selected racks by the same offset
    if (isGroupDrag) {
      const deltaX = x - originalRack.x;
      const deltaY = y - originalRack.y;

      setRacks((prev) =>
        prev.map((r, i) => {
          if (selectedRacks.includes(i)) {
            const newX = r.x + deltaX;
            const newY = r.y + deltaY;
            // Validate each rack's new position
            const isValid = rackPositionIsValid(
              newX,
              newY,
              rackW,
              rackD,
              polygon,
              rackInsidePoly,
              rackDoorBlocked,
              doorSide,
              door,
              roomW,
              roomH,
              doorOffset,
              doorFlipped,
              doorHingeRight
            );
            return isValid ? { ...r, x: newX, y: newY } : r;
          }
          return r;
        })
      );
    } else {
      setRacks((prev) =>
        prev.map((r, i) => (i === index ? { ...r, x, y } : r))
      );
    }
  }

  function resetRacks() {
    // Force repack by temporarily clearing racks, then setting new packed positions
    // Don't pass existing racks to reset types and rotations
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
        doorOffset,
        doorFlipped,
        doorHingeRight,
        [], // Pass empty array to reset all racks to default
        rackNumberingStartsAtZero ? 0 : 1
      );
      setRacks(packed);
    }, 0);
  }

  function toggleRackType() {
    setRacks((prev) => {
      // First, toggle the types
      const toggled = prev.map((r, i) =>
        selectedRacks.includes(i)
          ? { ...r, type: r.type === "cooling" ? "server" : "cooling" }
          : r
      );

      // Then, renumber all server racks sequentially
      const startingNumber = rackNumberingStartsAtZero ? 0 : 1;
      let serverCount = startingNumber - 1;
      return toggled.map((r) => {
        if (r.type === "cooling") {
          return { ...r, label: "" };
        } else {
          serverCount++;
          return { ...r, label: `Rack\n${serverCount}` };
        }
      });
    });
  }

  function deleteSelectedRacks() {
    if (selectedRacks.length === 0) return;

    if (useCustomLayout) {
      // In custom layout mode, remove racks and update the configuration
      setRacks((prev) => {
        // Filter out selected racks
        const remaining = prev.filter((_, i) => !selectedRacks.includes(i));

        // Count racks per row in the remaining racks
        const rowCounts = {};
        remaining.forEach((rack) => {
          const row = rack.rowIndex;
          rowCounts[row] = (rowCounts[row] || 0) + 1;
        });

        // Update the column indices for remaining racks in each row
        const reindexed = {};
        remaining.forEach((rack) => {
          const row = rack.rowIndex;
          if (!reindexed[row]) reindexed[row] = [];
          reindexed[row].push(rack);
        });

        const result = [];
        Object.keys(reindexed).forEach((row) => {
          reindexed[row].forEach((rack, colIndex) => {
            result.push({ ...rack, columnIndex: colIndex });
          });
        });

        // Renumber all server racks sequentially
        const startingNumber = rackNumberingStartsAtZero ? 0 : 1;
        let serverCount = startingNumber - 1;
        return result.map((r) => {
          if (r.type === "cooling") {
            return { ...r, label: "" };
          } else {
            serverCount++;
            return { ...r, label: `Rack\n${serverCount}` };
          }
        });
      });

      // Update the custom racks per row string
      setRacks((prev) => {
        const rowCounts = {};
        prev.forEach((rack) => {
          const row = rack.rowIndex;
          rowCounts[row] = (rowCounts[row] || 0) + 1;
        });

        const maxRow = Math.max(...Object.keys(rowCounts).map(Number));
        const countsArray = [];
        for (let i = 0; i <= maxRow; i++) {
          countsArray.push(rowCounts[i] || 0);
        }

        // Filter out rows with 0 racks
        const nonZeroRows = countsArray.filter(c => c > 0);
        setCustomRacksPerRow(nonZeroRows.join(', '));

        return prev;
      });
    } else {
      // In normal mode, just filter and renumber
      setRacks((prev) => {
        // Filter out selected racks
        const remaining = prev.filter((_, i) => !selectedRacks.includes(i));

        // Renumber all server racks sequentially
        const startingNumber = rackNumberingStartsAtZero ? 0 : 1;
        let serverCount = startingNumber - 1;
        return remaining.map((r) => {
          if (r.type === "cooling") {
            return { ...r, label: "" };
          } else {
            serverCount++;
            return { ...r, label: `Rack\n${serverCount}` };
          }
        });
      });

      // Update numRacks to match the new count
      setNumRacks((prev) => Math.max(1, prev - selectedRacks.length));
    }

    // Clear selection
    setSelectedRacks([]);
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
    <div style={{ display: "flex", gap: 24, height: "calc(100vh - 80px)", minHeight: 0 }}>
      {/* LEFT SIDEBAR */}
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <ControlsPanel
          unit={unit}
          setUnit={setUnit}
          roomWidth={roomWidth}
          roomLength={roomLength}
          setRoomWidth={setRoomWidth}
          setRoomLength={setRoomLength}
          doorFlipped={doorFlipped}
          setDoorFlipped={setDoorFlipped}
          doorHingeRight={doorHingeRight}
          setDoorHingeRight={setDoorHingeRight}
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
          selectedAisle={selectedAisle}
          aisleType={aisles.find((a) => a.id === selectedAisle)?.type || "hot"}
          aisleWidth={aisles.find((a) => a.id === selectedAisle)?.width / scale || null}
          aisleHeight={aisles.find((a) => a.id === selectedAisle)?.height / scale || null}
          updateAisleSize={updateAisleSize}
          deleteAisle={deleteAisle}
          measurementMode={measurementMode}
          toggleMeasurementMode={toggleMeasurementMode}
          measurementsCount={measurements.length}
          clearAllMeasurements={clearAllMeasurements}
          exportPNG={exportPNG}
          exportJPG={exportJPG}
          exportPDF={exportPDF}
          resetRacks={resetRacks}
          selectedRacksCount={selectedRacks.length}
          rotateSelectedRacks={rotateSelectedRacks}
          toggleRackType={toggleRackType}
          deleteSelectedRacks={deleteSelectedRacks}
          rackNumberingStartsAtZero={rackNumberingStartsAtZero}
          setRackNumberingStartsAtZero={setRackNumberingStartsAtZero}
          rackNumberingRightToLeft={rackNumberingRightToLeft}
          setRackNumberingRightToLeft={setRackNumberingRightToLeft}
          useCustomLayout={useCustomLayout}
          setUseCustomLayout={setUseCustomLayout}
          customRacksPerRow={customRacksPerRow}
          setCustomRacksPerRow={setCustomRacksPerRow}
        />
      </div>

      {/* RIGHT SIDE (Canvas + asset palette) */}
      <div style={{ flex: 1, display: "flex", gap: 20, minHeight: 0 }}>
        {/* Canvas container */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
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
          ref={canvasContainerRef}
          style={{
            borderRadius: 12,
            background: "#ffffff",
            border: "1px solid #d5e1ef",
            boxShadow: "0 4px 10px rgba(0,0,0,0.06)",
            flex: 1,
            minHeight: 500,
            overflow: "hidden",
            position: "relative",
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
            } else if (type === "HotAisle") {
              addAisleCanvasCoords(
                e.clientX - rect.left,
                e.clientY - rect.top,
                "hot"
              );
            } else if (type === "ColdAisle") {
              addAisleCanvasCoords(
                e.clientX - rect.left,
                e.clientY - rect.top,
                "cold"
              );
            }
          }}
        >
          {/* ZOOM CONTROLS */}
          {!exporting && (
            <div style={{
              position: "absolute",
              top: 12,
              right: 12,
              zIndex: 10,
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "rgba(255,255,255,0.9)",
              border: "1px solid #b7cbe0",
              borderRadius: 8,
              padding: "4px 8px",
              boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
            }}>
              <button
                onClick={() => setZoomLevel((z) => Math.max(0.25, +(z - 0.25).toFixed(2)))}
                style={{ width: 28, height: 28, border: "none", background: "none", fontSize: 18, cursor: "pointer", color: "#003a66", lineHeight: 1 }}
                title="Zoom out"
              >−</button>
              <span style={{ fontSize: 12, color: "#003a66", minWidth: 40, textAlign: "center", fontWeight: 600 }}>
                {Math.round(zoomLevel * 100)}%
              </span>
              <button
                onClick={() => setZoomLevel((z) => Math.min(4, +(z + 0.25).toFixed(2)))}
                style={{ width: 28, height: 28, border: "none", background: "none", fontSize: 18, cursor: "pointer", color: "#003a66", lineHeight: 1 }}
                title="Zoom in"
              >+</button>
              <button
                onClick={() => setZoomLevel(1)}
                style={{ fontSize: 11, border: "1px solid #b7cbe0", background: "#f4f8ff", borderRadius: 4, padding: "2px 6px", cursor: "pointer", color: "#003a66", marginLeft: 2 }}
                title="Reset zoom"
              >Reset</button>
            </div>
          )}
          <Stage
            width={stageSize.width}
            height={stageSize.height}
            ref={stageRef}
            onMouseDown={(e) => {
              if (measurementMode) {
                handleMeasurementClick(e);
              } else if (e.target === e.target.getStage()) {
                setSelectedAC(null);
                setSelectedCamera(null);
                setSelectedUPS(null);
                setSelectedLabel(null);
                setSelectedAisle(null);
                setSelectedRacks([]);
              }
            }}
          >
            <Layer>
              {/* GRID LINES */}
              {showGrid && !exporting && (() => {
                const gridSize = scale * scaleToFit; // Grid in screen pixels
                const lines = [];

                // Vertical lines - cover entire canvas width
                for (let x = 0; x <= stageSize.width; x += gridSize) {
                  lines.push(
                    <Line
                      key={`v-${x}`}
                      points={[x, 0, x, stageSize.height]}
                      stroke="#cccccc"
                      strokeWidth={1}
                      dash={[5, 5]}
                    />
                  );
                }

                // Horizontal lines - cover entire canvas height
                for (let y = 0; y <= stageSize.height; y += gridSize) {
                  lines.push(
                    <Line
                      key={`h-${y}`}
                      points={[0, y, stageSize.width, y]}
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
                  doorOffset,
                  doorFlipped,
                  doorHingeRight
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
                // Simple center-pivot rotation WITHOUT using Konva offsets:
                // - Position Group at CENTER of rack
                // - Draw children at negative half-dimensions from center
                // - Rotation automatically pivots around Group's x,y (the center)
                const centerX = (rk.x + rackW / 2) * scaleToFit + offsetX;
                const centerY = (rk.y + rackD / 2) * scaleToFit + offsetY;
                const isSelected = selectedRacks.includes(i);
                const isCooling = rk.type === "cooling";

                // Colors for cooling vs server racks
                const fillColor = isCooling
                  ? null // Use gradient for cooling racks
                  : (isSelected && !exporting ? "#d0e7ff" : "#e8f1fb");
                const strokeColor = isCooling
                  ? (isSelected && !exporting ? "#ff6b00" : "#0099cc")
                  : (isSelected && !exporting ? "#ff6b00" : "#1976d2");

                return (
                  <Group
                    key={i}
                    x={centerX}
                    y={centerY}
                    rotation={rk.rotation || 0}
                    draggable={!exporting}
                    onDragMove={(e) =>
                      onRackDragMove(i, e.target.x(), e.target.y())
                    }
                    onDragEnd={(e) =>
                      onRackDragEnd(i, e.target.x(), e.target.y())
                    }
                    onClick={(e) => {
                      if (e.evt.ctrlKey || e.evt.metaKey) {
                        // CTRL+click: toggle selection
                        setSelectedRacks((prev) =>
                          prev.includes(i)
                            ? prev.filter((idx) => idx !== i)
                            : [...prev, i]
                        );
                      } else {
                        // Regular click: select only this rack
                        setSelectedRacks([i]);
                      }
                    }}
                  >
                    <Rect
                      x={-rackW * scaleToFit / 2}
                      y={-rackD * scaleToFit / 2}
                      width={rackW * scaleToFit}
                      height={rackD * scaleToFit}
                      fill={fillColor}
                      fillLinearGradientStartPoint={isCooling ? { x: 0, y: 0 } : undefined}
                      fillLinearGradientEndPoint={isCooling ? { x: rackW * scaleToFit, y: rackD * scaleToFit } : undefined}
                      fillLinearGradientColorStops={isCooling ? [0, '#0066ff', 1, '#00ffff'] : undefined}
                      stroke={strokeColor}
                      strokeWidth={isSelected && !exporting ? 3 : 2}
                      cornerRadius={6}
                      shadowColor={isCooling && !exporting ? "#0099cc" : undefined}
                      shadowBlur={isCooling && !exporting ? 5 : 0}
                      shadowEnabled={isCooling && !exporting}
                    />

                    {/* Thermal vision wavy lines for cooling racks */}
                    {isCooling && (
                      <>
                        {/* Wavy heat dissipation lines */}
                        {[0.25, 0.4, 0.55, 0.7].map((fraction, idx) => {
                          const baseY = (-rackD * scaleToFit / 2) + (rackD * scaleToFit * fraction);
                          const startX = -rackW * scaleToFit / 2 + 10;
                          const endX = rackW * scaleToFit / 2 - 10;
                          const points = [];

                          // Create wavy line points
                          const steps = 20;
                          for (let step = 0; step <= steps; step++) {
                            const x = startX + (endX - startX) * (step / steps);
                            const waveOffset = Math.sin((step + idx * 4) * 0.5) * 3;
                            points.push(x, baseY + waveOffset);
                          }

                          return (
                            <Line
                              key={`wave-${idx}`}
                              points={points}
                              stroke="rgba(255, 255, 255, 0.6)"
                              strokeWidth={1.5}
                              tension={0.3}
                            />
                          );
                        })}

                        {/* Temperature indicator icon (snowflake) */}
                        <Text
                          x={rackW * scaleToFit / 2 - 20}
                          y={-rackD * scaleToFit / 2 + 5}
                          text="❄"
                          fontSize={16}
                          fill="#ffffff"
                        />
                      </>
                    )}

                    <Text
                      x={-rackW * scaleToFit / 2}
                      y={-rackD * scaleToFit / 2}
                      text={rk.label}
                      width={rackW * scaleToFit}
                      height={rackD * scaleToFit}
                      align="center"
                      verticalAlign="middle"
                      fill={isCooling ? "#ffffff" : "#003a66"}
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

              {/* AISLES (Hot/Cold) */}
              {aisles.map((aisle) => {
                const sx = aisle.x * scaleToFit + offsetX;
                const sy = aisle.y * scaleToFit + offsetY;
                const w = aisle.width * scaleToFit;
                const h = aisle.height * scaleToFit;
                const isSelected = selectedAisle === aisle.id;
                const isHot = aisle.type === "hot";
                const text = isHot ? "HOT AISLE" : "COLD AISLE";
                const fontSize = Math.min(w / 10, h / 2, 16);

                return (
                  <Group
                    key={aisle.id}
                    x={sx}
                    y={sy}
                    draggable={!exporting}
                    onDragEnd={(e) =>
                      onAisleDragEnd(aisle, e.target.x(), e.target.y())
                    }
                    onClick={() => {
                      setSelectedAisle(aisle.id);
                      setSelectedAC(null);
                      setSelectedCamera(null);
                      setSelectedUPS(null);
                      setSelectedLabel(null);
                    }}
                  >
                    {/* Aisle rectangle */}
                    <Rect
                      width={w}
                      height={h}
                      fill={isHot ? "#ffcdd2" : "#bbdefb"}
                      stroke={isSelected ? "#000" : (isHot ? "#d32f2f" : "#1976d2")}
                      strokeWidth={isSelected ? 3 : 2}
                      opacity={0.6}
                      cornerRadius={4}
                    />

                    {/* Aisle label - properly centered */}
                    <Text
                      text={text}
                      width={w}
                      height={h}
                      fontSize={fontSize}
                      fill={isHot ? "#b71c1c" : "#0d47a1"}
                      fontStyle="bold"
                      align="center"
                      verticalAlign="middle"
                    />

                    {/* Resize handles - only show when selected */}
                    {isSelected && !exporting && (
                      <>
                        {/* Bottom-right resize handle */}
                        <Circle
                          x={w}
                          y={h}
                          radius={6}
                          fill="#fff"
                          stroke="#000"
                          strokeWidth={2}
                          draggable
                          onDragMove={(e) => {
                            const newW = Math.max(50, e.target.x());
                            const newH = Math.max(20, e.target.y());
                            updateAisleSize(
                              aisle.id,
                              newW / scaleToFit,
                              newH / scaleToFit
                            );
                          }}
                          onDragEnd={(e) => {
                            e.target.x(w);
                            e.target.y(h);
                          }}
                        />
                        {/* Bottom-left resize handle */}
                        <Circle
                          x={0}
                          y={h}
                          radius={6}
                          fill="#fff"
                          stroke="#000"
                          strokeWidth={2}
                          draggable
                          onDragMove={(e) => {
                            const deltaX = e.target.x();
                            const newW = Math.max(50, w - deltaX);
                            const newH = Math.max(20, e.target.y());

                            setAisles((prev) =>
                              prev.map((a) =>
                                a.id === aisle.id
                                  ? {
                                      ...a,
                                      x: (sx - offsetX + deltaX) / scaleToFit,
                                      width: newW / scaleToFit,
                                      height: newH / scaleToFit,
                                    }
                                  : a
                              )
                            );
                          }}
                          onDragEnd={(e) => {
                            e.target.x(0);
                            e.target.y(h);
                          }}
                        />
                        {/* Top-right resize handle */}
                        <Circle
                          x={w}
                          y={0}
                          radius={6}
                          fill="#fff"
                          stroke="#000"
                          strokeWidth={2}
                          draggable
                          onDragMove={(e) => {
                            const deltaY = e.target.y();
                            const newW = Math.max(50, e.target.x());
                            const newH = Math.max(20, h - deltaY);

                            setAisles((prev) =>
                              prev.map((a) =>
                                a.id === aisle.id
                                  ? {
                                      ...a,
                                      y: (sy - offsetY + deltaY) / scaleToFit,
                                      width: newW / scaleToFit,
                                      height: newH / scaleToFit,
                                    }
                                  : a
                              )
                            );
                          }}
                          onDragEnd={(e) => {
                            e.target.x(w);
                            e.target.y(0);
                          }}
                        />
                        {/* Top-left resize handle */}
                        <Circle
                          x={0}
                          y={0}
                          radius={6}
                          fill="#fff"
                          stroke="#000"
                          strokeWidth={2}
                          draggable
                          onDragMove={(e) => {
                            const deltaX = e.target.x();
                            const deltaY = e.target.y();
                            const newW = Math.max(50, w - deltaX);
                            const newH = Math.max(20, h - deltaY);

                            setAisles((prev) =>
                              prev.map((a) =>
                                a.id === aisle.id
                                  ? {
                                      ...a,
                                      x: (sx - offsetX + deltaX) / scaleToFit,
                                      y: (sy - offsetY + deltaY) / scaleToFit,
                                      width: newW / scaleToFit,
                                      height: newH / scaleToFit,
                                    }
                                  : a
                              )
                            );
                          }}
                          onDragEnd={(e) => {
                            e.target.x(0);
                            e.target.y(0);
                          }}
                        />
                      </>
                    )}
                  </Group>
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
