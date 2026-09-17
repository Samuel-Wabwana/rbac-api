import { filenameFromItem, sanitizeFilename } from './filename.util';

describe('sanitizeFilename', () => {
  it('keeps a simple name and adds .pdf', () => {
    expect(sanitizeFilename('user1', 'item-1')).toBe('user1.pdf');
  });

  it('strips path separators and special characters', () => {
    expect(sanitizeFilename('../a/b?c', 'item-1')).toBe('_a_b_c.pdf');
  });

  it('uses the fallback when the name is empty', () => {
    expect(sanitizeFilename('   ', 'item-1')).toBe('item-1.pdf');
  });
});

describe('filenameFromItem', () => {
  it('uses the name field when present', () => {
    expect(filenameFromItem({ name: 'user1', table: 'josh' }, 0)).toBe(
      'user1.pdf',
    );
  });

  it('falls back to the item index', () => {
    expect(filenameFromItem({ table: 'josh' }, 2)).toBe('item-3.pdf');
  });
});
