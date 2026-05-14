import { defineConfig } from "vite";

export default defineConfig({
  base: process.env.NODE_ENV === "production" ? "/guji_buddha_hall_3d/" : "/",
  server: {
    host: "0.0.0.0",
    port: 5173
  }
});
