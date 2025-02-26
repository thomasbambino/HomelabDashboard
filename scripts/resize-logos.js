import sharp from 'sharp';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sourceDir = path.join(__dirname, '..', 'attached_assets');
const targetDir = path.join(__dirname, '..', 'client', 'public');
const size = 32;

const logos = {
  'Google__G__logo.svg.png': 'google-logo.png',
  '61447fb55953a50004ee16ee.png': 'tmobile-logo.png',
  'Frontier_communications_logo_2022.png': 'frontier-logo.png',
  '6227182b74a10c92f2ae07aa.png': 'spectrum-logo.png',
  'Daco_558615.png': 'cox-logo.png',
  '5842905ca6515b1e0ad75ab9.png': 'att-logo.png',
  'Verizon_logo.png': 'verizon-logo.png'
};

async function resizeLogos() {
  // Create the target directory if it doesn't exist
  await fs.mkdir(targetDir, { recursive: true });

  for (const [source, target] of Object.entries(logos)) {
    try {
      await sharp(path.join(sourceDir, source))
        .resize(size, size, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .toFile(path.join(targetDir, target));
      console.log(`Resized ${source} to ${target}`);
    } catch (error) {
      console.error(`Error processing ${source}:`, error);
    }
  }
}

resizeLogos().catch(console.error);