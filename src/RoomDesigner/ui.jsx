// ui.js — Modern Amgen-style Light Theme Controls Panel
// Clean white panel, Amgen-blue section headers, modern spacing

import React from "react";

// Helper function to get aisle preview colors
function getAislePreviewColor(scheme, type) {
  const schemes = {
    current: {
      hot: "#ffcdd2",
      cold: "#bbdefb",
    },
    highContrast: {
      hot: "#FFE0B2",
      cold: "#E0F7FA",
    },
    trafficLight: {
      hot: "#FFCDD2",
      cold: "#C8E6C9",
    },
    industrial: {
      hot: "#FFF9C4",
      cold: "#F5F5F5",
    },
    neon: {
      hot: "#FCE4EC",
      cold: "#E1F5FE",
    },
    earthy: {
      hot: "#FFCCBC",
      cold: "#E8F5E9",
    },
  };
  return schemes[scheme]?.[type] || schemes.current[type];
}

export function ControlsPanel(props) {
  const inputStyle = {
    width: 80,
    background: "#f7fbff",
    color: "#003a66",
    border: "1px solid #b7cbe0",
    padding: "6px 8px",
    borderRadius: 6,
    fontSize: 14,
    marginLeft: 8,
  };

  const buttonStyle = {
    background: "#007dc3",
    color: "white",
    border: "none",
    borderRadius: 6,
    padding: "6px 14px",
    cursor: "pointer",
    boxShadow: "0 2px 4px rgba(0,0,0,0.12)",
    fontWeight: 600,
    width: "100%",
    marginTop: 6,
  };

  const headingStyle = {
    color: "#007dc3",
    marginBottom: 10,
    fontSize: 16,
    fontWeight: 700,
  };

  return (
    <div
      style={{
        width: 260,
        background: "#ffffff",
        border: "1px solid #d5e1ef",
        borderRadius: 12,
        padding: 20,
        boxShadow: "0 4px 10px rgba(0,0,0,0.08)",
        color: "#003a66",
        fontFamily: "Inter, Segoe UI, Arial, sans-serif",
      }}
    >
      <h2
        style={{
          color: "#0061af",
          marginTop: 0,
          marginBottom: 20,
          fontSize: 20,
          fontWeight: 700,
          letterSpacing: 0.3,
        }}
      >
        Controls
      </h2>

      {/* AC Unit Settings */}
      {props.selectedAC && (
        <div style={{ marginBottom: 22 }}>
          <h3 style={headingStyle}>AC Unit</h3>

          <label style={{ display: "block", marginBottom: 10 }}>
            Width:
            <input
              type="number"
              step={0.5}
              min={0.2}
              value={props.acWidth || ""}
              onChange={(e) =>
                props.updateACSize(
                  props.selectedAC,
                  Number(e.target.value),
                  props.acHeight
                )
              }
              style={inputStyle}
            />
          </label>

          <label style={{ display: "block", marginBottom: 10 }}>
            Height:
            <input
              type="number"
              step={0.5}
              min={0.2}
              value={props.acHeight || ""}
              onChange={(e) =>
                props.updateACSize(
                  props.selectedAC,
                  props.acWidth,
                  Number(e.target.value)
                )
              }
              style={inputStyle}
            />
          </label>

          <button
            onClick={() => props.rotateAC(props.selectedAC)}
            style={buttonStyle}
          >
            Rotate 45°
          </button>

          <button
            onClick={() => props.deleteAC(props.selectedAC)}
            style={{ ...buttonStyle, background: "#b02020" }}
          >
            Delete AC Unit
          </button>
        </div>
      )}

      {/* Camera Settings */}
      {props.selectedCamera && (
        <div style={{ marginBottom: 22 }}>
          <h3 style={headingStyle}>Camera</h3>

          <label style={{ display: "block", marginBottom: 10 }}>
            Size:
            <input
              type="number"
              step={1}
              min={10}
              value={props.cameraSize || ""}
              onChange={(e) =>
                props.updateCameraSize(
                  props.selectedCamera,
                  Number(e.target.value)
                )
              }
              style={inputStyle}
            />
          </label>

          <button
            onClick={() => props.rotateCamera(props.selectedCamera)}
            style={buttonStyle}
          >
            Rotate 45°
          </button>

          <button
            onClick={() => props.deleteCamera(props.selectedCamera)}
            style={{ ...buttonStyle, background: "#b02020" }}
          >
            Delete Camera
          </button>
        </div>
      )}

      {/* UPS Settings */}
      {props.selectedUPS && (
        <div style={{ marginBottom: 22 }}>
          <h3 style={headingStyle}>UPS</h3>

          <label style={{ display: "block", marginBottom: 10 }}>
            Size:
            <input
              type="number"
              step={1}
              min={10}
              value={props.upsSize || ""}
              onChange={(e) =>
                props.updateUPSSize(
                  props.selectedUPS,
                  Number(e.target.value)
                )
              }
              style={inputStyle}
            />
          </label>

          <button
            onClick={() => props.rotateUPS(props.selectedUPS)}
            style={buttonStyle}
          >
            Rotate 45°
          </button>

          <button
            onClick={() => props.deleteUPS(props.selectedUPS)}
            style={{ ...buttonStyle, background: "#b02020" }}
          >
            Delete UPS
          </button>
        </div>
      )}

      {/* Label Settings */}
      {props.selectedLabel && (
        <div style={{ marginBottom: 22 }}>
          <h3 style={headingStyle}>Text Label</h3>

          <label style={{ display: "block", marginBottom: 10 }}>
            Text:
            <input
              type="text"
              value={props.labelText || ""}
              onChange={(e) =>
                props.updateLabelText(
                  props.selectedLabel,
                  e.target.value
                )
              }
              style={inputStyle}
            />
          </label>

          <label style={{ display: "block", marginBottom: 10 }}>
            Font Size:
            <input
              type="number"
              step={1}
              min={8}
              value={props.labelFontSize || ""}
              onChange={(e) =>
                props.updateLabelFontSize(
                  props.selectedLabel,
                  Number(e.target.value)
                )
              }
              style={inputStyle}
            />
          </label>

          <label style={{ display: "block", marginBottom: 10 }}>
            Color:
            <input
              type="color"
              value={props.labelColor || "#000000"}
              onChange={(e) =>
                props.updateLabelColor(
                  props.selectedLabel,
                  e.target.value
                )
              }
              style={{ ...inputStyle, height: 35 }}
            />
          </label>

          <button
            onClick={() => props.deleteLabel(props.selectedLabel)}
            style={{ ...buttonStyle, background: "#b02020" }}
          >
            Delete Label
          </button>
        </div>
      )}

      {/* Aisle Settings */}
      {props.selectedAisle && (
        <div style={{ marginBottom: 22 }}>
          <h3 style={headingStyle}>
            {props.aisleType === "hot" ? "Hot Aisle" : "Cold Aisle"}
          </h3>

          <label style={{ display: "block", marginBottom: 10 }}>
            Width:
            <input
              type="number"
              step={0.5}
              min={1}
              value={props.aisleWidth || ""}
              onChange={(e) =>
                props.updateAisleSize(
                  props.selectedAisle,
                  Number(e.target.value),
                  props.aisleHeight
                )
              }
              style={inputStyle}
            />
          </label>

          <label style={{ display: "block", marginBottom: 10 }}>
            Height:
            <input
              type="number"
              step={0.1}
              min={0.2}
              value={props.aisleHeight || ""}
              onChange={(e) =>
                props.updateAisleSize(
                  props.selectedAisle,
                  props.aisleWidth,
                  Number(e.target.value)
                )
              }
              style={inputStyle}
            />
          </label>

          <button
            onClick={() => props.deleteAisle(props.selectedAisle)}
            style={{ ...buttonStyle, background: "#b02020" }}
          >
            Delete Aisle
          </button>
        </div>
      )}

      {/* Aisle Appearance */}
      <div style={{ marginBottom: 22 }}>
        <h3 style={headingStyle}>Aisle Appearance</h3>

        <label style={{ display: "block", marginBottom: 10 }}>
          Color Scheme:
          <select
            value={props.aisleColorScheme || "current"}
            onChange={(e) => props.setAisleColorScheme(e.target.value)}
            style={{ ...inputStyle, width: "100%" }}
          >
            <option value="current">Current (Red/Blue)</option>
            <option value="highContrast">High Contrast (Orange/Cyan)</option>
            <option value="trafficLight">Traffic Light (Red/Green)</option>
            <option value="industrial">Industrial (Yellow/Gray)</option>
            <option value="neon">Neon Tech (Magenta/Cyan)</option>
            <option value="earthy">Earthy (Terracotta/Mint)</option>
          </select>
        </label>

        {/* Color preview swatches */}
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: "#666", marginBottom: 4, textAlign: "center" }}>Hot</div>
            <div
              style={{
                height: 40,
                borderRadius: 6,
                border: "2px solid #ccc",
                background: getAislePreviewColor(props.aisleColorScheme, "hot"),
              }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: "#666", marginBottom: 4, textAlign: "center" }}>Cold</div>
            <div
              style={{
                height: 40,
                borderRadius: 6,
                border: "2px solid #ccc",
                background: getAislePreviewColor(props.aisleColorScheme, "cold"),
              }}
            />
          </div>
        </div>
      </div>

      {/* Room Settings */}
      <div style={{ marginBottom: 22 }}>
        <h3 style={headingStyle}>Room Settings</h3>

        <label style={{ display: "block", marginBottom: 10 }}>
          Unit:
          <select
            value={props.unit}
            onChange={(e) => props.setUnit(e.target.value)}
            style={{ ...inputStyle, width: 120 }}
          >
            <option value="feet">Feet</option>
            <option value="meters">Meters</option>
          </select>
        </label>

        <label style={{ display: "block", marginBottom: 10 }}>
          Width:
          <input
            type="number"
            value={props.roomWidth}
            onChange={(e) => props.setRoomWidth(Number(e.target.value))}
            style={inputStyle}
          />
        </label>

        <label style={{ display: "block", marginBottom: 10 }}>
          Length:
          <input
            type="number"
            value={props.roomLength}
            onChange={(e) => props.setRoomLength(Number(e.target.value))}
            style={inputStyle}
          />
        </label>
      </div>

      {/* Door Options */}
      <div style={{ marginBottom: 22 }}>
        <h3 style={headingStyle}>Door Options</h3>

        <label style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
          <input
            type="checkbox"
            checked={props.doorFlipped}
            onChange={(e) => props.setDoorFlipped(e.target.checked)}
            style={{ marginRight: 10 }}
          />
          Door swings outward
        </label>

        <label style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
          <input
            type="checkbox"
            checked={props.doorHingeRight}
            onChange={(e) => props.setDoorHingeRight(e.target.checked)}
            style={{ marginRight: 10 }}
          />
          Hinge on right side
        </label>
      </div>

      {/* View Options */}
      <div style={{ marginBottom: 22 }}>
        <h3 style={headingStyle}>View Options</h3>

        <label style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
          <input
            type="checkbox"
            checked={props.showGrid}
            onChange={(e) => props.setShowGrid(e.target.checked)}
            style={{ marginRight: 10 }}
          />
          Show grid lines
        </label>
      </div>

      {/* Rack Settings */}
      <div style={{ marginBottom: 22 }}>
        <h3 style={headingStyle}>Rack Settings</h3>

        {props.selectedRacksCount > 0 && (
          <div style={{ marginBottom: 12 }}>
            <button
              onClick={props.rotateSelectedRacks}
              style={buttonStyle}
            >
              Rotate Selected Racks 90°
            </button>
            <button
              onClick={props.toggleRackType}
              style={{ ...buttonStyle, marginTop: 8 }}
            >
              Toggle Cooling/Server Type
            </button>
            <button
              onClick={props.deleteSelectedRacks}
              style={{ ...buttonStyle, marginTop: 8, background: "#d32f2f" }}
            >
              Delete Selected Racks
            </button>
          </div>
        )}

        <label style={{ display: "block", marginBottom: 10 }}>
          Racks:
          <input
            type="number"
            min={1}
            max={50}
            value={props.numRacks}
            onChange={(e) => props.setNumRacks(Number(e.target.value))}
            style={inputStyle}
          />
        </label>

        <label style={{ display: "block", marginBottom: 10 }}>
          Rows:
          <input
            type="number"
            min={1}
            max={props.numRacks}
            value={props.numRows}
            onChange={(e) => props.setNumRows(Number(e.target.value))}
            style={inputStyle}
          />
        </label>

        <label style={{ display: "block", marginBottom: 10 }}>
          Rack Width:
          <input
            type="number"
            step={0.5}
            value={props.rackWidth}
            onChange={(e) => props.setRackWidth(Number(e.target.value))}
            style={inputStyle}
          />
        </label>

        <label style={{ display: "block", marginBottom: 10 }}>
          Rack Depth:
          <input
            type="number"
            step={0.5}
            value={props.rackDepth}
            onChange={(e) => props.setRackDepth(Number(e.target.value))}
            style={inputStyle}
          />
        </label>

        <label style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
          <input
            type="checkbox"
            checked={props.snapToRacks}
            onChange={(e) => props.setSnapToRacks(e.target.checked)}
            style={{ marginRight: 10 }}
          />
          Snap racks to grid
        </label>

        <label style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
          <input
            type="checkbox"
            checked={props.rackNumberingStartsAtZero}
            onChange={(e) => props.setRackNumberingStartsAtZero(e.target.checked)}
            style={{ marginRight: 10 }}
          />
          Start numbering from 0
        </label>

        <label style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
          <input
            type="checkbox"
            checked={props.rackNumberingRightToLeft}
            onChange={(e) => props.setRackNumberingRightToLeft(e.target.checked)}
            style={{ marginRight: 10 }}
          />
          Number racks right to left
        </label>

        <label style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
          <input
            type="checkbox"
            checked={props.useCustomLayout}
            onChange={(e) => props.setUseCustomLayout(e.target.checked)}
            style={{ marginRight: 10 }}
          />
          Custom layout (preserves gaps)
        </label>

        {props.useCustomLayout && (
          <label style={{ display: "block", marginBottom: 10 }}>
            Racks per row (e.g., "4, 3, 4"):
            <input
              type="text"
              value={props.customRacksPerRow}
              onChange={(e) => props.setCustomRacksPerRow(e.target.value)}
              placeholder="e.g., 4, 3, 4"
              style={{ ...inputStyle, width: "100%" }}
            />
          </label>
        )}

        <button onClick={props.resetRacks} style={buttonStyle}>
          Reset Racks
        </button>
      </div>

      {/* Cable Managers */}
      <div style={{ marginBottom: 22 }}>
        <h3 style={headingStyle}>Cable Managers</h3>

        <label style={{ display: "block", marginBottom: 10 }}>
          Width:
          <input
            type="number"
            step={0.5}
            min={0.01}
            value={props.cableManagerWidth}
            onChange={(e) =>
              props.setCableManagerWidth(Number(e.target.value))
            }
            style={inputStyle}
          />
        </label>

        <button
          onClick={() =>
            props.setShowCableManagers(!props.showCableManagers)
          }
          style={{
            ...buttonStyle,
            background: props.showCableManagers ? "#4caf50" : "#007dc3",
          }}
        >
          {props.showCableManagers ? "Hide" : "Show"} Cable Managers
        </button>
      </div>

      {/* Measurement Tool */}
      <div style={{ marginBottom: 22 }}>
        <h3 style={headingStyle}>Measurement Tool</h3>

        <button
          onClick={props.toggleMeasurementMode}
          style={{
            ...buttonStyle,
            background: props.measurementMode ? "#4caf50" : "#007dc3",
          }}
        >
          {props.measurementMode ? "✓ Measuring (click 2 points)" : "Start Measuring"}
        </button>

        {props.measurementsCount > 0 && (
          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: 13, color: "#666", marginBottom: 8 }}>
              {props.measurementsCount} measurement{props.measurementsCount !== 1 ? 's' : ''}
            </div>
            <button
              onClick={props.clearAllMeasurements}
              style={{ ...buttonStyle, background: "#b02020" }}
            >
              Clear All Measurements
            </button>
          </div>
        )}
      </div>

      {/* Export */}
      <div style={{ marginBottom: 10 }}>
        <h3 style={headingStyle}>Export</h3>

        <button onClick={props.exportPNG} style={buttonStyle}>
          Export PNG
        </button>

        {props.exportJPG && (
          <button onClick={props.exportJPG} style={buttonStyle}>
            Export JPG
          </button>
        )}

        {props.exportPDF && (
          <button onClick={props.exportPDF} style={buttonStyle}>
            Export PDF
          </button>
        )}
      </div>
    </div>
  );
}
