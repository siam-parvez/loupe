/**
 * Creates the `demo` project from generated test artworks so the viewer works out of the box.
 *
 *   pnpm viewer:demo                              (re)generate the demo project
 *   tsx scripts/generate-demo.ts --if-missing     (used by `predev`; no-op when it exists)
 *   tsx scripts/generate-demo.ts --out public/static-projects   (hosted demo build)
 */
import { existsSync, promises as fs } from 'node:fs';
import path from 'node:path';

import sharp from 'sharp';

import { type ImageInput, prepareProject } from '@/lib/images/prepare-project';
import { PROJECT_FILE } from '@/lib/projects/layout';
import { resolveLocalStorageDir } from '@/lib/storage/root';

import { type DemoArtworkSpec, renderDemoArtwork } from './demo-artwork';

const PROJECT_ID = 'demo';
const CACHE_DIR = path.resolve('.cache', 'demo-source');

interface DemoImage {
  id: string;
  title: string;
  description: string;
  spec: DemoArtworkSpec;
}

const DEMO_IMAGES: DemoImage[] = [
  {
    id: 'aurora-study',
    title: 'Aurora Study',
    description: 'Generated 8192 × 6144 test image. Zoom in to read the grid labels.',
    spec: {
      width: 8192,
      height: 6144,
      seed: 0.4,
      palette: [
        [12, 24, 48],
        [24, 92, 120],
        [64, 170, 150],
        [210, 220, 170],
        [240, 160, 110],
      ],
    },
  },
  {
    id: 'ember-field',
    title: 'Ember Field',
    description: 'Generated 4800 × 6400 portrait test image.',
    spec: {
      width: 4800,
      height: 6400,
      seed: 2.1,
      palette: [
        [30, 12, 18],
        [120, 30, 36],
        [210, 90, 50],
        [245, 190, 110],
        [252, 240, 214],
      ],
    },
  },
];

async function writeDemoPng(image: DemoImage): Promise<string> {
  const file = path.join(CACHE_DIR, `${image.id}.png`);
  if (existsSync(file)) return file;
  const { width, height } = image.spec;
  console.log(`Rendering ${image.id}.png (${width} × ${height})…`);
  await sharp(renderDemoArtwork(image.spec), { raw: { width, height, channels: 3 } })
    .png({ compressionLevel: 6 })
    .toFile(file);
  return file;
}

async function main(): Promise<void> {
  const outIndex = process.argv.indexOf('--out');
  const outDir = outIndex === -1 ? undefined : process.argv[outIndex + 1];
  const projectsRoot = outDir ? path.resolve(outDir) : resolveLocalStorageDir();
  const ifMissing = process.argv.includes('--if-missing');
  if (ifMissing && existsSync(path.join(projectsRoot, PROJECT_ID, PROJECT_FILE))) return;

  console.log('Creating the demo project (first run only, takes about a minute)…');
  await fs.mkdir(CACHE_DIR, { recursive: true });

  const images: ImageInput[] = [];
  for (const image of DEMO_IMAGES) {
    images.push({
      sourcePath: await writeDemoPng(image),
      imageId: image.id,
      title: image.title,
      description: image.description,
    });
  }

  await prepareProject({
    projectsRoot,
    projectId: PROJECT_ID,
    projectTitle: 'Demo Collection',
    projectDescription: 'Generated test artworks for trying the viewer.',
    images,
    quality: 85,
    force: true,
    log: (message) => console.log(message),
  });
  console.log('\n✔ Demo ready at http://localhost:3000/viewer/demo\n');
}

main().catch((error: unknown) => {
  console.error('\n✖ Could not create the demo project:', error);
  // Never block `pnpm dev` because of the demo — but do fail a hosted-demo build (--out).
  const isDevConvenience = process.argv.includes('--if-missing') && !process.argv.includes('--out');
  process.exitCode = isDevConvenience ? 0 : 1;
});
