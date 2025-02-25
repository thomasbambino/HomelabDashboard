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
import {User} from '@shared/schema';
import { ChatServer } from './chat';
import cookieParser from 'cookie-parser';
import { sendEmail } from './email'; // Import sendEmail function
import { ampService } from './amp-service';
import { updateUserSchema } from "@shared/schema"; // Import updateUserSchema


// Configure multer for image upload
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

export async function registerRoutes(app: Express): Promise<Server> {
  // Add cookie parser middleware before session setup
  app.use(cookieParser());

  setupAuth(app);

  // Initialize chat server
  const chatServer = new ChatServer();
  app.set('chatServer', chatServer);

  // Add Stream Chat token endpoint
  app.get("/api/chat/token", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const { token } = await chatServer.connectUser(req.user);
      res.json({ token });
    } catch (error) {
      console.error('Error generating chat token:', error);
      res.status(500).json({ message: "Failed to generate chat token" });
    }
  });

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

      // Get all stored game servers (for hidden status and customizations)
      const storedServers = await storage.getAllGameServers();

      // Map AMP instances to our game server format
      const servers = await Promise.all(ampInstances.map(async (instance) => {
        // Find existing stored server or create new one
        const storedServer = storedServers.find(s => s.instanceId === instance.InstanceID) || {
          instanceId: instance.InstanceID,
          hidden: false,
          show_player_count: true,
          show_status_badge: true,
          autoStart: false,
          refreshInterval: 30
        };

        return {
          ...storedServer,
          name: instance.FriendlyName,
          type: instance.FriendlyName.toLowerCase().split(' ')[0], // Extract game type from name
          status: instance.Running,
          playerCount: instance.ActiveUsers,
          maxPlayers: instance.MaxUsers,
          lastStatusCheck: new Date()
        };
      }));

      // Only return non-hidden servers unless specifically requested
      const showHidden = req.query.showHidden === 'true';
      const filteredServers = showHidden ? servers : servers.filter(s => !s.hidden);

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

      // Get system info
      const systemInfo = await ampService.getSystemInfo();
      console.log('System info:', systemInfo);

      // Get API spec
      const apiSpec = await ampService.getAPISpec();
      console.log('API spec available:', !!apiSpec);

      // Get module info
      const moduleInfo = await ampService.getModuleInfo();
      console.log('Module info:', moduleInfo);

      // Test AMP connection
      const instances = await ampService.getInstances();

      res.json({
        success: true,
        message: "AMP connection test completed",
        instanceCount: instances.length,
        instances: instances,
        systemInfo: systemInfo,
        moduleInfo: moduleInfo,
        availableEndpoints: Object.values(apiSpec || {})
          .map(method => method.Name)
          .filter(name => name.toLowerCase().includes('instance'))
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

  // Add private chat room routes
  app.post("/api/chat/private-rooms", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const { userId } = req.body;
      const currentUser = req.user as User;

      if (!userId || typeof userId !== "number") {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      // Check if users already have a private chat
      const existingRoom = await storage.findPrivateRoom(currentUser.id, userId);
      if (existingRoom) {
        return res.json(existingRoom);
      }

      // Get the other user's info for the room name
      const otherUser = await storage.getUser(userId);
      if (!otherUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Create new private room
      const newRoom = await storage.createChatRoom({
        name: `${currentUser.username} & ${otherUser.username}`,
        type: "private",
        createdBy: currentUser.id,
      });

      // Add both users as members
      await storage.addChatMember({
        roomId: newRoom.id,
        userId: currentUser.id,
        isAdmin: true,
      });

      await storage.addChatMember({
        roomId: newRoom.id,
        userId: userId,
        isAdmin: true,
      });

      res.status(201).json(newRoom);
    } catch (error) {
      console.error("Error creating private chat room:", error);
      res.status(500).json({ message: "Failed to create private chat room" });
    }
  });

  app.get("/api/chat/private-rooms", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const user = req.user as User;
      const rooms = await storage.listPrivateRooms(user.id);
      res.json(rooms);
    } catch (error) {
      console.error("Error fetching private rooms:", error);
      res.status(500).json({ message: "Failed to fetch private rooms" });
    }
  });

  // Modify chat room creation to use Stream Chat
  app.post("/api/chat/rooms", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const { name } = req.body;
      if (!name || typeof name !== "string" || !name.trim()) {
        return res.status(400).json({ message: "Invalid chat room name" });
      }

      const user = req.user as User;
      const channelId = `room-${Date.now()}`;

      // Create channel in Stream Chat
      await chatServer.createChannel('team', channelId, name.trim(), [user.id.toString()]);

      // Store channel info in local database
      const newRoom = await storage.createChatRoom({
        name: name.trim(),
        type: "group",
        createdBy: user.id,
        streamChannelId: channelId,
      });

      res.status(201).json(newRoom);
    } catch (error) {
      console.error("Error creating chat room:", error);
      res.status(500).json({ message: "Failed to create chat room" });
    }
  });

  app.get("/api/chat/rooms", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const user = req.user as User;
      const rooms = await storage.listChatRooms(user.id);
      res.json(rooms);
    } catch (error) {
      console.error("Error fetching chat rooms:", error);
      res.status(500).json({ message: "Failed to fetch chat rooms" });
    }
  });

  // Add chat message routes
  app.post("/api/chat/messages/:roomId", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const { content } = req.body;
      const roomId = parseInt(req.params.roomId);
      const user = req.user as User;

      console.log(`Message send attempt - Room: ${roomId}, User: ${user.id}, Content length: ${content?.length}`);

      if (!content || typeof content !== "string" || !content.trim()) {
        console.log("Invalid message content");
        return res.status(400).json({ message: "Invalid message content" });
      }

      // Get the room to check if it exists and its type
      const room = await storage.getChatRoom(roomId);
      if (!room) {
        console.log(`Room ${roomId} not found`);
        return res.status(404).json({ message: "Chat room not found" });
      }

      console.log(`Processing message for ${room.type} room ${roomId}`);

      // For public rooms, ensure user is a member
      if (room.type === 'public') {
        console.log(`Ensuring user ${user.id} is member of public room`);
        await storage.addUserToPublicRoom(user.id);
      } else {
        // For private/group rooms, verify membership
        console.log(`Checking membership for user ${user.id} in room ${roomId}`);
        const isMember = await storage.getChatMember(roomId, user.id);
        if (!isMember) {
          console.log(`User ${user.id} is not a member of room ${roomId}`);
          return res.status(403).json({ message: "Not a member of this chat room" });
        }
      }

      console.log(`Creating message in database`);
      const message = await storage.createChatMessage({
        roomId,
        senderId: user.id,
        type: 'text',
        content: content.trim(),
        createdAt: new Date(),
        updatedAt: new Date(),
        isEdited: false,
      });

      // Get the complete message with sender info
      const messageWithSender = {
        ...message,
        sender: await storage.getUser(user.id),
      };

      // Broadcast the message through WebSocket
      if (chatServer) {
        console.log(`Broadcasting message to room ${roomId}`);
        chatServer.broadcastToRoom(roomId, {
          type: 'message',
          roomId,
          data: messageWithSender,
        });
      } else {
        console.warn('Chat server not found for broadcasting');
      }

      res.status(201).json(messageWithSender);
    } catch (error) {
      console.error("Error sending message:", error);
      res.status(500).json({ message: "Failed to send message" });
    }
  });

  // Add endpoint to get users for private chats
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

      //      // Fetch service details for each log
      const logsWithServiceDetails = await Promise.all(
        logs.map(async (log) => {
          const service = await storage.getService(log.serviceId);
          return { ...log, service };
        })
      );

      console.log('Returning logs count:', logsWithServiceDetails.length);
      res.json(logsWithServiceDetails);
    } catch (error) {
      console.error('Error fetching status logs:', error);
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

      // Add user to public chat room
      await storage.addUserToPublicRoom(user.id);

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
      console.log(`Metrics for instance ${instanceId}:`, metrics);

      res.json(metrics);
    } catch (error) {
      console.error(`Error fetching metrics for instance ${instanceId}:`, error);
      res.status(500).json({ 
        message: "Failed to fetch instance metrics",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  // Add logging and session update to the user preferences endpoint
  app.patch("/api/users/:id/preferences", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      console.log('Updating user preferences:', req.body);
      const data = updateUserSchema.parse({ ...req.body, id: parseInt(req.params.id) });
      console.log('Parsed data:', data);

      const user = await storage.updateUser(data);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Update the session with new user data
      req.session.passport.user = user;
      await new Promise<void>((resolve, reject) => {
        req.session.save((err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      console.log('Updated user preferences:', user);
      res.json(user);
    } catch (error) {
      console.error('Error updating user preferences:', error);
      if (error instanceof ZodError) {
        res.status(400).json({ message: fromZodError(error).message });
      } else {
        res.status(500).json({ message: "Failed to update preferences" });
      }
    }
  });

  const httpServer = createServer(app);
  console.log('Chat server initialized successfully');

  return httpServer;
}