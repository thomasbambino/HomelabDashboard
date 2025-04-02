import { Router } from 'express';
import { upload, processUploadedImage, deleteFile } from '../../utils/file-upload';
import { isAuthenticated, isAdmin } from '../../middleware/auth-middleware';
import { storage } from '../../../storage';
import { asyncHandler } from '../../middleware/error-handler';

const router = Router();

/**
 * Upload game server icon
 */
router.post('/game-server/icon', isAuthenticated, isAdmin, upload.single('file'), asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }
  
  try {
    // Process the uploaded image to create optimized versions
    const { thumbnail, original } = await processUploadedImage(req.file.path);
    
    // Return the paths to the processed images
    res.json({
      message: 'File uploaded successfully',
      path: original,
      thumbnail,
      original,
      filename: req.file.filename
    });
  } catch (error) {
    console.error('Error processing uploaded game server icon:', error);
    
    // Try to clean up the file if processing failed
    if (req.file) {
      await deleteFile(req.file.path);
    }
    
    res.status(500).json({ message: 'Failed to process uploaded image', error: error.message });
  }
}));

/**
 * Upload service icon
 */
router.post('/service/icon', isAuthenticated, isAdmin, upload.single('file'), asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }
  
  try {
    // Process the uploaded image to create optimized versions
    const { thumbnail, original } = await processUploadedImage(req.file.path);
    
    // Return the paths to the processed images
    res.json({
      message: 'File uploaded successfully',
      path: original,
      thumbnail,
      original,
      filename: req.file.filename
    });
  } catch (error) {
    console.error('Error processing uploaded service icon:', error);
    
    // Try to clean up the file if processing failed
    if (req.file) {
      await deleteFile(req.file.path);
    }
    
    res.status(500).json({ message: 'Failed to process uploaded image', error: error.message });
  }
}));

/**
 * Upload user avatar
 */
router.post('/user/avatar', isAuthenticated, upload.single('file'), asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }
  
  try {
    // Process the uploaded image to create optimized versions
    const { thumbnail, original } = await processUploadedImage(req.file.path);
    
    // Update the user's avatar in the database
    const user = req.user as any;
    await storage.updateUser(user.id, { avatar: thumbnail });
    
    // Return the paths to the processed images
    res.json({
      message: 'Avatar uploaded successfully',
      path: thumbnail,
      thumbnail,
      original,
      filename: req.file.filename
    });
  } catch (error) {
    console.error('Error processing uploaded avatar:', error);
    
    // Try to clean up the file if processing failed
    if (req.file) {
      await deleteFile(req.file.path);
    }
    
    res.status(500).json({ message: 'Failed to process uploaded image', error: error.message });
  }
}));

/**
 * Upload chat message image
 */
router.post('/messages/images', isAuthenticated, upload.single('file'), asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }
  
  try {
    // Process the uploaded image to create optimized versions
    const { thumbnail, original } = await processUploadedImage(req.file.path);
    
    // Return the paths to the processed images
    res.json({
      message: 'Image uploaded successfully',
      path: original,
      thumbnail,
      original,
      filename: req.file.filename
    });
  } catch (error) {
    console.error('Error processing uploaded message image:', error);
    
    // Try to clean up the file if processing failed
    if (req.file) {
      await deleteFile(req.file.path);
    }
    
    res.status(500).json({ message: 'Failed to process uploaded image', error: error.message });
  }
}));

export default router;