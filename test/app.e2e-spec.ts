import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { configureApp } from './../src/configure-app';
import { PdfService } from './../src/printers/pdf.service';

describe('App (e2e)', () => {
  let app: INestApplication<App>;
  const pdfBuffer = Buffer.from('%PDF-1.4 mock-pdf');

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PdfService)
      .useValue({
        htmlToPdfs: async (htmls: string[], _pageSize?: unknown) =>
          htmls.map(() => pdfBuffer),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  it('rejects an invalid print job body', () => {
    return request(app.getHttpServer())
      .post('/printers/jobs')
      .send({ templateId: 'user-card', items: [] })
      .expect(400);
  });

  it('rejects mixed format and custom page dimensions', () => {
    return request(app.getHttpServer())
      .post('/printers/jobs')
      .send({
        templateId: 'user-card',
        format: 'A5',
        width: '148mm',
        height: '210mm',
        partners: ['Hinata', 'Naruto'],
        items: [{ name: 'user1', table: 'josh' }],
      })
      .expect(400);
  });

  it('rejects width without height', () => {
    return request(app.getHttpServer())
      .post('/printers/jobs')
      .send({
        templateId: 'user-card',
        width: '148mm',
        partners: ['Hinata', 'Naruto'],
        items: [{ name: 'user1', table: 'josh' }],
      })
      .expect(400);
  });

  it('creates a job then downloads a PDF', async () => {
    const created = await request(app.getHttpServer())
      .post('/printers/jobs')
      .send({
        templateId: 'user-card',
        partners: ['Hinata', 'Naruto'],
        items: [{ name: 'user1', table: 'josh' }],
      })
      .expect(201);

    expect(created.body.status).toBe('done');
    expect(created.body.files).toHaveLength(1);

    const download = await request(app.getHttpServer())
      .get(created.body.files[0].downloadUrl)
      .expect(200)
      .expect('Content-Type', /pdf/);

    expect(download.body.length).toBeGreaterThan(0);

    await request(app.getHttpServer())
      .get(`/printers/jobs/${created.body.id}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.id).toBe(created.body.id);
      });
  });

  it('uploads an image then uses its id in a print job', async () => {
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64',
    );

    const uploaded = await request(app.getHttpServer())
      .post('/printers/images')
      .attach('file', png, { filename: 'dot.png', contentType: 'image/png' })
      .expect(201);

    expect(uploaded.body.id).toBeDefined();
    expect(uploaded.body.url).toBe(`/printers/images/${uploaded.body.id}`);

    await request(app.getHttpServer())
      .get(uploaded.body.url)
      .expect(200)
      .expect('Content-Type', /image\/png/);

    const created = await request(app.getHttpServer())
      .post('/printers/jobs')
      .send({
        templateId: 'user-card',
        partners: ['Hinata', 'Naruto'],
        photos: [uploaded.body.id],
        items: [
          { name: 'user1', table: 'josh' },
          { name: 'user2', table: 'anna' },
        ],
      })
      .expect(201);

    expect(created.body.photos).toEqual([uploaded.body.id]);
    expect(created.body.files[0].item.photos).toBeUndefined();
  });
});
