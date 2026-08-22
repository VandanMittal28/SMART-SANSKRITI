const fs = require("fs");
const paths = [".next", "node_modules/.cache"];

for (const p of paths) {
  try {
    if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true });
    console.log(`Removed ${p}`);
  } catch (err) {
    console.error(`Failed to remove ${p}:`, err.message);
  }
}
