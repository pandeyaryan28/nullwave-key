import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  collection,
  query,
  where,
  getDocs,
  limit,
} from 'firebase/firestore';
import { db } from '../../lib/firebase/config';
import { UserProfile, Resource } from '../../types';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { CodeInput } from '../../components/ui/CodeInput';
import { ThemeToggle } from '../../components/ui/ThemeToggle';
import { Lock, FileText, ArrowRight, Instagram, Globe } from 'lucide-react';

export const CreatorProfilePage: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();

  const [creator, setCreator] = useState<UserProfile | null>(null);
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [notFound, setNotFound] = useState<boolean>(false);

  // Code verification state
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [hintMessage, setHintMessage] = useState<string | null>(null);
  const [unlockedResourceIds, setUnlockedResourceIds] = useState<Set<string>>(new Set());

  // Persistent abuse protection (rate limiting via sessionStorage)
  const [cooldownSeconds, setCooldownSeconds] = useState<number>(0);
  const codeCardRef = React.useRef<HTMLDivElement>(null);

  const cleanUsername = (username || '').replace(/^@/, '').toLowerCase();

  // Load cooldown and unlocked state
  useEffect(() => {
    if (!cleanUsername) return;

    const checkCooldown = () => {
      try {
        const stored = sessionStorage.getItem(`unlockr_cooldown_${cleanUsername}`);
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
        if (key?.startsWith('unlockr_unlocked_')) {
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
        // Query users by username
        const usersQuery = query(
          collection(db, 'users'),
          where('username', '==', cleanUsername),
          limit(1)
        );
        const userSnap = await getDocs(usersQuery);

        if (userSnap.empty) {
          // Check local fallback
          const localKey = `unlockr_profile_${cleanUsername}`;
          const localData = localStorage.getItem(localKey);
          if (localData) {
            const parsed = JSON.parse(localData);
            setCreator(parsed);
            await fetchCreatorResources(parsed.uid);
          } else {
            setNotFound(true);
          }
          setLoading(false);
          return;
        }

        const creatorData = userSnap.docs[0].data() as UserProfile;
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
      const resList: Resource[] = resSnap.docs.map(
        d => ({ id: d.id, ...d.data() } as Resource)
      );
      setResources(resList);
    } catch (err) {
      console.warn('Error fetching creator resources:', err);
    }
  };

  const handleCodeSubmit = async (code: string) => {
    if (!creator) return;

    // Check rate limit cooldown
    if (cooldownSeconds > 0) {
      setCodeError(`Too many failed attempts. Please wait ${cooldownSeconds}s before trying again.`);
      return;
    }

    setCodeError(null);
    setHintMessage(null);
    setIsVerifying(true);

    try {
      // Scoped query: creatorId + code + status == 'active'
      const q = query(
        collection(db, 'resources'),
        where('creatorId', '==', creator.uid),
        where('code', '==', code.trim()),
        where('status', '==', 'active'),
        limit(1)
      );

      const snap = await getDocs(q);

      if (snap.empty) {
        // Record failed attempt in sessionStorage
        let attempts = 0;
        try {
          const stored = sessionStorage.getItem(`unlockr_attempts_${cleanUsername}`);
          attempts = stored ? parseInt(stored, 10) : 0;
        } catch {}
        attempts += 1;

        if (attempts >= 5) {
          const cooldownDurationMs = 30000; // 30-second cooldown
          const expiresAt = Date.now() + cooldownDurationMs;
          try {
            sessionStorage.setItem(`unlockr_cooldown_${cleanUsername}`, expiresAt.toString());
            sessionStorage.removeItem(`unlockr_attempts_${cleanUsername}`);
          } catch {}
          setCooldownSeconds(30);
          setCodeError('Incorrect code. Too many failed attempts, please wait 30 seconds.');
        } else {
          try {
            sessionStorage.setItem(`unlockr_attempts_${cleanUsername}`, attempts.toString());
          } catch {}
          setCodeError('Incorrect code. Check the 6-digit code shared by the creator.');
        }
        setIsVerifying(false);
        return;
      }

      // Valid code found!
      const targetResource = snap.docs[0].data() as Resource;
      try {
        sessionStorage.setItem(`unlockr_unlocked_${targetResource.id}`, 'true');
        sessionStorage.removeItem(`unlockr_attempts_${cleanUsername}`);
      } catch {}

      navigate(`/@${creator.username}/resource/${targetResource.publicSlug}`);
    } catch (error) {
      console.error('Code verification error:', error);
      setCodeError('Unable to verify code. Please check your network and try again.');
      setIsVerifying(false);
    }
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
          <Lock className="w-6 h-6" />
        </div>
        <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">
          Creator Not Found
        </h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400 max-w-sm mb-6">
          The creator profile <span className="font-semibold text-neutral-900 dark:text-neutral-200">@{cleanUsername}</span> does not exist or may have changed their username.
        </p>
        <Link
          to="/"
          className="text-sm font-medium text-neutral-900 dark:text-neutral-100 underline hover:no-underline"
        >
          Return to Unlockr home
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex flex-col selection:bg-neutral-200 dark:selection:bg-neutral-800">
      {/* Minimal Top Bar */}
      <header className="w-full px-4 sm:px-6 py-4 flex items-center justify-between max-w-md mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-neutral-900 text-neutral-50 dark:bg-neutral-100 dark:text-neutral-900 flex items-center justify-center">
            <Lock className="w-3.5 h-3.5" />
          </div>
          <span className="font-semibold text-sm tracking-tight text-neutral-900 dark:text-neutral-100">
            Unlockr
          </span>
        </div>
        <ThemeToggle />
      </header>

      {/* Main Mobile-First Container */}
      <main className="w-full max-w-md mx-auto px-4 py-6 flex-1 flex flex-col">
        {/* Creator Identity Header */}
        <div className="flex flex-col items-center text-center mb-8">
          {creator.photoURL ? (
            <img
              src={creator.photoURL}
              alt={creator.displayName}
              className="w-20 h-20 rounded-md object-cover border border-neutral-200 dark:border-neutral-800 mb-4 shadow-sm"
            />
          ) : (
            <div className="w-20 h-20 rounded-md bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 flex items-center justify-center font-bold text-2xl mb-4 border border-neutral-300 dark:border-neutral-700">
              {creator.displayName ? creator.displayName[0].toUpperCase() : 'C'}
            </div>
          )}

          <h1 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
            {creator.displayName || creator.username}
          </h1>
          <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400 mt-0.5">
            @{creator.username}
          </p>

          {creator.bio && (
            <p className="text-sm text-neutral-700 dark:text-neutral-300 mt-3 max-w-xs leading-relaxed">
              {creator.bio}
            </p>
          )}

          {creator.socialLink && (
            <a
              href={
                creator.socialLink.startsWith('http')
                  ? creator.socialLink
                  : `https://${creator.socialLink}`
              }
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 mt-3 px-2.5 py-1 rounded-md border border-neutral-200 dark:border-neutral-800 transition-colors"
            >
              {creator.socialLink.includes('instagram.com') ? (
                <Instagram className="w-3.5 h-3.5" />
              ) : (
                <Globe className="w-3.5 h-3.5" />
              )}
              <span>{creator.socialLink.replace(/^https?:\/\//, '')}</span>
            </a>
          )}
        </div>

        {/* Primary Interaction: 6-Digit Code Slot Input */}
        <div ref={codeCardRef} className="scroll-mt-6">
          <Card className="p-6 mb-8 border-neutral-300 dark:border-neutral-700 shadow-sm">
            <div className="text-center mb-6">
              <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                Access a resource
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                Enter the 6-digit code shared by the creator.
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
              onComplete={handleCodeSubmit}
              onChange={() => {
                if (codeError) setCodeError(null);
              }}
              isLoading={isVerifying}
              error={codeError}
              disabled={cooldownSeconds > 0}
              autoFocus={true}
            />
          </Card>
        </div>

        {/* Creator's Active Resources List */}
        {resources.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                Available Resources ({resources.length})
              </h3>
            </div>

            <div className="space-y-2.5">
              {resources.map(res => {
                const isUnlocked = unlockedResourceIds.has(res.id);

                if (isUnlocked) {
                  return (
                    <Link
                      key={res.id}
                      to={`/@${creator.username}/resource/${res.publicSlug}`}
                      className="block p-3.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-neutral-300 dark:hover:border-neutral-700 transition-all hover:shadow-xs group"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-200 dark:border-emerald-800">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 truncate group-hover:text-neutral-950 dark:group-hover:text-neutral-50">
                                {res.title}
                              </h4>
                              <Badge variant="success" className="text-[10px] py-0 px-1.5 shrink-0">
                                Unlocked
                              </Badge>
                            </div>
                            {res.description && (
                              <p className="text-xs text-neutral-500 dark:text-neutral-400 line-clamp-1 mt-0.5">
                                {res.description}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-2">
                              {res.category && (
                                <Badge variant="neutral" className="text-[10px] py-0 px-1.5">
                                  {res.category}
                                </Badge>
                              )}
                              <span className="text-[11px] text-neutral-500 font-mono">
                                {(res.fileSizeBytes / (1024 * 1024)).toFixed(1)} MB PDF
                              </span>
                            </div>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-neutral-400 group-hover:text-neutral-900 dark:group-hover:text-neutral-100 transition-colors shrink-0 mt-2" />
                      </div>
                    </Link>
                  );
                }

                return (
                  <button
                    key={res.id}
                    type="button"
                    onClick={() => {
                      setHintMessage(`Enter the 6-digit access code for "${res.title}" above.`);
                      setCodeError(null);
                      codeCardRef.current?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="w-full text-left p-3.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-neutral-300 dark:hover:border-neutral-700 transition-all hover:shadow-xs group cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 flex items-center justify-center shrink-0 border border-neutral-200 dark:border-neutral-700">
                          <Lock className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 truncate group-hover:text-neutral-950 dark:group-hover:text-neutral-50">
                              {res.title}
                            </h4>
                            <Badge variant="neutral" className="text-[10px] py-0 px-1.5 shrink-0">
                              Requires 6-Digit Code
                            </Badge>
                          </div>
                          {res.description && (
                            <p className="text-xs text-neutral-500 dark:text-neutral-400 line-clamp-1 mt-0.5">
                              {res.description}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            {res.category && (
                              <Badge variant="neutral" className="text-[10px] py-0 px-1.5">
                                {res.category}
                              </Badge>
                            )}
                            <span className="text-[11px] text-neutral-500 font-mono">
                              {(res.fileSizeBytes / (1024 * 1024)).toFixed(1)} MB PDF
                            </span>
                          </div>
                        </div>
                      </div>
                      <span className="text-xs font-medium text-neutral-400 group-hover:text-neutral-900 dark:group-hover:text-neutral-200 shrink-0 mt-2">
                        Enter code →
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* Clean Bottom Attribution */}
      <footer className="w-full py-4 text-center text-xs text-neutral-400 dark:text-neutral-600 mt-auto">
        Powered by Unlockr
      </footer>
    </div>
  );
};
