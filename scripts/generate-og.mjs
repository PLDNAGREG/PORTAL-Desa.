// scripts/generate-og.mjs
// Generate halaman statis /berita/{id}.html untuk tiap berita di Supabase,
// masing-masing dengan meta tag Open Graph (judul, deskripsi, gambar) yang benar.
// Halaman ini otomatis mengalihkan pengunjung ke index.html#berita/{id}
// (tampilan asli situs), tapi bot WhatsApp/Facebook/dll akan membaca
// tag OG statis di file ini sebelum pengalihan terjadi.

import fs from "node:fs/promises";
import path from "node:path";

const SUPABASE_URL = "https://nssrmpypcadjadxquxkx.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_Ga-3oYa9f_jPA-z199-u3Q_Zzu2TyDt";

// Ganti sesuai domain GitHub Pages kamu (tanpa trailing slash)
const SITE_URL = "https://pldnagreg.github.io/PORTAL-Desa";
const DEFAULT_IMAGE = `${SITE_URL}/og-image.jpg`;
const OUTPUT_DIR = "berita"; // hasil akan ditulis ke ./berita/{id}.html

function escapeHtml(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function shortDesc(x) {
  const raw = x.summary || x.body || "Portal Desa Smart System TPP Kecamatan Nagreg";
  return raw.replace(/\s+/g, " ").trim().slice(0, 180);
}

// Google Drive thumbnail links sering GAGAL di-fetch oleh bot WhatsApp/Facebook
// (butuh redirect & terkadang butuh izin). Kalau image_url dari Drive, kita
// tetap pakai, tapi kalau kosong/invalid, fallback ke og-image.jpg default.
function resolveImage(x) {
  if (x.image_url && /^https?:\/\//.test(x.image_url)) return x.image_url;
  return DEFAULT_IMAGE;
}

function renderPage(x) {
  const title = escapeHtml(x.title || "Portal Desa Smart System TPP Kecamatan Nagreg");
  const desc = escapeHtml(shortDesc(x));
  const image = escapeHtml(resolveImage(x));
  const pageUrl = `${SITE_URL}/${OUTPUT_DIR}/${x.id}.html`;
  const redirectUrl = `../index.html#berita/${encodeURIComponent(x.id)}`;

  return `<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} — Portal Desa Smart System TPP Kecamatan Nagreg</title>

<meta property="og:type" content="article">
<meta property="og:site_name" content="Portal Desa Smart System TPP Kecamatan Nagreg">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${desc}">
<meta property="og:image" content="${image}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:url" content="${pageUrl}">

<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${title}">
<meta name="twitter:description" content="${desc}">
<meta name="twitter:image" content="${image}">

<link rel="canonical" href="${redirectUrl}">
<meta http-equiv="refresh" content="0; url=${redirectUrl}">
<script>location.replace(${JSON.stringify(redirectUrl)});</script>
</head>
<body>
  <p>Mengalihkan ke <a href="${redirectUrl}">${title}</a>...</p>
</body>
</html>
`;
}

async function main() {
  const endpoint =
    `${SUPABASE_URL}/rest/v1/portal_content` +
    `?select=id,title,summary,body,image_url,status,type` +
    `&type=eq.berita&status=eq.published`;

  const res = await fetch(endpoint, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
  });

  if (!res.ok) {
    throw new Error(`Gagal mengambil data Supabase: ${res.status} ${await res.text()}`);
  }

  const rows = await res.json();
  console.log(`Ditemukan ${rows.length} berita published.`);

  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  for (const x of rows) {
    const html = renderPage(x);
    const filePath = path.join(OUTPUT_DIR, `${x.id}.html`);
    await fs.writeFile(filePath, html, "utf-8");
    console.log(`✓ ${filePath}`);
  }

  console.log("Selesai.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
