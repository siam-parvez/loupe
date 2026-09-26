/**
 * Prepare one or more PNG artworks for the deep-zoom viewer.
 *
 *   pnpm viewer:prepare ./artwork.png
 *   pnpm viewer:prepare ./a.png ./b.png --project client-name --project-title "Client Name"
 *   pnpm viewer:prepare ./artwork.png --project demo --title "Final Artwork" --force
 */
import path from 'node:path';
import { parseArgs } from 'node:util';

import { type ImageInput, prepareProject } from '@/lib/images/prepare-project';
import { PrepareError } from '@/lib/images/pyramid';
import { humanize, slugify } from '@/lib/projects/validation';
import { resolveLocalStorageDir } from '@/lib/storage/root';

const DEFAULT_QUALITY = 85;

const USAGE = `
Usage: pnpm viewer:prepare <image.png> [more.png …] [options]

Options:
  --project <id>             Project id (default: derived from the first file name)
  --project-title <text>     Project title shown in the header
  --project-description <t>  Optional project description
  --id <imageId>             Image id (single image only; default: from file name)
  --title <text>             Image title (single image only; default: from file name)
  --description <text>       Image description (single image only)
  --quality <1-100>          WebP tile quality (default: ${DEFAULT_QUALITY})
  --force                    Replace images that already exist in the project
  --help                     Show this help
`;

function fail(message: string): never {
  console.error(`\n✖ ${message}\n`);
  process.exit(1);
}

function parseCli() {
  try {
    return parseArgs({
      allowPositionals: true,
      options: {
        project: { type: 'string' },
        'project-title': { type: 'string' },
        'project-description': { type: 'string' },
        id: { type: 'string' },
        title: { type: 'string' },
        description: { type: 'string' },
        quality: { type: 'string' },
        force: { type: 'boolean', default: false },
        help: { type: 'boolean', default: false },
      },
    });
  } catch (error) {
    fail(`${(error as Error).message}\n${USAGE}`);
  }
}

async function main(): Promise<void> {
  const { values, positionals } = parseCli();
  if (values.help || positionals.length === 0) {
    console.log(USAGE);
    if (!values.help) process.exitCode = 1;
    return;
  }

  const single = positionals.length === 1;
  if (!single && (values.id || values.title || values.description)) {
    fail('--id, --title and --description can only be used with a single image.');
  }

  const quality = values.quality === undefined ? DEFAULT_QUALITY : Number(values.quality);
  if (!Number.isInteger(quality) || quality < 1 || quality > 100) {
    fail('--quality must be a whole number between 1 and 100.');
  }

  const images: ImageInput[] = positionals.map((file) => {
    const baseName = path.basename(file);
    return {
      sourcePath: path.resolve(file),
      imageId: (single && values.id) || slugify(baseName),
      title: (single && values.title) || humanize(baseName),
      description: single ? values.description : undefined,
    };
  });

  const projectId = values.project ?? images[0]?.imageId ?? '';
  const projectsRoot = resolveLocalStorageDir();
  console.log(`Preparing ${images.length} image(s) into ${path.join(projectsRoot, projectId)}`);

  const record = await prepareProject({
    projectsRoot,
    projectId,
    projectTitle: values['project-title'],
    projectDescription: values['project-description'],
    images,
    quality,
    force: values.force,
    log: (message) => console.log(message),
  });

  console.log(`\n✔ Project "${record.title}" now has ${record.images.length} image(s).`);
  console.log(`  Run \`pnpm dev\` and open http://localhost:3000/viewer/${record.id}\n`);
}

main().catch((error: unknown) => {
  if (error instanceof PrepareError) {
    if (process.env.DEBUG && error.cause) console.error(error.cause);
    fail(error.message);
  }
  console.error(error);
  fail('Preparation failed unexpectedly (details above).');
});
