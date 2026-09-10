import type { MetadataRoute } from "next";
import { SITE_URL } from "@/constants";

/** Sitemap statis — semua halaman publik. */
export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ["", "/kirim", "/arsip", "/about", "/privacy", "/terms"];
  return routes.map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: new Date(),
    changeFrequency: path === "" || path === "/arsip" ? "hourly" : "monthly",
    priority: path === "" ? 1 : path === "/kirim" ? 0.9 : 0.6,
  }));
}
