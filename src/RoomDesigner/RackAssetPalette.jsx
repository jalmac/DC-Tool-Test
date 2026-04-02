// RackAssetPalette.js — Modern Amgen-style AC Palette
// Clean UI, vector AC icon, draggable asset block

import React from "react";

export default function RackAssetPalette() {
  return (
    <div
      style={{
        width: 150,
        background: "#ffffff",
        border: "1px solid #c9d7e6",
        borderRadius: 12,
        padding: "18px 14px",
        boxShadow: "0 3px 8px rgba(0,0,0,0.08)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 12,
        marginBottom: 20,
      }}
    >
      {/* AC Unit */}
      <div
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData("asset-type", "ACUnit");
        }}
        style={{
          width: "100%",
          border: "2px solid #007dc3",
          background: "#e8f3ff",
          borderRadius: 10,
          padding: "14px 10px",
          textAlign: "center",
          cursor: "grab",
          boxShadow: "0 2px 6px rgba(0,0,0,0.06)",
          transition: "box-shadow 0.2s ease",
        }}
        title="Drag into the room layout"
      >
        {/* Vector AC fan icon */}
        <svg
          width="38"
          height="38"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#007dc3"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ marginBottom: 6 }}
        >
          <circle cx="12" cy="12" r="4"></circle>
          <path d="M3 12h3"></path>
          <path d="M18 12h3"></path>
          <path d="M12 3v3"></path>
          <path d="M12 18v3"></path>
          <path d="M5.6 5.6l2.1 2.1"></path>
          <path d="M16.3 16.3l2.1 2.1"></path>
          <path d="M18.4 5.6l-2.1 2.1"></path>
          <path d="M7.7 16.3l-2.1 2.1"></path>
        </svg>

        <div
          style={{
            fontSize: 15,
            fontWeight: 600,
            color: "#005a99",
            letterSpacing: 0.3,
          }}
        >
          AC Unit
        </div>
      </div>

      {/* Camera */}
      <div
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData("asset-type", "Camera");
        }}
        style={{
          width: "100%",
          border: "2px solid #2e7d32",
          background: "#e8f5e9",
          borderRadius: 10,
          padding: "14px 10px",
          textAlign: "center",
          cursor: "grab",
          boxShadow: "0 2px 6px rgba(0,0,0,0.06)",
          transition: "box-shadow 0.2s ease",
        }}
        title="Drag anywhere in the room"
      >
        {/* Camera icon */}
        <svg
          width="38"
          height="38"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#2e7d32"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ marginBottom: 6 }}
        >
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
          <circle cx="12" cy="13" r="4"></circle>
        </svg>

        <div
          style={{
            fontSize: 15,
            fontWeight: 600,
            color: "#1b5e20",
            letterSpacing: 0.3,
          }}
        >
          Camera
        </div>
      </div>

      {/* UPS */}
      <div
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData("asset-type", "UPS");
        }}
        style={{
          width: "100%",
          border: "2px solid #ff6f00",
          background: "#fff3e0",
          borderRadius: 10,
          padding: "14px 10px",
          textAlign: "center",
          cursor: "grab",
          boxShadow: "0 2px 6px rgba(0,0,0,0.06)",
          transition: "box-shadow 0.2s ease",
        }}
        title="Drag anywhere in the room"
      >
        {/* UPS/Battery icon */}
        <svg
          width="38"
          height="38"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#ff6f00"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ marginBottom: 6 }}
        >
          <rect x="2" y="7" width="16" height="13" rx="2" ry="2"></rect>
          <line x1="22" y1="11" x2="22" y2="17"></line>
          <line x1="6" y1="11" x2="6" y2="13"></line>
          <line x1="10" y1="11" x2="10" y2="13"></line>
        </svg>

        <div
          style={{
            fontSize: 15,
            fontWeight: 600,
            color: "#e65100",
            letterSpacing: 0.3,
          }}
        >
          UPS
        </div>
      </div>

      {/* Text Label */}
      <div
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData("asset-type", "Label");
        }}
        style={{
          width: "100%",
          border: "2px solid #9c27b0",
          background: "#f3e5f5",
          borderRadius: 10,
          padding: "14px 10px",
          textAlign: "center",
          cursor: "grab",
          boxShadow: "0 2px 6px rgba(0,0,0,0.06)",
          transition: "box-shadow 0.2s ease",
        }}
        title="Drag anywhere to add text"
      >
        {/* Label/Text icon */}
        <svg
          width="38"
          height="38"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#9c27b0"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ marginBottom: 6 }}
        >
          <polyline points="4 7 4 4 20 4 20 7"></polyline>
          <line x1="9" y1="20" x2="15" y2="20"></line>
          <line x1="12" y1="4" x2="12" y2="20"></line>
        </svg>

        <div
          style={{
            fontSize: 15,
            fontWeight: 600,
            color: "#7b1fa2",
            letterSpacing: 0.3,
          }}
        >
          Text Label
        </div>
      </div>

      {/* Hot Aisle */}
      <div
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData("asset-type", "HotAisle");
        }}
        style={{
          width: "100%",
          border: "2px solid #d32f2f",
          background: "#ffebee",
          borderRadius: 10,
          padding: "14px 10px",
          textAlign: "center",
          cursor: "grab",
          boxShadow: "0 2px 6px rgba(0,0,0,0.06)",
          transition: "box-shadow 0.2s ease",
        }}
        title="Drag between rack rows"
      >
        {/* Hot aisle icon - horizontal bars with heat waves */}
        <svg
          width="38"
          height="38"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#d32f2f"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ marginBottom: 6 }}
        >
          <rect x="2" y="10" width="20" height="4" fill="#d32f2f" opacity="0.3"></rect>
          <path d="M6 4 Q 6 6, 6 8" strokeWidth="1.5"></path>
          <path d="M12 4 Q 12 6, 12 8" strokeWidth="1.5"></path>
          <path d="M18 4 Q 18 6, 18 8" strokeWidth="1.5"></path>
        </svg>

        <div
          style={{
            fontSize: 15,
            fontWeight: 600,
            color: "#c62828",
            letterSpacing: 0.3,
          }}
        >
          Hot Aisle
        </div>
      </div>

      {/* Cold Aisle */}
      <div
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData("asset-type", "ColdAisle");
        }}
        style={{
          width: "100%",
          border: "2px solid #1976d2",
          background: "#e3f2fd",
          borderRadius: 10,
          padding: "14px 10px",
          textAlign: "center",
          cursor: "grab",
          boxShadow: "0 2px 6px rgba(0,0,0,0.06)",
          transition: "box-shadow 0.2s ease",
        }}
        title="Drag between rack rows"
      >
        {/* Cold aisle icon - horizontal bars with snowflakes */}
        <svg
          width="38"
          height="38"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#1976d2"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ marginBottom: 6 }}
        >
          <rect x="2" y="10" width="20" height="4" fill="#1976d2" opacity="0.3"></rect>
          <line x1="6" y1="4" x2="6" y2="8"></line>
          <line x1="4" y1="6" x2="8" y2="6"></line>
          <line x1="12" y1="4" x2="12" y2="8"></line>
          <line x1="10" y1="6" x2="14" y2="6"></line>
          <line x1="18" y1="4" x2="18" y2="8"></line>
          <line x1="16" y1="6" x2="20" y2="6"></line>
        </svg>

        <div
          style={{
            fontSize: 15,
            fontWeight: 600,
            color: "#0d47a1",
            letterSpacing: 0.3,
          }}
        >
          Cold Aisle
        </div>
      </div>

      <div
        style={{
          fontSize: 12,
          color: "#3c6d99",
          textAlign: "center",
        }}
      >
        Drag assets into<br />
        the room layout
      </div>
    </div>
  );
}
