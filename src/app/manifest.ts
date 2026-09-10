import type { MetadataRoute } from "next";
import { SITE_URL } from "@/constants";

/**
 * PWA manifest — bikin situs bisa "di-install" ke home screen HP
 * dengan identitas brand yang konsisten (kertas krem + kuning signal).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Fess UNAIR — menfess anonim buat warga UNAIR",
    short_name: "Fess UNAIR",
    description:
      "Tulis apa pun yang belum sempat kamu ucapkan. Tanpa nama, tanpa login — langsung tayang di @fess_unair.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#F7F2E8",
    theme_color: "#FFC800",
    lang: "id",
    categories: ["social", "lifestyle"],
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
