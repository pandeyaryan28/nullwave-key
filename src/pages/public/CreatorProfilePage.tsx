import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link, Navigate } from 'react-router-dom';
import {
  collection,
  query,
  where,
  getDocs,
  limit,
  doc,
  getDoc,
} from 'firebase/firestore';
import { db } from '../../lib/firebase/config';
import { UserProfile, Resource } from '../../types';
import { useAuth } from '../../lib/auth/authContext';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { CodeInput } from '../../components/ui/CodeInput';
import { ThemeToggle } from '../../components/ui/ThemeToggle';
import {
  Waves,
  Radio,
  FileText,
  ArrowRight,
  Instagram,
  Twitter,
  Youtube,
  Linkedin,
  Github,
  Globe,
  MapPin,
  Calendar,
  Share2,
  Check,
  Search,
  LayoutGrid,
  List as ListIcon,
  Pin,
  Lock,
  EyeOff,
  X,
  Edit,
  Clock,
  Users,
} from 'lucide-react';

export const CreatorProfilePage: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Redirect legacy @, encoded %40, or mixed-case handles immediately to clean canonical URL
  if (username && (username !== username.toLowerCase() || /^(?:@|%40)/.test(username))) {
    const clean = username.replace(/^(?:@|%40)+/, '').toLowerCase();
    return <Navigate to={`/${clean}`} replace />;
  }

  const [creator, setCreator] = useState<UserProfile | null>(null);
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [notFound, setNotFound] = useState<boolean>(false);

  // Filter and presentation state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [copiedProfile, setCopiedProfile] = useState<boolean>(false);

  // Inline Tuner Code verification state
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [hintMessage, setHintMessage] = useState<string | null>(null);
  const [unlockedResourceIds, setUnlockedResourceIds] = useState<Set<string>>(new Set());

  // Focused Card-Click Unlock Modal state
  const [modalResource, setModalResource] = useState<Resource | null>(null);
  const [modalVerifying, setModalVerifying] = useState<boolean>(false);
  const [modalCodeError, setModalCodeError] = useState<string | null>(null);

  // Persistent abuse protection (rate limiting via sessionStorage)
  const [cooldownSeconds, setCooldownSeconds] = useState<number>(0);
  const codeCardRef = useRef<HTMLDivElement>(null);

  const cleanUsername = (username || '').replace(/^(?:@|%40)+/, '').toLowerCase();

  // Load cooldown and unlocked state
  useEffect(() => {
    if (!cleanUsername) return;

    const checkCooldown = () => {
      try {
        const stored =
          sessionStorage.getItem(`nullwave_cooldown_${cleanUsername}`) ||
          sessionStorage.getItem(`unlockr_cooldown_${cleanUsername}`);
        if (stored) {
          const expiresAt = parseInt(stored, 10);
          const remaining = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
          setCooldownSeconds(remaining);
        }
      } catch {}
    };

    checkCooldown();
    const interval = setInterval(checkCooldown, 1000);
    return () => clearInterval(interval);
  }, [cleanUsername]);

  useEffect(() => {
    // Check unlocked resources in session
    try {
      const unlocked = new Set<string>();
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key?.startsWith('nullwave_unlocked_')) {
          unlocked.add(key.replace('nullwave_unlocked_', ''));
        } else if (key?.startsWith('unlockr_unlocked_')) {
          unlocked.add(key.replace('unlockr_unlocked_', ''));
        }
      }
      setUnlockedResourceIds(unlocked);
    } catch {}
  }, []);

  useEffect(() => {
    const fetchCreatorAndResources = async () => {
      if (!cleanUsername) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        let creatorData: UserProfile | null = null;

        // 1. Query users collection by username
        const usersQuery = query(
          collection(db, 'users'),
          where('username', '==', cleanUsername),
          limit(1)
        );
        const userSnap = await getDocs(usersQuery);

        if (!userSnap.empty) {
          const userDoc = userSnap.docs[0];
          creatorData = {
            ...(userDoc.data() as UserProfile),
            uid: userDoc.id,
          };
        } else {
          // 2. Direct lookup in usernames collection
          try {
            const usernameDocRef = doc(db, 'usernames', cleanUsername);
            const usernameSnap = await getDoc(usernameDocRef);
            if (usernameSnap.exists()) {
              const uid = usernameSnap.data().uid;
              const userRef = doc(db, 'users', uid);
              const directUserSnap = await getDoc(userRef);
              if (directUserSnap.exists()) {
                creatorData = {
                  ...(directUserSnap.data() as UserProfile),
                  uid: directUserSnap.id,
                };
              }
            }
          } catch (e) {
            console.warn('Username direct lookup fallback error:', e);
          }
        }

        // 3. Check local storage fallback if not found in Firestore
        if (!creatorData) {
          try {
            const localKey = localStorage.getItem(`nullwave_profile_${cleanUsername}`)
              ? `nullwave_profile_${cleanUsername}`
              : `unlockr_profile_${cleanUsername}`;
            const localData = localStorage.getItem(localKey);
            if (localData) {
              creatorData = JSON.parse(localData);
            } else {
              for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i);
                if (k?.startsWith('nullwave_profile_') || k?.startsWith('unlockr_profile_')) {
                  const val = localStorage.getItem(k);
                  if (val) {
                    const parsed = JSON.parse(val);
                    if (parsed.username?.toLowerCase() === cleanUsername) {
                      creatorData = parsed;
                      break;
                    }
                  }
                }
              }
            }
          } catch {}
        }

        if (!creatorData || !creatorData.uid) {
          setNotFound(true);
          setLoading(false);
          return;
        }

        setCreator(creatorData);
        await fetchCreatorResources(creatorData.uid);
      } catch (err) {
        console.error('Error fetching creator profile:', err);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    fetchCreatorAndResources();
  }, [cleanUsername]);

  const fetchCreatorResources = async (creatorId: string) => {
    try {
      const resQuery = query(
        collection(db, 'resources'),
        where('creatorId', '==', creatorId),
        where('status', '==', 'active')
      );
      const resSnap = await getDocs(resQuery);
      let resList: Resource[] = resSnap.docs
        .map(d => ({ id: d.id, ...d.data() } as Resource))
        .filter(r => r.status === 'active');

      // Local storage fallback for offline/demo resources if list is empty
      if (resList.length === 0) {
        try {
          const localListStr =
            localStorage.getItem(`nullwave_resources_${creatorId}`) ||
            localStorage.getItem(`unlockr_resources_${creatorId}`);
          if (localListStr) {
            const localList = JSON.parse(localListStr) as Resource[];
            resList = localList.filter(r => r.status === 'active');
          }
        } catch {}
      }

      resList.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return b.createdAt - a.createdAt;
      });
      setResources(resList);
    } catch (err) {
      console.warn('Error fetching creator resources:', err);
      try {
        const localListStr =
          localStorage.getItem(`nullwave_resources_${creatorId}`) ||
          localStorage.getItem(`unlockr_resources_${creatorId}`);
        if (localListStr) {
          const localList = JSON.parse(localListStr) as Resource[];
          const filtered = localList.filter(r => r.status === 'active');
          filtered.sort((a, b) => {
            if (a.isPinned && !b.isPinned) return -1;
            if (!a.isPinned && b.isPinned) return 1;
            return b.createdAt - a.createdAt;
          });
          setResources(filtered);
        }
      } catch {}
    }
  };

  const handleShareProfile = async () => {
    const profileUrl = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${creator?.displayName || creator?.username} on NullWave`,
          text: creator?.headline || `Check out ${creator?.displayName}'s guides and resources on NullWave`,
          url: profileUrl,
        });
        return;
      } catch {}
    }
    await navigator.clipboard.writeText(profileUrl);
    setCopiedProfile(true);
    setTimeout(() => setCopiedProfile(false), 2000);
  };

  const recordFailedAttempt = (): boolean => {
    let attempts = 0;
    try {
      const stored =
        sessionStorage.getItem(`nullwave_attempts_${cleanUsername}`) ||
        sessionStorage.getItem(`unlockr_attempts_${cleanUsername}`);
      attempts = stored ? parseInt(stored, 10) : 0;
    } catch {}
    attempts += 1;

    if (attempts >= 5) {
      const cooldownDurationMs = 30000; // 30-second cooldown
      const expiresAt = Date.now() + cooldownDurationMs;
      try {
        sessionStorage.setItem(`nullwave_cooldown_${cleanUsername}`, expiresAt.toString());
        sessionStorage.setItem(`unlockr_cooldown_${cleanUsername}`, expiresAt.toString());
        sessionStorage.removeItem(`nullwave_attempts_${cleanUsername}`);
        sessionStorage.removeItem(`unlockr_attempts_${cleanUsername}`);
      } catch {}
      setCooldownSeconds(30);
      return true;
    }

    try {
      sessionStorage.setItem(`nullwave_attempts_${cleanUsername}`, attempts.toString());
      sessionStorage.setItem(`unlockr_attempts_${cleanUsername}`, attempts.toString());
    } catch {}
    return false;
  };

  const unlockAndNavigate = (targetResource: Resource) => {
    try {
      sessionStorage.setItem(`nullwave_unlocked_${targetResource.id}`, 'true');
      sessionStorage.setItem(`unlockr_unlocked_${targetResource.id}`, 'true');
      sessionStorage.removeItem(`nullwave_attempts_${cleanUsername}`);
      sessionStorage.removeItem(`unlockr_attempts_${cleanUsername}`);
    } catch {}
    setUnlockedResourceIds(prev => new Set(prev).add(targetResource.id));
    navigate(`/${creator?.username}/resource/${targetResource.publicSlug}`);
  };

  const checkResourceAccess = (target: Resource): { allowed: boolean; error?: string } => {
    const isOwner = Boolean(user && creator && user.uid === creator.uid);
    if (isOwner) return { allowed: true };

    if (target.expiresAt && Date.now() > target.expiresAt) {
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

  const handleInlineCodeSubmit = async (code: string) => {
    if (!creator) return;

    if (cooldownSeconds > 0) {
      setCodeError(`Too many failed attempts. Please wait ${cooldownSeconds}s before trying again.`);
      return;
    }

    setCodeError(null);
    setHintMessage(null);
    setIsVerifying(true);

    const trimmedCode = code.trim();

    // 1. Fast-path: Check in-memory resources
    const memoryMatch = resources.find(
      r => r.code === trimmedCode && r.status === 'active'
    );
    if (memoryMatch) {
      const access = checkResourceAccess(memoryMatch);
      if (!access.allowed) {
        setCodeError(access.error || 'Access to this drop is currently closed.');
        setIsVerifying(false);
        return;
      }
      unlockAndNavigate(memoryMatch);
      return;
    }

    // 2. Query Firestore with creatorId + code + status == 'active'
    try {
      const q = query(
        collection(db, 'resources'),
        where('creatorId', '==', creator.uid),
        where('code', '==', trimmedCode),
        where('status', '==', 'active'),
        limit(1)
      );

      const snap = await getDocs(q);

      if (snap.empty) {
        // Local storage fallback
        let localMatch: Resource | null = null;
        try {
          const localListStr =
            localStorage.getItem(`nullwave_resources_${creator.uid}`) ||
            localStorage.getItem(`unlockr_resources_${creator.uid}`);
          if (localListStr) {
            const localList = JSON.parse(localListStr) as Resource[];
            localMatch = localList.find(r => r.code === trimmedCode && r.status === 'active') || null;
          }
        } catch {}

        if (localMatch) {
          const access = checkResourceAccess(localMatch);
          if (!access.allowed) {
            setCodeError(access.error || 'Access to this drop is currently closed.');
            setIsVerifying(false);
            return;
          }
          unlockAndNavigate(localMatch);
          return;
        }

        const isLockedOut = recordFailedAttempt();
        if (isLockedOut) {
          setCodeError('Incorrect code. Too many failed attempts, please wait 30 seconds.');
        } else {
          setCodeError('Incorrect code. Check the 6-digit wave code shared by the creator.');
        }
        setIsVerifying(false);
        return;
      }

      const targetResource = { id: snap.docs[0].id, ...snap.docs[0].data() } as Resource;
      const access = checkResourceAccess(targetResource);
      if (!access.allowed) {
        setCodeError(access.error || 'Access to this drop is currently closed.');
        setIsVerifying(false);
        return;
      }
      unlockAndNavigate(targetResource);
    } catch (error) {
      console.error('Code verification error:', error);
      setCodeError('Unable to verify code. Please check your connection and try again.');
      setIsVerifying(false);
    }
  };

  const handleModalCodeSubmit = async (code: string) => {
    if (!modalResource || !creator) return;

    if (cooldownSeconds > 0) {
      setModalCodeError(`Cooldown active. Wait ${cooldownSeconds}s.`);
      return;
    }

    setModalCodeError(null);
    setModalVerifying(true);

    const access = checkResourceAccess(modalResource);
    if (!access.allowed) {
      setModalCodeError(access.error || 'Access to this drop is closed.');
      setModalVerifying(false);
      return;
    }

    const trimmedCode = code.trim();

    if (modalResource.code === trimmedCode) {
      setModalVerifying(false);
      setModalResource(null);
      unlockAndNavigate(modalResource);
      return;
    }

    // Record failure
    const isLockedOut = recordFailedAttempt();
    if (isLockedOut) {
      setModalCodeError('Too many failed attempts. Cooldown started for 30 seconds.');
    } else {
      setModalCodeError('Incorrect 6-digit code for this resource.');
    }
    setModalVerifying(false);
  };

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

  const renderBioWithLinks = (bioText: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = bioText.split(urlRegex);
    return parts.map((part, index) => {
      if (part.match(urlRegex)) {
        const cleanUrl = part.replace(/[.,!?:;]+$/, '');
        const trailing = part.slice(cleanUrl.length);
        return (
          <React.Fragment key={index}>
            <a
              href={cleanUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-neutral-900 dark:text-neutral-100 underline decoration-neutral-400 hover:decoration-neutral-900 dark:hover:decoration-neutral-100 font-medium break-all"
            >
              {cleanUrl}
            </a>
            {trailing && <span>{trailing}</span>}
          </React.Fragment>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex flex-col items-center justify-center p-4">
        <div className="w-16 h-16 rounded-md bg-neutral-200 dark:bg-neutral-800 animate-pulse mb-4" />
        <div className="h-6 w-40 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse mb-2" />
        <div className="h-4 w-60 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" />
      </div>
    );
  }

  if (notFound || !creator) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 rounded-md bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center mb-4 text-neutral-500">
          <Waves className="w-6 h-6" />
        </div>
        <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">
          Station Not Found
        </h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400 max-w-sm mb-6">
          The creator station <span className="font-semibold text-neutral-900 dark:text-neutral-200">{cleanUsername}</span> does not exist or may have changed their handle.
        </p>
        <Link
          to="/"
          className="text-sm font-medium text-neutral-900 dark:text-neutral-100 underline hover:no-underline"
        >
          Return to NullWave home
        </Link>
      </div>
    );
  }

  // Filter categories
  const categories = [
    'All',
    ...Array.from(new Set(resources.map(r => r.category).filter(Boolean) as string[])),
  ];

  const isOwner = Boolean(user && creator && user.uid === creator.uid);

  // Filtered resources
  const visibleResources = resources.filter(res => {
    const isUnlocked = isOwner || unlockedResourceIds.has(res.id);
    if (res.isPublicListing === false && !isUnlocked && !isOwner) {
      return false;
    }
    if (selectedCategory !== 'All' && res.category !== selectedCategory) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const titleMatch = res.title.toLowerCase().includes(q);
      const descMatch = (res.description || '').toLowerCase().includes(q);
      const catMatch = (res.category || '').toLowerCase().includes(q);
      if (!titleMatch && !descMatch && !catMatch) return false;
    }
    return true;
  });

  const pinnedResource = visibleResources.find(r => r.isPinned);
  const regularResources = pinnedResource
    ? visibleResources.filter(r => r.id !== pinnedResource.id)
    : visibleResources;

  // Stats calculation
  const publishedCount = resources.filter(r => r.isPublicListing !== false).length;
  const totalUnlocksCount = resources.reduce(
    (sum, r) => sum + (r.uniqueViews || r.totalViews || 0),
    0
  );
  const activeSinceDate = creator.createdAt
    ? new Date(creator.createdAt).toLocaleDateString(undefined, {
        month: 'short',
        year: 'numeric',
      })
    : '2026';

  // Gather social links
  const socials = {
    instagram: normalizeSocialUrl(
      creator.socialLinks?.instagram ||
        (creator.socialLink?.includes('instagram.com') ? creator.socialLink : undefined),
      'instagram'
    ),
    twitter: normalizeSocialUrl(
      creator.socialLinks?.twitter ||
        (creator.socialLink?.includes('twitter.com') || creator.socialLink?.includes('x.com')
          ? creator.socialLink
          : undefined),
      'twitter'
    ),
    youtube: normalizeSocialUrl(
      creator.socialLinks?.youtube ||
        (creator.socialLink?.includes('youtube.com') ? creator.socialLink : undefined),
      'youtube'
    ),
    linkedin: normalizeSocialUrl(
      creator.socialLinks?.linkedin ||
        (creator.socialLink?.includes('linkedin.com') ? creator.socialLink : undefined),
      'linkedin'
    ),
    github: normalizeSocialUrl(
      creator.socialLinks?.github ||
        (creator.socialLink?.includes('github.com') ? creator.socialLink : undefined),
      'github'
    ),
    website: normalizeSocialUrl(
      creator.socialLinks?.website ||
        (!creator.socialLinks &&
        creator.socialLink &&
        !creator.socialLink.includes('instagram.com') &&
        !creator.socialLink.includes('twitter.com')
          ? creator.socialLink
          : undefined)
    ),
  };

  const hasAnySocial = Object.values(socials).some(Boolean);

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex flex-col selection:bg-neutral-200 dark:selection:bg-neutral-800">
      {/* Top Navigation */}
      <header className="sticky top-0 z-40 border-b border-neutral-200 dark:border-neutral-800 bg-white/90 dark:bg-neutral-950/90 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-neutral-900 text-neutral-50 dark:bg-neutral-100 dark:text-neutral-900 flex items-center justify-center">
              <Waves className="w-3.5 h-3.5" />
            </div>
            <span className="font-bold text-sm tracking-tight text-neutral-900 dark:text-neutral-100">
              NullWave
            </span>
          </Link>

          <div className="flex items-center gap-2.5">
            {isOwner && (
              <Link to="/dashboard/settings">
                <Button size="sm" variant="outline" className="text-xs">
                  <Edit className="w-3.5 h-3.5" />
                  <span>Edit Station</span>
                </Button>
              </Link>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={handleShareProfile}
              className="text-xs"
            >
              {copiedProfile ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Share</span>
                </>
              )}
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Hero Banner Cover (X / Twitter style) */}
      <div className="w-full bg-neutral-200 dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-800 relative">
        <div className="max-w-4xl mx-auto relative h-40 sm:h-52 md:h-60 overflow-hidden">
          {creator.bannerURL ? (
            <img
              src={creator.bannerURL}
              alt="Station Banner"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-neutral-200 via-neutral-300 to-neutral-200 dark:from-neutral-900 dark:via-neutral-800 dark:to-neutral-900 flex items-center justify-center">
              <div className="opacity-10 dark:opacity-20 flex items-center gap-3">
                <Waves className="w-16 h-16 text-neutral-900 dark:text-neutral-100" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Profile Body */}
      <main className="w-full max-w-4xl mx-auto px-4 sm:px-6 flex-1 pb-16">
        {/* Creator Identity Row (Overlapping Avatar) */}
        <div className="relative mb-6">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 -mt-14 sm:-mt-16 md:-mt-20 mb-4">
            {/* Avatar */}
            {creator.photoURL ? (
              <img
                src={creator.photoURL}
                alt={creator.displayName}
                className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-lg object-cover border-4 border-white dark:border-neutral-950 shadow-sm bg-neutral-100 dark:bg-neutral-900 shrink-0"
              />
            ) : (
              <div className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-lg bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 flex items-center justify-center font-bold text-3xl sm:text-4xl border-4 border-white dark:border-neutral-950 shadow-sm shrink-0">
                {creator.displayName ? creator.displayName[0].toUpperCase() : 'C'}
              </div>
            )}

            {/* Quick Actions (Share + Edit + Station Link) */}
            <div className="flex items-center gap-2 self-start sm:self-auto">
              {isOwner && (
                <Link to="/dashboard/settings">
                  <Button variant="primary" size="sm" className="text-xs">
                    <Edit className="w-3.5 h-3.5" />
                    <span>Edit Profile</span>
                  </Button>
                </Link>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleShareProfile}
                className="text-xs"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>{copiedProfile ? 'Copied Station Link' : 'Share Station'}</span>
              </Button>
            </div>
          </div>

          {/* Identity & Headline */}
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
              {creator.displayName || creator.username}
            </h1>
            <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400 font-mono">
              @{creator.username}
            </p>

            {creator.headline && (
              <p className="text-sm sm:text-base font-medium text-neutral-800 dark:text-neutral-200 pt-1">
                {creator.headline}
              </p>
            )}

            {creator.bio && (
              <p className="text-sm text-neutral-600 dark:text-neutral-300 pt-2 max-w-2xl whitespace-pre-line leading-relaxed">
                {renderBioWithLinks(creator.bio)}
              </p>
            )}

            {/* Meta Row: Location & Joined */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-500 dark:text-neutral-400 pt-2.5">
              {creator.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{creator.location}</span>
                </span>
              )}
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                <span>Station active since {activeSinceDate}</span>
              </span>
            </div>

            {/* Social Links Row */}
            {hasAnySocial && (
              <div className="flex flex-wrap items-center gap-2 pt-3">
                {socials.instagram && (
                  <a
                    href={socials.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:text-neutral-950 dark:hover:text-neutral-50 hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors"
                  >
                    <Instagram className="w-3.5 h-3.5" />
                    <span>Instagram</span>
                  </a>
                )}
                {socials.twitter && (
                  <a
                    href={socials.twitter}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:text-neutral-950 dark:hover:text-neutral-50 hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors"
                  >
                    <Twitter className="w-3.5 h-3.5" />
                    <span>X</span>
                  </a>
                )}
                {socials.youtube && (
                  <a
                    href={socials.youtube}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:text-neutral-950 dark:hover:text-neutral-50 hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors"
                  >
                    <Youtube className="w-3.5 h-3.5" />
                    <span>YouTube</span>
                  </a>
                )}
                {socials.linkedin && (
                  <a
                    href={socials.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:text-neutral-950 dark:hover:text-neutral-50 hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors"
                  >
                    <Linkedin className="w-3.5 h-3.5" />
                    <span>LinkedIn</span>
                  </a>
                )}
                {socials.github && (
                  <a
                    href={socials.github}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:text-neutral-950 dark:hover:text-neutral-50 hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors"
                  >
                    <Github className="w-3.5 h-3.5" />
                    <span>GitHub</span>
                  </a>
                )}
                {socials.website && (
                  <a
                    href={socials.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:text-neutral-950 dark:hover:text-neutral-50 hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors"
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span>Website</span>
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Stats Bar */}
          <div className="flex items-center gap-6 pt-4 border-t border-neutral-200/80 dark:border-neutral-800/80 mt-4 text-xs">
            <div>
              <span className="font-bold text-neutral-900 dark:text-neutral-100 mr-1.5 font-mono text-sm">
                {publishedCount}
              </span>
              <span className="text-neutral-500 dark:text-neutral-400">Guides</span>
            </div>
            <div>
              <span className="font-bold text-neutral-900 dark:text-neutral-100 mr-1.5 font-mono text-sm">
                {totalUnlocksCount}
              </span>
              <span className="text-neutral-500 dark:text-neutral-400">Total Unlocks</span>
            </div>
          </div>
        </div>

        {/* Wave Code Tuner Box */}
        <div ref={codeCardRef} className="scroll-mt-20 mb-8">
          <Card className="p-6 border-neutral-300 dark:border-neutral-700 shadow-sm">
            <div className="text-center mb-5">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 text-xs font-semibold mb-2 uppercase tracking-wider">
                <Radio className="w-3.5 h-3.5 text-neutral-600 dark:text-neutral-400" />
                <span>Station Wave Code Tuner</span>
              </div>
              <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                Enter 6-Digit Wave Code
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                Have an access code shared on Instagram or social media? Enter it here to unlock immediately.
              </p>

              {hintMessage && (
                <div className="mt-3 p-2.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-xs text-neutral-800 dark:text-neutral-200 border border-neutral-200 dark:border-neutral-700">
                  {hintMessage}
                </div>
              )}

              {cooldownSeconds > 0 && (
                <div className="mt-3 p-2.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-xs text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                  Rate limit cooldown active. Please wait {cooldownSeconds}s before trying again.
                </div>
              )}
            </div>

            <CodeInput
              length={6}
              onComplete={handleInlineCodeSubmit}
              onChange={() => {
                if (codeError) setCodeError(null);
              }}
              isLoading={isVerifying}
              error={codeError}
              disabled={cooldownSeconds > 0}
              autoFocus={false}
            />
          </Card>
        </div>

        {/* Resources Section Controls: Search + Categories + View Switcher */}
        <div className="space-y-4 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                placeholder="Search guides & resources..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full h-9 pl-9 pr-3 text-xs rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-400"
              />
            </div>

            {/* View Mode Switcher (Grid vs List) */}
            <div className="flex items-center gap-1.5 self-end sm:self-auto">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                title="Grid view"
                className={`p-1.5 rounded-md border text-xs flex items-center gap-1 transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-neutral-900 text-neutral-50 dark:bg-neutral-100 dark:text-neutral-900 border-transparent font-medium'
                    : 'bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Grid</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('list')}
                title="List view"
                className={`p-1.5 rounded-md border text-xs flex items-center gap-1 transition-colors ${
                  viewMode === 'list'
                    ? 'bg-neutral-900 text-neutral-50 dark:bg-neutral-100 dark:text-neutral-900 border-transparent font-medium'
                    : 'bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                }`}
              >
                <ListIcon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Feed</span>
              </button>
            </div>
          </div>

          {/* Category Tabs (Strictly rounded-md per Anti-AI Slop rules) */}
          {categories.length > 1 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {categories.map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 rounded-md text-xs font-medium shrink-0 transition-colors ${
                    selectedCategory === cat
                      ? 'bg-neutral-900 text-neutral-50 dark:bg-neutral-100 dark:text-neutral-900'
                      : 'bg-neutral-100 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-800'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Pinned / Featured Resource Highlight Card */}
        {pinnedResource && (
          <div className="mb-6">
            <div className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-2 flex items-center gap-1.5">
              <Pin className="w-3.5 h-3.5 text-neutral-600 dark:text-neutral-400" />
              <span>Pinned Featured Guide</span>
            </div>

            <Card className="p-5 border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 hover:border-neutral-400 dark:hover:border-neutral-600 transition-colors">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5 min-w-0 flex-1">
                  {pinnedResource.coverUrl ? (
                    <img
                      src={pinnedResource.coverUrl}
                      alt={pinnedResource.title}
                      className="w-16 h-16 sm:w-20 sm:h-20 rounded-md object-cover border border-neutral-200 dark:border-neutral-800 shrink-0"
                    />
                  ) : (
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 flex items-center justify-center shrink-0 border border-neutral-200 dark:border-neutral-700">
                      <FileText className="w-8 h-8" />
                    </div>
                  )}

                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                        {pinnedResource.title}
                      </h3>
                      <Badge variant="success" className="text-[10px] py-0 px-1.5 flex items-center gap-1">
                        <Pin className="w-2.5 h-2.5" />
                        <span>Pinned</span>
                      </Badge>
                      {isOwner || unlockedResourceIds.has(pinnedResource.id) ? (
                        <Badge variant="success" className="text-[10px] py-0 px-1.5">
                          Unlocked
                        </Badge>
                      ) : (
                        <Badge variant="neutral" className="text-[10px] py-0 px-1.5 flex items-center gap-1">
                          <Lock className="w-2.5 h-2.5" />
                          <span>Requires Code</span>
                        </Badge>
                      )}
                      {pinnedResource.allowDownload === false && (
                        <Badge variant="warning" className="text-[10px] py-0 px-1.5">
                          View Only
                        </Badge>
                      )}
                      {pinnedResource.isPublicListing === false && (
                        <Badge variant="neutral" className="text-[10px] py-0 px-1.5 flex items-center gap-1">
                          <EyeOff className="w-2.5 h-2.5" />
                          <span>Unlisted</span>
                        </Badge>
                      )}
                      {pinnedResource.expiresAt && (
                        Date.now() > pinnedResource.expiresAt ? (
                          <Badge variant="error" className="text-[10px] py-0 px-1.5 flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" />
                            <span>Expired</span>
                          </Badge>
                        ) : (
                          <Badge variant="neutral" className="text-[10px] py-0 px-1.5 flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" />
                            <span>Expires {new Date(pinnedResource.expiresAt).toLocaleDateString()}</span>
                          </Badge>
                        )
                      )}
                      {pinnedResource.maxUnlocks && (
                        (pinnedResource.uniqueViews || 0) >= pinnedResource.maxUnlocks ? (
                          <Badge variant="error" className="text-[10px] py-0 px-1.5 flex items-center gap-1">
                            <Users className="w-2.5 h-2.5" />
                            <span>Cap Reached</span>
                          </Badge>
                        ) : (
                          <Badge variant="neutral" className="text-[10px] py-0 px-1.5">
                            Limited Drop ({pinnedResource.uniqueViews || 0}/{pinnedResource.maxUnlocks})
                          </Badge>
                        )
                      )}
                    </div>

                    {pinnedResource.description && (
                      <p className="text-xs text-neutral-600 dark:text-neutral-400 line-clamp-2">
                        {pinnedResource.description}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-neutral-500 pt-1">
                      {pinnedResource.category && <span>{pinnedResource.category} •</span>}
                      <span>{(pinnedResource.fileSizeBytes / (1024 * 1024)).toFixed(1)} MB PDF</span>
                    </div>
                  </div>
                </div>

                <div className="w-full sm:w-auto shrink-0">
                  {isOwner || unlockedResourceIds.has(pinnedResource.id) ? (
                    <Link to={`/${creator.username}/resource/${pinnedResource.publicSlug}`}>
                      <Button variant="primary" size="sm" className="w-full sm:w-auto">
                        <span>Open Document</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Button>
                    </Link>
                  ) : pinnedResource.expiresAt && Date.now() > pinnedResource.expiresAt ? (
                    <Button variant="outline" size="sm" disabled className="w-full sm:w-auto opacity-60 cursor-not-allowed">
                      <Clock className="w-3.5 h-3.5 text-red-500" />
                      <span>Drop Expired</span>
                    </Button>
                  ) : pinnedResource.maxUnlocks && (pinnedResource.uniqueViews || 0) >= pinnedResource.maxUnlocks ? (
                    <Button variant="outline" size="sm" disabled className="w-full sm:w-auto opacity-60 cursor-not-allowed">
                      <Users className="w-3.5 h-3.5 text-amber-500" />
                      <span>Capacity Reached</span>
                    </Button>
                  ) : (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setModalResource(pinnedResource)}
                      className="w-full sm:w-auto"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>Unlock with Code</span>
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Regular Resources Collection */}
        {regularResources.length === 0 && !pinnedResource ? (
          <Card className="p-10 text-center border-dashed border-2">
            <FileText className="w-8 h-8 text-neutral-400 mx-auto mb-2" />
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              No matching resources found
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              Try adjusting your search query or category filter.
            </p>
          </Card>
        ) : (
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-3">
              Station Library ({visibleResources.length})
            </div>

            {viewMode === 'grid' ? (
              /* Instagram-style Cards Grid */
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {regularResources.map(res => {
                  const isUnlocked = isOwner || unlockedResourceIds.has(res.id);
                  const isResExpired = Boolean(res.expiresAt && Date.now() > res.expiresAt);
                  const isResCapped = Boolean(res.maxUnlocks && (res.uniqueViews || 0) >= res.maxUnlocks);

                  return (
                    <Card
                      key={res.id}
                      className="overflow-hidden flex flex-col hover:border-neutral-300 dark:hover:border-neutral-700 transition-all hover:shadow-xs group cursor-pointer"
                      onClick={() => {
                        if (isUnlocked) {
                          navigate(`/${creator.username}/resource/${res.publicSlug}`);
                        } else {
                          setModalResource(res);
                        }
                      }}
                    >
                      {/* Thumbnail Cover Area */}
                      <div className="relative aspect-video w-full bg-neutral-100 dark:bg-neutral-900 overflow-hidden border-b border-neutral-200 dark:border-neutral-800">
                        {res.coverUrl ? (
                          <img
                            src={res.coverUrl}
                            alt={res.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-neutral-400 dark:text-neutral-600 gap-1.5">
                            <FileText className="w-8 h-8" />
                            <span className="text-[10px] uppercase font-mono tracking-wider">
                              PDF Document
                            </span>
                          </div>
                        )}

                        {/* Status Badges Overlay */}
                        <div className="absolute top-2 left-2 flex flex-wrap gap-1">
                          {isUnlocked ? (
                            <Badge variant="success" className="text-[10px] py-0 px-1.5">
                              Unlocked
                            </Badge>
                          ) : (
                            <Badge variant="neutral" className="text-[10px] py-0 px-1.5 flex items-center gap-1">
                              <Lock className="w-2.5 h-2.5" />
                              <span>Protected</span>
                            </Badge>
                          )}
                          {res.allowDownload === false && (
                            <Badge variant="warning" className="text-[10px] py-0 px-1.5">
                              View Only
                            </Badge>
                          )}
                          {res.isPublicListing === false && (
                            <Badge variant="neutral" className="text-[10px] py-0 px-1.5 flex items-center gap-1">
                              <EyeOff className="w-2.5 h-2.5" />
                              <span>Unlisted</span>
                            </Badge>
                          )}
                        </div>

                        {isResExpired ? (
                          <div className="absolute top-2 right-2">
                            <Badge variant="error" className="text-[10px] py-0 px-1.5 flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5" />
                              <span>Expired</span>
                            </Badge>
                          </div>
                        ) : isResCapped ? (
                          <div className="absolute top-2 right-2">
                            <Badge variant="error" className="text-[10px] py-0 px-1.5 flex items-center gap-1">
                              <Users className="w-2.5 h-2.5" />
                              <span>Cap Reached</span>
                            </Badge>
                          </div>
                        ) : res.maxUnlocks ? (
                          <div className="absolute top-2 right-2">
                            <Badge variant="neutral" className="text-[10px] py-0 px-1.5">
                              Cap: {res.uniqueViews || 0}/{res.maxUnlocks}
                            </Badge>
                          </div>
                        ) : null}
                      </div>

                      {/* Card Content */}
                      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                        <div className="space-y-1">
                          <h4 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 line-clamp-1 group-hover:text-neutral-950 dark:group-hover:text-neutral-50">
                            {res.title}
                          </h4>
                          {res.description && (
                            <p className="text-xs text-neutral-500 dark:text-neutral-400 line-clamp-2 leading-relaxed">
                              {res.description}
                            </p>
                          )}
                        </div>

                        <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-[11px] text-neutral-500">
                          <span>{(res.fileSizeBytes / (1024 * 1024)).toFixed(1)} MB</span>
                          <span className="font-medium text-neutral-800 dark:text-neutral-200 group-hover:underline flex items-center gap-1">
                            {isUnlocked ? (
                              'Open Document →'
                            ) : isResExpired && !isOwner ? (
                              <span className="text-red-500">Expired</span>
                            ) : isResCapped && !isOwner ? (
                              <span className="text-amber-500">Cap Reached</span>
                            ) : (
                              'Enter Code →'
                            )}
                          </span>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            ) : (
              /* X / Twitter Timeline Feed View */
              <div className="space-y-3">
                {regularResources.map(res => {
                  const isUnlocked = isOwner || unlockedResourceIds.has(res.id);
                  const isResExpired = Boolean(res.expiresAt && Date.now() > res.expiresAt);
                  const isResCapped = Boolean(res.maxUnlocks && (res.uniqueViews || 0) >= res.maxUnlocks);

                  return (
                    <Card
                      key={res.id}
                      className="p-4 sm:p-5 hover:border-neutral-300 dark:hover:border-neutral-700 transition-all hover:shadow-xs group cursor-pointer"
                      onClick={() => {
                        if (isUnlocked) {
                          navigate(`/${creator.username}/resource/${res.publicSlug}`);
                        } else {
                          setModalResource(res);
                        }
                      }}
                    >
                      <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                        <div className="flex items-start gap-3.5 min-w-0 flex-1">
                          {res.coverUrl ? (
                            <img
                              src={res.coverUrl}
                              alt={res.title}
                              className="w-14 h-14 sm:w-16 sm:h-16 rounded-md object-cover border border-neutral-200 dark:border-neutral-800 shrink-0"
                            />
                          ) : (
                            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 flex items-center justify-center shrink-0 border border-neutral-200 dark:border-neutral-700">
                              <FileText className="w-6 h-6" />
                            </div>
                          )}

                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <h4 className="text-sm sm:text-base font-bold text-neutral-900 dark:text-neutral-100">
                                {res.title}
                              </h4>
                              {isUnlocked ? (
                                <Badge variant="success" className="text-[10px] py-0 px-1.5">
                                  Unlocked
                                </Badge>
                              ) : (
                                <Badge variant="neutral" className="text-[10px] py-0 px-1.5 flex items-center gap-1">
                                  <Lock className="w-2.5 h-2.5" />
                                  <span>Requires Code</span>
                                </Badge>
                              )}
                              {res.allowDownload === false && (
                                <Badge variant="warning" className="text-[10px] py-0 px-1.5">
                                  View Only
                                </Badge>
                              )}
                              {res.isPublicListing === false && (
                                <Badge variant="neutral" className="text-[10px] py-0 px-1.5 flex items-center gap-1">
                                  <EyeOff className="w-2.5 h-2.5" />
                                  <span>Unlisted</span>
                                </Badge>
                              )}
                              {isResExpired && (
                                <Badge variant="error" className="text-[10px] py-0 px-1.5 flex items-center gap-1">
                                  <Clock className="w-2.5 h-2.5" />
                                  <span>Expired</span>
                                </Badge>
                              )}
                              {isResCapped && !isResExpired && (
                                <Badge variant="error" className="text-[10px] py-0 px-1.5 flex items-center gap-1">
                                  <Users className="w-2.5 h-2.5" />
                                  <span>Cap Reached</span>
                                </Badge>
                              )}
                              {res.maxUnlocks && !isResCapped && !isResExpired && (
                                <Badge variant="neutral" className="text-[10px] py-0 px-1.5">
                                  Cap: {res.uniqueViews || 0}/{res.maxUnlocks}
                                </Badge>
                              )}
                              {res.category && (
                                <Badge variant="neutral" className="text-[10px] py-0 px-1.5">
                                  {res.category}
                                </Badge>
                              )}
                            </div>

                            {res.description && (
                              <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 line-clamp-2">
                                {res.description}
                              </p>
                            )}

                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-500 pt-1">
                              <span>{(res.fileSizeBytes / (1024 * 1024)).toFixed(1)} MB PDF</span>
                              <span>•</span>
                              <span>{res.totalViews} views</span>
                              <span>•</span>
                              <span>{new Date(res.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>

                        <div className="self-end sm:self-center shrink-0">
                          <span className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 group-hover:underline flex items-center gap-1">
                            {isUnlocked ? (
                              'View Document'
                            ) : isResExpired && !isOwner ? (
                              <span className="text-red-500">Expired</span>
                            ) : isResCapped && !isOwner ? (
                              <span className="text-amber-500">Cap Reached</span>
                            ) : (
                              'Unlock Code'
                            )}
                            <ArrowRight className="w-3.5 h-3.5" />
                          </span>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Focused Card-Click Unlock Modal */}
      {modalResource && (() => {
        const isModalExpired = Boolean(modalResource.expiresAt && Date.now() > modalResource.expiresAt);
        const isModalCapped = Boolean(modalResource.maxUnlocks && (modalResource.uniqueViews || 0) >= modalResource.maxUnlocks);
        const isBlocked = (isModalExpired || isModalCapped) && !isOwner;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <Card className="max-w-md w-full p-6 sm:p-7 relative shadow-xl border-neutral-300 dark:border-neutral-700">
              <button
                type="button"
                onClick={() => setModalResource(null)}
                className="absolute top-4 right-4 p-1.5 text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 rounded-md transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="text-center mb-5">
                <div className="w-10 h-10 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 flex items-center justify-center mx-auto mb-3 border border-neutral-200 dark:border-neutral-700">
                  {isBlocked ? <Lock className="w-5 h-5 text-red-500" /> : <Lock className="w-5 h-5" />}
                </div>
                <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-50">
                  {isModalExpired && !isOwner
                    ? `Drop Expired: ${modalResource.title}`
                    : isModalCapped && !isOwner
                    ? `Capacity Reached: ${modalResource.title}`
                    : `Unlock ${modalResource.title}`}
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                  {isModalExpired && !isOwner
                    ? `This time-limited drop expired on ${new Date(modalResource.expiresAt!).toLocaleDateString()}. Access is no longer open.`
                    : isModalCapped && !isOwner
                    ? `All ${modalResource.maxUnlocks} access slots have been redeemed. Capacity limit has been reached.`
                    : `Enter the 6-digit wave code shared by ${creator.displayName || creator.username}.`}
                </p>

                {modalResource.allowDownload === false && (
                  <div className="mt-2 inline-flex items-center gap-1 text-[11px] text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800">
                    <EyeOff className="w-3 h-3" />
                    <span>Distributed in view-only reader mode</span>
                  </div>
                )}
              </div>

              {isBlocked ? (
                <div className="p-4 rounded-md bg-neutral-100 dark:bg-neutral-800 text-xs text-neutral-600 dark:text-neutral-400 text-center">
                  Access to this resource has closed. Check @{creator.username}&apos;s profile for other guides.
                </div>
              ) : (
                <CodeInput
                  length={6}
                  onComplete={handleModalCodeSubmit}
                  onChange={() => {
                    if (modalCodeError) setModalCodeError(null);
                  }}
                  isLoading={modalVerifying}
                  error={modalCodeError}
                  disabled={cooldownSeconds > 0}
                  autoFocus={true}
                />
              )}

              <div className="mt-6 flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setModalResource(null)}
                >
                  Close
                </Button>
              </div>
            </Card>
          </div>
        );
      })()}

      {/* Clean Footer */}
      <footer className="w-full py-6 text-center text-xs text-neutral-400 dark:text-neutral-600 mt-auto flex items-center justify-center gap-1.5 border-t border-neutral-200 dark:border-neutral-800">
        <span>Powered by</span>
        <Link
          to="/"
          className="inline-flex items-center gap-1 font-semibold text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
        >
          <Waves className="w-3.5 h-3.5" />
          <span>NullWave</span>
        </Link>
        <span>• Zero-friction creator distribution</span>
      </footer>
    </div>
  );
};
