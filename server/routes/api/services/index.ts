import { Router } from 'express';
import { storage } from '../../../storage';
import { z } from 'zod';
import { fromZodError } from 'zod-validation-error';
import { isAdmin, isAuthenticated } from '../../middleware/auth-middleware';
import { asyncHandler } from '../../middleware/error-handler';
import { serviceRegistry } from '../../../services/service-registry';

const router = Router();

// Get all services
router.get('/', asyncHandler(async (req, res) => {
  const result = await storage.getServices();
  res.json(result);
}));

// Get a specific service by ID
router.get('/:id', asyncHandler(async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const service = await storage.getServiceById(id);
    
    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }
    
    res.json(service);
  } catch (error) {
    console.error('Error fetching service:', error);
    res.status(500).json({ message: 'Error fetching service' });
  }
}));

// Create a new service (admin only)
router.post('/', isAdmin, asyncHandler(async (req, res) => {
  try {
    const serviceSchema = z.object({
      name: z.string().min(1).max(100),
      url: z.string().url(),
      type: z.string().min(1).max(50),
      icon: z.string().optional(),
      description: z.string().optional(),
      hidden: z.boolean().optional().default(false),
      sortOrder: z.number().optional().default(0)
    });
    
    const serviceData = serviceSchema.parse(req.body);
    const newService = await storage.createService(serviceData);
    res.status(201).json(newService);
  } catch (error) {
    if (error.name === 'ZodError') {
      const validationError = fromZodError(error);
      res.status(400).json({ message: validationError.message });
    } else {
      throw error;
    }
  }
}));

// Update a service (admin only)
router.patch('/:id', isAdmin, asyncHandler(async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    const serviceSchema = z.object({
      name: z.string().min(1).max(100).optional(),
      url: z.string().url().optional(),
      type: z.string().min(1).max(50).optional(),
      icon: z.string().optional(),
      description: z.string().optional(),
      hidden: z.boolean().optional(),
      sortOrder: z.number().optional()
    });
    
    const serviceData = serviceSchema.parse(req.body);
    const updatedService = await storage.updateService(id, serviceData);
    
    if (!updatedService) {
      return res.status(404).json({ message: 'Service not found' });
    }
    
    res.json(updatedService);
  } catch (error) {
    if (error.name === 'ZodError') {
      const validationError = fromZodError(error);
      res.status(400).json({ message: validationError.message });
    } else {
      throw error;
    }
  }
}));

// Delete a service (admin only)
router.delete('/:id', isAdmin, asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  const success = await storage.deleteService(id);
  
  if (!success) {
    return res.status(404).json({ message: 'Service not found' });
  }
  
  res.json({ message: 'Service deleted successfully' });
}));

// Get Plex service details
router.get('/plex/details', isAuthenticated, asyncHandler(async (req, res) => {
  try {
    const plexService = serviceRegistry.get('plex');
    if (!plexService) {
      return res.status(500).json({ message: 'Plex service not available' });
    }
    
    const details = await plexService.getServerInfo();
    res.json(details);
  } catch (error) {
    console.error('Error getting Plex details:', error);
    res.status(500).json({ 
      message: 'Failed to retrieve Plex server information',
      error: error.message
    });
  }
}));

export default router;