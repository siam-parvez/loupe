/**
 * Procedural test artwork: flowing colour field + fine rings + labelled 512 px grid, so it is
 * obvious when the viewer swaps in sharper tiles while zooming.
 */

export type Rgb = readonly [number, number, number];

export interface DemoArtworkSpec {
  width: number;
  height: number;
  palette: readonly Rgb[];
  seed: number;
}

const GRID = 512;
const LABEL_SCALE = 6;
const LABEL_COLOR: Rgb = [250, 248, 240];

// 3×5 bitmap digits plus "-" (rows top→bottom, 3 bits each).
const GLYPHS: Record<string, readonly number[]> = {
  '0': [7, 5, 5, 5, 7],
  '1': [2, 6, 2, 2, 7],
  '2': [7, 1, 7, 4, 7],
  '3': [7, 1, 7, 1, 7],
  '4': [5, 5, 7, 1, 1],
  '5': [7, 4, 7, 1, 7],
  '6': [7, 4, 7, 5, 7],
  '7': [7, 1, 1, 1, 1],
  '8': [7, 5, 7, 5, 7],
  '9': [7, 5, 7, 1, 7],
  '-': [0, 0, 7, 0, 0],
};

function mixPalette(palette: readonly Rgb[], t: number): Rgb {
  const clamped = Math.min(0.9999, Math.max(0, t));
  const scaled = clamped * (palette.length - 1);
  const index = Math.floor(scaled);
  const frac = scaled - index;
  const a = palette[index] ?? LABEL_COLOR;
  const b = palette[index + 1] ?? a;
  return [a[0] + (b[0] - a[0]) * frac, a[1] + (b[1] - a[1]) * frac, a[2] + (b[2] - a[2]) * frac];
}

function paintBackground(buffer: Buffer, spec: DemoArtworkSpec): void {
  const { width, height, palette, seed } = spec;
  const cx = width * 0.62;
  const cy = height * 0.4;
  for (let y = 0; y < height; y += 1) {
    const ny = y / height;
    for (let x = 0; x < width; x += 1) {
      const nx = x / width;
      const field =
        Math.sin(nx * 7 + seed + Math.sin(ny * 5 + seed) * 1.6) +
        Math.sin(ny * 6 - seed + Math.cos(nx * 4) * 1.8) +
        Math.sin((nx + ny) * 9 + seed * 2);
      const [r, g, b] = mixPalette(palette, (field + 3) / 6);
      const ring = 0.93 + 0.07 * Math.sin(Math.hypot(x - cx, y - cy) * 0.5);
      const minor = x % 64 === 0 || y % 64 === 0 ? 0.9 : 1;
      const major = x % GRID < 3 || y % GRID < 3 ? 0.55 : 1;
      const shade = ring * minor * major;
      const offset = (y * width + x) * 3;
      buffer[offset] = r * shade;
      buffer[offset + 1] = g * shade;
      buffer[offset + 2] = b * shade;
    }
  }
}

function paintPixelBlock(buffer: Buffer, width: number, height: number, x0: number, y0: number) {
  for (let dy = 0; dy < LABEL_SCALE; dy += 1) {
    for (let dx = 0; dx < LABEL_SCALE; dx += 1) {
      const x = x0 + dx;
      const y = y0 + dy;
      if (x >= width || y >= height) continue;
      buffer.set(LABEL_COLOR, (y * width + x) * 3);
    }
  }
}

function paintText(buffer: Buffer, spec: DemoArtworkSpec, text: string, x0: number, y0: number) {
  [...text].forEach((char, index) => {
    const glyph = GLYPHS[char] ?? [];
    const left = x0 + index * 4 * LABEL_SCALE;
    glyph.forEach((bits, row) => {
      for (let col = 0; col < 3; col += 1) {
        if (bits & (4 >> col)) {
          const x = left + col * LABEL_SCALE;
          paintPixelBlock(buffer, spec.width, spec.height, x, y0 + row * LABEL_SCALE);
        }
      }
    });
  });
}

/** Returns raw 8-bit RGB pixels (width × height × 3). */
export function renderDemoArtwork(spec: DemoArtworkSpec): Buffer {
  const buffer = Buffer.alloc(spec.width * spec.height * 3);
  paintBackground(buffer, spec);
  for (let row = 0; row * GRID < spec.height; row += 1) {
    for (let col = 0; col * GRID < spec.width; col += 1) {
      paintText(buffer, spec, `${row + 1}-${col + 1}`, col * GRID + 16, row * GRID + 16);
    }
  }
  return buffer;
}
