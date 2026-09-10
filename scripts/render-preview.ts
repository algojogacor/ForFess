/**
 * Render contoh kartu menfess ke PNG untuk QA visual.
 * Jalankan: bun scripts/render-preview.ts
 * Output: /tmp/menfess-preview-*.png
 */
import { writeFileSync } from "node:fs";
import { renderMenfessCard } from "../src/lib/generate-image";

const SAMPLES = [
  { name: "short", text: "lulus, alhamdulillah." },
  {
    name: "long",
    text: "Kadang mikir, kenapa ya tugas kelompok selalu ada satu orang yang hilang saat deadline terakhir? Padahal pas bagi-bagi tugas paling semangat. Semoga kalian baik-baik saja, teman. Semoga sukses. Tapi tolong ya, lain kali kabarin dulu kalau nggak bisa. Kami di sini masih setia nunggu revisi bareng. Terima kasih sudah membaca curhatan malam ini. Besok kita coba lagi. Semangat untuk kita semua yang sedang berjuang menyelesaikan tugas akhir di tengah keterbatasan waktu dan tenaga. Tetap sehat, tetap waras, tetap semangat!",
  },
];

for (const sample of SAMPLES) {
  const png = await renderMenfessCard(sample.text);
  const out = `/tmp/menfess-preview-${sample.name}.png`;
  writeFileSync(out, png);
  console.log(`OK ${out} (${(png.length / 1024).toFixed(0)} KB, text ${sample.text.length} chars)`);
}
