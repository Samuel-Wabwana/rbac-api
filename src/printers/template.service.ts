import { BadRequestException, Injectable } from '@nestjs/common';
import { promises as fs } from 'fs';
import Handlebars from 'handlebars';
import { join } from 'path';

const TEMPLATE_ID = /^[a-z0-9-]+$/;

@Injectable()
export class TemplateService {
  private readonly templatesDir = join(__dirname, 'templates');

  async render(
    templateId: string,
    item: Record<string, unknown>,
  ): Promise<string> {
    if (!TEMPLATE_ID.test(templateId)) {
      throw new BadRequestException('Unknown template');
    }

    const filePath = join(this.templatesDir, `${templateId}.hbs`);
    let source: string;
    try {
      source = await fs.readFile(filePath, 'utf8');
    } catch {
      throw new BadRequestException(`Unknown template: ${templateId}`);
    }

    const compile = Handlebars.compile(source, { strict: false });
    return compile(item);
  }
}
