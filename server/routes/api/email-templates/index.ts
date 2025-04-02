import { Router } from 'express';
import { storage } from '../../../storage';
import { isAdmin } from '../../middleware/auth-middleware';
import { asyncHandler } from '../../middleware/error-handler';
import { z } from 'zod';
import { fromZodError } from 'zod-validation-error';
import { sendEmail } from '../../../email';

const router = Router();

// Get all email templates (admin only)
router.get('/', isAdmin, asyncHandler(async (req, res) => {
  const templates = await storage.getEmailTemplates();
  res.json(templates);
}));

// Create a new email template (admin only)
router.post('/', isAdmin, asyncHandler(async (req, res) => {
  const templateSchema = z.object({
    name: z.string().min(1).max(100),
    subject: z.string().min(1).max(200),
    html: z.string().min(1),
    description: z.string().optional()
  });
  
  try {
    const templateData = templateSchema.parse(req.body);
    const template = await storage.createEmailTemplate(templateData);
    res.status(201).json(template);
  } catch (error) {
    if (error.name === 'ZodError') {
      const validationError = fromZodError(error);
      res.status(400).json({ message: validationError.message });
    } else {
      throw error;
    }
  }
}));

// Update an email template (admin only)
router.patch('/:id', isAdmin, asyncHandler(async (req, res) => {
  const templateSchema = z.object({
    name: z.string().min(1).max(100).optional(),
    subject: z.string().min(1).max(200).optional(),
    html: z.string().min(1).optional(),
    description: z.string().optional()
  });
  
  try {
    const id = parseInt(req.params.id);
    const templateData = templateSchema.parse(req.body);
    
    const template = await storage.updateEmailTemplate(id, templateData);
    if (!template) {
      return res.status(404).json({ message: "Email template not found" });
    }
    
    res.json(template);
  } catch (error) {
    if (error.name === 'ZodError') {
      const validationError = fromZodError(error);
      res.status(400).json({ message: validationError.message });
    } else {
      throw error;
    }
  }
}));

// Test an email template (admin only)
router.post('/:id/test', isAdmin, asyncHandler(async (req, res) => {
  const testSchema = z.object({
    email: z.string().email(),
    data: z.record(z.any()).optional()
  });
  
  try {
    const { email, data = {} } = testSchema.parse(req.body);
    const id = parseInt(req.params.id);
    
    // Get the template
    const template = await storage.getEmailTemplate(id);
    if (!template) {
      return res.status(404).json({ message: "Email template not found" });
    }
    
    // Send test email
    const success = await sendEmail({
      to: email,
      subject: template.subject,
      templateId: id,
      templateData: data
    });
    
    if (success) {
      res.json({ message: "Test email sent successfully" });
    } else {
      res.status(500).json({ message: "Failed to send test email" });
    }
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