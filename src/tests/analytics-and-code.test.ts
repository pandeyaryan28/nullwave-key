import test from 'node:test';
import assert from 'node:assert/strict';
import { generateSixDigitCode } from '../lib/utils/codeGenerator.ts';
import { generatePublicSlug } from '../lib/utils/slugify.ts';
import { evaluateUniquenessWindow, type StorageLike } from '../lib/analytics/tracker.ts';
import { MAX_PDF_SIZE_BYTES, MAX_IMAGE_SIZE_BYTES } from '../lib/storage/storageService.ts';

// Test 1: Real Production 6-Digit Code Generator
test('generateSixDigitCode produces valid 6-digit numeric strings in range 100000-999999', () => {
  const codes = new Set<string>();
  for (let i = 0; i < 100; i++) {
    const code = generateSixDigitCode();
    assert.equal(code.length, 6, 'Code must be exactly 6 digits');
    assert.match(code, /^\d{6}$/, 'Code must contain only numeric digits');
    const num = parseInt(code, 10);
    assert.ok(num >= 100000 && num <= 999999, 'Code must be >= 100000 and <= 999999');
    codes.add(code);
  }
  // Across 100 generations, we should have high entropy (at least 90 distinct codes)
  assert.ok(codes.size >= 90, 'Codes should exhibit high cryptographic entropy');
});

// Test 2: Real Production Slug Generator
test('generatePublicSlug generates safe URL slug without database ID and cleans .pdf extension', () => {
  // Test stripping .pdf from title
  const slugWithPdf = generatePublicSlug('The Ultimate Startup GTM Guide.pdf');
  assert.ok(
    slugWithPdf.startsWith('the-ultimate-startup-gtm-guide-'),
    `Slug should strip trailing .pdf; got: ${slugWithPdf}`
  );
  assert.ok(
    !slugWithPdf.includes('guidepdf'),
    'Slug should not concatenate "guidepdf"'
  );

  // Test special characters & spacing
  const slugSpecial = generatePublicSlug('  Startup Playbook & Cheatsheet: 2026!  ');
  assert.ok(
    slugSpecial.startsWith('startup-playbook-cheatsheet-2026-'),
    `Slug should handle symbols properly; got: ${slugSpecial}`
  );

  // Test fallback on empty title
  const slugEmpty = generatePublicSlug('');
  assert.ok(
    slugEmpty.startsWith('resource-'),
    `Slug should default to "resource-" for empty title; got: ${slugEmpty}`
  );

  // Test 4-character suffix length
  const parts = slugWithPdf.split('-');
  const suffix = parts[parts.length - 1];
  assert.equal(suffix.length, 4, 'Suffix must be guaranteed 4 characters');
  assert.match(suffix, /^[a-z0-9]{4}$/, 'Suffix must be alphanumeric lowercase');
});

// Test 3: Real Production 24-Hour Analytics Uniqueness Window & Rollback
test('evaluateUniquenessWindow accurately enforces 24h uniqueness window and commit/rollback', () => {
  const mockStore = new Map<string, string>();
  const mockStorage: StorageLike = {
    getItem: (key: string) => mockStore.get(key) ?? null,
    setItem: (key: string, value: string) => mockStore.set(key, value),
    removeItem: (key: string) => mockStore.delete(key),
  };

  const resourceId = 'res_test_8829';
  const t0 = 1700000000000;
  const ONE_HOUR = 60 * 60 * 1000;
  const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

  // Visit 1: Brand new visitor
  const eval1 = evaluateUniquenessWindow(resourceId, t0, mockStorage);
  assert.equal(eval1.isUnique, true, 'First visit must be unique');
  // Commit visit 1
  eval1.commit();

  // Visit 2: 1 hour later (within 24h window)
  const eval2 = evaluateUniquenessWindow(resourceId, t0 + ONE_HOUR, mockStorage);
  assert.equal(eval2.isUnique, false, 'Visit at +1h must NOT be unique (repeat view)');

  // Visit 3: 23 hours and 59 minutes later (still within 24h window)
  const eval3 = evaluateUniquenessWindow(resourceId, t0 + TWENTY_FOUR_HOURS - 60000, mockStorage);
  assert.equal(eval3.isUnique, false, 'Visit at +23h59m must NOT be unique');

  // Visit 4: 24 hours + 10 seconds later (new measurement window)
  const eval4 = evaluateUniquenessWindow(resourceId, t0 + TWENTY_FOUR_HOURS + 10000, mockStorage);
  assert.equal(eval4.isUnique, true, 'Visit after 24 hours must be counted as a new unique view');

  // Test rollback: if the network request fails, rollback restores the previous timestamp
  const previousStored = mockStorage.getItem(`unlockr_viewed_${resourceId}`);
  eval4.commit();
  eval4.rollback();
  assert.equal(
    mockStorage.getItem(`unlockr_viewed_${resourceId}`),
    previousStored,
    'Rollback should restore the previous timestamp if recording fails'
  );
});

// Test 4: Username Constraints (Section 2 of Build Brief)
test('username regex enforces lowercase alphanumeric + underscore between 3-20 chars', () => {
  const usernameRegex = /^[a-z0-9_]{3,20}$/;

  const validUsernames = ['aryan', 'aryan_28', 'creator_1', 'the_founder_2026', 'abc'];
  for (const u of validUsernames) {
    assert.ok(usernameRegex.test(u), `Username "${u}" should be valid`);
  }

  const invalidUsernames = [
    'ab', // too short (<3)
    'a'.repeat(21), // too long (>20)
    'Aryan', // contains uppercase
    'aryan-28', // dashes not allowed
    'aryan.pandey', // periods not allowed
    'aryan 28', // spaces not allowed
    'aryan@creator', // special characters not allowed
  ];
  for (const u of invalidUsernames) {
    assert.ok(!usernameRegex.test(u), `Username "${u}" should be invalid`);
  }
});

// Test 5: Storage Constants & Ceilings (Section 13 of Build Brief)
test('storage limits enforce reasonable 25MB PDF ceiling and 5MB cover ceiling', () => {
  assert.equal(MAX_PDF_SIZE_BYTES, 25 * 1024 * 1024, 'PDF limit must be exactly 25MB');
  assert.equal(MAX_IMAGE_SIZE_BYTES, 5 * 1024 * 1024, 'Image limit must be exactly 5MB');
});
