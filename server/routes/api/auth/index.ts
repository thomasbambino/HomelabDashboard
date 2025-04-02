import { Router } from 'express';
import authRoutes from '../../../auth/routes';

// Create the router
const router = Router();

// Mount all the authentication routes
router.use('/', authRoutes);

export default router;