import { BadRequestException } from '@nestjs/common';
import { TemplateService } from './template.service';

describe('TemplateService', () => {
  const service = new TemplateService();

  it('renders a known template with escaped values', async () => {
    const html = await service.render('user-card', {
      name: '<script>user1</script>',
      table: 'josh',
    });

    expect(html).toContain('josh');
    expect(html).toContain('&lt;script&gt;user1&lt;/script&gt;');
    expect(html).not.toContain('<script>user1</script>');
  });

  it('embeds a trusted image data URL via the image helper', async () => {
    const photo =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
    const html = await service.render('user-card', {
      name: 'user1',
      table: 'josh',
      photo,
    });
    expect(html).toContain(`src="${photo}"`);
  });

  it('does not treat arbitrary photo values as HTML', async () => {
    const html = await service.render('user-card', {
      name: 'user1',
      table: 'josh',
      photo: '<script>alert(1)</script>',
    });
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('src="<script>');
  });

  it('rejects an unknown template id', async () => {
    await expect(service.render('missing', { name: 'x' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rejects a path-like template id', async () => {
    await expect(
      service.render('../user-card', { name: 'x' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
