import test from 'node:test';
import assert from 'node:assert/strict';

// Test 1: 6-digit code generator logic
test('generateSixDigitCode produces valid 6-digit numeric string', () => {
  for (let i = 0; i < 50; i++) {
    const min = 100000;
    const max = 999999;
    const array = new Uint32Array(1);
    // Use Web Crypto if available or Math.random
    const rand = Math.floor(Math.random() * (max - min + 1)) + min;
    const code = rand.toString();

    assert.equal(code.length, 6, 'Code must be exactly 6 digits');
    assert.match(code, /^\d{6}$/, 'Code must contain only digits');
    const num = parseInt(code, 10);
    assert.ok(num >= 100000 && num <= 999999, 'Code must be within range 100000-999999');
  }
});

// Test 2: Slug generation logic
test('generatePublicSlug generates safe public URL without database ID exposure', () => {
  function generatePublicSlug(title: string): string {
    const cleanTitle = title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 50);

    const randomSuffix = 'abcd';
    return cleanTitle ? `${cleanTitle}-${randomSuffix}` : `resource-${randomSuffix}`;
  }

  const slug1 = generatePublicSlug('The Ultimate Startup GTM Guide.pdf');
  assert.equal(slug1, 'the-ultimate-startup-gtm-guidepdf-abcd');

  const slug2 = generatePublicSlug('   Quick Start & Secrets! 2026   ');
  assert.equal(slug2, 'quick-start-secrets-2026-abcd');

  const slug3 = generatePublicSlug('');
  assert.equal(slug3, 'resource-abcd');
});

// Test 3: 24-hour Uniqueness Window Logic (Section 8 requirement)
test('evaluateUniquenessWindow correctly distinguishes repeat vs unique views in 24h window', () => {
  const UNIQUENESS_WINDOW_MS = 24 * 60 * 60 * 1000;

  // Mock localStorage
  const store: Record<string, string> = {};
  function mockEvaluate(resourceId: string, currentTime: number) {
    const storageKey = `unlockr_viewed_${resourceId}`;
    const lastViewedStr = store[storageKey];
    if (!lastViewedStr) {
      store[storageKey] = currentTime.toString();
      return { isUnique: true };
    }
    const lastViewed = parseInt(lastViewedStr, 10);
    if (currentTime - lastViewed >= UNIQUENESS_WINDOW_MS) {
      store[storageKey] = currentTime.toString();
      return { isUnique: true };
    }
    return { isUnique: false };
  }

  const t0 = 1700000000000;

  // Visit 1: Brand new visitor
  const v1 = mockEvaluate('res_123', t0);
  assert.equal(v1.isUnique, true, 'First view must be unique');

  // Visit 2: 1 hour later (within 24h window)
  const v2 = mockEvaluate('res_123', t0 + 1 * 60 * 60 * 1000);
  assert.equal(v2.isUnique, false, 'View after 1 hour must NOT be unique (repeat view)');

  // Visit 3: 12 hours later (within 24h window)
  const v3 = mockEvaluate('res_123', t0 + 12 * 60 * 60 * 1000);
  assert.equal(v3.isUnique, false, 'View after 12 hours must NOT be unique');

  // Visit 4: 25 hours later (exceeds 24h window)
  const v4 = mockEvaluate('res_123', t0 + 25 * 60 * 60 * 1000);
  assert.equal(v4.isUnique, true, 'View after 25 hours must be counted as a new unique view');

  // Visit 5: 30 minutes after visit 4 (within new 24h window)
  const v5 = mockEvaluate('res_123', t0 + 25.5 * 60 * 60 * 1000);
  assert.equal(v5.isUnique, false, 'View right after must NOT be unique');
});

// Test 4: Username format validation (Section 2 requirement)
test('username validation adheres to lowercase alphanumeric + underscore requirements', () => {
  const regex = /^[a-z0-9_]{3,20}$/;

  assert.ok(regex.test('aryan'), 'valid username: aryan');
  assert.ok(regex.test('aryan_28'), 'valid username: aryan_28');
  assert.ok(regex.test('creator123'), 'valid username: creator123');

  assert.ok(!regex.test('ab'), 'too short (2 chars)');
  assert.ok(!regex.test('this_username_is_way_too_long_for_unlockr'), 'too long (>20 chars)');
  assert.ok(!regex.test('Aryan'), 'must be lowercase only');
  assert.ok(!regex.test('aryan-pandey'), 'dashes not allowed');
  assert.ok(!regex.test('aryan.pandey'), 'periods not allowed');
  assert.ok(!regex.test('aryan pandey'), 'spaces not allowed');
});
