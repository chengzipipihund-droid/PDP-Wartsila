import fs from 'fs';
import path from 'path';

function mergeDir(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const item of fs.readdirSync(src)) {
    const srcItem = path.join(src, item);
    const destItem = path.join(dest, item);
    if (fs.statSync(srcItem).isDirectory()) {
      mergeDir(srcItem, destItem);
    } else if (!fs.existsSync(destItem)) {
      fs.copyFileSync(srcItem, destItem);
    }
  }
}

// On Linux (Vercel), src/Pages and src/pages are separate directories.
// Merge uppercase into lowercase so relative imports resolve correctly.
const upper = 'src/Pages';
const lower = 'src/pages';

if (fs.existsSync(upper) && upper !== lower) {
  console.log(`Merging ${upper}/ into ${lower}/...`);
  mergeDir(upper, lower);
  console.log('Case normalization done.');
}
