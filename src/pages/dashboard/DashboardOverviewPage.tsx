import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db } from '../../lib/firebase/config';
import { useAuth } from '../../lib/auth/authContext';
import { Resource } from '../../types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import {
  FileText,
  Eye,
  Users,
  Download,
  Plus,
  Copy,
  Check,
  ExternalLink,
  ArrowRight,
} from 'lucide-react';

export const DashboardOverviewPage: React.FC = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);
  const [copiedProfileLink, setCopiedProfileLink] = useState<boolean>(false);

  useEffect(() => {
    if (!user) return;

    const fetchResources = async () => {
      setLoading(true);
      try {
        const q = query(
          collection(db, 'resources'),
          where('creatorId', '==', user.uid),
          orderBy('createdAt', 'desc'),
          limit(20)
        );
        const snap = await getDocs(q);
        const list: Resource[] = snap.docs.map(
          d => ({ id: d.id, ...d.data() } as Resource)
        );
        setResources(list);
      } catch (err) {
        console.warn('Could not fetch resources with ordered query, falling back:', err);
        try {
          const fallbackQ = query(
            collection(db, 'resources'),
            where('creatorId', '==', user.uid)
          );
          const snap = await getDocs(fallbackQ);
          const list: Resource[] = snap.docs.map(
            d => ({ id: d.id, ...d.data() } as Resource)
          );
          list.sort((a, b) => b.createdAt - a.createdAt);
          setResources(list);
        } catch (e) {
          console.error('Failed to load resources:', e);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchResources();
  }, [user]);

  const copyCode = (resourceId: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeId(resourceId);
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  const copyProfileUrl = () => {
    if (!profile?.username) return;
    const url = `${window.location.origin}/${profile.username}`;
    navigator.clipboard.writeText(url);
    setCopiedProfileLink(true);
    setTimeout(() => setCopiedProfileLink(false), 2000);
  };

  // Aggregate metrics
  const totalResources = resources.length;
  const totalViews = resources.reduce((acc, r) => acc + (r.totalViews || 0), 0);
  const uniqueViews = resources.reduce((acc, r) => acc + (r.uniqueViews || 0), 0);
  const totalDownloads = resources.reduce((acc, r) => acc + (r.totalDownloads || 0), 0);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array(4).fill(0).map((_, i) => (
            <div key={i} className="h-24 bg-neutral-200 dark:bg-neutral-800 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  // Proper Empty State if creator has no resources yet
  if (resources.length === 0) {
    return (
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
              Welcome{profile?.displayName ? `, ${profile.displayName}` : ''}
            </h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
              Distribute digital resources to your audience with frictionless 6-digit codes.
            </p>
          </div>

          {profile?.username && (
            <Button variant="outline" size="sm" onClick={copyProfileUrl}>
              {copiedProfileLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              <span>{copiedProfileLink ? 'Link Copied!' : `Copy /${profile.username}`}</span>
            </Button>
          )}
        </div>

        {/* Empty State Banner */}
        <Card className="p-12 text-center border-dashed border-2 border-neutral-300 dark:border-neutral-700">
          <div className="w-12 h-12 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 flex items-center justify-center mx-auto mb-4 border border-neutral-200 dark:border-neutral-700">
            <FileText className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 mb-2">
            Your resource library is empty.
          </h2>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 max-w-md mx-auto mb-6">
            Upload your first PDF resource, receive an instant 6-digit access code, and share it in your Instagram bio or Reels.
          </p>
          <Button
            size="md"
            variant="primary"
            onClick={() => navigate('/dashboard/resources/new')}
          >
            <Plus className="w-4 h-4" />
            <span>Upload your first resource</span>
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header and Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
            Overview
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
            Real-time access and distribution analytics for your resources.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {profile?.username && (
            <Button variant="outline" size="sm" onClick={copyProfileUrl}>
              {copiedProfileLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              <span>{copiedProfileLink ? 'Copied' : `/${profile.username}`}</span>
            </Button>
          )}

          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/dashboard/resources/new')}
          >
            <Plus className="w-4 h-4" />
            <span>Upload Resource</span>
          </Button>
        </div>
      </div>

      {/* Aggregate Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Resources</span>
            <FileText className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-neutral-100 font-mono">
            {totalResources.toLocaleString()}
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Views</span>
            <Eye className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-neutral-100 font-mono">
            {totalViews.toLocaleString()}
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Unique Views (24h)</span>
            <Users className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-neutral-100 font-mono">
            {uniqueViews.toLocaleString()}
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Downloads</span>
            <Download className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-neutral-100 font-mono">
            {totalDownloads.toLocaleString()}
          </div>
        </Card>
      </div>

      {/* Recent Resources Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
            Recent Resources
          </h2>
          <Link
            to="/dashboard/resources"
            className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-neutral-100 flex items-center gap-1"
          >
            <span>View all ({resources.length})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="space-y-3">
          {resources.slice(0, 5).map(res => (
            <Card
              key={res.id}
              className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors"
            >
              <div className="flex items-start gap-4 min-w-0">
                <div className="w-10 h-10 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 flex items-center justify-center shrink-0 border border-neutral-200 dark:border-neutral-700">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                      {res.title}
                    </h3>
                    <Badge variant={res.status === 'active' ? 'success' : 'neutral'}>
                      {res.status}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                    <span>{res.totalViews} views</span>
                    <span>•</span>
                    <span>{res.uniqueViews} unique</span>
                    <span>•</span>
                    <span>{res.totalDownloads} downloads</span>
                  </div>
                </div>
              </div>

              {/* Code & Actions */}
              <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                <button
                  type="button"
                  onClick={() => copyCode(res.id, res.code)}
                  title="Copy 6-digit access code"
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900/80 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-xs font-mono font-bold text-neutral-900 dark:text-neutral-100"
                >
                  <span className="tracking-widest text-sm">{res.code}</span>
                  {copiedCodeId === res.id ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-neutral-400" />
                  )}
                </button>

                {profile?.username && (
                  <Link
                    to={`/${profile.username}/resource/${res.publicSlug}`}
                    target="_blank"
                    className="p-2 text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                    title="View public resource page"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Link>
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};
