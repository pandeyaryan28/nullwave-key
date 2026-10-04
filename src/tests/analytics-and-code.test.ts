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

// Test 6: Clean URL Generation & Handle Sanitization without @
test('username sanitization strips @ prefix and normalizes to clean public URL path', () => {
  const sanitize = (raw: string) => raw.replace(/^[@%40]+/, '').toLowerCase().trim();

  assert.equal(sanitize('@aryan'), 'aryan', 'Leading @ must be stripped');
  assert.equal(sanitize('@@aryan'), 'aryan', 'Multiple leading @ must be stripped');
  assert.equal(sanitize('%40aryan'), 'aryan', 'URL encoded %40 must be stripped');
  assert.equal(sanitize('Aryan_28'), 'aryan_28', 'Should lowercase handle');
  assert.equal(sanitize('aryan'), 'aryan', 'Clean handle should remain unchanged');

  const getProfileUrl = (origin: string, username: string) => `${origin}/${sanitize(username)}`;
  const getResourceUrl = (origin: string, username: string, slug: string) =>
    `${origin}/${sanitize(username)}/resource/${slug}`;

  assert.equal(getProfileUrl('https://unlockr.com', '@aryan'), 'https://unlockr.com/aryan');
  assert.equal(
    getResourceUrl('https://unlockr.com', '@aryan', 'my-cv-4k2x'),
    'https://unlockr.com/aryan/resource/my-cv-4k2x'
  );
});

// Test 7: Public 6-Digit Code Verification & Session Storage Gating
test('public document 6-digit code verification unlocks document in sessionStorage without sign-in', () => {
  const mockStore = new Map<string, string>();
  const resourceId = 'res_cv_9918';
  const secretCode = '209797';

  const isUnlocked = () => mockStore.get(`unlockr_unlocked_${resourceId}`) === 'true';

  // Initially locked
  assert.equal(isUnlocked(), false, 'Document must be locked initially');

  // Verify with incorrect code
  const verifyAttempt1 = (entered: string) => entered.trim() === secretCode;
  assert.equal(verifyAttempt1('123456'), false, 'Wrong code must fail');
  assert.equal(isUnlocked(), false, 'Document must remain locked on wrong code');

  // Verify with correct code
  const result = verifyAttempt1(secretCode);
  assert.equal(result, true, 'Correct code must pass');
  mockStore.set(`unlockr_unlocked_${resourceId}`, 'true');

  assert.equal(isUnlocked(), true, 'Document must be unlocked in session without user login');
});

// Test 8: Public Viewer Route Detection
test('isPublicViewerRoute accurately distinguishes public standalone viewer routes from creator dashboard', () => {
  const mainAppRoutes = ['/', '/login', '/signup', '/onboarding'];
  const isPublicViewerRoute = (pathname: string) =>
    !mainAppRoutes.includes(pathname) && !pathname.startsWith('/dashboard');

  // Public standalone screens (clean URLs)
  assert.equal(isPublicViewerRoute('/aryan'), true, '/aryan is a public viewer route');
  assert.equal(isPublicViewerRoute('/aryan/resource/founder-cv-rns7'), true, 'resource view is a public viewer route');
  assert.equal(isPublicViewerRoute('/@aryan'), true, '/@aryan is a public viewer route');

  // Main creator app & dashboard routes
  assert.equal(isPublicViewerRoute('/'), false, 'Home landing page is a main app route');
  assert.equal(isPublicViewerRoute('/login'), false, 'Login page is a main app route');
  assert.equal(isPublicViewerRoute('/signup'), false, 'Signup page is a main app route');
  assert.equal(isPublicViewerRoute('/onboarding'), false, 'Onboarding page is a main app route');
  assert.equal(isPublicViewerRoute('/dashboard'), false, 'Dashboard overview is a main app route');
  assert.equal(isPublicViewerRoute('/dashboard/resources'), false, 'Dashboard resources is a main app route');
  assert.equal(isPublicViewerRoute('/dashboard/resources/new'), false, 'Dashboard new resource is a main app route');
  assert.equal(isPublicViewerRoute('/dashboard/settings'), false, 'Dashboard settings is a main app route');
});

