// PWA 아이콘 generator — sharp로 SVG → PNG.
// brand 노란색(--bus #fbbf24) + 흰 셔틀버스(Lucide Bus) 모티브.
// 베타용 generic 자산. 정식 디자이너 자산 받으면 이 파일 → 수동 PNG로 교체.
//
// 실행: pnpm tsx scripts/generate-pwa-icons.ts

import path from "node:path";
import sharp from "sharp";

const BUS_PATHS = `
  <path d="M8 6v6"/>
  <path d="M15 6v6"/>
  <path d="M2 12h19.6"/>
  <path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4a2 2 0 0 0-2 2v10h3"/>
  <circle cx="7" cy="18" r="2"/>
  <path d="M9 18h5"/>
  <circle cx="16" cy="18" r="2"/>
`;

function svgIcon(size: number): string {
  const inner = Math.round(size * 0.6);
  const offset = Math.round((size - inner) / 2);
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="#fbbf24"/>
  <svg x="${offset}" y="${offset}" width="${inner}" height="${inner}" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    ${BUS_PATHS}
  </svg>
</svg>
`.trim();
}

async function main() {
  const publicDir = path.resolve("public");

  await sharp(Buffer.from(svgIcon(192)))
    .png()
    .toFile(path.join(publicDir, "icon.png"));

  await sharp(Buffer.from(svgIcon(180)))
    .png()
    .toFile(path.join(publicDir, "apple-icon.png"));

  console.log("✅ public/icon.png (192x192) + public/apple-icon.png (180x180)");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
