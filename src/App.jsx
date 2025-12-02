import React from "react";
import RoomDesigner from "./RoomDesigner/RoomDesigner";
import amgenLogo from "./assets/amgen-logo.png";

export default function App() {
  return (
    <div style={{ background: "#f6f8fa", minHeight: "100vh" }}>
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: "18px",
          padding: "20px 32px",
          background: "linear-gradient(90deg, #0061af 0%, #0090e3 100%)",
          borderBottom: "3px solid #007dc3",
        }}
      >
        <img
          src={amgenLogo}
          alt="Amgen"
          style={{
            height: 48,
            borderRadius: 12,
            background: "#fff",
            padding: "4px 6px",
            boxShadow: "0 2px 4px rgba(0,0,0,0.15)",
          }}
        />
        <h1
          style={{
            color: "#fff",
            fontWeight: 700,
            fontSize: 30,
            letterSpacing: 0.5,
            margin: 0,
          }}
        >
          Datacenter Layout Tool
        </h1>
      </header>

      <div style={{ padding: "30px 40px" }}>
        <RoomDesigner />
      </div>
    </div>
  );
}
