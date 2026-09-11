// Generate src/lib/fonts.generated.ts berisi font base64 untuk Satori.
// Jalankan: bun scripts/generate-fonts.mjs
// Dipanggil ulang hanya jika ganti font/weight.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const FILES = [
  { key: "spaceGroteskRegular", path: "@fontsource/space-grotesk/files/space-grotesk-latin-400-normal.woff", meta: { name: "Space Grotesk", weight: 400, style: "normal" } },
  { key: "spaceGroteskMedium", path: "@fontsource/space-grotesk/files/space-grotesk-latin-500-normal.woff", meta: { name: "Space Grotesk", weight: 500, style: "normal" } },
  { key: "spaceGroteskBold", path: "@fontsource/space-grotesk/files/space-grotesk-latin-700-normal.woff", meta: { name: "Space Grotesk", weight: 700, style: "normal" } },
  { key: "spaceMonoRegular", path: "@fontsource/space-mono/files/space-mono-latin-400-normal.woff", meta: { name: "Space Mono", weight: 400, style: "normal" } },
];

let out = `/* AUTO-GENERATED oleh scripts/generate-fonts.mjs — jangan edit manual.
 * Font WOFF base64, dipakai Satori untuk render gambar menfess 1080x1080.
 */\n\n`;

for (const f of FILES) {
  const buf = readFileSync(join(process.cwd(), "node_modules", f.path));
  out += `export const ${f.key}Base64 =\n  "${buf.toString("base64")}";\n\n`;
  out += `export const ${f.key}Meta = ${JSON.stringify(f.meta)};\n\n`;
}

writeFileSync(join(process.cwd(), "src", "lib", "fonts.generated.ts"), out);
console.log("OK: src/lib/fonts.generated.ts");
