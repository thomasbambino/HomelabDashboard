import { Router } from 'express';

// Create the router
const router = Router();

// Authentication routes are directly in auth.ts
// This is a placeholder for compatibility
router.use('/', (req, res, next) => {
  res.status(200).json({ message: "Auth routes are mounted in server/auth.ts" });
});

export default router;