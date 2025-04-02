import express, { Router } from 'express';
import { upload, downloadImage, resizeAndSaveImage } from '../utils/file-upload';
import { isAuthenticated } from '../middleware/auth-middleware';
import { storage } from '../../storage';
import path from 'path';
import fs from 'fs';
import { services } from '../../services';

const router = Router();
const ampService = services.ampService;

/**
 * Handle image uploads for various entity types
 */
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

    let instance;
    if (type === 'game') {
      console.log('Processing icon upload for instance:', instanceId);
      // Verify instance exists before proceeding
      const instances = await ampService.getInstances();
      instance = instances.find((i: any) => i.InstanceID === instanceId);
      if (!instance) {
        return res.status(404).json({ message: "Game server not found in AMP" });
      }
      console.log('Found matching AMP instance:', instance.FriendlyName);
    }

    let inputBuffer: Buffer;
    let filename: string;

    console.log('Upload request details:', {
      hasFile: !!req.file,
      hasImageUrl: !!req.body.imageUrl,
      fileDetails: req.file ? {
        fieldname: req.file.fieldname,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size
      } : null
    });

    try {
      if (req.file) {
        // Handle direct file upload
        console.log('Reading file from path:', req.file.path);
        if (!fs.existsSync(req.file.path)) {
          return res.status(400).json({ message: "Uploaded file doesn't exist at expected path" });
        }
        
        inputBuffer = fs.readFileSync(req.file.path);
        console.log('File read successfully, size:', inputBuffer.length, 'bytes');
        
        filename = req.file.filename;
        
        // Delete the original uploaded file since we'll create resized version
        try {
          fs.unlinkSync(req.file.path);
          console.log('Original file deleted');
        } catch (deleteErr) {
          console.error('Error deleting original file:', deleteErr);
          // Continue even if delete fails
        }
      } else if (req.body.imageUrl) {
        // Handle URL-based upload
        console.log('Downloading image from URL:', req.body.imageUrl);
        const { buffer } = await downloadImage(req.body.imageUrl);
        inputBuffer = buffer;
        console.log('Image downloaded successfully, size:', inputBuffer.length, 'bytes');
        
        filename = `url-${Date.now()}-${Math.round(Math.random() * 1E9)}.png`;
      } else {
        console.error('No file or URL provided in request:', req.body);
        return res.status(400).json({ message: "No file or URL provided" });
      }
    } catch (fileProcessingError) {
      console.error('Error processing uploaded file:', fileProcessingError);
      return res.status(500).json({ message: "Error processing uploaded file: " + (fileProcessingError instanceof Error ? fileProcessingError.message : String(fileProcessingError)) });
    }

    const uploadDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const result = await resizeAndSaveImage(inputBuffer, uploadDir, filename, type);

    // If this is a game server icon
    if (type === 'game') {
      try {
        console.log('Handling game server icon upload');
        
        // Get server ID from request
        const idStr = req.body.id;
        const id = idStr ? parseInt(idStr) : undefined;
        
        // Log debugging info
        console.log(`Game icon upload - ID: ${id}, instanceId: ${instanceId}, icon path: ${typeof result === 'string' ? result : result.url}`);
        
        if (!instanceId && !id) {
          return res.status(400).json({ message: "Either instanceId or server id is required for game server icons" });
        }

        // Find server record via instanceId or id
        let server = null;
        
        // First, try to find by ID if provided
        if (id) {
          console.log('Looking up server by id:', id);
          try {
            server = await storage.getGameServer(id);
            console.log('Server found by ID:', server ? server.id : 'not found');
          } catch (err) {
            console.error('Error looking up server by ID:', err);
          }
        }
        
        // If not found by ID, try instanceId
        if (!server && instanceId) {
          console.log('Looking up server by instanceId:', instanceId);
          try {
            server = await storage.getGameServerByInstanceId(instanceId);
            console.log('Server found by instanceId:', server ? server.id : 'not found');
          } catch (err) {
            console.error('Error looking up server by instanceId:', err);
          }
        }
        
        // Determine the icon URL from the result
        const iconUrl = typeof result === 'string' ? result : result.url;
        
        // Create new server if none exists
        if (!server) {
          console.log('No existing server found, creating new record');
          
          if (!instanceId) {
            return res.status(404).json({ message: "Cannot create new server without instanceId" });
          }
          
          // Get instance details from AMP
          try {
            const instances = await ampService.getInstances();
            const instance = instances.find(i => i.InstanceID === instanceId);
            
            if (!instance) {
              return res.status(404).json({ message: "Game server not found in AMP" });
            }
            
            // Create new server record with minimal required fields
            const newServer = {
              instanceId,
              name: instance.FriendlyName,
              type: instance.FriendlyName.toLowerCase().split(' ')[0],
              icon: iconUrl
            };
            
            console.log('Creating new server with data:', JSON.stringify(newServer));
            server = await storage.createGameServer(newServer);
            
            console.log('Created new server record with ID:', server.id);
          } catch (err) {
            console.error('Error creating new server:', err);
            throw err;
          }
        } 
        // Update existing server
        else {
          console.log('Updating icon for existing server ID:', server.id);
          
          try {
            // Simply use the storage service 
            console.log('Using storage service for updating icon');
            const updatedServer = await storage.updateGameServer({
              id: server.id,
              icon: iconUrl
            });
            
            if (updatedServer) {
              server = updatedServer;
              console.log('Server updated successfully via storage service');
            } else {
              throw new Error('Storage service returned no server object');
            }
          } catch (updateError) {
            console.error('Error updating server icon:', updateError);
            throw updateError;
          }
        }
        
        console.log('Server operation completed successfully - ID:', server.id, 'Icon:', server.icon);
      } catch (finalError) {
        console.error('Error handling game server icon:', finalError);
        // More detailed error message for frontend 
        let detailedError = "Unknown error";
        if (finalError instanceof Error) {
          detailedError = `${finalError.name}: ${finalError.message}`;
          if (finalError.stack) {
            console.error('Stack:', finalError.stack);
          }
        }
        
        // Check for specific error patterns
        if (detailedError.includes('duplicate key')) {
          detailedError = "Database primary key conflict - Please try again with another image";
        }
        
        return res.status(500).json({ 
          message: "Failed to process game server icon",
          error: detailedError,
          details: finalError instanceof Error ? finalError.stack : null
        });
      }
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

// Upload endpoints
router.post('/site', isAuthenticated, upload.single('image'), (req, res) => handleUpload(req, res, 'site'));
router.post('/service', isAuthenticated, upload.single('image'), (req, res) => handleUpload(req, res, 'service'));
router.post('/game', isAuthenticated, upload.single('image'), (req, res) => handleUpload(req, res, 'game'));

export default router;