import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { startServiceChecker } from "./service-checker";
import { ChatServer } from "./chat";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

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
    log('Starting server initialization...');

    const server = await registerRoutes(app);
    log('Routes registered successfully');

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      log(`Error middleware caught: ${status} - ${message}`);
      res.status(status).json({ message });
      throw err;
    });

    // Start the service checker
    startServiceChecker();
    log('Service checker started');

    if (app.get("env") === "development") {
      log('Setting up Vite for development...');
      await setupVite(app, server);
      log('Vite setup completed');
    } else {
      log('Setting up static file serving...');
      serveStatic(app);
      log('Static file serving setup completed');
    }

    const port = 5000;
    server.listen({
      port,
      host: "0.0.0.0",
      reusePort: true,
    }, () => {
      log(`Server started successfully, serving on port ${port}`);
    });

    // Handle graceful shutdown
    const cleanup = () => {
      log('Starting graceful shutdown...');
      const chatServer = app.get('chatServer') as ChatServer;
      if (chatServer) {
        chatServer.close();
        log('Chat server closed');
      }
      server.close();
      log('HTTP server closed');
      process.exit(0);
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);

    log('Server initialization completed successfully');
  } catch (error) {
    log(`Fatal error during server initialization: ${error}`);
    process.exit(1);
  }
})();