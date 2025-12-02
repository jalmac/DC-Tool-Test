// ui.js — Modern Amgen-style Light Theme Controls Panel
// Clean white panel, Amgen-blue section headers, modern spacing

import React from "react";

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

      {/* Rack Settings */}
      <div style={{ marginBottom: 22 }}>
        <h3 style={headingStyle}>Rack Settings</h3>

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
            step={0.01}
            value={props.rackWidth}
            onChange={(e) => props.setRackWidth(Number(e.target.value))}
            style={inputStyle}
          />
        </label>

        <label style={{ display: "block", marginBottom: 10 }}>
          Rack Depth:
          <input
            type="number"
            step={0.01}
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
            step={0.01}
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

      {/* AC Unit Settings */}
      {props.selectedAC && (
        <div style={{ marginBottom: 22 }}>
          <h3 style={headingStyle}>AC Unit</h3>

          <label style={{ display: "block", marginBottom: 10 }}>
            Width:
            <input
              type="number"
              step={0.01}
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
              step={0.01}
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
            onClick={() => props.deleteAC(props.selectedAC)}
            style={{ ...buttonStyle, background: "#b02020" }}
          >
            Delete AC Unit
          </button>
        </div>
      )}

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
