import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes.js";
import { setupVite, serveStatic, log } from "./vite.js";
import { startServiceChecker } from "./service-checker.js";
import { setupDefaultTemplates } from "./email-templates.js";

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
  let server;
  let startAttempts = 0;
  const MAX_ATTEMPTS = 5;

  try {
    // Set up default email templates
    await setupDefaultTemplates();

    server = await registerRoutes(app);

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      log(`Error: ${message}`, "error");
      res.status(status).json({ message });
    });

    // Start the service checker
    startServiceChecker();

    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    const port = 5000;

    const startServer = () => {
      if (startAttempts >= MAX_ATTEMPTS) {
        log("Maximum retry attempts reached. Exiting...", "error");
        process.exit(1);
      }

      startAttempts++;
      log(`Attempt ${startAttempts} to start server on port ${port}`);

      server.listen({
        port,
        host: "0.0.0.0",
      }, () => {
        log(`Server running on port ${port}`);
      });
    };

    // Handle server-specific errors
    server.on('error', (error: any) => {
      if (error.code === 'EADDRINUSE') {
        log(`Port ${port} is in use. Retrying in 1 second... (Attempt ${startAttempts}/${MAX_ATTEMPTS})`, "error");
        server.close();
        setTimeout(startServer, 1000);
      } else {
        log(`Server error: ${error.message}`, "error");
        process.exit(1);
      }
    });

    startServer();

    // Handle graceful shutdown
    const cleanup = () => {
      log("Shutting down server...");
      if (server) {
        server.close(() => {
          log("Server closed");
          process.exit(0);
        });
      } else {
        process.exit(0);
      }
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
    process.on('uncaughtException', (error) => {
      log(`Uncaught Exception: ${error.message}`, "error");
      cleanup();
    });

  } catch (error) {
    log(`Failed to start server: ${error}`, "error");
    process.exit(1);
  }
})();