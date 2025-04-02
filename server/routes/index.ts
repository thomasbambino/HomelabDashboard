import express, { Express, NextFunction, Request, Response } from 'express';
import session from 'express-session';
import passport from 'passport';
import path from 'path';
import { setupAuth } from '../auth';
import cookieParser from 'cookie-parser';
import apiRoutes from './api';
import { errorHandler } from './middleware/error-handler';
import { ensureUploadsDirectory } from './utils/file-upload';

/**
 * Sets up all Express routes and middleware for the application
 */
export function setupRoutes(app: Express) {
  // Basic middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser());
  
  // Session middleware
  const sessionMiddleware = session({
    secret: process.env.SESSION_SECRET || 'supersecretkey',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 7 // 1 week
    }
  });
  
  app.use(sessionMiddleware);
  
  // Authentication middleware
  app.use(passport.initialize());
  app.use(passport.session());
  setupAuth(app);
  
  // Ensure uploads directory exists
  ensureUploadsDirectory().catch(err => {
    console.error('Failed to create uploads directory:', err);
  });
  
  // Serve static files from the uploads directory
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
  
  // API routes
  app.use('/api', apiRoutes);
  
  // Global error handler
  app.use(errorHandler);
  
  // 404 handler for API routes
  app.use('/api/*', (req, res) => {
    res.status(404).json({
      message: `API endpoint not found: ${req.path}`,
      status: 404
    });
  });
}