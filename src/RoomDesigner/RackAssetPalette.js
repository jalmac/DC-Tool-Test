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
        marginBottom: 20,
      }}
    >
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

      <div
        style={{
          marginTop: 12,
          fontSize: 12,
          color: "#3c6d99",
          textAlign: "center",
        }}
      >
        Drag into the<br />
        room layout
      </div>
    </div>
  );
}
