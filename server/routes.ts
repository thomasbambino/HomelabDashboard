import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertServiceSchema, insertGameServerSchema, updateServiceSchema, updateGameServerSchema } from "@shared/schema";
import { fromZodError } from "zod-validation-error";
import { ZodError } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";
import express from 'express';
import https from 'https';
import http from 'http';
import sharp from 'sharp';
import { User } from '@shared/schema';
import cookieParser from 'cookie-parser';
import { sendEmail } from './email';
import { ampService } from './amp-service';
import { z } from "zod";
import fetch from 'node-fetch';

const plexInviteSchema = z.object({
  email: z.string().email("Invalid email address"),
});

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = path.join(process.cwd(), 'uploads');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
  }),
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only .png and .jpeg format allowed!'));
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

async function downloadImage(url: string): Promise<{ buffer: Buffer; contentType: string }> {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    protocol.get(url, (res) => {
      const contentType = res.headers['content-type'];
      if (!contentType || !['image/jpeg', 'image/png'].includes(contentType)) {
        reject(new Error('Invalid image type'));
        return;
      }

      const chunks: Buffer[] = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve({
        buffer: Buffer.concat(chunks),
        contentType
      }));
    }).on('error', reject);
  });
}

async function resizeAndSaveImage(inputBuffer: Buffer, basePath: string, filename: string, type: string): Promise<string | { url: string; largeUrl: string }> {
  if (type === 'site') {
    // For site logos, create both small and large versions
    const smallFilename = `site_small_${filename}`;
    const largeFilename = `site_large_${filename}`;
    const smallPath = path.join(basePath, smallFilename);
    const largePath = path.join(basePath, largeFilename);

    // Create small version (32x32) for header
    await sharp(inputBuffer)
      .resize(32, 32, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png({ quality: 90 })
      .toFile(smallPath);

    // Create large version (128x128) for login page
    await sharp(inputBuffer)
      .resize(128, 128, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png({ quality: 100 })
      .toFile(largePath);

    return {
      url: `/uploads/${smallFilename}`,
      largeUrl: `/uploads/${largeFilename}`
    };
  }

  // For other types, create a single resized version
  let size: number;
  switch (type) {
    case 'service':
      size = 48; // Medium icon for service cards
      break;
    case 'game':
      size = 64; // Larger icon for game servers
      break;
    default:
      size = 32;
  }

  const outputFilename = `${type}_${filename}`;
  const outputPath = path.join(basePath, outputFilename);

  await sharp(inputBuffer)
    .resize(size, size, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .png({ quality: 90 })
    .toFile(outputPath);

  return `/uploads/${outputFilename}`;
}

// Type-specific upload endpoints
const handleUpload = async (req: express.Request, res: express.Response, type: 'site' | 'service' | 'game') => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    // Get instanceId from the request
    const { instanceId } = req.body;
    if (!instanceId && type === 'game') {
      return res.status(400).json({ message: "Instance ID is required for game server icons" });
    }

    if (type === 'game') {
      console.log('Processing icon upload for instance:', instanceId);
      // Verify instance exists before proceeding
      const instances = await ampService.getInstances();
      const instance = instances.find(i => i.InstanceID === instanceId);
      if (!instance) {
        return res.status(404).json({ message: "Game server not found in AMP" });
      }
      console.log('Found matching AMP instance:', instance.FriendlyName);
    }

    let inputBuffer: Buffer;
    let filename: string;

    if (req.file) {
      // Handle direct file upload
      inputBuffer = fs.readFileSync(req.file.path);
      filename = req.file.filename;
      // Delete the original uploaded file since we'll create resized version
      fs.unlinkSync(req.file.path);
    } else if (req.body.imageUrl) {
      // Handle URL-based upload
      const { buffer } = await downloadImage(req.body.imageUrl);
      inputBuffer = buffer;
      filename = `url-${Date.now()}-${Math.round(Math.random() * 1E9)}.png`;
    } else {
      return res.status(400).json({ message: "No file or URL provided" });
    }

    const uploadDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const result = await resizeAndSaveImage(inputBuffer, uploadDir, filename, type);

    // If this is a game server icon, ensure the server exists in database
    if (type === 'game' && instanceId) {
      console.log('Updating icon for instance:', instanceId);

      // Find or create server record
      let server = await storage.getGameServerByInstanceId(instanceId);
      if (!server) {
        console.log('Creating new server record for instance:', instanceId);
        // Get instance details from AMP
        const instances = await ampService.getInstances();
        const instance = instances.find(i => i.InstanceID === instanceId);
        if (!instance) {
          return res.status(404).json({ message: "Game server not found" });
        }

        // Create new server record
        server = await storage.createGameServer({
          instanceId,
          name: instance.FriendlyName,
          type: instance.FriendlyName.toLowerCase().split(' ')[0],
          icon: typeof result === 'string' ? result : result.url,
        });
      } else {
        console.log('Updating existing server record:', server.name);
        // Update existing server with new icon
        server = await storage.updateGameServer({
          ...server,
          icon: typeof result === 'string' ? result : result.url,
        });
      }

      console.log('Server updated successfully:', server.name, 'with icon:', server.icon);
    }

    // For site uploads, handle both URLs
    if (typeof result === 'object' && 'largeUrl' in result) {
      res.json(result);
    } else {
      res.json({ url: result });
    }
  } catch (error) {
    console.error('Upload error:', error);
    res.status(400).json({
      message: error instanceof Error ? error.message : "Upload failed"
    });
  }
};

const isAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (!req.isAuthenticated() || (req.user as User).role !== 'admin' && (req.user as User).role !== 'superadmin') {
    return res.status(403).json({ message: 'Forbidden' });
  }
  next();
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Add cookie parser middleware before session setup
  app.use(cookieParser());

  setupAuth(app);

  // Serve uploaded files
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  // Register type-specific upload endpoints
  app.post("/api/upload/site", upload.single('image'), (req, res) => handleUpload(req, res, 'site'));
  app.post("/api/upload/service", upload.single('image'), (req, res) => handleUpload(req, res, 'service'));
  app.post("/api/upload/game", upload.single('image'), (req, res) => handleUpload(req, res, 'game'));

  app.get("/api/services", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const services = await storage.getAllServices();
    res.json(services);
  });

  app.post("/api/services", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const data = insertServiceSchema.parse(req.body);
      const service = await storage.createService(data);
      res.status(201).json(service);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: fromZodError(error).message });
      } else {
        console.error('Error creating service:', error);
        res.status(500).json({ message: "Internal server error" });
      }
    }
  });

  app.put("/api/services/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const data = updateServiceSchema.parse({ ...req.body, id: parseInt(req.params.id) });
      const service = await storage.updateService(data);
      if (!service) {
        return res.status(404).json({ message: "Service not found" });
      }
      res.json(service);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: fromZodError(error).message });
      } else {
        console.error('Error updating service:', error);
        res.status(500).json({ message: "Internal server error" });
      }
    }
  });

  app.delete("/api/services/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const id = parseInt(req.params.id);
      const service = await storage.deleteService(id);
      if (!service) {
        return res.status(404).json({ message: "Service not found" });
      }
      res.json(service);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: fromZodError(error).message });
      } else {
        console.error('Error deleting service:', error);
        res.status(500).json({ message: "Internal server error" });
      }
    }
  });

  app.get("/api/game-servers", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      // Get all AMP instances
      const ampInstances = await ampService.getInstances();
      console.log('Raw AMP instances:', ampInstances);

      // Get all stored game servers (for hidden status and customizations)
      const storedServers = await storage.getAllGameServers();

      // Map AMP instances to our game server format
      const servers = ampInstances.map(instance => {
        // Find existing stored server or create new one
        const storedServer = storedServers.find(s => s.instanceId === instance.InstanceID) || {
          instanceId: instance.InstanceID,
          hidden: false,
          show_player_count: true,
          show_status_badge: true,
          autoStart: false,
          refreshInterval: 30
        };

        // Get port from ApplicationEndpoints
        let port = '';
        if (instance.ApplicationEndpoints && instance.ApplicationEndpoints.length > 0) {
          const endpoint = instance.ApplicationEndpoints[0].Endpoint;
          port = endpoint.split(':')[1];
        }

        // Create response object with metrics data directly from instance
        const serverData = {
          ...storedServer,
          name: instance.FriendlyName,
          type: instance.FriendlyName.toLowerCase().split(' ')[0],
          status: instance.Running,
          playerCount: instance.Metrics?.['Active Users']?.RawValue || 0,
          maxPlayers: instance.Metrics?.['Active Users']?.MaxValue || 0,
          cpuUsage: instance.Metrics?.['CPU Usage']?.RawValue || 0,
          memoryUsage: instance.Metrics?.['Memory Usage']?.RawValue || 0,
          maxMemory: instance.Metrics?.['Memory Usage']?.MaxValue || 0,
          port,
          lastStatusCheck: new Date()
        };

        console.log('Processed server data:', serverData);
        return serverData;
      });

      // Only return non-hidden servers unless specifically requested
      const showHidden = req.query.showHidden === 'true';
      const filteredServers = showHidden ? servers : servers.filter(s => !s.hidden);

      console.log('Sending filtered servers:', filteredServers);
      res.json(filteredServers);
    } catch (error) {
      console.error('Error fetching game servers:', error);
      res.status(500).json({ message: "Failed to fetch game servers" });
    }
  });

  app.post("/api/game-servers/:instanceId/hide", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const { instanceId } = req.params;
      const { hidden } = req.body;

      // Find or create server record
      let server = await storage.getGameServerByInstanceId(instanceId);
      if (!server) {
        server = await storage.createGameServer({
          instanceId,
          name: "Unknown",  // Will be updated on next fetch
          type: "unknown",  // Will be updated on next fetch
          hidden: hidden
        });
      } else {
        server = await storage.updateGameServer({
          ...server,
          hidden: hidden
        });
      }

      res.json(server);
    } catch (error) {
      console.error('Error updating server visibility:', error);
      res.status(500).json({ message: "Failed to update server visibility" });
    }
  });

  app.post("/api/game-servers/:instanceId/start", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const { instanceId } = req.params;
      console.log(`Start request received for instance ${instanceId}`);

      // Verify instance exists
      const instances = await ampService.getInstances();
      const instance = instances.find(i => i.InstanceID === instanceId);
      if (!instance) {
        console.error(`Instance ${instanceId} not found`);
        return res.status(404).json({ message: "Instance not found" });
      }

      // Attempt to start the instance
      await ampService.startInstance(instanceId);
      console.log(`Start command successful for instance ${instanceId}`);

      // Get updated status
      const status = await ampService.getInstanceStatus(instanceId);
      console.log(`Updated status for instance ${instanceId}:`, status);

      res.json({
        message: "Server starting",
        status: status?.State || "Unknown"
      });
    } catch (error) {
      console.error('Error starting game server:', error);
      res.status(500).json({
        message: "Failed to start game server",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.post("/api/game-servers/:instanceId/stop", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const { instanceId } = req.params;
      console.log(`Stop request received for instance ${instanceId}`);

      // Verify instance exists
      const instances = await ampService.getInstances();
      const instance = instances.find(i => i.InstanceID === instanceId);
      if (!instance) {
        console.error(`Instance ${instanceId} not found`);
        return res.status(404).json({ message: "Instance not found" });
      }

      // Attempt to stop the instance
      await ampService.stopInstance(instanceId);
      console.log(`Stop command successful for instance ${instanceId}`);

      // Get updated status
      const status = await ampService.getInstanceStatus(instanceId);
      console.log(`Updated status for instance ${instanceId}:`, status);

      res.json({
        message: "Server stopping",
        status: status?.State || "Unknown"
      });
    } catch (error) {
      console.error('Error stopping game server:', error);
      res.status(500).json({
        message: "Failed to stop game server",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.post("/api/game-servers/:instanceId/restart", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const { instanceId } = req.params;
      console.log(`Restart request received for instance ${instanceId}`);

      // Verify instance exists
      const instances = await ampService.getInstances();
      const instance = instances.find(i => i.InstanceID === instanceId);
      if (!instance) {
        console.error(`Instance ${instanceId} not found`);
        return res.status(404).json({ message: "Instance not found" });
      }

      // Attempt to restart the instance
      await ampService.restartInstance(instanceId);
      console.log(`Restart command successful for instance ${instanceId}`);

      // Get updated status
      const status = await ampService.getInstanceStatus(instanceId);
      console.log(`Updated status for instance ${instanceId}:`, status);

      res.json({
        message: "Server restarting",
        status: status?.State || "Unknown"
      });
    } catch (error) {
      console.error('Error restarting game server:', error);
      res.status(500).json({
        message: "Failed to restart game server",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.post("/api/game-servers/:instanceId/kill", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const { instanceId } = req.params;
      console.log(`Kill request received for instance ${instanceId}`);

      // Verify instance exists
      const instances = await ampService.getInstances();
      const instance = instances.find(i => i.InstanceID === instanceId);
      if (!instance) {
        console.error(`Instance ${instanceId} not found`);
        return res.status(404).json({ message: "Instance not found" });
      }

      // Attempt to kill the instance
      await ampService.killInstance(instanceId);
      console.log(`Kill command successful for instance ${instanceId}`);

      // Get updated status
      const status = await ampService.getInstanceStatus(instanceId);
      console.log(`Updated status for instance ${instanceId}:`, status);

      res.json({
        message: "Server killed",
        status: status?.State || "Unknown"
      });
    } catch (error) {
      console.error('Error killing game server:', error);
      res.status(500).json({
        message: "Failed to kill game server",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.post("/api/game-servers", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const data = insertGameServerSchema.parse(req.body);
      const server = await storage.createGameServer(data);
      res.status(201).json(server);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: fromZodError(error).message });
      } else {
        console.error('Error creating game server:', error);
        res.status(500).json({ message: "Internal server error" });
      }
    }
  });

  app.put("/api/game-servers/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const data = updateGameServerSchema.parse({ ...req.body, id: parseInt(req.params.id) });
      const server = await storage.updateGameServer(data);
      if (!server) {
        return res.status(404).json({ message: "Game server not found" });
      }
      res.json(server);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: fromZodError(error).message });
      } else {
        console.error('Error updating game server:', error);
        res.status(500).json({ message: "Internal server error" });
      }
    }
  });

  app.delete("/api/game-servers/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const id = parseInt(req.params.id);
      const server = await storage.deleteGameServer(id);
      if (!server) {
        return res.status(404).json({ message: "Game server not found" });
      }
      res.json(server);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: fromZodError(error).message });
      } else {
        console.error('Error deleting game server:', error);
        res.status(500).json({ message: "Internal server error" });
      }
    }
  });

  // Update the AMP test endpoint
  app.get("/api/amp-test", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      console.log('Testing AMP connection...');
      console.log('AMP URL:', process.env.AMP_API_URL);
      console.log('Username configured:', !!process.env.AMP_API_USERNAME);

      // Try to get available API methods
      const apiMethods = await ampService.getAvailableAPIMethods();
      console.log('Available API methods:', apiMethods);

      // Get instance information
      const instances = await ampService.getInstances();

      res.json({
        success: true,
        message: "AMP connection test completed",
        instanceCount: instances.length,
        instances: instances,
        availableAPIMethods: apiMethods
      });
    } catch (error) {
      console.error('AMP test endpoint error:', error);
      res.status(500).json({
        success: false,
        message: "Failed to connect to AMP",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.post("/api/game-servers/request", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const { game } = req.body;
      const user = req.user as User;

      // Get all admin users
      const admins = await storage.getAllUsers();
      const adminEmails = admins
        .filter(admin => admin.role === 'admin' && admin.email)
        .map(admin => admin.email);

      if (adminEmails.length > 0) {
        // Send email to all admins
        for (const adminEmail of adminEmails) {
          if (adminEmail) {
            await sendEmail({
              to: adminEmail,
              subject: "New Game Server Request",
              html: `
                <p>A new game server has been requested:</p>
                <ul>
                  <li><strong>Game:</strong> ${game}</li>
                  <li><strong>Requested by:</strong> ${user.username}</li>
                  <li><strong>User Email:</strong> ${user.email || 'No email provided'}</li>
                  <li><strong>Time:</strong> ${new Date().toLocaleString()}</li>
                </ul>
                <p>Please review this request in the admin dashboard.</p>
              `
            });
          }
        }
      }

      res.json({ message: "Request submitted successfully" });
    } catch (error) {
      console.error('Error processing game server request:', error);
      res.status(500).json({ message: "Failed to process request" });
    }
  });



  app.get("/api/users", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const currentUser = req.user as User;
      const users = await storage.listUsers();
      // Filter out the current user and only return necessary fields
      const filteredUsers = users
        .filter(user => user.id !== currentUser.id)
        .map(({ id, username, isOnline, lastSeen }) => ({
          id,
          username,
          isOnline,
          lastSeen
        }));
      res.json(filteredUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Add new route for service status logs with filtering
  app.get("/api/services/status-logs", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const filters: {
        serviceId?: number;
        startDate?: Date;
        endDate?: Date;
        status?: boolean;
      } = {};

      console.log('Raw query params:', req.query);

      // Parse serviceId
      if (req.query.serviceId) {
        const serviceId = parseInt(req.query.serviceId as string);
        if (!isNaN(serviceId)) {
          filters.serviceId = serviceId;
          console.log('Parsed serviceId:', filters.serviceId);
        }
      }

      // Parse status
      if (req.query.status) {
        filters.status = req.query.status === 'true';
        console.log('Parsed status:', filters.status);
      }

      // Parse dates
      if (req.query.startDate) {
        filters.startDate = new Date(req.query.startDate as string);
      }

      if (req.query.endDate) {
        filters.endDate = new Date(req.query.endDate as string);
      }

      console.log('Final filters:', filters);

      const logs = await storage.getServiceStatusLogs(filters);

      // Fetch service details for each log
      const logsWithServiceDetails = await Promise.all(
        logs.map(async (log) => {
          const service = await storage.getService(log.serviceId);
          return { ...log, service };
        })
      );

      console.log('Returning logs count:', logsWithServiceDetails.length);
      res.json(logsWithServiceDetails);
    } catch (error) {
      console.error('Error fetching statuslogs:', error);
      res.status(500).json({ message: "Failed to fetch status logs" });
    }
  });
  // Inside /api/register route
  app.post("/api/register", async (req, res) => {
    if (req.isAuthenticated()) {
      return res.status(400).json({ message: "Already logged in" });
    }

    try {
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      const user = await storage.createUser({
        ...req.body,
        role: 'user',
        approved: true,
      });

      req.login(user, (err) => {
        if (err) {
          console.error("Login error after registration:", err);
          return res.status(500).json({ message: "Error during login" });
        }
        res.json(user);
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Error creating user" });
    }
  });

  app.post("/api/update-amp-credentials", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const { amp_url, amp_username, amp_password } = req.body;

      // Basic validation
      if (!amp_url || !amp_username || !amp_password) {
        return res.status(400).json({ message: "Missing required credentials" });
      }

      // Update environment variables
      process.env.AMP_API_URL = amp_url;
      process.env.AMP_API_USERNAME = amp_username;
      process.env.AMP_API_PASSWORD = amp_password;

      // Reinitialize the AMP service with new credentials
      ampService.reinitialize(amp_url, amp_username, amp_password);

      // Test the new credentials
      try {
        console.log('Testing new AMP credentials...');
        console.log('Using username:', amp_username);
        const systemInfo = await ampService.getSystemInfo();
        console.log('Updated credentials test - System info:', systemInfo);
        res.json({ message: "AMP credentials updated successfully" });
      } catch (error) {
        console.error('Error testing new credentials:', error);

        // Extract the specific error message if available
        let errorMessage = "Failed to connect with new credentials";
        if (error instanceof Error) {
          errorMessage = error.message;
        }

        res.status(400).json({
          message: "Failed to connect with new credentials",
          error: errorMessage
        });
      }
    } catch (error) {
      console.error('Error updating AMP credentials:', error);
      res.status(500).json({ message: "Failed to update AMP credentials" });
    }
  });

  app.get("/api/game-servers/:instanceId/metrics", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const { instanceId } = req.params;
      console.log(`Fetching metrics for instance ${instanceId}`);

      // Get instance status first to verify it exists and is running
      const instances = await ampService.getInstances();
      const instance = instances.find(i => i.InstanceID === instanceId);

      if (!instance) {
        console.error(`Instance ${instanceId} not found`);
        return res.status(404).json({ message: "Instance not found" });
      }

      if (!instance.Running) {
        console.log(`Instance ${instanceId} is not running, returning null metrics`);
        return res.json(null);
      }

      // Get metrics
      const metrics = await ampService.getMetrics(instanceId);
      console.log(`Metrics forinstance ${instanceId}:`, metrics);

      res.json(metrics);
    } catch (error) {
      console.error(`Error fetching metrics for instance ${`instanceId}:`, error);
            res.status(500).json({
        message: "Failed to fetchinstance metrics",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }  }
  });

  // Add new debug endpoint for game server player count
  app.get("/api/game-servers/:instanceId/debug", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const { instanceId } = req.params;
      console.log(`Debug request received for instance ${instanceId}`);

      // Get all instance information first
      const instances = await ampService.getInstances();
      const instance = instances.find(i => i.InstanceID === instanceId);

      if (!instance) {
        console.log(`Instance ${instanceId} not found`);
        return res.status(404).json({ message: "Instance not found" });
      }

      console.log('Found instance:', instance);

      // Get data from all possible sources
      console.log('Fetching metrics...');
      const metrics = await ampService.getMetrics(instanceId);
      console.log('Raw metrics:', metrics);

      console.log('Fetching user list...');
      const userList = await ampService.getUserList(instanceId);
      console.log('Raw user list:', userList);

      console.log('Fetching instance status...');
      const status = await ampService.getInstanceStatus(instanceId);
      console.log('Raw instance status:', status);

      const activeUsers = status?.Metrics?.['Active Users']?.RawValue || 0;
      console.log('Extracted active users:', activeUsers);

      // Return all debug information
      const response = {
        instanceInfo: {
          ...instance,
          FriendlyName: instance.FriendlyName,
          Running: instance.Running,
          ActiveUsers: instance.ActiveUsers,
          MaxUsers: instance.MaxUsers
        },
        metrics: {
          raw: metrics,
          playerCount: parseInt(metrics.Users[0]) || 0,
          maxPlayers: parseInt(metrics.Users[1]) || 0
        },
        userList: {
          raw: userList,
          count: userList.length
        },
        status: status,
        activeUsers: activeUsers,
        state: status?.State
      };

      console.log('Sending debug response:', response);
      res.json(response);

    } catch (error) {
      console.error('Debug endpoint error:', error);
      res.status(500).json({
        message: "Debug operation failed",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Add these routes within the registerRoutes function, with the other admin routes
  app.get("/api/email-templates", isAdmin, async (req, res) => {
    try {
      const templates = await storage.getAllEmailTemplates();
      res.json(templates);
    } catch (error) {
      console.error('Error fetching email templates:', error);
      res.status(500).json({ message: "Failed to fetch email templates" });
    }
  });

  app.post("/api/email-templates", isAdmin, async (req, res) => {
    try {
      const template = await storage.createEmailTemplate(req.body);
      res.status(201).json(template);
    } catch (error) {
      console.error('Error creating email template:', error);
      res.status(500).json({ message: "Failed to create email template" });
    }
  });

  app.patch("/api/email-templates/:id", isAdmin, async (req, res) => {
    try {
      const template = await storage.updateEmailTemplate({
        id: parseInt(req.params.id),
        ...req.body
      });
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }
      res.json(template);
    } catch (error) {
      console.error('Error updating email template:', error);
      res.status(500).json({ message: "Failed to update email template" });
    }
  });

  app.post("/api/email-templates/:id/test", isAdmin, async (req, res) => {
    try {
      const { email, logoUrl } = req.body;
      if (!email) {
        return res.status(400).json({ message: "Email address is required" });
      }

      const templateId = parseInt(req.params.id);
      const template = await storage.getEmailTemplate(templateId);
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }

      // Ensure we have an absolute URL for the logo
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const absoluteLogoUrl = logoUrl?.startsWith('http') ? logoUrl : `${baseUrl}${logoUrl}`;

      console.log('Testing email template with logo:', {
        providedUrl: logoUrl,
        absoluteUrl: absoluteLogoUrl,
        baseUrl
      });

      const templateData = {
        serviceName: "Test Service",
        status: "UP",
        timestamp: new Date().toLocaleString(),
        duration: "5 minutes",
        logoUrl: absoluteLogoUrl
      };

      const success = await sendEmail({
        to: email,
        templateId,
        templateData,
      });

      if (success) {
        res.json({ message: "Test email sent successfully" });
      } else {
        res.status(500).json({ message: "Failed to send test email" });
      }
    } catch (error) {
      console.error('Error sending test email:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Add new route for login attempts
  app.get("/api/login-attempts", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const attempts = await storage.getAllLoginAttempts();
      res.json(attempts);
    } catch (error) {
      console.error('Error fetching login attempts:', error);
      res.status(500).json({ message: "Failed to fetch login attempts" });
    }
  });

  app.post("/api/services/plex/account", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const { email } = plexInviteSchema.parse(req.body);
      const plexToken = "WXxaPDsUPNFszKdPUmAx";

      if (!plexToken) {
        throw new Error("Plex token not configured");
      }

      console.log(`Sending Plex invitation to ${email}...`);

      // Common headers for all Plex API requests
      const headers = {
        'X-Plex-Token': plexToken,
        'X-Plex-Client-Identifier': 'HomelabDashboard',
        'X-Plex-Product': 'Homelab Dashboard',
        'X-Plex-Version': '1.0',
        'Accept': 'application/xml'
      };

      // Step 1: Get all servers associated with the account
      const resourcesResponse = await fetch('https://plex.tv/api/resources', {
        method: 'GET',
        headers
      });

      if (!resourcesResponse.ok) {
        const errorText = await resourcesResponse.text();
        console.error('Plex API resources error:', errorText);
        throw new Error(`Failed to get Plex resources: ${resourcesResponse.status} ${errorText}`);
      }

      const resourcesText = await resourcesResponse.text();
      console.log('Raw Plex response:', resourcesText);

      // Simple XML parsing to get the server identifier
      const serverMatch = resourcesText.match(/clientIdentifier="([^"]+)"/);
      const serverNameMatch = resourcesText.match(/name="([^"]+)"/);

      if (!serverMatch || !serverNameMatch) {
        throw new Error("Could not find server information in Plex response");
      }

      const serverId = serverMatch[1];
      const serverName = serverNameMatch[1];

      console.log(`Found Plex server: ${serverName} (${serverId})`);

      // Step 2: Send the invitation
      const inviteResponse = await fetch(`https://plex.tv/api/servers/${serverId}/shared_servers`, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          shared_server: {
            library_section_ids: [],
            invited_email: email,
            sharing_settings: {
              allowSync: 1,
              allowCameraUpload: 0,
              allowChannels: 0,
              filterMovies: '',
              filterTelevision: '',
              filterMusic: ''
            }
          }
        })
      });

      if (!inviteResponse.ok) {
        const errorText = await inviteResponse.text();
        console.error('Plex API invitation error:', errorText);
        throw new Error(`Failed to send invitation: ${inviteResponse.status} ${errorText}`);
      }

      const inviteResult = await inviteResponse.text();
      console.log('Plex invitation response:', inviteResult);

      res.json({ 
        message: "Plex invitation sent successfully", 
        server: serverName,
        email: email
      });
    } catch (error) {
      console.error('Error sending Plex invitation:', error);
      res.status(500).json({
        message: "Failed to send Plex invitation",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.get("/api/services/plex/sessions", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      // Get Plex service from database
      const services = await storage.getAllServices();
      const plexService = services.find(s => s.name.toLowerCase().includes('plex'));

      if (!plexService || !plexService.url) {
        console.log('No Plex service found or URL missing');
        return res.status(404).json({ message: "Plex service not configured" });
      }

      console.log('Found Plex service:', plexService.name, plexService.url);

      // Extract token from URL if present
      const url = new URL(plexService.url);
      const token = url.searchParams.get('X-Plex-Token');

      if (!token) {
        console.log('No Plex token found in URL');
        return res.status(400).json({ message: "Plex token not found in service URL" });
      }

      console.log('Executing Plex sessions script with URL:', url.origin);

      // Use the Python script to get Plex sessions
      const { spawn } = require('child_process');
      const pythonProcess = spawn('python3', [
        'server/plex_sessions.py',
        url.origin,
        token
      ]);

      let output = '';
      let errorOutput = '';

      pythonProcess.stdout.on('data', (data) => {
        output += data.toString();
        console.log('Python script output:', data.toString());
      });

      pythonProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
        console.error('Python script error:', data.toString());
      });

      // Add a timeout to prevent hanging
      const timeout = setTimeout(() => {
        pythonProcess.kill();
        throw new Error('Plex session check timed out');
      }, 10000); // 10 second timeout

      const exitCode = await new Promise((resolve) => {
        pythonProcess.on('close', resolve);
      });

      clearTimeout(timeout);

      if (exitCode !== 0) {
        console.error('Python script failed with code:', exitCode);
        console.error('Error output:', errorOutput);
        throw new Error('Failed to fetch Plex sessions');
      }

      try {
        const data = JSON.parse(output);
        if (data.error) {
          console.error('Plex API error:', data.error);
          throw new Error(data.error);
        }

        console.log('Plex session data:', JSON.stringify(data, null, 2));
        res.json(data);
      } catch (parseError) {
        console.error('Error parsing Python output:', parseError);
        console.error('Raw output:', output);
        throw new Error('Failed to parse Plex session data');
      }

    } catch (error) {
      console.error('Error fetching Plex sessions:', error);
      res.status(500).json({ 
        message: "Failed to fetch Plex sessions",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}