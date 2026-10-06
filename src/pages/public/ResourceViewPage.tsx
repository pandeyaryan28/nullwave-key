import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link, Navigate, useNavigate } from 'react-router-dom';
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
import { Resource, UserProfile } from '../../types';
import { useAuth } from '../../lib/auth/authContext';
import { trackResourceView, trackResourceDownload } from '../../lib/analytics/tracker';
import { fetchFileFromFirestoreChunks } from '../../lib/storage/storageService';
import {
  saveResource,
  removeSavedResource,
  isResourceSaved,
} from '../../lib/storage/savedResourcesService';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { CodeInput } from '../../components/ui/CodeInput';
import { ThemeToggle } from '../../components/ui/ThemeToggle';
import {
  ArrowLeft,
  Download,
  FileText,
  Calendar,
  Clock,
  Users,
  EyeOff,
  Lock,
  Edit,
  Bookmark,
  Copy,
  Check,
  Shield,
  X,
  Key,
  Eye,
} from 'lucide-react';

export const ResourceViewPage: React.FC = () => {
  const { username, code, publicSlug } = useParams<{
    username: string;
    code?: string;
    publicSlug?: string;
  }>();
  const { user, signInWithGoogle } = useAuth();
  const navigate = useNavigate();

  // Redirect legacy @, encoded %40, or mixed-case handles immediately to clean canonical URL
  if (username && (username !== username.toLowerCase() || /^(?:@|%40)/.test(username))) {
    const clean = username.replace(/^(?:@|%40)+/, '').toLowerCase();
    if (code) {
      return <Navigate to={`/${clean}/${code}`} replace />;
    }
    return <Navigate to={`/${clean}/resource/${publicSlug || ''}`} replace />;
  }

  const [creator, setCreator] = useState<UserProfile | null>(null);
  const [resource, setResource] = useState<Resource | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [notFound, setNotFound] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);

  // Verification & public unlock state
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = useState<number>(0);

  // Password protection state
  const [isPasswordUnlocked, setIsPasswordUnlocked] = useState<boolean>(false);
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isVerifyingPassword, setIsVerifyingPassword] = useState<boolean>(false);

  // Viewer library save state
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  // Prevent multiple view tracks on re-renders in the same mount
  const hasTrackedView = useRef<boolean>(false);

  const cleanUsername = (username || '').replace(/^(?:@|%40)+/, '').toLowerCase();

  // Create clean Blob URL for base64 data URLs, Firestore chunks, or Storage URLs
  useEffect(() => {
    const isOwnerUser = Boolean(user && resource && user.uid === resource.creatorId);
    if (!resource?.fileUrl || !isUnlocked || (resource.password && !isPasswordUnlocked && !isOwnerUser)) return;

    let active = true;
    let createdUrl: string | null = null;

    if (resource.fileUrl.startsWith('firestore_chunks://')) {
      const resourceId = resource.fileUrl.replace('firestore_chunks://', '') || resource.id;
      fetchFileFromFirestoreChunks(resourceId)
        .then(url => {
          if (active) {
            createdUrl = url;
            setBlobUrl(url);
          }
        })
        .catch(err => {
          console.error('Failed to reconstruct file from chunks:', err);
        });
    } else if (resource.fileUrl.startsWith('data:application/pdf')) {
      try {
        const parts = resource.fileUrl.split(',');
        const byteCharacters = atob(parts[1]);
        const byteNumbers = new Uint8Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const blob = new Blob([byteNumbers], { type: 'application/pdf' });
        createdUrl = URL.createObjectURL(blob);
        setBlobUrl(createdUrl);
      } catch {
        setBlobUrl(resource.fileUrl);
      }
    } else {
      setBlobUrl(resource.fileUrl);
    }

    return () => {
      active = false;
      if (createdUrl) {
        URL.revokeObjectURL(createdUrl);
      }
    };
  }, [resource?.fileUrl, resource?.id, isUnlocked]);

  // Check rate limit cooldown for this specific resource
  useEffect(() => {
    if (!cleanUsername) return;
    const identifier = code || publicSlug || 'default';
    const nullwaveKey = `nullwave_cooldown_${cleanUsername}_${identifier}`;
    const unlockrKey = `unlockr_cooldown_${cleanUsername}_${identifier}`;

    const checkCooldown = () => {
      try {
        const stored = sessionStorage.getItem(nullwaveKey) || sessionStorage.getItem(unlockrKey);
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
  }, [cleanUsername, code, publicSlug]);

  // Check if saved in viewer's personal library
  useEffect(() => {
    if (user?.uid && resource?.id) {
      isResourceSaved(user.uid, resource.id).then(saved => {
        setIsSaved(saved);
      });
    }
  }, [user?.uid, resource?.id]);

  useEffect(() => {
    const fetchResource = async () => {
      if (!cleanUsername || (!code && !publicSlug)) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // 1. Get creator profile
        let creatorData: UserProfile | null = null;
        const userQ = query(
          collection(db, 'users'),
          where('username', '==', cleanUsername),
          limit(1)
        );
        const userSnap = await getDocs(userQ);

        if (!userSnap.empty) {
          const userDoc = userSnap.docs[0];
          creatorData = {
            ...(userDoc.data() as UserProfile),
            uid: userDoc.id,
          };
        } else {
          // Direct lookup in usernames collection
          try {
            const usernameDocRef = doc(db, 'usernames', cleanUsername);
            const usernameSnap = await getDoc(usernameDocRef);
            if (usernameSnap.exists()) {
              const uid = usernameSnap.data().uid;
              const directUserSnap = await getDoc(doc(db, 'users', uid));
              if (directUserSnap.exists()) {
                creatorData = {
                  ...(directUserSnap.data() as UserProfile),
                  uid: directUserSnap.id,
                };
              }
            }
          } catch (e) {
            console.warn('Fallback direct username lookup error in resource view:', e);
          }
        }

        // Local storage fallback for creator profile
        if (!creatorData) {
          try {
            const localProfile =
              localStorage.getItem(`nullwave_profile_${cleanUsername}`) ||
              localStorage.getItem(`unlockr_profile_${cleanUsername}`);
            if (localProfile) {
              creatorData = JSON.parse(localProfile);
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

        // 2. Fetch resource by creatorId + (code OR publicSlug)
        const isOwner = user?.uid === creatorData.uid;
        const constraints = [where('creatorId', '==', creatorData.uid)];

        if (code) {
          constraints.push(where('code', '==', code.trim()));
        } else if (publicSlug) {
          constraints.push(where('publicSlug', '==', publicSlug));
        }

        if (!isOwner) {
          constraints.push(where('status', '==', 'active'));
        }

        let resData: Resource | null = null;
        try {
          const resQ = query(
            collection(db, 'resources'),
            ...constraints,
            limit(1)
          );
          const resSnap = await getDocs(resQ);
          if (!resSnap.empty) {
            resData = {
              id: resSnap.docs[0].id,
              ...resSnap.docs[0].data(),
            } as Resource;
          }
        } catch (err) {
          console.warn('Firestore query failed for resource, trying fallback:', err);
        }

        // Fallback to local storage if not found in Firestore
        if (!resData) {
          try {
            const localListStr =
              localStorage.getItem(`nullwave_resources_${creatorData.uid}`) ||
              localStorage.getItem(`unlockr_resources_${creatorData.uid}`);
            if (localListStr) {
              const localList = JSON.parse(localListStr) as Resource[];
              resData =
                localList.find(r => {
                  const matchesIdentifier = code
                    ? r.code === code.trim()
                    : r.publicSlug === publicSlug;
                  return matchesIdentifier && (isOwner || r.status === 'active');
                }) || null;
            }
          } catch {}
        }

        if (!resData || (!isOwner && resData.status !== 'active')) {
          setNotFound(true);
          setLoading(false);
          return;
        }

        // Canonical URL migration: when accessed via legacy slug route, redirect to canonical /:username/:code
        if (!code && publicSlug && resData.code) {
          navigate(`/${cleanUsername}/${resData.code}`, { replace: true });
          return;
        }

        setResource(resData);

        // Password gate evaluation
        const isOwnerUser = Boolean(user && user.uid === resData.creatorId);
        const isPwdUnlockedInSession =
          sessionStorage.getItem(`nullwave_pwd_unlocked_${resData.id}`) === 'true' ||
          sessionStorage.getItem(`unlockr_pwd_unlocked_${resData.id}`) === 'true';

        if (!resData.password || isPwdUnlockedInSession || isOwnerUser) {
          setIsPasswordUnlocked(true);
        }

        // Evaluation: when accessed via direct code URL (/:username/:code),
        // the visitor already possesses the valid access code! Automatically unlock!
        const isDirectCodeAccess = Boolean(code && code.trim() === resData.code);
        const alreadyUnlockedInSession =
          sessionStorage.getItem(`nullwave_unlocked_${resData.id}`) === 'true' ||
          sessionStorage.getItem(`unlockr_unlocked_${resData.id}`) === 'true' ||
          user?.uid === resData.creatorId;

        const isExpiredCheck = Boolean(resData.expiresAt && Date.now() > resData.expiresAt);
        const isCapacityCheck = Boolean(
          resData.maxUnlocks && (resData.uniqueViews || 0) >= resData.maxUnlocks
        );

        if ((isDirectCodeAccess || alreadyUnlockedInSession) && ((!isExpiredCheck && !isCapacityCheck) || isOwner)) {
          setIsUnlocked(true);
          try {
            sessionStorage.setItem(`nullwave_unlocked_${resData.id}`, 'true');
            sessionStorage.setItem(`unlockr_unlocked_${resData.id}`, 'true');
          } catch {}
        }
      } catch (err) {
        console.error('Error fetching resource:', err);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    fetchResource();
  }, [cleanUsername, code, publicSlug, user?.uid]);

  // Track page view once unlocked
  useEffect(() => {
    const isOwnerUser = Boolean(user && resource && user.uid === resource.creatorId);
    if (!resource || !isUnlocked || (resource.password && !isPasswordUnlocked && !isOwnerUser)) return;

    if (!hasTrackedView.current) {
      hasTrackedView.current = true;
      trackResourceView(resource.id, resource.creatorId).then(res => {
        if (res.totalViewsIncremented) {
          setResource(prev =>
            prev
              ? {
                  ...prev,
                  totalViews: prev.totalViews + 1,
                  uniqueViews: res.uniqueViewsIncremented
                    ? prev.uniqueViews + 1
                    : prev.uniqueViews,
                }
              : null
          );
        }
      });
    }
  }, [resource, isUnlocked]);

  // Expiration & Capacity evaluation
  const isOwner = Boolean(user && resource && user.uid === resource.creatorId);
  const isExpired = Boolean(resource?.expiresAt && Date.now() > resource.expiresAt);
  const isCapacityReached = Boolean(
    resource?.maxUnlocks && (resource.uniqueViews || 0) >= resource.maxUnlocks
  );
  const allowDownload = resource?.allowDownload !== false;
  const allowSave = resource?.allowSave !== false;

  const handleInlineCodeSubmit = (enteredCode: string) => {
    if (!resource) return;

    // Check expiration and cap
    if (isExpired && !isOwner) {
      setCodeError('This document has expired and is no longer accessible.');
      return;
    }

    if (isCapacityReached && !isOwner) {
      setCodeError(`Maximum unlock capacity (${resource.maxUnlocks}) has been reached for this document.`);
      return;
    }

    const identifier = code || publicSlug || resource.code;
    const nullwaveCooldownKey = `nullwave_cooldown_${cleanUsername}_${identifier}`;
    const unlockrCooldownKey = `unlockr_cooldown_${cleanUsername}_${identifier}`;
    const nullwaveAttemptsKey = `nullwave_attempts_${cleanUsername}_${identifier}`;
    const unlockrAttemptsKey = `unlockr_attempts_${cleanUsername}_${identifier}`;

    if (cooldownSeconds > 0) {
      setCodeError(`Too many failed attempts. Please wait ${cooldownSeconds}s before trying again.`);
      return;
    }

    setCodeError(null);
    setIsVerifying(true);

    if (enteredCode.trim() === resource.code) {
      try {
        sessionStorage.setItem(`nullwave_unlocked_${resource.id}`, 'true');
        sessionStorage.setItem(`unlockr_unlocked_${resource.id}`, 'true');
        sessionStorage.removeItem(nullwaveAttemptsKey);
        sessionStorage.removeItem(unlockrAttemptsKey);
      } catch {}
      setIsUnlocked(true);
      setIsVerifying(false);
    } else {
      let attempts = 0;
      try {
        const stored = sessionStorage.getItem(nullwaveAttemptsKey) || sessionStorage.getItem(unlockrAttemptsKey);
        attempts = stored ? parseInt(stored, 10) : 0;
      } catch {}
      attempts += 1;

      if (attempts >= 5) {
        const cooldownDurationMs = 30000;
        const expiresAt = Date.now() + cooldownDurationMs;
        try {
          sessionStorage.setItem(nullwaveCooldownKey, expiresAt.toString());
          sessionStorage.setItem(unlockrCooldownKey, expiresAt.toString());
          sessionStorage.removeItem(nullwaveAttemptsKey);
          sessionStorage.removeItem(unlockrAttemptsKey);
        } catch {}
        setCooldownSeconds(30);
        setCodeError('Incorrect code. Too many failed attempts, please wait 30 seconds.');
      } else {
        try {
          sessionStorage.setItem(nullwaveAttemptsKey, attempts.toString());
          sessionStorage.setItem(unlockrAttemptsKey, attempts.toString());
        } catch {}
        setCodeError('Incorrect 4-digit access code. Please check the code shared by the creator.');
      }
      setIsVerifying(false);
    }
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resource) return;

    if (cooldownSeconds > 0) {
      setPasswordError(`Too many failed attempts. Please wait ${cooldownSeconds}s before trying again.`);
      return;
    }

    setPasswordError(null);
    setIsVerifyingPassword(true);

    if (passwordInput === resource.password) {
      try {
        sessionStorage.setItem(`nullwave_pwd_unlocked_${resource.id}`, 'true');
        sessionStorage.setItem(`unlockr_pwd_unlocked_${resource.id}`, 'true');
      } catch {}
      setIsPasswordUnlocked(true);
      setIsVerifyingPassword(false);
    } else {
      const identifier = code || publicSlug || resource.code;
      const nullwaveAttemptsKey = `nullwave_attempts_${cleanUsername}_${identifier}`;
      const unlockrAttemptsKey = `unlockr_attempts_${cleanUsername}_${identifier}`;
      const nullwaveCooldownKey = `nullwave_cooldown_${cleanUsername}_${identifier}`;
      const unlockrCooldownKey = `unlockr_cooldown_${cleanUsername}_${identifier}`;

      let attempts = 0;
      try {
        const stored = sessionStorage.getItem(nullwaveAttemptsKey) || sessionStorage.getItem(unlockrAttemptsKey);
        attempts = stored ? parseInt(stored, 10) : 0;
      } catch {}
      attempts += 1;

      if (attempts >= 5) {
        const cooldownDurationMs = 30000;
        const expiresAt = Date.now() + cooldownDurationMs;
        try {
          sessionStorage.setItem(nullwaveCooldownKey, expiresAt.toString());
          sessionStorage.setItem(unlockrCooldownKey, expiresAt.toString());
          sessionStorage.removeItem(nullwaveAttemptsKey);
          sessionStorage.removeItem(unlockrAttemptsKey);
        } catch {}
        setCooldownSeconds(30);
        setPasswordError('Incorrect password. Too many failed attempts, please wait 30 seconds.');
      } else {
        try {
          sessionStorage.setItem(nullwaveAttemptsKey, attempts.toString());
          sessionStorage.setItem(unlockrAttemptsKey, attempts.toString());
        } catch {}
        setPasswordError('Incorrect password. Please verify with the creator.');
      }
      setIsVerifyingPassword(false);
    }
  };

  const handleDownload = async () => {
    if (!resource || !allowDownload) return;
    setIsDownloading(true);

    try {
      await trackResourceDownload(resource.id, resource.creatorId);

      setResource(prev =>
        prev ? { ...prev, totalDownloads: prev.totalDownloads + 1 } : null
      );

      const targetUrl = blobUrl || resource.fileUrl;
      const fileName = resource.fileName || `${resource.title}.pdf`;

      try {
        const response = await fetch(targetUrl);
        const fileBlob = await response.blob();
        const tempBlobUrl = URL.createObjectURL(fileBlob);
        const link = document.createElement('a');
        link.href = tempBlobUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(tempBlobUrl), 2000);
      } catch {
        const link = document.createElement('a');
        link.href = targetUrl;
        link.download = fileName;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err) {
      console.error('Download error:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleToggleSave = async () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    if (!resource || !creator) return;

    setIsSaving(true);
    try {
      if (isSaved) {
        await removeSavedResource(user.uid, resource.id);
        setIsSaved(false);
      } else {
        await saveResource(user.uid, resource, creator);
        setIsSaved(true);
      }
    } catch (err) {
      console.error('Error toggling saved resource:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyDocLink = () => {
    if (!creator?.username || !resource?.code) return;
    const url = `${window.location.origin}/${creator.username}/${resource.code}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleGoogleSignInAndSave = async () => {
    try {
      await signInWithGoogle();
      setShowAuthModal(false);
    } catch (err) {
      console.error('Google sign in error from viewer modal:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 rounded-md bg-neutral-200 dark:bg-neutral-800 animate-pulse mb-4" />
        <div className="h-5 w-48 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse mb-2" />
        <div className="h-4 w-32 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" />
      </div>
    );
  }

  if (notFound || !resource || !creator) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 rounded-md bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center mb-4 text-neutral-500">
          <FileText className="w-6 h-6" />
        </div>
        <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">
          Document Unavailable
        </h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400 max-w-sm mb-6">
          This document is either disabled, has been removed, or does not exist under {cleanUsername}.
        </p>
        <Link to={`/${cleanUsername}`}>
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4" />
            <span>Back to {cleanUsername}</span>
          </Button>
        </Link>
      </div>
    );
  }

  const formattedDate = new Date(resource.createdAt).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex flex-col selection:bg-neutral-200 dark:selection:bg-neutral-800">
      {/* Top Sticky Document Control Bar */}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 dark:border-white/10 bg-white/85 dark:bg-[#141822]/90 backdrop-blur-md shadow-clay-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              to={`/${creator.username}`}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:text-neutral-950 dark:hover:text-neutral-50 shrink-0 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back to</span>
              <span>{creator.displayName || creator.username}</span>
            </Link>

            <span className="text-neutral-300 dark:text-neutral-700 hidden sm:inline">•</span>

            <span className="text-xs font-medium text-neutral-900 dark:text-neutral-100 truncate hidden md:inline">
              {resource.title}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isOwner && (
              <Link to={`/dashboard/resources/${resource.id}/edit`}>
                <Button size="sm" variant="outline" className="text-xs">
                  <Edit className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Edit</span>
                </Button>
              </Link>
            )}

            <Button
              size="sm"
              variant="outline"
              onClick={handleCopyDocLink}
              title="Copy direct document link"
              className="text-xs"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{copiedLink ? 'Link Copied' : 'Share'}</span>
            </Button>

            {/* Save to Library Button (for viewers when creator allows saving) */}
            {isUnlocked && (!resource.password || isPasswordUnlocked || isOwner) && allowSave && (
              <Button
                size="sm"
                variant={isSaved ? 'secondary' : 'outline'}
                onClick={handleToggleSave}
                isLoading={isSaving}
                className="text-xs"
                title={isSaved ? 'Remove from saved library' : 'Save to viewer library'}
              >
                <Bookmark className={`w-3.5 h-3.5 ${isSaved ? 'fill-current text-neutral-900 dark:text-neutral-100' : ''}`} />
                <span className="hidden sm:inline">{isSaved ? 'Saved' : 'Save'}</span>
              </Button>
            )}

            {/* Download Button */}
            {isUnlocked && (!resource.password || isPasswordUnlocked || isOwner) ? (
              allowDownload ? (
                <Button
                  size="sm"
                  variant="primary"
                  onClick={handleDownload}
                  isLoading={isDownloading}
                  className="text-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </Button>
              ) : (
                <Badge variant="warning" className="text-xs py-1 px-2.5 flex items-center gap-1.5">
                  <EyeOff className="w-3.5 h-3.5" />
                  <span>View Only</span>
                </Badge>
              )
            ) : resource.password && !isPasswordUnlocked && !isOwner ? (
              <div className="text-xs text-neutral-500 flex items-center gap-1.5 font-medium">
                <Key className="w-3.5 h-3.5" />
                <span>Password Protected</span>
              </div>
            ) : (
              <div className="text-xs text-neutral-500 flex items-center gap-1.5 font-medium">
                <Shield className="w-3.5 h-3.5" />
                <span>Code Protected</span>
              </div>
            )}

            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Document Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex-1 w-full space-y-6">
        {/* Document Metadata Bar */}
        <div className="flex flex-col md:flex-row items-start justify-between gap-4 p-5 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#1a1e28] shadow-clay-card">
          <div className="space-y-2 flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              {resource.category && (
                <Badge variant="neutral">{resource.category}</Badge>
              )}
              {!allowDownload && (
                <Badge variant="warning" className="flex items-center gap-1">
                  <EyeOff className="w-3 h-3" />
                  <span>View Only</span>
                </Badge>
              )}
              {isExpired && (
                <Badge variant="error" className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>Expired</span>
                </Badge>
              )}
              {isCapacityReached && (
                <Badge variant="error" className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  <span>Capacity Cap Reached</span>
                </Badge>
              )}
              {resource.password && (
                <Badge variant="neutral" className="flex items-center gap-1">
                  <Key className="w-3 h-3" />
                  <span>Password Protected</span>
                </Badge>
              )}
              <span className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {formattedDate}
              </span>
              <span className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center gap-1 font-mono">
                {(resource.fileSizeBytes / (1024 * 1024)).toFixed(1)} MB
              </span>
              <span className="text-xs font-mono text-neutral-500 dark:text-neutral-400">
                Code: <span className="font-semibold text-neutral-900 dark:text-neutral-100">{resource.code}</span>
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50 leading-tight">
              {resource.title}
            </h1>

            {resource.description && (
              <p className="text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed max-w-3xl">
                {resource.description}
              </p>
            )}

            {/* Creator Attribution */}
            <div className="pt-2 flex items-center gap-3 border-t border-neutral-100 dark:border-neutral-800">
              <Link
                to={`/${creator.username}`}
                className="flex items-center gap-2 group"
              >
                {creator.photoURL ? (
                  <img
                    src={creator.photoURL}
                    alt={creator.displayName}
                    className="w-6 h-6 rounded-md object-cover border border-neutral-200 dark:border-neutral-700"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-md bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 flex items-center justify-center font-bold text-xs">
                    {creator.displayName ? creator.displayName[0].toUpperCase() : 'C'}
                  </div>
                )}
                <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 group-hover:underline">
                  {creator.displayName} <span className="text-neutral-500 font-normal">(@{creator.username})</span>
                </span>
              </Link>
              {creator.headline && (
                <span className="text-xs text-neutral-500 truncate hidden sm:inline">
                  • {creator.headline}
                </span>
              )}
            </div>
          </div>

          {resource.coverUrl && (
            <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-xl overflow-hidden border border-slate-200/80 dark:border-white/10 shadow-clay-sm shrink-0">
              <img
                src={resource.coverUrl}
                alt={resource.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}
        </div>

        {/* Expired Notice */}
        {isExpired && !isOwner && (
          <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300 flex items-center gap-2.5 shadow-clay-sm">
            <Clock className="w-4 h-4 shrink-0 text-red-600 dark:text-red-400" />
            <span>
              This document expired on {new Date(resource.expiresAt!).toLocaleString()}. Access has closed.
            </span>
          </div>
        )}

        {/* Capacity Cap Notice */}
        {isCapacityReached && !isUnlocked && !isOwner && (
          <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2.5 shadow-clay-sm">
            <Users className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <span>
              This document had a limit of {resource.maxUnlocks} viewers, and all slots have been claimed.
            </span>
          </div>
        )}

        {/* View-Only Notice */}
        {!allowDownload && isUnlocked && (
          <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2 shadow-clay-sm">
            <EyeOff className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <span>
              This document is distributed in view-only mode by the creator. You can read the entire guide in the reader below, but raw file downloading is disabled.
            </span>
          </div>
        )}

        {/* Gated Access: 4-Digit Code Input OR Password Gate OR Native PDF Document Reader */}
        {!isUnlocked ? (
          <Card className="p-8 text-center border-slate-200/80 dark:border-white/10 shadow-clay-card max-w-lg mx-auto">
            <div className="w-12 h-12 rounded-xl bg-[#e7ecf3] dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 flex items-center justify-center mx-auto mb-4 border border-slate-200/80 dark:border-white/10 shadow-clay-sm">
              {isExpired || (isCapacityReached && !isOwner) ? (
                <Lock className="w-6 h-6 text-red-500" />
              ) : (
                <Shield className="w-6 h-6" />
              )}
            </div>

            <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 mb-1">
              {isExpired
                ? 'Document Expired'
                : isCapacityReached && !isOwner
                ? 'Capacity Reached'
                : 'Enter 4-Digit Code'}
            </h2>

            <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-6 max-w-sm mx-auto">
              {isExpired
                ? 'This guide was time-limited and is no longer open for access.'
                : isCapacityReached && !isOwner
                ? 'This document has reached maximum viewer capacity.'
                : `This document is protected. Enter the 4-digit access code shared by ${
                    creator.displayName || creator.username
                  } to view.`}
            </p>

            {cooldownSeconds > 0 && (
              <div className="mb-4 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-xs text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 shadow-clay-sm">
                Rate limit cooldown active. Please wait {cooldownSeconds}s before trying again.
              </div>
            )}

            {isExpired && !isOwner ? (
              <div className="p-4 rounded-xl bg-[#e7ecf3]/70 dark:bg-[#12151e]/80 shadow-clay-inset border border-slate-200/80 dark:border-white/10 text-xs text-neutral-600 dark:text-neutral-400">
                Document availability has ended. Contact @{creator.username} for updates.
              </div>
            ) : isCapacityReached && !isOwner ? (
              <div className="p-4 rounded-xl bg-[#e7ecf3]/70 dark:bg-[#12151e]/80 shadow-clay-inset border border-slate-200/80 dark:border-white/10 text-xs text-neutral-600 dark:text-neutral-400">
                All {resource.maxUnlocks} access slots have been claimed.
              </div>
            ) : (
              <CodeInput
                length={4}
                onComplete={handleInlineCodeSubmit}
                onChange={() => {
                  if (codeError) setCodeError(null);
                }}
                isLoading={isVerifying}
                error={codeError}
                disabled={cooldownSeconds > 0}
                autoFocus={true}
              />
            )}

            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-white/10">
              <Link
                to={`/${creator.username}`}
                className="text-xs text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
              >
                View all documents by {creator.displayName || creator.username} →
              </Link>
            </div>
          </Card>
        ) : resource.password && !isPasswordUnlocked && !isOwner ? (
          /* Password Protection Gate */
          <Card className="p-8 text-center border-slate-200/80 dark:border-white/10 shadow-clay-card max-w-lg mx-auto">
            <div className="w-12 h-12 rounded-xl bg-[#e7ecf3] dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 flex items-center justify-center mx-auto mb-4 border border-slate-200/80 dark:border-white/10 shadow-clay-sm">
              <Key className="w-6 h-6" />
            </div>

            <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 mb-1">
              Password Protected Document
            </h2>

            <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-6 max-w-sm mx-auto">
              This document requires an access password set by {creator.displayName || creator.username}. Enter the password to view and download.
            </p>

            {cooldownSeconds > 0 && (
              <div className="mb-4 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-xs text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 shadow-clay-sm">
                Rate limit cooldown active. Please wait {cooldownSeconds}s before trying again.
              </div>
            )}

            <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-sm mx-auto">
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={passwordInput}
                  onChange={e => {
                    setPasswordInput(e.target.value);
                    if (passwordError) setPasswordError(null);
                  }}
                  placeholder="Enter document password"
                  autoFocus
                  disabled={cooldownSeconds > 0}
                  className="w-full h-11 px-3.5 pr-10 text-sm rounded-xl border border-slate-200/80 dark:border-white/10 bg-[#e7ecf3]/70 dark:bg-[#12151e]/80 text-neutral-900 dark:text-neutral-100 font-mono shadow-clay-inset focus:outline-none focus:bg-white dark:focus:bg-[#1a1e28] focus:shadow-clay-inset-focus"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {passwordError && (
                <p className="text-xs font-medium text-red-600 dark:text-red-400 text-left">
                  {passwordError}
                </p>
              )}

              <Button
                type="submit"
                variant="primary"
                className="w-full"
                isLoading={isVerifyingPassword}
                disabled={!passwordInput.trim() || cooldownSeconds > 0}
              >
                <Key className="w-4 h-4" />
                <span>Unlock Document</span>
              </Button>
            </form>

            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-white/10">
              <Link
                to={`/${creator.username}`}
                className="text-xs text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
              >
                View all documents by {creator.displayName || creator.username} →
              </Link>
            </div>
          </Card>
        ) : (
          /* Native PDF Document Viewer */
          <div className="space-y-4">
            <div className="w-full min-h-[85vh] sm:min-h-[90vh] h-[85vh] sm:h-[90vh] bg-white dark:bg-[#141822] rounded-2xl overflow-hidden border border-slate-200/80 dark:border-white/10 shadow-clay-card relative">
              <object
                data={`${blobUrl || resource.fileUrl}#view=FitH`}
                type="application/pdf"
                className="w-full h-full"
              >
                <iframe
                  src={`${blobUrl || resource.fileUrl}#view=FitH`}
                  title={resource.title}
                  className="w-full h-full border-none"
                />
              </object>
            </div>

            {/* Social In-App Browser Helper */}
            {(allowDownload || isOwner) && (
              <div className="px-4 py-2.5 bg-white/80 dark:bg-neutral-900/80 border border-slate-200/80 dark:border-white/10 rounded-xl shadow-clay-sm text-[11px] text-neutral-500 text-center">
                Viewing inside Instagram or a social in-app browser? If preview is blank, tap{' '}
                <a
                  href={blobUrl || resource.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium underline text-neutral-700 dark:text-neutral-300"
                >
                  Open in new tab
                </a>
                .
              </div>
            )}
          </div>
        )}
      </main>

      {/* Viewer Account Modal (for guests clicking "Save to Library") */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in-up">
          <Card className="w-full max-w-sm p-6 relative border-slate-200/80 dark:border-white/15 shadow-clay-card animate-clay-pop">
            <button
              onClick={() => setShowAuthModal(false)}
              className="absolute top-4 right-4 p-1 text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 rounded-md"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-10 h-10 rounded-xl bg-neutral-900 text-neutral-50 dark:bg-neutral-100 dark:text-neutral-900 flex items-center justify-center mb-3 shadow-clay-sm">
              <Bookmark className="w-5 h-5" />
            </div>

            <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-50 mb-1">
              Save to Your Library
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-5 leading-relaxed">
              Create a free viewer account to save this document and access it anytime from your personal library.
            </p>

            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full flex items-center justify-center gap-2"
                onClick={handleGoogleSignInAndSave}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Continue with Google</span>
              </Button>

              <Button
                variant="primary"
                className="w-full"
                onClick={() => {
                  setShowAuthModal(false);
                  navigate('/signup');
                }}
              >
                <span>Create Free Account</span>
              </Button>

              <div className="pt-2 text-center">
                <span className="text-xs text-neutral-500">Already have an account? </span>
                <Link
                  to="/login"
                  onClick={() => setShowAuthModal(false)}
                  className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 underline"
                >
                  Sign in
                </Link>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
