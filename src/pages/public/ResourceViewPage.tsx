import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  collection,
  query,
  where,
  getDocs,
  limit,
} from 'firebase/firestore';
import { db } from '../../lib/firebase/config';
import { Resource, UserProfile } from '../../types';
import { trackResourceView, trackResourceDownload } from '../../lib/analytics/tracker';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { ThemeToggle } from '../../components/ui/ThemeToggle';
import {
  ArrowLeft,
  Download,
  Lock,
  ExternalLink,
  FileText,
  Eye,
  Calendar,
} from 'lucide-react';

export const ResourceViewPage: React.FC = () => {
  const { username, publicSlug } = useParams<{ username: string; publicSlug: string }>();

  const [creator, setCreator] = useState<UserProfile | null>(null);
  const [resource, setResource] = useState<Resource | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [notFound, setNotFound] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);

  // Prevent multiple view tracks on re-renders in the same mount
  const hasTrackedView = useRef<boolean>(false);

  const cleanUsername = (username || '').replace(/^@/, '').toLowerCase();

  useEffect(() => {
    const fetchResource = async () => {
      if (!cleanUsername || !publicSlug) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // First get creator
        const userQ = query(
          collection(db, 'users'),
          where('username', '==', cleanUsername),
          limit(1)
        );
        const userSnap = await getDocs(userQ);

        let creatorData: UserProfile | null = null;
        if (!userSnap.empty) {
          creatorData = userSnap.docs[0].data() as UserProfile;
        } else {
          const localProfile = localStorage.getItem(`unlockr_profile_${cleanUsername}`);
          if (localProfile) creatorData = JSON.parse(localProfile);
        }

        if (!creatorData) {
          setNotFound(true);
          setLoading(false);
          return;
        }
        setCreator(creatorData);

        // Fetch resource by creatorId + publicSlug
        const resQ = query(
          collection(db, 'resources'),
          where('creatorId', '==', creatorData.uid),
          where('publicSlug', '==', publicSlug),
          where('status', '==', 'active'),
          limit(1)
        );
        const resSnap = await getDocs(resQ);

        if (resSnap.empty) {
          setNotFound(true);
          setLoading(false);
          return;
        }

        const resData = {
          id: resSnap.docs[0].id,
          ...resSnap.docs[0].data(),
        } as Resource;

        setResource(resData);

        // Track page view once per mount
        if (!hasTrackedView.current) {
          hasTrackedView.current = true;
          trackResourceView(resData.id, resData.creatorId).then(res => {
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
      } catch (err) {
        console.error('Error fetching resource:', err);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    fetchResource();
  }, [cleanUsername, publicSlug]);

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

      // 2. Trigger actual browser file download
      const link = document.createElement('a');
      link.href = resource.fileUrl;
      link.download = resource.fileName || `${resource.title}.pdf`;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
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
          <Lock className="w-6 h-6" />
        </div>
        <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">
          Resource Unavailable
        </h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400 max-w-sm mb-6">
          This resource is either disabled, has been removed, or does not exist under @{cleanUsername}.
        </p>
        <Link to={`/@${cleanUsername}`}>
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4" />
            <span>Back to @{cleanUsername}</span>
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
            to={`/@${creator.username}`}
            className="inline-flex items-center gap-2 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:text-neutral-950 dark:hover:text-neutral-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to @{creator.username}</span>
          </Link>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Button
              size="sm"
              variant="primary"
              onClick={handleDownload}
              isLoading={isDownloading}
            >
              <Download className="w-4 h-4" />
              <span>Download PDF</span>
            </Button>
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
                  to={`/@${creator.username}`}
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
                    {creator.displayName} (@{creator.username})
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

        {/* Embedded In-Browser PDF Viewer */}
        <Card className="overflow-hidden border-neutral-300 dark:border-neutral-700">
          <div className="p-3 bg-neutral-100 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between text-xs text-neutral-600 dark:text-neutral-400">
            <span className="font-medium flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              <span>{resource.fileName || `${resource.title}.pdf`}</span>
            </span>

            <div className="flex items-center gap-2">
              <a
                href={resource.fileUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 hover:text-neutral-900 dark:hover:text-neutral-100"
              >
                <span>Open in new tab</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          <div className="w-full h-[65vh] min-h-[480px] bg-neutral-200 dark:bg-neutral-950 flex flex-col">
            <iframe
              src={`${resource.fileUrl}#view=FitH`}
              title={resource.title}
              className="w-full h-full border-none"
            />
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
      </main>

      {/* Clean Footer */}
      <footer className="border-t border-neutral-200 dark:border-neutral-800 py-6 text-center text-xs text-neutral-500 dark:text-neutral-400 mt-auto">
        Distributed via Unlockr
      </footer>
    </div>
  );
};
