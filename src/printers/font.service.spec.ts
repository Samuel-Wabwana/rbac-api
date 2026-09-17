import { mkdtemp, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { FontService, PRINT_FONT_FAMILY } from './font.service';

describe('FontService', () => {
  let fontsDir: string;

  beforeEach(async () => {
    fontsDir = await mkdtemp(join(tmpdir(), 'print-fonts-'));
  });

  afterEach(async () => {
    await rm(fontsDir, { recursive: true, force: true });
  });

  it('embeds a matching font file as a data URL', async () => {
    const bytes = Buffer.from('woff2-fixture');
    await writeFile(join(fontsDir, 'user-card.woff2'), bytes);

    const loaded = await new FontService().load('user-card', fontsDir);

    expect(loaded).toEqual({
      fontFamily: PRINT_FONT_FAMILY,
      fontSrc: `data:font/woff2;base64,${bytes.toString('base64')}`,
      fontFormat: 'woff2',
    });
  });

  it('prefers woff2 over ttf when both exist', async () => {
    await writeFile(join(fontsDir, 'user-card.ttf'), Buffer.from('ttf'));
    await writeFile(join(fontsDir, 'user-card.woff2'), Buffer.from('woff2'));

    const loaded = await new FontService().load('user-card', fontsDir);

    expect(loaded?.fontFormat).toBe('woff2');
  });

  it('returns undefined when no font file exists', async () => {
    await expect(
      new FontService().load('user-card', fontsDir),
    ).resolves.toBeUndefined();
  });

  it('ignores an empty file and continues', async () => {
    await writeFile(join(fontsDir, 'user-card.woff2'), Buffer.alloc(0));
    await writeFile(join(fontsDir, 'user-card.ttf'), Buffer.from('ttf'));

    const loaded = await new FontService().load('user-card', fontsDir);

    expect(loaded?.fontFormat).toBe('truetype');
  });
});
