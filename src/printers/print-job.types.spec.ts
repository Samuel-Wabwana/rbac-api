import {
  DEFAULT_PDF_PAGE_SIZE,
  resolvePdfPageSize,
} from './print-job.types';

describe('resolvePdfPageSize', () => {
  it('defaults to A5 when no page size is provided', () => {
    expect(resolvePdfPageSize({})).toEqual(DEFAULT_PDF_PAGE_SIZE);
  });

  it('uses format when provided', () => {
    expect(resolvePdfPageSize({ format: 'A4' })).toEqual({ format: 'A4' });
  });

  it('uses custom dimensions when provided', () => {
    expect(
      resolvePdfPageSize({ width: '148mm', height: '210mm' }),
    ).toEqual({
      width: '148mm',
      height: '210mm',
    });
  });
});
