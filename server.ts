import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Proxy API requests to avoid CORS issues
  app.get("/api/v1/*", async (req, res) => {
    const targetUrl = `https://aaronep.pythonanywhere.com${req.originalUrl}`;
    try {
      const response = await fetch(targetUrl);
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error(`Error proxying to ${targetUrl}:`, error);
      res.status(500).json({ error: "Failed to fetch from backend" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
