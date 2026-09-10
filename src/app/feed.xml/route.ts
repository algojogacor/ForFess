/**
 * RSS feed — /feed.xml
 * Daftar menfess terbaru dari @fess_unair dalam format RSS 2.0, dengan
 * link ke halaman kartu lokal (/fess/[id]) bukan langsung ke IG — biar
 * pembaca feed dapat halaman yang cepat & rapi.
 *
 * Fail-open: kalau Graph API gagal, tetap keluarkan feed channel yang
 * valid (kosong) — bukan 500. Reader RSS akan menampilkan channel saja.
 */
import { listRecentMedia } from "@/lib/instagram";
import { excerptFromCaption } from "@/lib/caption";
import { IG_HANDLE, SITE_URL } from "@/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FEED_ITEMS = 20;

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export async function GET() {
  let itemsXml = "";

  try {
    const items = await listRecentMedia(MAX_FEED_ITEMS);
    itemsXml = items
      .map((item) => {
        const text = excerptFromCaption(item.caption, 500);
        const title = excerptFromCaption(item.caption, 80) || "Menfess tanpa teks";
        const link = `${SITE_URL}/fess/${item.id}`;
        const pubDate = item.timestamp
          ? new Date(item.timestamp).toUTCString()
          : "";
        const guid = item.id;

        return `    <item>
      <title>${escapeXml(title)}</title>
      <link>${escapeXml(link)}</link>
      <guid isPermaLink="true">${escapeXml(guid)}</guid>
      ${pubDate ? `<pubDate>${pubDate}</pubDate>` : ""}
      <description>${escapeXml(text || "(tanpa teks)")}</description>
    </item>`;
      })
      .join("\n");
  } catch (err) {
    console.warn(
      "[feed] gagal ambil media, sajikan feed kosong:",
      err instanceof Error ? err.message : err
    );
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Fess UNAIR — menfess anonim ${IG_HANDLE}</title>
    <link>${escapeXml(SITE_URL)}</link>
    <description>Kartu menfess anonim terbaru dari civitas Universitas Airlangga, tayang otomatis di ${IG_HANDLE}.</description>
    <language>id</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${escapeXml(`${SITE_URL}/feed.xml`)}" rel="self" type="application/rss+xml" />
${itemsXml}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=300, s-maxage=300",
    },
  });
}
