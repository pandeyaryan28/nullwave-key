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
import { Resource, SavedResource } from '../../types';
import { getSavedResources } from '../../lib/storage/savedResourcesService';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import {
  FileText,
  Eye,
  Users,
  Download,
  Plus,
  Copy,
  Check,
  ExternalLink,
  Search,
  ArrowRight,
  Bookmark,
  Edit,
  Key,
} from 'lucide-react';

export const DashboardOverviewPage: React.FC = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [resources, setResources] = useState<Resource[]>([]);
  const [savedResources, setSavedResources] = useState<SavedResource[]>([]);
  const isViewerAccount = profile?.accountType === 'viewer' && !profile?.username;
  const [activeTab, setActiveTab] = useState<'uploads' | 'saved'>(
    profile?.accountType === 'viewer' && !profile?.username ? 'saved' : 'uploads'
  );
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);
  const [copiedProfileLink, setCopiedProfileLink] = useState<boolean>(false);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        // 1. Fetch creator uploads
        let list: Resource[] = [];
        try {
          const q = query(
            collection(db, 'resources'),
            where('creatorId', '==', user.uid),
            orderBy('createdAt', 'desc'),
            limit(50)
          );
          const snap = await getDocs(q);
          list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Resource));
        } catch {
          // Fallback unordered query
          try {
            const fallbackQ = query(
              collection(db, 'resources'),
              where('creatorId', '==', user.uid)
            );
            const snap = await getDocs(fallbackQ);
            list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Resource));
            list.sort((a, b) => b.createdAt - a.createdAt);
          } catch (e) {
            console.error('Failed to query resources:', e);
          }
        }

        // Local storage cache fallback if Firestore query is empty
        if (list.length === 0) {
          try {
            const local = JSON.parse(
              localStorage.getItem(`nullwave_resources_${user.uid}`) ||
              localStorage.getItem(`unlockr_resources_${user.uid}`) ||
              '[]'
            ) as Resource[];
            if (local.length > 0) list = local;
          } catch {}
        }
        setResources(list);

        // 2. Fetch saved resources for viewer library tab
        try {
          const saved = await getSavedResources(user.uid);
          setSavedResources(saved);
        } catch (e) {
          console.warn('Failed to load saved resources for dashboard:', e);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const copyCode = (resourceId: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeId(resourceId);
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  const copyDocLink = (resource: Resource) => {
    if (!profile?.username) return;
    const url = `${window.location.origin}/${profile.username}/${resource.code}`;
    navigator.clipboard.writeText(url);
    setCopiedLinkId(resource.id);
    setTimeout(() => setCopiedLinkId(null), 2000);
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

  const filteredResources = resources.filter(res => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      res.title.toLowerCase().includes(q) ||
      res.code.includes(q) ||
      (res.category && res.category.toLowerCase().includes(q))
    );
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array(4).fill(0).map((_, i) => (
            <div key={i} className="h-24 bg-neutral-200 dark:bg-neutral-800 rounded-md animate-pulse" />
          ))}
        </div>
        <div className="h-64 bg-neutral-200 dark:bg-neutral-800 rounded-md animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Redesigned Dashboard Header */}
      <div className="p-6 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#1a1e28] shadow-clay-card flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all duration-200">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
              Welcome back{profile?.displayName ? `, ${profile.displayName}` : ''}
            </h1>
          </div>
          {profile?.username ? (
            <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
              <span>Public Profile:</span>
              <span className="font-mono font-medium text-neutral-800 dark:text-neutral-200">
                {window.location.origin}/{profile.username}
              </span>
            </div>
          ) : isViewerAccount ? (
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Your personal library of saved guides and documents.
            </p>
          ) : (
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Manage your documents and view real-time reader engagement.
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {profile?.username && (
            <>
              <Button variant="outline" size="sm" onClick={copyProfileUrl}>
                {copiedProfileLink ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                <span>{copiedProfileLink ? 'Profile Copied' : 'Copy Profile Link'}</span>
              </Button>

              <Link to={`/${profile.username}`} target="_blank" rel="noreferrer">
                <Button variant="secondary" size="sm">
                  <span>View Public Profile</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </>
          )}

          {isViewerAccount ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/onboarding')}
            >
              <Plus className="w-4 h-4" />
              <span>Become a Creator</span>
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate('/dashboard/resources/new')}
            >
              <Plus className="w-4 h-4" />
              <span>Upload Document</span>
            </Button>
          )}
        </div>
      </div>

      {/* Metric Counters */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card variant="elevated" className="p-5 hover:shadow-clay-card-hover transition-all">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Documents</span>
            <div className="w-8 h-8 rounded-xl bg-[#e7ecf3] dark:bg-[#131720] shadow-clay-inset flex items-center justify-center border border-slate-200/60 dark:border-white/5">
              <FileText className="w-4 h-4 text-neutral-700 dark:text-neutral-300" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-neutral-100 font-mono">
            {totalResources.toLocaleString()}
          </div>
        </Card>

        <Card variant="elevated" className="p-5 hover:shadow-clay-card-hover transition-all">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Views</span>
            <div className="w-8 h-8 rounded-xl bg-[#e7ecf3] dark:bg-[#131720] shadow-clay-inset flex items-center justify-center border border-slate-200/60 dark:border-white/5">
              <Eye className="w-4 h-4 text-neutral-700 dark:text-neutral-300" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-neutral-100 font-mono">
            {totalViews.toLocaleString()}
          </div>
        </Card>

        <Card variant="elevated" className="p-5 hover:shadow-clay-card-hover transition-all">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Unique Visitors</span>
            <div className="w-8 h-8 rounded-xl bg-[#e7ecf3] dark:bg-[#131720] shadow-clay-inset flex items-center justify-center border border-slate-200/60 dark:border-white/5">
              <Users className="w-4 h-4 text-neutral-700 dark:text-neutral-300" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-neutral-100 font-mono">
            {uniqueViews.toLocaleString()}
          </div>
        </Card>

        <Card variant="elevated" className="p-5 hover:shadow-clay-card-hover transition-all">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Downloads</span>
            <div className="w-8 h-8 rounded-xl bg-[#e7ecf3] dark:bg-[#131720] shadow-clay-inset flex items-center justify-center border border-slate-200/60 dark:border-white/5">
              <Download className="w-4 h-4 text-neutral-700 dark:text-neutral-300" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-neutral-100 font-mono">
            {totalDownloads.toLocaleString()}
          </div>
        </Card>
      </div>

      {/* Tabs & Search Controls */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('uploads')}
              className={`px-3.5 py-1.5 text-sm font-semibold rounded-xl transition-all cursor-pointer ${
                activeTab === 'uploads'
                  ? 'bg-neutral-900 text-neutral-50 dark:bg-neutral-100 dark:text-neutral-900 shadow-clay-btn'
                  : 'bg-white/60 dark:bg-[#1a1e28]/60 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 border border-slate-200/80 dark:border-white/10 shadow-clay-sm'
              }`}
            >
              My Uploads ({resources.length})
            </button>
            <button
              onClick={() => setActiveTab('saved')}
              className={`px-3.5 py-1.5 text-sm font-semibold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'saved'
                  ? 'bg-neutral-900 text-neutral-50 dark:bg-neutral-100 dark:text-neutral-900 shadow-clay-btn'
                  : 'bg-white/60 dark:bg-[#1a1e28]/60 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 border border-slate-200/80 dark:border-white/10 shadow-clay-sm'
              }`}
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span>Saved Library ({savedResources.length})</span>
            </button>
          </div>

          {activeTab === 'uploads' && resources.length > 0 && (
            <div className="relative w-full sm:w-64">
              <Input
                placeholder="Search by title or access code..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-8 text-xs h-9"
              />
              <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-2.5 pointer-events-none" />
            </div>
          )}
        </div>

        {/* Tab 1: Creator Uploads */}
        {activeTab === 'uploads' && (
          <div>
            {resources.length === 0 ? (
              <Card variant="inset" className="p-12 text-center border-dashed border-2 border-slate-300 dark:border-neutral-700">
                <div className="w-12 h-12 rounded-xl bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 flex items-center justify-center mx-auto mb-4 border border-slate-200/80 dark:border-white/10 shadow-clay-sm">
                  <FileText className="w-6 h-6" />
                </div>
                <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 mb-2">
                  No documents uploaded yet
                </h2>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 max-w-md mx-auto mb-6">
                  Upload your first PDF document to generate an isolated 4-digit access code and canonical link to share with your audience.
                </p>
                <Button
                  size="md"
                  variant="primary"
                  onClick={() => navigate('/dashboard/resources/new')}
                >
                  <Plus className="w-4 h-4" />
                  <span>Upload Your First Document</span>
                </Button>
              </Card>
            ) : filteredResources.length === 0 ? (
              <Card variant="inset" className="p-8 text-center border-slate-200/80 dark:border-white/10">
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  No documents found matching &quot;{searchQuery}&quot;.
                </p>
              </Card>
            ) : (
              <div className="space-y-3">
                {filteredResources.map(res => (
                  <Card
                    key={res.id}
                    variant="interactive"
                    className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-4 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-[#e7ecf3] dark:bg-[#131720] text-neutral-700 dark:text-neutral-300 flex items-center justify-center shrink-0 border border-slate-200/60 dark:border-white/5 shadow-clay-inset">
                        <FileText className="w-5 h-5" />
                      </div>

                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                            {res.title}
                          </h3>
                          <Badge variant={res.status === 'active' ? 'success' : 'neutral'} className="text-[10px]">
                            {res.status}
                          </Badge>
                          {res.category && (
                            <Badge variant="neutral" className="text-[10px]">
                              {res.category}
                            </Badge>
                          )}
                          {res.isPinned && (
                            <Badge variant="neutral" className="text-[10px]">
                              Pinned
                            </Badge>
                          )}
                          {res.password && (
                            <Badge variant="neutral" className="text-[10px] flex items-center gap-1">
                              <Key className="w-2.5 h-2.5" />
                              <span>Password Protected</span>
                            </Badge>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-500 dark:text-neutral-400">
                          <span>{res.totalViews} views</span>
                          <span>•</span>
                          <span>{res.uniqueViews} unique</span>
                          <span>•</span>
                          <span>{res.totalDownloads} downloads</span>
                          <span>•</span>
                          <span className="font-mono">{(res.fileSizeBytes / (1024 * 1024)).toFixed(1)} MB</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions: Code Badge, 1-Click Link Copy, Edit, View */}
                    <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
                      {/* Click-to-copy access code */}
                      <button
                        type="button"
                        onClick={() => copyCode(res.id, res.code)}
                        title="Click to copy access code"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200/80 dark:border-white/10 bg-[#e7ecf3] dark:bg-[#131720] shadow-clay-inset hover:shadow-clay-sm transition-all text-xs font-mono font-bold text-neutral-900 dark:text-neutral-100 cursor-pointer active:scale-95"
                      >
                        <span className="tracking-wider">{res.code}</span>
                        {copiedCodeId === res.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5 text-neutral-400" />
                        )}
                      </button>

                      {/* 1-Click canonical link copy (url/username/code) */}
                      {profile?.username && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyDocLink(res)}
                          title="Copy direct document link"
                          className="text-xs"
                        >
                          {copiedLinkId === res.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                          <span className="hidden sm:inline">
                            {copiedLinkId === res.id ? 'Copied' : 'Share Link'}
                          </span>
                        </Button>
                      )}

                      <Link to={`/dashboard/resources/${res.id}/edit`}>
                        <Button size="sm" variant="outline" className="text-xs">
                          <Edit className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Edit</span>
                        </Button>
                      </Link>

                      {profile?.username && (
                        <Link
                          to={`/${profile.username}/${res.code}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <Button size="sm" variant="secondary" className="text-xs">
                            <span>Open</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Button>
                        </Link>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Saved Library */}
        {activeTab === 'saved' && (
          <div>
            {savedResources.length === 0 ? (
              <Card variant="inset" className="p-12 text-center border-dashed border-2 border-slate-300 dark:border-neutral-700">
                <div className="w-12 h-12 rounded-xl bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 flex items-center justify-center mx-auto mb-4 border border-slate-200/80 dark:border-white/10 shadow-clay-sm">
                  <Bookmark className="w-6 h-6" />
                </div>
                <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 mb-1">
                  No saved documents yet
                </h2>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-md mx-auto mb-6">
                  Save documents you find from creators to access and read them anytime in your personal library.
                </p>
                <Link to="/">
                  <Button variant="outline" size="sm">
                    Discover Documents
                  </Button>
                </Link>
              </Card>
            ) : (
              <div className="space-y-3">
                {savedResources.map(item => (
                  <Card
                    key={item.resourceId}
                    variant="interactive"
                    className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-4 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-[#e7ecf3] dark:bg-[#131720] text-neutral-700 dark:text-neutral-300 flex items-center justify-center shrink-0 border border-slate-200/60 dark:border-white/5 shadow-clay-inset">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 space-y-1">
                        <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                          {item.title}
                        </h3>
                        <p className="text-xs text-neutral-500">
                          by {item.creatorDisplayName || item.creatorUsername} (@{item.creatorUsername})
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <Link to={`/${item.creatorUsername}/${item.code}`} target="_blank">
                        <Button size="sm" variant="primary" className="text-xs">
                          <span>Open Document</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Button>
                      </Link>
                    </div>
                  </Card>
                ))}

                <div className="pt-2 text-right">
                  <Link
                    to="/dashboard/saved"
                    className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-neutral-100 inline-flex items-center gap-1"
                  >
                    <span>View full saved library</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
