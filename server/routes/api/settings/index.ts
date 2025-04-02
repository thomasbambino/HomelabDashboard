import { Router } from 'express';
import { storage } from '../../../storage';
import { isAdmin } from '../../middleware/auth-middleware';
import { asyncHandler } from '../../middleware/error-handler';
import { z } from 'zod';
import { fromZodError } from 'zod-validation-error';

const router = Router();

// Get application settings
router.get('/', asyncHandler(async (req, res) => {
  const settings = await storage.getSettings();
  res.json(settings);
}));

// Update application settings (admin only)
router.post('/', isAdmin, asyncHandler(async (req, res) => {
  const settingsSchema = z.object({
    siteName: z.string().optional(),
    siteDescription: z.string().optional(),
    logoUrl: z.string().optional(),
    largeLogoUrl: z.string().optional(),
    theme: z.string().optional(),
    contactEmail: z.string().email().optional(),
    refreshInterval: z.number().min(5).max(120).optional(),
    showOfflineServers: z.boolean().optional(),
    enableRegistration: z.boolean().optional(),
    requireApproval: z.boolean().optional(),
    enableChat: z.boolean().optional(),
    maintenance: z.boolean().optional(),
    maintenanceMessage: z.string().optional()
  });
  
  try {
    const settingsData = settingsSchema.parse(req.body);
    const updatedSettings = await storage.updateSettings(settingsData);
    res.json(updatedSettings);
  } catch (error) {
    if (error.name === 'ZodError') {
      const validationError = fromZodError(error);
      res.status(400).json({ message: validationError.message });
    } else {
      throw error;
    }
  }
}));

export default router;