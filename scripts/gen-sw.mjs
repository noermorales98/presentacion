// Regenera el service worker DESPUÉS de que el bundle principal sea visible
// en el mount de red: el paso generateSW de vite-plugin-pwa puede ejecutarse
// antes de que el archivo grande de ~1 MB sea listado por el filesystem,
// dejándolo fuera del precache (y rompiendo el modo offline).
import { generateSW } from "workbox-build";
import fs from "node:fs";
import path from "node:path";

const DIST = path.resolve("dist");

// espera hasta 120 s a que el bundle JS principal aparezca con su tamaño final
const mainJs = () => {
  try {
    const assets = path.join(DIST, "assets");
    for (const f of fs.readdirSync(assets)) {
      if (f.startsWith("index-") && f.endsWith(".js")) {
        const p = path.join(assets, f);
        return fs.existsSync(p) && fs.statSync(p).size > 100_000 ? p : null;
      }
    }
  } catch {}
  return null;
};

let waited = 0;
while (!mainJs() && waited < 120) {
  await new Promise((r) => setTimeout(r, 1000));
  waited += 1;
}
const found = mainJs();
if (!found) {
  console.warn("[gen-sw] el bundle principal no apareció tras 120 s; el SW podría quedar incompleto");
}

await generateSW({
  swDest: path.join(DIST, "sw.js"),
  globDirectory: DIST,
  globPatterns: ["**/*.{js,wasm,css,html,ico,png,svg,webmanifest,ttf}"],
  globIgnores: ["sw.js", "workbox-*.js"],
  navigateFallback: "index.html",
  maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
  skipWaiting: true,
  clientsClaim: true,
  cleanupOutdatedCaches: true,
  runtimeCaching: [
    {
      // fuentes de Google Fonts: caché en tiempo de ejecución
      urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
      handler: "CacheFirst",
      options: {
        cacheName: "noxy-fonts",
        expiration: { maxEntries: 12, maxAgeSeconds: 60 * 60 * 24 * 365 },
      },
    },
  ],
});

const urls = [];
const sw = fs.readFileSync(path.join(DIST, "sw.js"), "utf8");
for (const m of sw.matchAll(/url:"([^"]+)"/g)) urls.push(m[1]);
console.log("[gen-sw] precache:", urls.join(", "));
if (!urls.some((u) => u.includes("index-") && u.endsWith(".js"))) {
  console.error("[gen-sw] ERROR: el bundle principal NO está en el precache");
  process.exit(1);
}
