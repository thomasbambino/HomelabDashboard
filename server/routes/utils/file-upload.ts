import { Request } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(process.cwd(), 'uploads'));
  },
  filename: (req, file, cb) => {
    // Create a unique filename with the original extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

// File filter for images
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Accept images only
  if (!file.originalname.match(/\.(jpg|jpeg|png|gif|svg|webp)$/i)) {
    return cb(new Error('Only image files are allowed!'));
  }
  cb(null, true);
};

// Create the multer upload instance
export const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: fileFilter
});

/**
 * Ensures the uploads directory exists
 */
export async function ensureUploadsDirectory() {
  const uploadsDir = path.join(process.cwd(), 'uploads');
  
  try {
    await fs.access(uploadsDir);
  } catch (error) {
    // Directory doesn't exist, create it
    await fs.mkdir(uploadsDir, { recursive: true });
  }
  
  // Also create thumbnails directory
  const thumbnailsDir = path.join(uploadsDir, 'thumbnails');
  try {
    await fs.access(thumbnailsDir);
  } catch (error) {
    await fs.mkdir(thumbnailsDir, { recursive: true });
  }
}

/**
 * Process an uploaded image to create optimized versions
 * 
 * @param filePath - Path to the uploaded file
 * @returns Object containing paths to the thumbnail and original image
 */
export async function processUploadedImage(filePath: string): Promise<{ thumbnail: string, original: string }> {
  await ensureUploadsDirectory();
  
  const originalFileName = path.basename(filePath);
  const uploadsDir = path.join(process.cwd(), 'uploads');
  const thumbnailsDir = path.join(uploadsDir, 'thumbnails');
  const thumbnailFileName = `thumb-${originalFileName}`;
  const thumbnailPath = path.join(thumbnailsDir, thumbnailFileName);
  
  try {
    // Create a thumbnail version
    await sharp(filePath)
      .resize(200, 200, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toFile(thumbnailPath);
    
    // Return paths relative to the server root for use in URLs
    return {
      thumbnail: `/uploads/thumbnails/${thumbnailFileName}`,
      original: `/uploads/${originalFileName}`
    };
  } catch (error) {
    console.error('Error processing image:', error);
    throw new Error(`Failed to process image: ${error.message}`);
  }
}

/**
 * Delete a file from the filesystem
 * 
 * @param filePath - Path to the file to delete
 */
export async function deleteFile(filePath: string): Promise<void> {
  try {
    await fs.unlink(filePath);
  } catch (error) {
    console.error(`Failed to delete file ${filePath}:`, error);
  }
}

/**
 * Process and save an image from a base64 string
 * 
 * @param base64Data - Base64 encoded image data
 * @param filePrefix - Prefix for the generated filename
 * @returns Object containing paths to the thumbnail and original image
 */
export async function processBase64Image(base64Data: string, filePrefix: string): Promise<{ thumbnail: string, original: string }> {
  await ensureUploadsDirectory();
  
  // Remove data URL prefix if present (e.g., "data:image/jpeg;base64,")
  const base64Image = base64Data.replace(/^data:image\/\w+;base64,/, '');
  const buffer = Buffer.from(base64Image, 'base64');
  
  // Generate a unique filename
  const uniqueId = uuidv4();
  const originalFileName = `${filePrefix}-${uniqueId}.jpg`;
  const uploadsDir = path.join(process.cwd(), 'uploads');
  const thumbnailsDir = path.join(uploadsDir, 'thumbnails');
  const originalPath = path.join(uploadsDir, originalFileName);
  const thumbnailFileName = `thumb-${originalFileName}`;
  const thumbnailPath = path.join(thumbnailsDir, thumbnailFileName);
  
  try {
    // Save the original image
    await fs.writeFile(originalPath, buffer);
    
    // Create a thumbnail version
    await sharp(buffer)
      .resize(200, 200, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toFile(thumbnailPath);
    
    // Return paths relative to the server root for use in URLs
    return {
      thumbnail: `/uploads/thumbnails/${thumbnailFileName}`,
      original: `/uploads/${originalFileName}`
    };
  } catch (error) {
    console.error('Error processing base64 image:', error);
    throw new Error(`Failed to process base64 image: ${error.message}`);
  }
}