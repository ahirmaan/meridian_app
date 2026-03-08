import { createServer as createViteServer } from "vite";
import path from "path";
import express from "express";
import { createApp } from "./src/server/app";

async function startDevServer() {
  const app = await createApp();
  const PORT = 3000;

  console.log("Starting Development Server...");

  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa",
  });

  app.use(vite.middlewares);

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Development server running on http://localhost:${PORT}`);
  });
}

// Only run this if we are NOT on Vercel
if (process.env.VERCEL !== '1') {
  startDevServer().catch(err => {
    console.error("Failed to start development server:", err);
  });
}

export default startDevServer;