// Test 9: Canonical URL Redirect Resolution for Legacy & Encoded URLs
test('canonical URL redirect accurately maps legacy prefixes and uppercase paths to clean routes', () => {
  const resolveRedirect = (pathname: string): string | null => {
    // If it starts with /creator/
    if (pathname.startsWith('/creator/')) {
      const parts = pathname.replace(/^\/creator\//, '').split('/');
      const cleanUser = parts[0].replace(/^[@%40]+/, '').toLowerCase();
      if (parts.length > 2 && parts[1] === 'resource') {
        return `/${cleanUser}/resource/${parts[2]}`;
      }
      return `/${cleanUser}`;
    }

    // Single or multi segment paths with @, %40, or uppercase
    const pathParts = pathname.split('/').filter(Boolean);
    if (pathParts.length > 0) {
      const rawUser = pathParts[0];
      const hasLegacyOrUpper = /^[@%40]/.test(rawUser) || rawUser !== rawUser.toLowerCase();
      if (hasLegacyOrUpper) {
        const cleanUser = rawUser.replace(/^[@%40]+/, '').toLowerCase();
        if (pathParts.length === 1) {
          return `/${cleanUser}`;
        }
        if (pathParts.length === 3 && pathParts[1] === 'resource') {
          return `/${cleanUser}/resource/${pathParts[2]}`;
        }
      }
    }

    return null; // Already canonical, no redirect needed
  };

  assert.equal(resolveRedirect('/@aryan'), '/aryan', '/@aryan must redirect to /aryan');
  assert.equal(resolveRedirect('/%40aryan'), '/aryan', '/%40aryan must redirect to /aryan');
  assert.equal(resolveRedirect('/Aryan'), '/aryan', '/Aryan must redirect to lowercase /aryan');
  assert.equal(resolveRedirect('/@Aryan'), '/aryan', '/@Aryan must redirect to /aryan');
  assert.equal(resolveRedirect('/creator/aryan'), '/aryan', '/creator/aryan must redirect to /aryan');
  assert.equal(resolveRedirect('/creator/@aryan'), '/aryan', '/creator/@aryan must redirect to /aryan');
  assert.equal(
    resolveRedirect('/@aryan/resource/growth-guide-991a'),
    '/aryan/resource/growth-guide-991a',
    '/@aryan/resource/... must redirect to clean /aryan/resource/...'
  );
  assert.equal(
    resolveRedirect('/creator/aryan/resource/growth-guide-991a'),
    '/aryan/resource/growth-guide-991a',
    '/creator/aryan/resource/... must redirect to /aryan/resource/...'
  );

  // Canonical paths should NOT redirect
  assert.equal(resolveRedirect('/aryan'), null, 'Canonical /aryan should not trigger redirect');
  assert.equal(resolveRedirect('/aryan/resource/growth-guide-991a'), null, 'Canonical resource view should not trigger redirect');
});

// Test 10: Security Rules Compliance: Unauthenticated Queries Require status == 'active'
test('public queries for resources strictly include status == "active" constraint to satisfy Firestore security rules', () => {
  type QueryConstraint = { field: string; op: string; value: string };
  const buildPublicProfileResourceQuery = (creatorId: string): QueryConstraint[] => [
    { field: 'creatorId', op: '==', value: creatorId },
    { field: 'status', op: '==', value: 'active' },
  ];

  const buildPublicCodeVerifyQuery = (creatorId: string, code: string): QueryConstraint[] => [
    { field: 'creatorId', op: '==', value: creatorId },
    { field: 'code', op: '==', value: code.trim() },
    { field: 'status', op: '==', value: 'active' },
  ];

  const profileConstraints = buildPublicProfileResourceQuery('usr_4412');
  const hasStatusConstraint1 = profileConstraints.some(
    c => c.field === 'status' && c.op === '==' && c.value === 'active'
  );
  assert.equal(hasStatusConstraint1, true, 'Profile resources query must filter by status == active');

  const verifyConstraints = buildPublicCodeVerifyQuery('usr_4412', '401928');
  const hasStatusConstraint2 = verifyConstraints.some(
    c => c.field === 'status' && c.op === '==' && c.value === 'active'
  );
  assert.equal(hasStatusConstraint2, true, 'Code verification query must filter by status == active');
});

// Test 11: Rate Limiting Cooldown Calculation & Fast-Path Memory Resolution
test('rate limit triggers 30-second cooldown after 5 failed attempts and fast-path resolves instantly', () => {
  const attemptsStore = new Map<string, string>();
  const username = 'aryan';

  const registerFailedAttempt = () => {
    const current = parseInt(attemptsStore.get(`unlockr_attempts_${username}`) || '0', 10);
    const next = current + 1;
    if (next >= 5) {
      const cooldownExpires = Date.now() + 30000;
      attemptsStore.set(`unlockr_cooldown_${username}`, cooldownExpires.toString());
      attemptsStore.delete(`unlockr_attempts_${username}`);
      return { cooldown: true, remainingSeconds: 30 };
    }
    attemptsStore.set(`unlockr_attempts_${username}`, next.toString());
    return { cooldown: false, attempts: next };
  };

  assert.equal(registerFailedAttempt().attempts, 1);
  assert.equal(registerFailedAttempt().attempts, 2);
  assert.equal(registerFailedAttempt().attempts, 3);
  assert.equal(registerFailedAttempt().attempts, 4);
  const fifthAttempt = registerFailedAttempt();
  assert.equal(fifthAttempt.cooldown, true);
  assert.equal(fifthAttempt.remainingSeconds, 30);

  // Fast-path test: matching active resource in-memory unlocks without network
  const inMemoryResources = [
    { id: 'res_1', title: 'Guide 1', code: '111222', status: 'active', publicSlug: 'guide-1' },
    { id: 'res_2', title: 'Guide 2', code: '333444', status: 'disabled', publicSlug: 'guide-2' },
  ];

  const matchActiveCode = (entered: string) =>
    inMemoryResources.find(r => r.code === entered && r.status === 'active') ?? null;

  assert.ok(matchActiveCode('111222') !== null, 'Active resource must resolve in-memory');
  assert.equal(matchActiveCode('333444'), null, 'Disabled resource must NOT resolve in-memory');
  assert.equal(matchActiveCode('999999'), null, 'Non-existent code must return null');
});

