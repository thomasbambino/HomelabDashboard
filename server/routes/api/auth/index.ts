import { Router } from 'express';
import { storage } from '../../../storage';
import { isAuthenticated } from '../../middleware/auth-middleware';
import { asyncHandler } from '../../middleware/error-handler';
import { z } from 'zod';
import { fromZodError } from 'zod-validation-error';
import passport from 'passport';
import { serviceRegistry } from '../../../services/service-registry';

const router = Router();

// Login endpoint
router.post('/login', asyncHandler(async (req, res, next) => {
  try {
    const loginSchema = z.object({
      username: z.string().min(1),
      password: z.string().min(1)
    });
    
    const loginData = loginSchema.parse(req.body);
    
    passport.authenticate('local', (err, user, info) => {
      if (err) {
        console.error('Login error:', err);
        return res.status(500).json({ message: 'Authentication failed', error: err.message });
      }
      
      if (!user) {
        return res.status(401).json({ message: info.message || 'Invalid credentials' });
      }
      
      // Check if user is marked as pending
      if (user.role === 'pending') {
        return res.status(403).json({ message: 'Your account is pending approval' });
      }
      
      req.login(user, (loginErr) => {
        if (loginErr) {
          console.error('Session error:', loginErr);
          return res.status(500).json({ message: 'Session error', error: loginErr.message });
        }
        
        // Return user data (without password)
        const { password, ...userData } = user;
        return res.json({ 
          message: 'Authentication successful',
          user: userData
        });
      });
    })(req, res, next);
  } catch (error) {
    if (error.name === 'ZodError') {
      const validationError = fromZodError(error);
      res.status(400).json({ message: validationError.message });
    } else {
      throw error;
    }
  }
}));

// Logout endpoint
router.post('/logout', asyncHandler(async (req, res) => {
  req.logout((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({ message: 'Error during logout', error: err.message });
    }
    req.session.destroy((err) => {
      if (err) {
        console.error('Session destruction error:', err);
        return res.status(500).json({ message: 'Error destroying session', error: err.message });
      }
      res.json({ message: 'Logged out successfully' });
    });
  });
}));

// Register endpoint
router.post('/register', asyncHandler(async (req, res) => {
  try {
    const registerSchema = z.object({
      username: z.string().min(3).max(30),
      password: z.string().min(6),
      email: z.string().email(),
      name: z.string().min(2).max(50).optional()
    });
    
    const userData = registerSchema.parse(req.body);
    
    // Check if username or email already exists
    const existingUser = await storage.getUserByUsername(userData.username);
    if (existingUser) {
      return res.status(409).json({ message: 'Username is already taken' });
    }
    
    const existingEmail = await storage.getUserByEmail(userData.email);
    if (existingEmail) {
      return res.status(409).json({ message: 'Email is already registered' });
    }
    
    // Set role as 'pending' for new registrations to require admin approval
    const newUser = await storage.createUser({
      ...userData,
      role: 'pending'
    });
    
    // Send admin notification email that a new user registered
    try {
      const emailService = serviceRegistry.get('email');
      if (emailService) {
        await emailService.sendAdminNotification(
          'New User Registration',
          `A new user has registered and is pending approval:
           Username: ${userData.username}
           Email: ${userData.email}
           Name: ${userData.name || 'Not provided'}
           
           Please log in to the admin panel to approve or reject this user.`
        );
      }
    } catch (err) {
      console.error('Failed to send admin notification email:', err);
      // Don't fail the registration if email fails
    }
    
    const { password, ...userInfo } = newUser;
    res.status(201).json({
      message: 'Registration successful, awaiting admin approval',
      user: userInfo
    });
  } catch (error) {
    if (error.name === 'ZodError') {
      const validationError = fromZodError(error);
      res.status(400).json({ message: validationError.message });
    } else {
      throw error;
    }
  }
}));

// Get current user info
router.get('/me', isAuthenticated, asyncHandler(async (req, res) => {
  const { password, ...userInfo } = req.user as any;
  res.json(userInfo);
}));

export default router;