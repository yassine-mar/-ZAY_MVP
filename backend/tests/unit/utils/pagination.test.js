'use strict';

const { parsePaginationParams, buildPaginationMeta } = require('../../../src/utils/pagination');

describe('parsePaginationParams', () => {
  it('returns defaults when query is empty', () => {
    expect(parsePaginationParams({})).toEqual({ page: 1, limit: 20, offset: 0 });
  });

  it('parses page and limit from query', () => {
    expect(parsePaginationParams({ page: '3', limit: '50' })).toEqual({
      page: 3,
      limit: 50,
      offset: 100,
    });
  });

  it('caps limit at MAX_LIMIT (100)', () => {
    expect(parsePaginationParams({ limit: '500' }).limit).toBe(100);
  });

  it('clamps page to minimum of 1', () => {
    expect(parsePaginationParams({ page: '-5' }).page).toBe(1);
    expect(parsePaginationParams({ page: '0' }).page).toBe(1);
  });

  it('clamps limit to minimum of 1', () => {
    expect(parsePaginationParams({ limit: '0' }).limit).toBe(1);
  });
});

describe('buildPaginationMeta', () => {
  it('builds correct metadata for first page', () => {
    expect(buildPaginationMeta(1, 20, 145)).toEqual({
      page: 1,
      limit: 20,
      total: 145,
      totalPages: 8,
      hasNext: true,
      hasPrev: false,
    });
  });

  it('builds correct metadata for last page', () => {
    expect(buildPaginationMeta(8, 20, 145)).toEqual({
      page: 8,
      limit: 20,
      total: 145,
      totalPages: 8,
      hasNext: false,
      hasPrev: true,
    });
  });

  it('handles empty result set', () => {
    expect(buildPaginationMeta(1, 20, 0)).toEqual({
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 0,
      hasNext: false,
      hasPrev: false,
    });
  });
});
