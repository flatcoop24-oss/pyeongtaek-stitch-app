const { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } = require("node:fs");
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

const indexPath = join(out, "index.html");
const indexHtml = readFileSync(indexPath, "utf8");
const bridgedHtml = indexHtml.includes("native-bridge.js")
  ? indexHtml
  : indexHtml.replace('<script src="./app.js"></script>', '<script src="./native-bridge.js"></script>\n    <script src="./app.js"></script>');
writeFileSync(indexPath, bridgedHtml, "utf8");
writeFileSync(join(out, "native-ready.txt"), "Pyeongtaek Stitch native bundle ready\n", "utf8");
console.log(`Native assets copied to ${out}`);
