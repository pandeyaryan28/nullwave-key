import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
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
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { CodeInput } from '../../components/ui/CodeInput';
import { ThemeToggle } from '../../components/ui/ThemeToggle';
import {
  ArrowLeft,
  Download,
  Waves,
  Radio,
  ExternalLink,
  FileText,
  Eye,
  Calendar,
} from 'lucide-react';

export const ResourceViewPage: React.FC = () => {
  const { username, publicSlug } = useParams<{ username: string; publicSlug: string }>();
  const { user } = useAuth();

  // Redirect legacy @, encoded %40, or mixed-case handles immediately to clean canonical URL
  if (username && (username !== username.toLowerCase() || /^[@%40]/.test(username))) {
    const clean = username.replace(/^[@%40]+/, '').toLowerCase();
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

  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  // Prevent multiple view tracks on re-renders in the same mount
  const hasTrackedView = useRef<boolean>(false);

  const cleanUsername = (username || '').replace(/^[@%40]+/, '').toLowerCase();

  // Create clean Blob URL for base64 data URLs, Firestore chunks, or Storage URLs
  useEffect(() => {
    if (!resource?.fileUrl || !isUnlocked) return;

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
    if (!cleanUsername || !publicSlug) return;
    const nullwaveKey = `nullwave_cooldown_${cleanUsername}_${publicSlug}`;
    const unlockrKey = `unlockr_cooldown_${cleanUsername}_${publicSlug}`;

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
  }, [cleanUsername, publicSlug]);

  useEffect(() => {
    const fetchResource = async () => {
      if (!cleanUsername || !publicSlug) {
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

        // 2. Fetch resource by creatorId + publicSlug (+ status == 'active' for public viewers)
        const isOwner = user?.uid === creatorData.uid;
        const constraints = [
          where('creatorId', '==', creatorData.uid),
          where('publicSlug', '==', publicSlug),
        ];
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
              resData = localList.find(
                r => r.publicSlug === publicSlug && (isOwner || r.status === 'active')
              ) || null;
            }
          } catch {}
        }

        if (!resData || (!isOwner && resData.status !== 'active')) {
          setNotFound(true);
          setLoading(false);
          return;
        }

        setResource(resData);

        // Check if unlocked in session or if logged in creator owns the resource
        const alreadyUnlocked =
          sessionStorage.getItem(`nullwave_unlocked_${resData.id}`) === 'true' ||
          sessionStorage.getItem(`unlockr_unlocked_${resData.id}`) === 'true' ||
          user?.uid === resData.creatorId;

        if (alreadyUnlocked) {
          setIsUnlocked(true);
        }
      } catch (err) {
        console.error('Error fetching resource:', err);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    fetchResource();
  }, [cleanUsername, publicSlug, user?.uid]);

  // Track page view once unlocked
  useEffect(() => {
    if (!resource || !isUnlocked) return;

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

  const handleInlineCodeSubmit = (enteredCode: string) => {
    if (!resource) return;

    const nullwaveCooldownKey = `nullwave_cooldown_${cleanUsername}_${publicSlug}`;
    const unlockrCooldownKey = `unlockr_cooldown_${cleanUsername}_${publicSlug}`;
    const nullwaveAttemptsKey = `nullwave_attempts_${cleanUsername}_${publicSlug}`;
    const unlockrAttemptsKey = `unlockr_attempts_${cleanUsername}_${publicSlug}`;

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
        setCodeError('Incorrect 6-digit access code. Please check the code shared by the creator.');
      }
      setIsVerifying(false);
    }
  };

  const handleDownload = async () => {
    if (!resource) return;
    setIsDownloading(true);

    try {
      // 1. Record download event in analytics atomically
      await trackResourceDownload(resource.id, resource.creatorId);

      // Update local counter
      setResource(prev =>
        prev ? { ...prev, totalDownloads: prev.totalDownloads + 1 } : null
      );

      const targetUrl = blobUrl || resource.fileUrl;
      const fileName = resource.fileName || `${resource.title}.pdf`;

      // 2. Trigger reliable browser file download via Blob (enforces custom fileName)
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

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-md bg-neutral-200 dark:bg-neutral-800 animate-pulse mb-4" />
        <div className="h-6 w-48 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse mb-2" />
        <div className="h-4 w-32 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" />
      </div>
    );
  }

  if (notFound || !resource || !creator) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 rounded-md bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center mb-4 text-neutral-500">
          <Waves className="w-6 h-6" />
        </div>
        <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">
          Resource Unavailable
        </h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400 max-w-sm mb-6">
          This resource is either disabled, has been removed, or does not exist under {cleanUsername}.
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
      {/* Top Header */}
      <header className="sticky top-0 z-40 border-b border-neutral-200 dark:border-neutral-800 bg-white/90 dark:bg-neutral-950/90 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link
            to={`/${creator.username}`}
            className="inline-flex items-center gap-2 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:text-neutral-950 dark:hover:text-neutral-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to {creator.displayName || creator.username}</span>
          </Link>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            {isUnlocked ? (
              <Button
                size="sm"
                variant="primary"
                onClick={handleDownload}
                isLoading={isDownloading}
              >
                <Download className="w-4 h-4" />
                <span>Download PDF</span>
              </Button>
            ) : (
              <div className="text-xs text-neutral-500 flex items-center gap-1.5 font-medium">
                <Radio className="w-3.5 h-3.5" />
                <span>Wave Protected</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full space-y-6">
        {/* Resource Header Card */}
        <Card className="p-6 sm:p-8">
          <div className="flex flex-col md:flex-row items-start justify-between gap-6">
            <div className="space-y-3 flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                {resource.category && (
                  <Badge variant="neutral">{resource.category}</Badge>
                )}
                <span className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {formattedDate}
                </span>
                <span className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center gap-1 font-mono">
                  {(resource.fileSizeBytes / (1024 * 1024)).toFixed(1)} MB
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50 leading-tight">
                {resource.title}
              </h1>

              {resource.description && (
                <p className="text-sm sm:text-base text-neutral-600 dark:text-neutral-300 leading-relaxed max-w-3xl">
                  {resource.description}
                </p>
              )}

              {/* Creator Bylines */}
              <div className="pt-2 flex items-center gap-3 border-t border-neutral-100 dark:border-neutral-800">
                <Link
                  to={`/${creator.username}`}
                  className="flex items-center gap-2 group"
                >
                  {creator.photoURL ? (
                    <img
                      src={creator.photoURL}
                      alt={creator.displayName}
                      className="w-7 h-7 rounded-md object-cover border border-neutral-200 dark:border-neutral-700"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-md bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 flex items-center justify-center font-bold text-xs">
                      {creator.displayName ? creator.displayName[0].toUpperCase() : 'C'}
                    </div>
                  )}
                  <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 group-hover:underline">
                    {creator.displayName} <span className="text-neutral-500 font-normal">({creator.username})</span>
                  </span>
                </Link>
              </div>
            </div>

            {/* Optional Resource Cover */}
            {resource.coverUrl && (
              <div className="w-full md:w-48 h-48 rounded-md overflow-hidden border border-neutral-200 dark:border-neutral-800 shrink-0">
                <img
                  src={resource.coverUrl}
                  alt={resource.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
          </div>
        </Card>

        {/* Gated Access: Inline 6-Digit Code Verification OR Unlocked Document Viewer */}
        {!isUnlocked ? (
          <Card className="p-8 text-center border-neutral-300 dark:border-neutral-700 shadow-sm max-w-lg mx-auto">
            <div className="w-12 h-12 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 flex items-center justify-center mx-auto mb-4 border border-neutral-200 dark:border-neutral-700">
              <Radio className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 mb-1">
              Enter 6-Digit Wave Code
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-6 max-w-sm mx-auto">
              This document is protected. Enter the 6-digit wave code shared by {creator.displayName || creator.username} to view and download it.
            </p>

            {cooldownSeconds > 0 && (
              <div className="mb-4 p-2.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-xs text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                Rate limit cooldown active. Please wait {cooldownSeconds}s before trying again.
              </div>
            )}

            <CodeInput
              length={6}
              onComplete={handleInlineCodeSubmit}
              onChange={() => {
                if (codeError) setCodeError(null);
              }}
              isLoading={isVerifying}
              error={codeError}
              disabled={cooldownSeconds > 0}
              autoFocus={true}
            />

            <div className="mt-6 pt-4 border-t border-neutral-100 dark:border-neutral-800">
              <Link
                to={`/${creator.username}`}
                className="text-xs text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
              >
                Looking for other resources? View {creator.displayName || creator.username}&apos;s profile →
              </Link>
            </div>
          </Card>
        ) : (
          /* Embedded In-Browser PDF Viewer & Direct Download (No Sign-in Required) */
          <Card className="overflow-hidden border-neutral-300 dark:border-neutral-700">
            <div className="p-3 bg-neutral-100 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between text-xs text-neutral-600 dark:text-neutral-400">
              <span className="font-medium flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                <span>{resource.fileName || `${resource.title}.pdf`}</span>
              </span>

              <div className="flex items-center gap-2">
                <a
                  href={blobUrl || resource.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 hover:text-neutral-900 dark:hover:text-neutral-100"
                >
                  <span>Open in new tab</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            <div className="w-full h-[65vh] min-h-[480px] bg-neutral-200 dark:bg-neutral-950 flex flex-col relative">
              <iframe
                src={`${blobUrl || resource.fileUrl}#view=FitH`}
                title={resource.title}
                className="w-full h-full border-none"
              />
            </div>

            {/* Social Webview Helper */}
            <div className="px-4 py-2 bg-neutral-50 dark:bg-neutral-900/50 border-t border-neutral-200 dark:border-neutral-800 text-[11px] text-neutral-500 text-center">
              Viewing inside Instagram or a social app? If preview is blank, tap <span className="font-medium text-neutral-700 dark:text-neutral-300">Open in new tab</span> or <span className="font-medium text-neutral-700 dark:text-neutral-300">Download</span> below.
            </div>

            {/* Quick Download Banner Below Viewer */}
            <div className="p-4 bg-white dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5" />
                  <span>{resource.totalViews} views</span>
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Download className="w-3.5 h-3.5" />
                  <span>{resource.totalDownloads} downloads</span>
                </span>
              </div>

              <Button
                size="md"
                variant="primary"
                onClick={handleDownload}
                isLoading={isDownloading}
                className="w-full sm:w-auto"
              >
                <Download className="w-4 h-4" />
                <span>Download Original PDF</span>
              </Button>
            </div>
          </Card>
        )}
      </main>

      {/* Clean Footer */}
      <footer className="border-t border-neutral-200 dark:border-neutral-800 py-6 text-center text-xs text-neutral-500 dark:text-neutral-400 mt-auto flex items-center justify-center gap-1.5">
        <span>Distributed via</span>
        <Link to="/" className="inline-flex items-center gap-1 font-semibold text-neutral-700 dark:text-neutral-300 hover:text-neutral-950 dark:hover:text-white transition-colors">
          <Waves className="w-3.5 h-3.5" />
          <span>NullWave</span>
        </Link>
      </footer>
    </div>
  );
};
