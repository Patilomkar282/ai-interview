/**
 * Run this ONCE to download face-api.js model weights into public/models/
 * Usage: node download-models.js
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights';
const OUTPUT_DIR = path.join(__dirname, 'public', 'models');

// Only the two models needed for emotion detection
const FILES = [
  'tiny_face_detector_model-weights_manifest.json',
  'tiny_face_detector_model-shard1',
  'face_expression_model-weights_manifest.json',
  'face_expression_model-shard1'
];

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const download = (filename) =>
  new Promise((resolve, reject) => {
    const url = `${BASE_URL}/${filename}`;
    const dest = path.join(OUTPUT_DIR, filename);

    if (fs.existsSync(dest)) {
      console.log(`  [skip] ${filename} already exists`);
      return resolve();
    }

    const file = fs.createWriteStream(dest);
    console.log(`  [download] ${filename} ...`);

    const request = (u) => {
      https.get(u, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          return request(res.headers.location);
        }
        if (res.statusCode !== 200) {
          file.close();
          fs.unlinkSync(dest);
          return reject(new Error(`HTTP ${res.statusCode} for ${filename}`));
        }
        res.pipe(file);
        file.on('finish', () => file.close(resolve));
      }).on('error', (err) => {
        fs.unlinkSync(dest);
        reject(err);
      });
    };

    request(url);
  });

(async () => {
  console.log('Downloading face-api.js models...\n');
  for (const file of FILES) {
    try {
      await download(file);
    } catch (err) {
      console.error(`  [error] ${file}: ${err.message}`);
      process.exit(1);
    }
  }
  console.log('\nDone. Models saved to public/models/');
})();
