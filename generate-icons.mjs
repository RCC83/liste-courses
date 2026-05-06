import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const sizes = [192, 512];

for (const size of sizes) {
  await sharp(path.join(__dirname, 'public/logo.svg'))
    .resize(size, size)
    .png()
    .toFile(path.join(__dirname, `public/icon-${size}.png`));
  console.log(`✅ icon-${size}.png créé`);
}

console.log('Done !');
