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
    const servers = await storage.getAllGameServers();
    res.json(servers);
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

  // Add chat room routes
  app.post("/api/chat/rooms", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const { name } = req.body;
      if (!name || typeof name !== "string" || !name.trim()) {
        return res.status(400).json({ message: "Invalid chat room name" });
      }

      const user = req.user as User; // User type from @shared/schema
      const newRoom = await storage.createChatRoom({
        name: name.trim(),
        type: "group",
        createdBy: user.id,
      });

      // Add the creator as a member and admin of the room
      await storage.addChatMember({
        roomId: newRoom.id,
        userId: user.id,
        isAdmin: true,
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

      if (!content || typeof content !== "string" || !content.trim()) {
        return res.status(400).json({ message: "Invalid message content" });
      }

      // Get the room to check if it's public
      const room = await storage.getChatRoom(roomId);
      if (!room) {
        return res.status(404).json({ message: "Chat room not found" });
      }

      // For public rooms, ensure user is a member
      if (room.type === 'public') {
        await storage.addUserToPublicRoom(user.id);
      } else {
        // For private/group rooms, verify membership
        const isMember = await storage.getChatMember(roomId, user.id);
        if (!isMember) {
          return res.status(403).json({ message: "Not a member of this chat room" });
        }
      }

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
      const chatServer = app.get('chatServer');
      if (chatServer) {
        chatServer.broadcastToRoom(roomId, {
          type: 'message',
          roomId,
          data: messageWithSender,
        });
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

  const httpServer = createServer(app);

  // Initialize chat server
  const chatServer = new ChatServer(httpServer);
  app.set('chatServer', chatServer);

  return httpServer;
}