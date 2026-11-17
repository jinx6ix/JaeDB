// scripts/render-sample-flyer.tsx
// Renders two sample tour flyer PDFs (no database):
//   tmp/sample-flyer-fallback.pdf   (coverSrc = null -> fallback sunset scene)
//   tmp/sample-flyer-cover.pdf      (coverSrc = image data URI)
// Usage:
//   pnpm exec ts-node-esm scripts/render-sample-flyer.tsx
//   pnpm exec ts-node-esm scripts/render-sample-flyer.tsx --cover /path/to/image.jpg
import { renderToBuffer } from '@react-pdf/renderer';
import { TourFlyerPDF } from '../lib/tour-flyer-pdf.tsx';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const TMP_DIR = join(process.cwd(), 'tmp');
if (!existsSync(TMP_DIR)) mkdirSync(TMP_DIR, { recursive: true });

const HIGHLIGHTS = [
  { title: 'Game drives', description: 'Sunrise and sunset drives in prime wildlife territory.' },
  { title: 'Expert guides', description: 'Experienced local guides who know every trail and track.' },
  { title: 'Comfortable stays', description: 'Handpicked lodges and tented camps.' },
  { title: 'Reliable transport', description: 'Safe, comfortable vehicles for the whole journey.' },
  { title: 'Wildlife encounters', description: 'Chances to see elephants, lions, giraffes and more.' },
  { title: 'Custom itineraries', description: 'Tours shaped to your dates, pace and budget.' },
];

const PROPS = {
  headline1: 'Your Safari',
  headline2: 'Adventure Awaits',
  subtitle: 'Guided tours into the heart of the wild — crafted around you.',
  highlights: HIGHLIGHTS,
} as const;

async function imagePathToDataUri(imagePath: string): Promise<string> {
  const { Jimp, JimpMime } = await import('jimp');
  const image = await Jimp.read(imagePath);
  const buf = await image.getBuffer(JimpMime.jpeg);
  return `data:image/jpeg;base64,${buf.toString('base64')}`;
}

async function makeTestCover(): Promise<string> {
  const { Jimp, JimpMime, rgbaToInt } = await import('jimp');
  // 1800x1200 simple colour gradient test JPEG
  const image = new Jimp({ width: 1800, height: 1200, color: 0 });
  for (let y = 0; y < 1200; y++) {
    for (let x = 0; x < 1800; x++) {
      const r = Math.floor(255 * (x / 1800));
      const g = Math.floor(140 + 80 * (y / 1200));
      const b = Math.floor(90 + 60 * (1 - x / 1800));
      image.setPixelColor(rgbaToInt(r, g, b, 255), x, y);
    }
  }
  const buf = await image.getBuffer(JimpMime.jpeg);
  return `data:image/jpeg;base64,${buf.toString('base64')}`;
}

async function render(coverSrc: string | null, outPath: string): Promise<void> {
  const buffer = await renderToBuffer(
    <TourFlyerPDF
      headline1={PROPS.headline1}
      headline2={PROPS.headline2}
      subtitle={PROPS.subtitle}
      highlights={PROPS.highlights}
      coverSrc={coverSrc}
    />,
  );
  writeFileSync(outPath, buffer);
  console.log(`Wrote ${outPath} (${buffer.byteLength} bytes)`);
}

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT', typeof err, err);
  process.exit(1);
});
process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED_REJECTION', typeof err, err);
  process.exit(1);
});

async function main() {
  console.log('MAIN START');
  const args = process.argv.slice(2);
  const coverIndex = args.indexOf('--cover');
  let coverSrc: string | null = null;
  if (coverIndex >= 0 && args[coverIndex + 1]) {
    coverSrc = await imagePathToDataUri(args[coverIndex + 1]);
    console.log('Using cover image:', args[coverIndex + 1]);
  } else {
    coverSrc = await makeTestCover();
    console.log('No --cover given; generated a 1800x1200 test JPEG');
  }

  await render(null, join(TMP_DIR, 'sample-flyer-fallback.pdf'));
  await render(coverSrc, join(TMP_DIR, 'sample-flyer-cover.pdf'));
}

main().catch((err) => {
  console.error('RENDER FAILED');
  console.error('typeof err:', typeof err);
  console.error('err:', err);
  if (err && err.stack) console.error('stack:', err.stack);
  process.exit(1);
});
