const { copyFileSync, existsSync, mkdirSync, rmSync, writeFileSync } = require("node:fs");
const { join } = require("node:path");

const root = join(__dirname, "..");
const out = join(root, "www");
const files = [
  "index.html",
  "styles.css",
  "app.js",
  "native-bridge.js",
  "manifest.webmanifest",
  "icon.svg",
  "service-worker.js"
];

if (existsSync(out)) rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

for (const file of files) {
  copyFileSync(join(root, file), join(out, file));
}

writeFileSync(join(out, "native-ready.txt"), "Pyeongtaek Stitch native bundle ready\n", "utf8");
console.log(`Native assets copied to ${out}`);
