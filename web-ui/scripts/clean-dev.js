const fs = require("fs");

try {
  if (fs.existsSync('.next')) {
    fs.rmSync('.next', { recursive: true, force: true });
  }
  if (fs.existsSync('node_modules/.cache')) {
    fs.rmSync('node_modules/.cache', { recursive: true, force: true });
  }
  console.log('Cleaned Next.js caches.');
} catch (err) {
  console.error(err.message);
  process.exit(1);
}
