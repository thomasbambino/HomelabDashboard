import { Router } from 'express';
import { storage } from '../../../storage';
import { z } from 'zod';
import { fromZodError } from 'zod-validation-error';
import { isAdmin, isAuthenticated } from '../../middleware/auth-middleware';
import { asyncHandler } from '../../middleware/error-handler';
import { services } from '../../../services';

const router = Router();

// Get all game servers
router.get('/', asyncHandler(async (req, res) => {
  const gameServers = await storage.getGameServers();
  res.json(gameServers);
}));

// Get a specific game server by ID
router.get('/:id', asyncHandler(async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const gameServer = await storage.getGameServerById(id);
    
    if (!gameServer) {
      return res.status(404).json({ message: 'Game server not found' });
    }
    
    res.json(gameServer);
  } catch (error) {
    console.error('Error fetching game server:', error);
    res.status(500).json({ message: 'Error fetching game server' });
  }
}));

// Create a new game server (admin only)
router.post('/', isAdmin, asyncHandler(async (req, res) => {
  try {
    const serverSchema = z.object({
      name: z.string().min(1).max(100),
      instanceId: z.string().min(1),
      type: z.string().min(1).max(50),
      displayName: z.string().nullable().optional(),
      icon: z.string().optional(),
      background: z.string().nullable().optional(),
      hidden: z.boolean().optional().default(false),
      show_player_count: z.boolean().optional().default(true),
      show_status_badge: z.boolean().optional().default(true),
      autoStart: z.boolean().optional().default(false),
      refreshInterval: z.number().min(5).max(300).optional().default(30),
      port: z.string().optional()
    });
    
    const serverData = serverSchema.parse(req.body);
    const newServer = await storage.createGameServer(serverData);
    res.status(201).json(newServer);
  } catch (error) {
    if (error.name === 'ZodError') {
      const validationError = fromZodError(error);
      res.status(400).json({ message: validationError.message });
    } else {
      throw error;
    }
  }
}));

// Update a game server (admin only)
router.patch('/:id', isAdmin, asyncHandler(async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    const serverSchema = z.object({
      name: z.string().min(1).max(100).optional(),
      instanceId: z.string().min(1).optional(),
      type: z.string().min(1).max(50).optional(),
      displayName: z.string().nullable().optional(),
      icon: z.string().optional(),
      background: z.string().nullable().optional(),
      hidden: z.boolean().optional(),
      show_player_count: z.boolean().optional(),
      show_status_badge: z.boolean().optional(),
      autoStart: z.boolean().optional(),
      refreshInterval: z.number().min(5).max(300).optional(),
      port: z.string().optional()
    });
    
    const serverData = serverSchema.parse(req.body);
    const updatedServer = await storage.updateGameServer(id, serverData);
    
    if (!updatedServer) {
      return res.status(404).json({ message: 'Game server not found' });
    }
    
    res.json(updatedServer);
  } catch (error) {
    if (error.name === 'ZodError') {
      const validationError = fromZodError(error);
      res.status(400).json({ message: validationError.message });
    } else {
      throw error;
    }
  }
}));

// Delete a game server (admin only)
router.delete('/:id', isAdmin, asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  const success = await storage.deleteGameServer(id);
  
  if (!success) {
    return res.status(404).json({ message: 'Game server not found' });
  }
  
  res.json({ message: 'Game server deleted successfully' });
}));

// Start a game server
router.post('/:id/start', isAdmin, asyncHandler(async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const gameServer = await storage.getGameServerById(id);
    
    if (!gameServer) {
      return res.status(404).json({ message: 'Game server not found' });
    }
    
    const ampService = services.get('amp');
    if (!ampService) {
      return res.status(500).json({ message: 'AMP service not available' });
    }
    
    await ampService.startInstance(gameServer.instanceId);
    
    // Update the status in the database (optimistic update)
    const updatedServer = await storage.updateGameServer(id, { status: true });
    
    res.json({ message: 'Game server started', gameServer: updatedServer });
  } catch (error) {
    console.error('Error starting game server:', error);
    res.status(500).json({ 
      message: 'Failed to start game server',
      error: error.message
    });
  }
}));

// Stop a game server
router.post('/:id/stop', isAdmin, asyncHandler(async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const gameServer = await storage.getGameServerById(id);
    
    if (!gameServer) {
      return res.status(404).json({ message: 'Game server not found' });
    }
    
    const ampService = services.get('amp');
    if (!ampService) {
      return res.status(500).json({ message: 'AMP service not available' });
    }
    
    await ampService.stopInstance(gameServer.instanceId);
    
    // Update the status in the database (optimistic update)
    const updatedServer = await storage.updateGameServer(id, { status: false });
    
    res.json({ message: 'Game server stopped', gameServer: updatedServer });
  } catch (error) {
    console.error('Error stopping game server:', error);
    res.status(500).json({ 
      message: 'Failed to stop game server',
      error: error.message
    });
  }
}));

// Restart a game server
router.post('/:id/restart', isAdmin, asyncHandler(async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const gameServer = await storage.getGameServerById(id);
    
    if (!gameServer) {
      return res.status(404).json({ message: 'Game server not found' });
    }
    
    const ampService = services.get('amp');
    if (!ampService) {
      return res.status(500).json({ message: 'AMP service not available' });
    }
    
    await ampService.restartInstance(gameServer.instanceId);
    
    // Update the status in the database (optimistic update)
    const updatedServer = await storage.updateGameServer(id, { status: true });
    
    res.json({ message: 'Game server restarted', gameServer: updatedServer });
  } catch (error) {
    console.error('Error restarting game server:', error);
    res.status(500).json({ 
      message: 'Failed to restart game server',
      error: error.message
    });
  }
}));

// Kill a game server (force stop)
router.post('/:id/kill', isAdmin, asyncHandler(async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const gameServer = await storage.getGameServerById(id);
    
    if (!gameServer) {
      return res.status(404).json({ message: 'Game server not found' });
    }
    
    const ampService = services.get('amp');
    if (!ampService) {
      return res.status(500).json({ message: 'AMP service not available' });
    }
    
    await ampService.killInstance(gameServer.instanceId);
    
    // Update the status in the database (optimistic update)
    const updatedServer = await storage.updateGameServer(id, { status: false });
    
    res.json({ message: 'Game server killed', gameServer: updatedServer });
  } catch (error) {
    console.error('Error killing game server:', error);
    res.status(500).json({ 
      message: 'Failed to kill game server',
      error: error.message
    });
  }
}));

// Get active players for a game server
router.get('/:id/players', isAuthenticated, asyncHandler(async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const gameServer = await storage.getGameServerById(id);
    
    if (!gameServer) {
      return res.status(404).json({ message: 'Game server not found' });
    }
    
    const ampService = services.get('amp');
    if (!ampService) {
      return res.status(500).json({ message: 'AMP service not available' });
    }
    
    const playerList = await ampService.getUserList(gameServer.instanceId);
    
    res.json({ players: playerList });
  } catch (error) {
    console.error('Error fetching player list:', error);
    res.status(500).json({ 
      message: 'Failed to fetch player list',
      error: error.message
    });
  }
}));

export default router;