/**
 * Genera los assets de marca desde un SVG del monograma EC.
 * Reproducible: bun run brand
 */
import sharp from "sharp";
import { writeFileSync, mkdirSync } from "fs";

const BG = "#0d0d10";
const VOLT = "#bdef27";

function svgMonogram(size: number, pad: number, rounded: number): string {
  const inner = size - pad * 2;
  const fontSize = Math.round(inner * 0.52);
  const dotSize = Math.max(2, Math.round(size * 0.03));
  return `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" rx="${rounded}" fill="${BG}"/>
  <rect x="${pad}" y="${pad * 0.35}" width="${inner}" height="${Math.max(2, size * 0.015)}" rx="2" fill="${VOLT}"/>
  <text x="${size / 2 - dotSize}" y="${size / 2 + fontSize * 0.34}" font-family="ui-monospace, Menlo, monospace" font-weight="700" font-size="${fontSize}" fill="#ffffff" text-anchor="middle" letter-spacing="${-fontSize * 0.04}">EC</text>
  <circle cx="${size / 2 + fontSize * 0.62}" cy="${size / 2 + fontSize * 0.3}" r="${dotSize}" fill="${VOLT}"/>
</svg>`;
}

function svgOG(): string {
  return `<svg width="1440" height="720" xmlns="http://www.w3.org/2000/svg">
  <rect width="1440" height="720" fill="${BG}"/>
  <rect x="0" y="120" width="1440" height="6" fill="${VOLT}"/>
  <text x="720" y="330" font-family="ui-monospace, Menlo, monospace" font-weight="700" font-size="120" fill="#ffffff" text-anchor="middle">EZEQUIEL COACHING</text>
  <text x="720" y="430" font-family="ui-monospace, Menlo, monospace" font-size="34" fill="${VOLT}" text-anchor="middle" letter-spacing="8">ENTRENAMIENTO ONLINE</text>
  <text x="720" y="540" font-family="ui-monospace, Menlo, monospace" font-size="26" fill="#9ca3af" text-anchor="middle">Planes personalizados · Seguimiento real · Herramientas gratuitas</text>
</svg>`;
}

async function main() {
  mkdirSync("public/brand", { recursive: true });

  async function icon(size: number, name: string, rounded = 0, pad = Math.round(size * 0.12)) {
    const buf = await sharp(Buffer.from(svgMonogram(size, pad, rounded))).png().toBuffer();
    writeFileSync(`public/brand/${name}`, buf);
  }

  await icon(1200, "logo-full.png", 0, 200);
  await icon(512, "logo-mark.png", 96, 80);
  await icon(192, "icon-192.png", 36, 24);
  await icon(512, "icon-512.png", 96, 64);
  await icon(512, "icon-512-rounded.png", 128, 64);
  await icon(180, "apple-touch-icon.png", 0, 12);

  writeFileSync("public/brand/og.png", await sharp(Buffer.from(svgOG())).png().toBuffer());
  writeFileSync("src/app/icon.png", await sharp(Buffer.from(svgMonogram(96, 10, 16))).png().toBuffer());
  writeFileSync("src/app/apple-icon.png", await sharp(Buffer.from(svgMonogram(180, 12, 0))).png().toBuffer());

  console.log("✔ Brand assets generados en public/brand + src/app");
}

main();
