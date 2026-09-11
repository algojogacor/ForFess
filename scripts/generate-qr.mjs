import QRCode from "qrcode";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function generateQR() {
  const targetUrl = "https://fess-unair.vercel.app";
  const outputPath = path.resolve(__dirname, "../public/qr-fess.png");

  console.log(`[generate-qr] Generating static QR code for ${targetUrl}...`);

  await QRCode.toFile(outputPath, targetUrl, {
    errorCorrectionLevel: "H",
    type: "png",
    width: 1000,
    margin: 2,
    color: {
      dark: "#1B1710", // Fess UNAIR ink color
      light: "#FFFFFF", // Pure white for maximum camera contrast
    },
  });

  const stats = fs.statSync(outputPath);
  console.log(`[generate-qr] Saved to ${outputPath} (${stats.size} bytes).`);
}

generateQR().catch((err) => {
  console.error("[generate-qr] Error generating QR code:", err);
  process.exit(1);
});
