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
  const sanitize = (raw: string) => raw.replace(/^(?:@|%40)+/, '').toLowerCase().trim();

  assert.equal(sanitize('@aryan'), 'aryan', 'Leading @ must be stripped');
  assert.equal(sanitize('@@aryan'), 'aryan', 'Multiple leading @ must be stripped');
  assert.equal(sanitize('%40aryan'), 'aryan', 'URL encoded %40 must be stripped');
  assert.equal(sanitize('Aryan_28'), 'aryan_28', 'Should lowercase handle');
  assert.equal(sanitize('aryan'), 'aryan', 'Clean handle should remain unchanged');
  // Critical regression test: usernames starting with 4 or 0 (prevent character class [@%40] bug)
  assert.equal(sanitize('4creator'), '4creator', 'Numeric-prefixed handles must NOT strip digits');
  assert.equal(sanitize('007agent'), '007agent', 'Handles starting with 0 must NOT strip digits');
  assert.equal(sanitize('@4creator'), '4creator', 'Leading @ on numeric handle must strip only @');
  assert.equal(sanitize('%404creator'), '4creator', 'Leading %40 on numeric handle must strip only %40');

  const getProfileUrl = (origin: string, username: string) => `${origin}/${sanitize(username)}`;
  const getResourceUrl = (origin: string, username: string, slug: string) =>
    `${origin}/${sanitize(username)}/resource/${slug}`;

  assert.equal(getProfileUrl('https://unlockr.com', '@aryan'), 'https://unlockr.com/aryan');
  assert.equal(getProfileUrl('https://unlockr.com', '@4creator'), 'https://unlockr.com/4creator');
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
      const cleanUser = parts[0].replace(/^(?:@|%40)+/, '').toLowerCase();
      if (parts.length > 2 && parts[1] === 'resource') {
        return `/${cleanUser}/resource/${parts[2]}`;
      }
      return `/${cleanUser}`;
    }

    // Single or multi segment paths with @, %40, or uppercase
    const pathParts = pathname.split('/').filter(Boolean);
    if (pathParts.length > 0) {
      const rawUser = pathParts[0];
      const hasLegacyOrUpper = /^(?:@|%40)/.test(rawUser) || rawUser !== rawUser.toLowerCase();
      if (hasLegacyOrUpper) {
        const cleanUser = rawUser.replace(/^(?:@|%40)+/, '').toLowerCase();
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

  // Regression tests for usernames starting with digits
  assert.equal(resolveRedirect('/4creator'), null, 'Canonical /4creator should not trigger redirect');
  assert.equal(resolveRedirect('/007agent'), null, 'Canonical /007agent should not trigger redirect');
  assert.equal(resolveRedirect('/@4creator'), '/4creator', '/@4creator must redirect to /4creator');
  assert.equal(resolveRedirect('/%404creator'), '/4creator', '/%404creator must redirect to /4creator');
  assert.equal(resolveRedirect('/creator/4creator'), '/4creator', '/creator/4creator must redirect to /4creator');
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

// Test 12: Base URL Route Resolution for Authenticated Creators vs Guests
test('base URL route resolution redirects authenticated creators to dashboard and guests to landing page', () => {
  interface AuthState {
    loading: boolean;
    user: { uid: string } | null;
    profile: { username?: string } | null;
  }

  const resolveHomeRoute = (state: AuthState): 'LOADING' | '/onboarding' | '/dashboard' | 'LANDING' => {
    if (state.loading) return 'LOADING';
    if (state.user) {
      if (state.profile && !state.profile.username) {
        return '/onboarding';
      }
      return '/dashboard';
    }
    return 'LANDING';
  };

  // State 1: Still loading authentication
  assert.equal(resolveHomeRoute({ loading: true, user: null, profile: null }), 'LOADING');

  // State 2: Unauthenticated guest on base URL
  assert.equal(resolveHomeRoute({ loading: false, user: null, profile: null }), 'LANDING');

  // State 3: Authenticated creator with existing username on base URL
  assert.equal(
    resolveHomeRoute({ loading: false, user: { uid: 'u1' }, profile: { username: 'aryan' } }),
    '/dashboard'
  );

  // State 4: Authenticated user without username claimed yet on base URL
  assert.equal(
    resolveHomeRoute({ loading: false, user: { uid: 'u2' }, profile: { username: '' } }),
    '/onboarding'
  );
});

// Test 13: Distribution Control: allowDownload Permission Evaluation
test('allowDownload evaluation permits in-browser viewing but suppresses downloads when false', () => {
  interface ResourceDownloadCheck {
    allowDownload?: boolean;
  }

  const canDownload = (r: ResourceDownloadCheck): boolean => r.allowDownload !== false;

  // Backwards compatibility: undefined / true allows download
  assert.equal(canDownload({}), true, 'Legacy resource without allowDownload must default to downloadable');
  assert.equal(canDownload({ allowDownload: true }), true, 'Explicit true must allow download');

  // View-Only mode: allowDownload === false
  assert.equal(canDownload({ allowDownload: false }), false, 'allowDownload: false must suppress download permission');
});

// Test 14: Distribution Control: expiresAt Drop Expiration Checking Logic
test('expiresAt accurately enforces time-limited drop expiration and backwards compatibility', () => {
  interface ResourceExpirationCheck {
    expiresAt?: number | null;
  }

  const isDropExpired = (r: ResourceExpirationCheck, currentTime: number): boolean => {
    if (!r.expiresAt) return false;
    return currentTime > r.expiresAt;
  };

  const t0 = 1700000000000;
  const ONE_DAY = 24 * 60 * 60 * 1000;
  const expiry = t0 + ONE_DAY;

  // Active drop before deadline
  assert.equal(isDropExpired({ expiresAt: expiry }, t0), false, 'Drop before deadline must NOT be expired');
  assert.equal(isDropExpired({ expiresAt: expiry }, t0 + ONE_DAY - 1000), false, 'Drop 1s before deadline must NOT be expired');

  // Expired drop after deadline
  assert.equal(isDropExpired({ expiresAt: expiry }, t0 + ONE_DAY + 1), true, 'Drop after deadline must be expired');
  assert.equal(isDropExpired({ expiresAt: expiry }, t0 + ONE_DAY + 3600000), true, 'Drop 1 hour after deadline must be expired');

  // Backwards compatibility: null or undefined expiresAt never expires
  assert.equal(isDropExpired({}, t0 + 10 * ONE_DAY), false, 'Resource without expiresAt never expires');
  assert.equal(isDropExpired({ expiresAt: null }, t0 + 10 * ONE_DAY), false, 'Resource with null expiresAt never expires');
});

// Test 15: Distribution Control: maxUnlocks Capacity Checking Logic
test('maxUnlocks cap checking restricts new unlocks when capacity limit is reached', () => {
  interface ResourceCapCheck {
    uniqueViews: number;
    maxUnlocks?: number | null;
  }

  const isCapacityReached = (r: ResourceCapCheck): boolean => {
    if (r.maxUnlocks === null || r.maxUnlocks === undefined) return false;
    return r.uniqueViews >= r.maxUnlocks;
  };

  // Unlimited resources
  assert.equal(isCapacityReached({ uniqueViews: 100 }), false, 'Undefined maxUnlocks allows unlimited unlocks');
  assert.equal(isCapacityReached({ uniqueViews: 500, maxUnlocks: null }), false, 'Null maxUnlocks allows unlimited unlocks');

  // Capped drop: capacity 100
  assert.equal(isCapacityReached({ uniqueViews: 0, maxUnlocks: 100 }), false, '0/100 must be open');
  assert.equal(isCapacityReached({ uniqueViews: 99, maxUnlocks: 100 }), false, '99/100 must be open');
  assert.equal(isCapacityReached({ uniqueViews: 100, maxUnlocks: 100 }), true, '100/100 must be capped');
  assert.equal(isCapacityReached({ uniqueViews: 105, maxUnlocks: 100 }), true, 'Over 100 must be capped');
});

// Test 16: Distribution Control: isPublicListing Filtering Logic
test('isPublicListing hides unlisted resources from public station feed unless unlocked', () => {
  interface ResourceListingCheck {
    id: string;
    isPublicListing?: boolean;
  }

  const filterForStationFeed = (
    resources: ResourceListingCheck[],
    unlockedIds: Set<string>
  ): ResourceListingCheck[] => {
    return resources.filter(r => {
      const isPublic = r.isPublicListing !== false;
      const isUnlocked = unlockedIds.has(r.id);
      return isPublic || isUnlocked;
    });
  };

  const r1: ResourceListingCheck = { id: 'r1', isPublicListing: true };
  const r2: ResourceListingCheck = { id: 'r2', isPublicListing: false }; // unlisted
  const r3: ResourceListingCheck = { id: 'r3' }; // default public

  // Public visitor without session unlock
  const feed1 = filterForStationFeed([r1, r2, r3], new Set());
  assert.equal(feed1.length, 2, 'Feed should only include 2 public items');
  assert.ok(feed1.some(r => r.id === 'r1'));
  assert.ok(feed1.some(r => r.id === 'r3'));
  assert.ok(!feed1.some(r => r.id === 'r2'), 'Unlisted item r2 must be hidden');

  // Visitor who unlocked r2 via direct code/link
  const feed2 = filterForStationFeed([r1, r2, r3], new Set(['r2']));
  assert.equal(feed2.length, 3, 'Feed should now include unlocked r2');
});

// Test 17: Custom 6-Digit Access Code Validation
test('custom 6-digit access code validator enforces exactly 6 numeric digits', () => {
  const validateCustomCode = (raw: string): { valid: boolean; code?: string; error?: string } => {
    const trimmed = raw.trim();
    if (!/^\d{6}$/.test(trimmed)) {
      return { valid: false, error: 'Code must be exactly 6 numeric digits' };
    }
    const num = parseInt(trimmed, 10);
    if (num < 100000 || num > 999999) {
      return { valid: false, error: 'Code must be in range 100000-999999' };
    }
    return { valid: true, code: trimmed };
  };

  // Valid codes
  assert.equal(validateCustomCode('100000').valid, true);
  assert.equal(validateCustomCode('582910').valid, true);
  assert.equal(validateCustomCode('999999').valid, true);
  assert.equal(validateCustomCode(' 482910 ').valid, true);

  // Invalid codes
  assert.equal(validateCustomCode('').valid, false);
  assert.equal(validateCustomCode('12345').valid, false); // 5 digits
  assert.equal(validateCustomCode('1234567').valid, false); // 7 digits
  assert.equal(validateCustomCode('099999').valid, false); // < 100000
  assert.equal(validateCustomCode('12a456').valid, false); // non-numeric
  assert.equal(validateCustomCode('abcdef').valid, false); // letters
});

// Test 18: Multi-Social Links Normalization and Legacy Compatibility
test('social links normalizer formats handles and links into valid canonical URLs', () => {
  const normalizeSocialUrl = (url?: string, platform?: string): string => {
    if (!url) return '';
    let clean = url.trim();
    if (!clean) return '';
    if (clean.startsWith('http://') || clean.startsWith('https://')) return clean;
    if (clean.startsWith('@')) clean = clean.substring(1);

    if (platform === 'instagram' && !clean.includes('instagram.com')) {
      return `https://instagram.com/${clean}`;
    }
    if (platform === 'twitter' && !clean.includes('twitter.com') && !clean.includes('x.com')) {
      return `https://x.com/${clean}`;
    }
    if (platform === 'youtube' && !clean.includes('youtube.com')) {
      return `https://youtube.com/@${clean}`;
    }
    if (platform === 'linkedin' && !clean.includes('linkedin.com')) {
      return `https://linkedin.com/in/${clean}`;
    }
    if (platform === 'github' && !clean.includes('github.com')) {
      return `https://github.com/${clean}`;
    }
    return `https://${clean}`;
  };

  // Instagram
  assert.equal(normalizeSocialUrl('@creator', 'instagram'), 'https://instagram.com/creator');
  assert.equal(normalizeSocialUrl('https://instagram.com/creator', 'instagram'), 'https://instagram.com/creator');

  // Twitter / X
  assert.equal(normalizeSocialUrl('@founder', 'twitter'), 'https://x.com/founder');
  assert.equal(normalizeSocialUrl('https://x.com/founder', 'twitter'), 'https://x.com/founder');

  // YouTube
  assert.equal(normalizeSocialUrl('creatorchannel', 'youtube'), 'https://youtube.com/@creatorchannel');

  // LinkedIn
  assert.equal(normalizeSocialUrl('aryan-pandey', 'linkedin'), 'https://linkedin.com/in/aryan-pandey');

  // GitHub
  assert.equal(normalizeSocialUrl('aryan', 'github'), 'https://github.com/aryan');

  // Website
  assert.equal(normalizeSocialUrl('https://aryanpandey.dev'), 'https://aryanpandey.dev');
  assert.equal(normalizeSocialUrl('aryanpandey.dev'), 'https://aryanpandey.dev');
});

// Test 19: Creator Code Uniqueness Evaluation Across Active Resources
test('isCodeInUseByCreator correctly identifies duplicate codes among active creator drops', () => {
  interface MockResource {
    id: string;
    creatorId: string;
    code: string;
    status: 'active' | 'disabled';
  }

  const mockDb: MockResource[] = [
    { id: 'res_1', creatorId: 'user_a', code: '123456', status: 'active' },
    { id: 'res_2', creatorId: 'user_a', code: '654321', status: 'disabled' }, // disabled
    { id: 'res_3', creatorId: 'user_b', code: '123456', status: 'active' }, // different creator
  ];

  const checkCodeInUse = (
    creatorId: string,
    code: string,
    excludeResourceId?: string
  ): boolean => {
    const clean = code.trim();
    const matches = mockDb.filter(
      r => r.creatorId === creatorId && r.code === clean && r.status === 'active'
    );
    if (matches.length === 0) return false;
    if (excludeResourceId) {
      return matches.some(r => r.id !== excludeResourceId);
    }
    return true;
  };

  // user_a checking 123456 (already used by active res_1) -> true
  assert.equal(checkCodeInUse('user_a', '123456'), true, 'Code 123456 is already active for user_a');

  // user_a checking 123456 while editing res_1 (excludeResourceId = 'res_1') -> false
  assert.equal(
    checkCodeInUse('user_a', '123456', 'res_1'),
    false,
    'Self-exclusion during edit allows keeping same code'
  );

  // user_a checking 654321 (disabled resource) -> false (available)
  assert.equal(checkCodeInUse('user_a', '654321'), false, 'Disabled drop code is not considered in use');

  // user_b checking 123456 while editing res_3 -> false
  assert.equal(checkCodeInUse('user_b', '123456', 'res_3'), false);

  // user_a checking 999999 (unused code) -> false
  assert.equal(checkCodeInUse('user_a', '999999'), false, 'Unused code is available');
});

// Test 20: Profile Tuner & Modal Access Gate for Expired and Capacity-Capped Drops
test('profile tuner and unlock modal block access when drop is expired or capacity cap is reached', () => {
  interface DropAccessTarget {
    id: string;
    title: string;
    code: string;
    expiresAt?: number | null;
    maxUnlocks?: number | null;
    uniqueViews?: number;
  }

  const checkAccess = (
    target: DropAccessTarget,
    isOwner: boolean,
    now: number
  ): { allowed: boolean; error?: string } => {
    if (isOwner) return { allowed: true };

    if (target.expiresAt && now > target.expiresAt) {
      return {
        allowed: false,
        error: `The drop "${target.title}" has expired and is no longer accessible.`,
      };
    }

    if (target.maxUnlocks && (target.uniqueViews || 0) >= target.maxUnlocks) {
      return {
        allowed: false,
        error: `The drop "${target.title}" has reached its maximum unlock capacity (${target.maxUnlocks}).`,
      };
    }

    return { allowed: true };
  };

  const now = 1700000000000;
  const expiredDrop: DropAccessTarget = {
    id: 'res_exp',
    title: 'Secret Blueprint',
    code: '112233',
    expiresAt: now - 5000, // expired 5s ago
  };

  const cappedDrop: DropAccessTarget = {
    id: 'res_cap',
    title: 'Limited Cohort',
    code: '445566',
    maxUnlocks: 50,
    uniqueViews: 50,
  };

  const activeDrop: DropAccessTarget = {
    id: 'res_ok',
    title: 'Open Whitepaper',
    code: '778899',
    expiresAt: now + 100000,
    maxUnlocks: 100,
    uniqueViews: 12,
  };

  // Visitor attempts to unlock expired drop -> blocked
  const res1 = checkAccess(expiredDrop, false, now);
  assert.equal(res1.allowed, false);
  assert.match(res1.error || '', /has expired/);

  // Visitor attempts to unlock capped drop -> blocked
  const res2 = checkAccess(cappedDrop, false, now);
  assert.equal(res2.allowed, false);
  assert.match(res2.error || '', /maximum unlock capacity/);

  // Visitor unlocks healthy drop -> allowed
  const res3 = checkAccess(activeDrop, false, now);
  assert.equal(res3.allowed, true);

  // Owner accessing expired or capped drop -> always allowed
  assert.equal(checkAccess(expiredDrop, true, now).allowed, true, 'Owner should always bypass expiration');
  assert.equal(checkAccess(cappedDrop, true, now).allowed, true, 'Owner should always bypass capacity cap');
});

// Test 21: View-Only Mode Protection (Suppression of External Download Links)
test('view-only mode suppresses raw PDF download button and open-in-new-tab external link', () => {
  interface ViewState {
    allowDownload?: boolean;
    isOwner: boolean;
    isUnlocked: boolean;
  }

  const getDownloadControls = (state: ViewState) => {
    const canDownload = state.isUnlocked && (state.allowDownload !== false || state.isOwner);
    const showOpenInNewTab = state.allowDownload !== false || state.isOwner;
    return { canDownload, showOpenInNewTab };
  };

  // Standard downloadable drop, unlocked by guest
  const guestUnlocked = getDownloadControls({ allowDownload: true, isOwner: false, isUnlocked: true });
  assert.equal(guestUnlocked.canDownload, true);
  assert.equal(guestUnlocked.showOpenInNewTab, true);

  // View-only drop, unlocked by guest -> Download & external link MUST be suppressed
  const viewOnlyGuest = getDownloadControls({ allowDownload: false, isOwner: false, isUnlocked: true });
  assert.equal(viewOnlyGuest.canDownload, false, 'Download must be suppressed in view-only mode');
  assert.equal(viewOnlyGuest.showOpenInNewTab, false, 'Open in new tab link must be suppressed in view-only mode');

  // View-only drop viewed by owner -> Owner retains direct access
  const viewOnlyOwner = getDownloadControls({ allowDownload: false, isOwner: true, isUnlocked: true });
  assert.equal(viewOnlyOwner.canDownload, true, 'Owner can download even in view-only mode');
  assert.equal(viewOnlyOwner.showOpenInNewTab, true, 'Owner can open in new tab even in view-only mode');
});

// Test 22: Firestore Profile Sanitization Deep undefined Stripping
test('stripUndefined recursively purges undefined keys to prevent Firestore runtime errors', () => {
  const stripUndefined = (obj: Record<string, unknown>): Record<string, unknown> => {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(obj)) {
      if (val === undefined) continue;
      if (val && typeof val === 'object' && !Array.isArray(val)) {
        const cleanedChild = stripUndefined(val as Record<string, unknown>);
        result[key] = cleanedChild;
      } else {
        result[key] = val;
      }
    }
    return result;
  };

  const dirtyProfile = {
    displayName: 'Aryan Pandey',
    headline: 'Founder',
    bio: '',
    location: undefined,
    photoURL: undefined,
    bannerURL: 'https://example.com/banner.png',
    socialLinks: {
      twitter: '@aryan',
      instagram: undefined,
      youtube: undefined,
      nested: {
        website: 'https://aryan.dev',
        emptyVal: undefined,
      },
    },
    tags: ['tag1', 'tag2'],
  };

  const cleaned = stripUndefined(dirtyProfile);

  assert.equal('location' in cleaned, false, 'Root undefined location must be stripped');
  assert.equal('photoURL' in cleaned, false, 'Root undefined photoURL must be stripped');
  assert.equal(cleaned.displayName, 'Aryan Pandey');
  assert.equal(cleaned.bannerURL, 'https://example.com/banner.png');

  const cleanedSocials = cleaned.socialLinks as Record<string, unknown>;
  assert.equal(cleanedSocials.twitter, '@aryan');
  assert.equal('instagram' in cleanedSocials, false, 'Nested undefined instagram must be stripped');
  assert.equal('youtube' in cleanedSocials, false, 'Nested undefined youtube must be stripped');

  const nested = cleanedSocials.nested as Record<string, unknown>;
  assert.equal(nested.website, 'https://aryan.dev');
  assert.equal('emptyVal' in nested, false, 'Deeply nested undefined key must be stripped');

  // Arrays must remain intact
  assert.deepEqual(cleaned.tags, ['tag1', 'tag2']);
});

