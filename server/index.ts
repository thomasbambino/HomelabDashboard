import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { startServiceChecker } from "./service-checker";
import { setupDefaultTemplates } from "./email-templates";

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

(async () => {
  try {
    log("Starting application setup...");

    // Setup base routes first to get the server running quickly
    log("Setting up base routes...");
    const server = await registerRoutes(app);

    // Configure error handling
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      log(`Error handler caught: ${status} - ${message}`);
      res.status(status).json({ message });
    });

    // Start server first, then initialize other services
    const port = 5000;
    log(`Attempting to start server on port ${port}...`);

    // Add detailed error handling for server startup
    server.on('error', (error: any) => {
      if (error.code === 'EADDRINUSE') {
        log(`Critical Error: Port ${port} is already in use. Please ensure no other instance is running.`);
        log("Checking process list...");
        try {
          const { execSync } = require('child_process');
          const output = execSync(`lsof -i :${port}`).toString();
          log(`Processes using port ${port}:\n${output}`);
        } catch (e) {
          log("Could not check process list");
        }
      } else {
        log(`Server startup error: ${error.message}`);
      }
      process.exit(1);
    });

    // Start listening before initializing other services
    await new Promise<void>((resolve, reject) => {
      server.listen({
        port,
        host: "0.0.0.0",
        reusePort: true,
      }, () => {
        log(`Server successfully started on port ${port}`);
        resolve();
      }).on('error', reject);
    });

    // Now that the server is running, initialize other services
    log("Initializing additional services...");

    if (app.get("env") === "development") {
      log("Setting up Vite development server...");
      await setupVite(app, server);
    } else {
      log("Setting up static file serving...");
      serveStatic(app);
    }

    // Setup remaining services asynchronously
    Promise.all([
      setupDefaultTemplates().then(() => log("Email templates setup complete")),
      startServiceChecker().then(() => log("Service checker started"))
    ]).catch(error => {
      log(`Warning: Non-critical service initialization error: ${error.message}`);
    });

    // Handle graceful shutdown
    const cleanup = () => {
      log("Initiating graceful shutdown...");
      server.close(() => {
        log("HTTP server closed");
        process.exit(0);
      });

      // Force exit after 5 seconds if graceful shutdown fails
      setTimeout(() => {
        log("Forced shutdown after timeout");
        process.exit(1);
      }, 5000);
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);

  } catch (error) {
    log(`Fatal error during startup: ${error instanceof Error ? error.message : 'Unknown error'}`);
    process.exit(1);
  }
})();