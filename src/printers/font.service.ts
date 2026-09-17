import { Injectable } from '@nestjs/common';
import { promises as fs } from 'fs';
import { join } from 'path';

export const PRINT_FONT_FAMILY = 'PrintCard';

const FONT_FILES = [
  { ext: '.woff2', mime: 'font/woff2', format: 'woff2' },
  { ext: '.woff', mime: 'font/woff', format: 'woff' },
  { ext: '.ttf', mime: 'font/ttf', format: 'truetype' },
  { ext: '.otf', mime: 'font/otf', format: 'opentype' },
] as const;

export type FontContext = {
  fontFamily: string;
  fontSrc: string;
  fontFormat: string;
};

@Injectable()
export class FontService {
  private readonly defaultFontsDir = join(__dirname, 'fonts');

  async load(
    templateId: string,
    fontsDir = this.defaultFontsDir,
  ): Promise<FontContext | undefined> {
    for (const { ext, mime, format } of FONT_FILES) {
      try {
        const buffer = await fs.readFile(join(fontsDir, `${templateId}${ext}`));
        if (!buffer.length) {
          continue;
        }
        return {
          fontFamily: PRINT_FONT_FAMILY,
          fontSrc: `data:${mime};base64,${buffer.toString('base64')}`,
          fontFormat: format,
        };
      } catch {
        // Missing or unreadable file: try the next extension, then skip.
      }
    }
    return undefined;
  }
}
