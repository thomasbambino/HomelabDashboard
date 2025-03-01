import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { startServiceChecker } from "./service-checker";
import { setupDefaultTemplates } from "./email-templates";
import { createServer } from "http";
import net from 'net';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Configure trust proxy before any route handlers
app.set("trust proxy", true);

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

async function findAvailablePort(startPort: number): Promise<number> {

  return new Promise((resolve) => {
    let port = startPort;

    function tryPort() {
      const server = net.createServer();

      server.once('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'EADDRINUSE') {
          port++;
          tryPort();
        } else {
          console.error("Unexpected error while finding port:", err);
          resolve(0); // Or handle the error appropriately
        }
      });

      server.once('listening', () => {
        server.close(() => resolve(port));
      });

      server.listen(port, '0.0.0.0');
    }

    tryPort();
  });
}

(async () => {
  // Set up default email templates
  await setupDefaultTemplates();

  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // Start the service checker
  startServiceChecker();

  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Find an available port starting from 5000
  const port = await findAvailablePort(5000);

  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`Server started - listening on port ${port}`);
  });

  // Handle graceful shutdown
  const cleanup = () => {
    server.close();
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
})();