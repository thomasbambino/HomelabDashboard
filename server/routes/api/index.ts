import { Router } from 'express';
import authRoutes from './auth';
import userRoutes from './users';
import gameServerRoutes from './game-servers';
import uploadRoutes from './upload';
import serviceRoutes from './services';
import emailTemplateRoutes from './email-templates';
import settingsRoutes from './settings';

// Create API router
const router = Router();

// Mount route modules
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/game-servers', gameServerRoutes);
router.use('/upload', uploadRoutes);
router.use('/services', serviceRoutes);
router.use('/email-templates', emailTemplateRoutes);
router.use('/settings', settingsRoutes);

// API status route
router.get('/status', (req, res) => {
  res.json({
    status: 'ok',
    version: process.env.npm_package_version || '1.0.0',
    timestamp: new Date().toISOString(),
    authenticated: req.isAuthenticated(),
    user: req.isAuthenticated() ? { 
      id: (req.user as any).id,
      username: (req.user as any).username,
      role: (req.user as any).role
    } : null
  });
});

export default router;