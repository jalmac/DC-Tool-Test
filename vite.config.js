import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    allowedHosts: ["*"],   // <-- allow all Codesandbox hosts
    host: true,            // <-- required for CSB remote preview
  },
});
