import React, { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  doc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../../lib/firebase/config';
import { useAuth } from '../../lib/auth/authContext';
import { Resource, SavedResource } from '../../types';
import { getSavedResources } from '../../lib/storage/savedResourcesService';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { SocialShareModal } from '../../components/dashboard/SocialShareModal';
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
  Pin,
  Power,
  Share2,
  HardDrive,
  LayoutGrid,
  List,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
} from 'lucide-react';

type SortOption = 'newest' | 'views' | 'downloads' | 'size';
type StatusFilter = 'all' | 'active' | 'disabled' | 'password' | 'pinned';

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
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [loading, setLoading] = useState<boolean>(true);

  // Copy Feedback States
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);
  const [copiedProfileLink, setCopiedProfileLink] = useState<boolean>(false);

  // Share Modal State
  const [selectedShareResource, setSelectedShareResource] = useState<Resource | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);

  // In-Dashboard 4-Digit Code Tester State
  const [testCodeInput, setTestCodeInput] = useState<string>('');
  const [testResult, setTestResult] = useState<{
    status: 'idle' | 'found' | 'not_found';
    resource?: Resource;
    message?: string;
  }>({ status: 'idle' });

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

        // 2. Fetch saved resources for viewer library
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

  const handleToggleStatus = async (resource: Resource) => {
    const newStatus = resource.status === 'active' ? 'disabled' : 'active';
    try {
      await updateDoc(doc(db, 'resources', resource.id), {
        status: newStatus,
        updatedAt: Date.now(),
      });
      setResources(prev =>
        prev.map(r => (r.id === resource.id ? { ...r, status: newStatus } : r))
      );
    } catch (err) {
      console.error('Error toggling status:', err);
    }
  };

  const openShareModal = (resource: Resource) => {
    setSelectedShareResource(resource);
    setIsShareModalOpen(true);
  };

  const handleTestCode = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const code = testCodeInput.trim();
    if (!code) return;

    const match = resources.find(r => r.code === code);
    if (match) {
      setTestResult({
        status: 'found',
        resource: match,
      });
    } else {
      setTestResult({
        status: 'not_found',
        message: `No document found matching code ${code}. Check the 4-digit code and try again.`,
      });
    }
  };

  // Aggregated Performance Metrics
  const totalResources = resources.length;
  const totalViews = resources.reduce((acc, r) => acc + (r.totalViews || 0), 0);
  const uniqueViews = resources.reduce((acc, r) => acc + (r.uniqueViews || 0), 0);
  const totalDownloads = resources.reduce((acc, r) => acc + (r.totalDownloads || 0), 0);

  // Conversion Intelligence
  const downloadConversionRate = totalViews > 0
    ? ((totalDownloads / totalViews) * 100).toFixed(1)
    : '0.0';

  const uniqueReachRatio = totalViews > 0
    ? Math.round((uniqueViews / totalViews) * 100)
    : 0;

  // Storage and Distribution Footprint
  const totalStorageBytes = resources.reduce((acc, r) => acc + (r.fileSizeBytes || 0), 0);
  const totalStorageMB = (totalStorageBytes / (1024 * 1024)).toFixed(1);
  const STORAGE_LIMIT_MB = 500;
  const storagePercentage = Math.min(
    100,
    Math.round((parseFloat(totalStorageMB) / STORAGE_LIMIT_MB) * 100)
  );

  const activeCount = resources.filter(r => r.status === 'active').length;
  const passwordCount = resources.filter(r => Boolean(r.password)).length;
  const pinnedCount = resources.filter(r => Boolean(r.isPinned)).length;
  const unlistedCount = resources.filter(r => r.isPublicListing === false).length;

  // Top Performing Resource Spotlight
  const topPerformingResource = useMemo(() => {
    if (resources.length === 0) return null;
    return [...resources].sort((a, b) => {
      const aScore = (a.totalViews || 0) + (a.totalDownloads || 0) * 2;
      const bScore = (b.totalViews || 0) + (b.totalDownloads || 0) * 2;
      return bScore - aScore;
    })[0];
  }, [resources]);

  // Dynamic Categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    resources.forEach(r => {
      if (r.category) set.add(r.category);
    });
    return Array.from(set);
  }, [resources]);

  // Filtered and Sorted Resources
  const displayedResources = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const filtered = resources.filter(res => {
      const matchesQuery =
        !q ||
        res.title.toLowerCase().includes(q) ||
        res.code.includes(q) ||
        (res.category && res.category.toLowerCase().includes(q)) ||
        (res.description && res.description.toLowerCase().includes(q));

      const matchesCategory =
        selectedCategory === 'all' || res.category === selectedCategory;

      let matchesStatus = true;
      if (statusFilter === 'active') matchesStatus = res.status === 'active';
      else if (statusFilter === 'disabled') matchesStatus = res.status === 'disabled';
      else if (statusFilter === 'password') matchesStatus = Boolean(res.password);
      else if (statusFilter === 'pinned') matchesStatus = Boolean(res.isPinned);

      return matchesQuery && matchesCategory && matchesStatus;
    });

    return filtered.sort((a, b) => {
      if (sortBy === 'newest') return b.createdAt - a.createdAt;
      if (sortBy === 'views') return (b.totalViews || 0) - (a.totalViews || 0);
      if (sortBy === 'downloads') return (b.totalDownloads || 0) - (a.totalDownloads || 0);
      if (sortBy === 'size') return (b.fileSizeBytes || 0) - (a.fileSizeBytes || 0);
      return 0;
    });
  }, [resources, searchQuery, selectedCategory, statusFilter, sortBy]);

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
      {/* 1. Command Center Header */}
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
              Manage your documents, distribution links, and audience engagement.
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

      {/* 2. Four-Metric Performance Pulse */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Documents */}
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
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1">
            {activeCount} active publications
          </p>
        </Card>

        {/* Total Views */}
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
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1">
            Across all publications
          </p>
        </Card>

        {/* Unique Reach Ratio */}
        <Card variant="elevated" className="p-5 hover:shadow-clay-card-hover transition-all">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Unique Reach</span>
            <div className="w-8 h-8 rounded-xl bg-[#e7ecf3] dark:bg-[#131720] shadow-clay-inset flex items-center justify-center border border-slate-200/60 dark:border-white/5">
              <Users className="w-4 h-4 text-neutral-700 dark:text-neutral-300" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-neutral-100 font-mono">
            {uniqueViews.toLocaleString()}
          </div>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1">
            {uniqueReachRatio}% unique reader ratio
          </p>
        </Card>

        {/* Download Conversion Rate */}
        <Card variant="elevated" className="p-5 hover:shadow-clay-card-hover transition-all">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Downloads & Conversion</span>
            <div className="w-8 h-8 rounded-xl bg-[#e7ecf3] dark:bg-[#131720] shadow-clay-inset flex items-center justify-center border border-slate-200/60 dark:border-white/5">
              <Download className="w-4 h-4 text-neutral-700 dark:text-neutral-300" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-neutral-100 font-mono">
            {totalDownloads.toLocaleString()}
          </div>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1 flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
            <span>{downloadConversionRate}% conversion rate</span>
          </p>
        </Card>
      </div>

      {/* 3. Responsive Command Center Layout (Two-Column on lg+) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* ========================================================
            MAIN WORKSPACE (8 Columns on lg)
           ======================================================== */}
        <div className="lg:col-span-8 space-y-6">
          {/* Top Asset Spotlight Card (Only shown if creator has uploads) */}
          {topPerformingResource && activeTab === 'uploads' && (
            <Card
              variant="elevated"
              className="p-5 border-l-4 border-l-neutral-900 dark:border-l-neutral-100 relative overflow-hidden"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase rounded-md bg-neutral-900 text-neutral-50 dark:bg-neutral-100 dark:text-neutral-900 shadow-clay-sm">
                      Top Performing Guide
                    </span>
                    {topPerformingResource.category && (
                      <Badge variant="neutral" className="text-[10px]">
                        {topPerformingResource.category}
                      </Badge>
                    )}
                  </div>

                  <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100 truncate">
                    {topPerformingResource.title}
                  </h2>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-500 dark:text-neutral-400">
                    <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                      {topPerformingResource.totalViews} views
                    </span>
                    <span>•</span>
                    <span>{topPerformingResource.uniqueViews} unique</span>
                    <span>•</span>
                    <span>{topPerformingResource.totalDownloads} downloads</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  {/* Click to copy code */}
                  <button
                    type="button"
                    onClick={() => copyCode(topPerformingResource.id, topPerformingResource.code)}
                    title="Copy access code"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200/80 dark:border-white/10 bg-[#e7ecf3] dark:bg-[#131720] shadow-clay-inset hover:shadow-clay-sm transition-all text-xs font-mono font-bold text-neutral-900 dark:text-neutral-100 cursor-pointer active:scale-95"
                  >
                    <span>{topPerformingResource.code}</span>
                    {copiedCodeId === topPerformingResource.id ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-neutral-400" />
                    )}
                  </button>

                  {/* Launch Share Kit */}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openShareModal(topPerformingResource)}
                    className="text-xs"
                    title="Open social share kit"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Share Kit</span>
                  </Button>

                  {profile?.username && (
                    <Link
                      to={`/${profile.username}/${topPerformingResource.code}`}
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
              </div>
            </Card>
          )}

          {/* Navigation Tabs (Uploads vs Saved Library) */}
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
                My Documents ({resources.length})
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

            {/* View Mode Toggle (Grid vs List) */}
            {activeTab === 'uploads' && resources.length > 0 && (
              <div className="flex items-center gap-1 bg-[#e7ecf3] dark:bg-[#131720] p-1 rounded-xl border border-slate-200/60 dark:border-white/5 shadow-clay-inset self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  title="Card Grid View"
                  className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                    viewMode === 'grid'
                      ? 'bg-white dark:bg-[#1a1e28] text-neutral-900 dark:text-neutral-100 shadow-clay-sm'
                      : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  title="Compact List View"
                  className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                    viewMode === 'list'
                      ? 'bg-white dark:bg-[#1a1e28] text-neutral-900 dark:text-neutral-100 shadow-clay-sm'
                      : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
                  }`}
                >
                  <List className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* TAB 1: CREATOR UPLOADS */}
          {activeTab === 'uploads' && (
            <div className="space-y-4">
              {resources.length > 0 && (
                /* Advanced Search, Category & Multi-Filter Toolbar */
                <div className="p-4 rounded-2xl bg-white dark:bg-[#1a1e28] border border-slate-200/80 dark:border-white/10 shadow-clay-card space-y-3">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    {/* Search Input */}
                    <div className="relative flex-1">
                      <Input
                        placeholder="Search by title, access code, or description..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="pl-8 text-xs h-9"
                      />
                      <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-2.5 pointer-events-none" />
                    </div>

                    {/* Category Filter */}
                    {categories.length > 0 && (
                      <select
                        value={selectedCategory}
                        onChange={e => setSelectedCategory(e.target.value)}
                        aria-label="Filter documents by category"
                        className="h-9 px-3 text-xs rounded-xl border border-slate-200/80 dark:border-white/10 bg-[#e7ecf3]/70 dark:bg-[#12151e]/80 text-neutral-900 dark:text-neutral-100 shadow-clay-inset focus:outline-none cursor-pointer"
                      >
                        <option value="all">All Categories</option>
                        {categories.map(c => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    )}

                    {/* Sort Selector */}
                    <select
                      value={sortBy}
                      onChange={e => setSortBy(e.target.value as SortOption)}
                      aria-label="Sort documents"
                      className="h-9 px-3 text-xs rounded-xl border border-slate-200/80 dark:border-white/10 bg-[#e7ecf3]/70 dark:bg-[#12151e]/80 text-neutral-900 dark:text-neutral-100 shadow-clay-inset focus:outline-none cursor-pointer"
                    >
                      <option value="newest">Newest First</option>
                      <option value="views">Most Views</option>
                      <option value="downloads">Most Downloads</option>
                      <option value="size">File Size</option>
                    </select>
                  </div>

                  {/* Status Filter Chips */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-200/60 dark:border-white/5">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 mr-1">
                      Filter:
                    </span>
                    {(
                      [
                        { id: 'all', label: 'All Status' },
                        { id: 'active', label: 'Active Only' },
                        { id: 'disabled', label: 'Disabled' },
                        { id: 'password', label: 'Password Protected' },
                        { id: 'pinned', label: 'Pinned' },
                      ] as const
                    ).map(item => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setStatusFilter(item.id)}
                        className={`px-2.5 py-1 text-xs font-medium rounded-md border transition-all cursor-pointer ${
                          statusFilter === item.id
                            ? 'bg-neutral-900 text-neutral-50 dark:bg-neutral-100 dark:text-neutral-900 border-transparent shadow-clay-btn'
                            : 'bg-white/70 dark:bg-neutral-800/70 text-neutral-600 dark:text-neutral-400 border-slate-200/80 dark:border-white/10 hover:text-neutral-900 dark:hover:text-neutral-100 shadow-clay-sm'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Document List Rendering */}
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
              ) : displayedResources.length === 0 ? (
                <Card variant="inset" className="p-8 text-center border-slate-200/80 dark:border-white/10 space-y-3">
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    No documents found matching your filter criteria.
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedCategory('all');
                      setStatusFilter('all');
                    }}
                  >
                    Reset Filters
                  </Button>
                </Card>
              ) : viewMode === 'grid' ? (
                /* 1. CARD GRID VIEW */
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {displayedResources.map(res => (
                    <Card
                      key={res.id}
                      variant="elevated"
                      className="p-5 flex flex-col justify-between gap-4 hover:shadow-clay-card-hover transition-all"
                    >
                      <div className="space-y-3">
                        {/* Header: Icon / Thumbnail & Badges */}
                        <div className="flex items-start justify-between gap-3">
                          {res.coverUrl ? (
                            <img
                              src={res.coverUrl}
                              alt={res.title}
                              className="w-12 h-12 rounded-xl object-cover border border-slate-200/80 dark:border-white/10 shadow-clay-sm shrink-0"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-xl bg-[#e7ecf3] dark:bg-[#131720] text-neutral-700 dark:text-neutral-300 flex items-center justify-center shrink-0 border border-slate-200/60 dark:border-white/5 shadow-clay-inset">
                              <FileText className="w-6 h-6" />
                            </div>
                          )}

                          <div className="flex flex-wrap items-center justify-end gap-1">
                            <Badge
                              variant={res.status === 'active' ? 'success' : 'neutral'}
                              className="text-[10px]"
                            >
                              {res.status}
                            </Badge>
                            {res.isPinned && (
                              <Badge variant="neutral" className="text-[10px] flex items-center gap-1">
                                <Pin className="w-2.5 h-2.5" />
                                <span>Pinned</span>
                              </Badge>
                            )}
                            {res.password && (
                              <Badge variant="neutral" className="text-[10px] flex items-center gap-1">
                                <Key className="w-2.5 h-2.5" />
                                <span>Protected</span>
                              </Badge>
                            )}
                            {res.isPublicListing === false && (
                              <Badge variant="neutral" className="text-[10px] flex items-center gap-1">
                                <EyeOff className="w-2.5 h-2.5" />
                                <span>Unlisted</span>
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Title & Category */}
                        <div className="space-y-1">
                          <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 line-clamp-1">
                            {res.title}
                          </h3>
                          {res.category && (
                            <p className="text-xs text-neutral-500 dark:text-neutral-400">
                              {res.category}
                            </p>
                          )}
                          {res.description && (
                            <p className="text-xs text-neutral-600 dark:text-neutral-400 line-clamp-2">
                              {res.description}
                            </p>
                          )}
                        </div>

                        {/* Stats Bar */}
                        <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400 pt-2 border-t border-slate-200/60 dark:border-white/5">
                          <span>{res.totalViews} views</span>
                          <span>{res.totalDownloads} downloads</span>
                          <span className="font-mono">
                            {(res.fileSizeBytes / (1024 * 1024)).toFixed(1)} MB
                          </span>
                        </div>
                      </div>

                      {/* Card Actions Bottom Bar */}
                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200/60 dark:border-white/5">
                        {/* 4-digit code button */}
                        <button
                          type="button"
                          onClick={() => copyCode(res.id, res.code)}
                          title="Click to copy 4-digit code"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-200/80 dark:border-white/10 bg-[#e7ecf3] dark:bg-[#131720] shadow-clay-inset hover:shadow-clay-sm transition-all text-xs font-mono font-bold text-neutral-900 dark:text-neutral-100 cursor-pointer active:scale-95"
                        >
                          <span>{res.code}</span>
                          {copiedCodeId === res.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5 text-neutral-400" />
                          )}
                        </button>

                        <div className="flex items-center gap-1.5">
                          {/* Share kit */}
                          <button
                            type="button"
                            onClick={() => openShareModal(res)}
                            title="Share Kit & Captions"
                            className="p-1.5 rounded-lg border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-neutral-800/70 text-neutral-600 dark:text-neutral-300 hover:text-neutral-950 dark:hover:text-neutral-50 shadow-clay-sm transition-all"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Toggle Active status */}
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(res)}
                            title={res.status === 'active' ? 'Disable document' : 'Enable document'}
                            className={`p-1.5 rounded-lg border border-slate-200/80 dark:border-white/10 shadow-clay-sm transition-all ${
                              res.status === 'active'
                                ? 'text-emerald-600 dark:text-emerald-400 bg-white/70 dark:bg-neutral-800/70'
                                : 'text-neutral-400 bg-slate-100 dark:bg-neutral-800'
                            }`}
                          >
                            <Power className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit */}
                          <Link to={`/dashboard/resources/${res.id}/edit`}>
                            <button
                              type="button"
                              title="Edit document"
                              className="p-1.5 rounded-lg border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-neutral-800/70 text-neutral-600 dark:text-neutral-300 hover:text-neutral-950 dark:hover:text-neutral-50 shadow-clay-sm transition-all"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                          </Link>

                          {/* Direct open */}
                          {profile?.username && (
                            <Link
                              to={`/${profile.username}/${res.code}`}
                              target="_blank"
                              rel="noreferrer"
                            >
                              <button
                                type="button"
                                title="Open document view"
                                className="p-1.5 rounded-lg border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-neutral-800/70 text-neutral-600 dark:text-neutral-300 hover:text-neutral-950 dark:hover:text-neutral-50 shadow-clay-sm transition-all"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </button>
                            </Link>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                /* 2. COMPACT LIST VIEW */
                <div className="space-y-3">
                  {displayedResources.map(res => (
                    <Card
                      key={res.id}
                      variant="interactive"
                      className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="flex items-start gap-4 min-w-0 flex-1">
                        <div className="w-10 h-10 rounded-xl bg-[#e7ecf3] dark:bg-[#131720] text-neutral-700 dark:text-neutral-300 flex items-center justify-center shrink-0 border border-slate-200/60 dark:border-white/5 shadow-clay-inset">
                          <FileText className="w-5 h-5" />
                        </div>

                        <div className="min-w-0 space-y-1 flex-1">
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
                              <Badge variant="neutral" className="text-[10px] flex items-center gap-1">
                                <Pin className="w-2.5 h-2.5" />
                                <span>Pinned</span>
                              </Badge>
                            )}
                            {res.password && (
                              <Badge variant="neutral" className="text-[10px] flex items-center gap-1">
                                <Key className="w-2.5 h-2.5" />
                                <span>Protected</span>
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

                      {/* Right Action Row */}
                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        {/* 4-digit Code */}
                        <button
                          type="button"
                          onClick={() => copyCode(res.id, res.code)}
                          title="Click to copy access code"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200/80 dark:border-white/10 bg-[#e7ecf3] dark:bg-[#131720] shadow-clay-inset hover:shadow-clay-sm transition-all text-xs font-mono font-bold text-neutral-900 dark:text-neutral-100 cursor-pointer active:scale-95"
                        >
                          <span>{res.code}</span>
                          {copiedCodeId === res.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5 text-neutral-400" />
                          )}
                        </button>

                        {/* Share Kit */}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openShareModal(res)}
                          title="Share Kit & Captions"
                          className="text-xs"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Share</span>
                        </Button>

                        {/* 1-Click Link Copy */}
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
                              {copiedLinkId === res.id ? 'Copied' : 'Link'}
                            </span>
                          </Button>
                        )}

                        {/* Edit */}
                        <Link to={`/dashboard/resources/${res.id}/edit`}>
                          <Button size="sm" variant="outline" className="text-xs">
                            <Edit className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Edit</span>
                          </Button>
                        </Link>

                        {/* Open */}
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

          {/* TAB 2: SAVED LIBRARY */}
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

        {/* ========================================================
            SIDEBAR UTILITY & ACTION HUB (4 Columns on lg)
           ======================================================== */}
        <div className="lg:col-span-4 space-y-6">
          {/* 1. In-Dashboard 4-Digit Code Tester */}
          <Card variant="elevated" className="p-5 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-neutral-900 text-neutral-50 dark:bg-neutral-100 dark:text-neutral-900 flex items-center justify-center shadow-clay-sm">
                <Key className="w-3.5 h-3.5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                  Access Code Tester
                </h3>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                  Verify how readers unlock your drops
                </p>
              </div>
            </div>

            <form onSubmit={handleTestCode} className="space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  maxLength={4}
                  placeholder="Enter 4-digit code"
                  value={testCodeInput}
                  onChange={e => {
                    const clean = e.target.value.replace(/\D/g, '').slice(0, 4);
                    setTestCodeInput(clean);
                    if (testResult.status !== 'idle') setTestResult({ status: 'idle' });
                  }}
                  className="flex-1 h-9 px-3 text-xs font-mono font-bold tracking-widest text-center rounded-xl border border-slate-200/80 dark:border-white/10 bg-[#e7ecf3]/70 dark:bg-[#12151e]/80 text-neutral-900 dark:text-neutral-100 shadow-clay-inset focus:outline-none focus:bg-white dark:focus:bg-[#1a1e28]"
                />
                <Button
                  type="submit"
                  size="sm"
                  variant="primary"
                  className="h-9 px-3 text-xs"
                  disabled={testCodeInput.length < 4}
                >
                  Verify
                </Button>
              </div>

              {/* Tester Result Box */}
              {testResult.status === 'found' && testResult.resource && (
                <div className="p-3 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/80 shadow-clay-sm space-y-2 animate-fade-in-up">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>Code verified</span>
                  </div>
                  <p className="text-xs font-medium text-neutral-900 dark:text-neutral-100 truncate">
                    {testResult.resource.title}
                  </p>
                  {profile?.username && (
                    <a
                      href={`/${profile.username}/${testResult.resource.code}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 hover:underline"
                    >
                      <span>Test unlock reader</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              )}

              {testResult.status === 'not_found' && (
                <div className="p-3 rounded-xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/80 shadow-clay-sm flex items-start gap-2 text-xs text-amber-800 dark:text-amber-300 animate-fade-in-up">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{testResult.message}</span>
                </div>
              )}
            </form>
          </Card>

          {/* 2. Storage & Distribution Footprint */}
          <Card variant="elevated" className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-neutral-900 text-neutral-50 dark:bg-neutral-100 dark:text-neutral-900 flex items-center justify-center shadow-clay-sm">
                  <HardDrive className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                    Storage Footprint
                  </h3>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                    {totalStorageMB} MB used of {STORAGE_LIMIT_MB} MB
                  </p>
                </div>
              </div>
              <span className="text-xs font-mono font-semibold text-neutral-700 dark:text-neutral-300">
                {storagePercentage}%
              </span>
            </div>

            {/* Storage Meter Bar */}
            <div className="w-full h-2 rounded-md bg-slate-200/80 dark:bg-neutral-800 overflow-hidden shadow-clay-inset">
              <div
                className="h-full bg-neutral-900 dark:bg-neutral-100 transition-all duration-300"
                style={{ width: `${Math.max(4, storagePercentage)}%` }}
              />
            </div>

            {/* Distribution Breakdown Counters */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/60 dark:border-white/5 text-xs">
              <div className="p-2.5 rounded-lg bg-[#e7ecf3]/70 dark:bg-[#131720]/80 border border-slate-200/60 dark:border-white/5 shadow-clay-inset">
                <span className="text-[10px] uppercase font-semibold text-neutral-500 dark:text-neutral-400 block">
                  Active Drops
                </span>
                <span className="font-mono font-bold text-neutral-900 dark:text-neutral-100">
                  {activeCount}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-[#e7ecf3]/70 dark:bg-[#131720]/80 border border-slate-200/60 dark:border-white/5 shadow-clay-inset">
                <span className="text-[10px] uppercase font-semibold text-neutral-500 dark:text-neutral-400 block">
                  Protected
                </span>
                <span className="font-mono font-bold text-neutral-900 dark:text-neutral-100">
                  {passwordCount}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-[#e7ecf3]/70 dark:bg-[#131720]/80 border border-slate-200/60 dark:border-white/5 shadow-clay-inset">
                <span className="text-[10px] uppercase font-semibold text-neutral-500 dark:text-neutral-400 block">
                  Pinned Drops
                </span>
                <span className="font-mono font-bold text-neutral-900 dark:text-neutral-100">
                  {pinnedCount}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-[#e7ecf3]/70 dark:bg-[#131720]/80 border border-slate-200/60 dark:border-white/5 shadow-clay-inset">
                <span className="text-[10px] uppercase font-semibold text-neutral-500 dark:text-neutral-400 block">
                  Unlisted
                </span>
                <span className="font-mono font-bold text-neutral-900 dark:text-neutral-100">
                  {unlistedCount}
                </span>
              </div>
            </div>
          </Card>

          {/* 3. Distribution Quick Guide */}
          <Card variant="elevated" className="p-5 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
              Distribution Workflow
            </h3>
            <div className="space-y-2.5 text-xs text-neutral-600 dark:text-neutral-400">
              <div className="flex items-start gap-2">
                <span className="w-4 h-4 rounded bg-neutral-900 text-neutral-50 dark:bg-neutral-100 dark:text-neutral-900 text-[10px] font-bold flex items-center justify-center shrink-0">
                  1
                </span>
                <p>Add your public profile link to your social media bio or video description.</p>
              </div>

              <div className="flex items-start gap-2">
                <span className="w-4 h-4 rounded bg-neutral-900 text-neutral-50 dark:bg-neutral-100 dark:text-neutral-900 text-[10px] font-bold flex items-center justify-center shrink-0">
                  2
                </span>
                <p>Announce your 4-digit numeric access code in your post or video caption.</p>
              </div>

              <div className="flex items-start gap-2">
                <span className="w-4 h-4 rounded bg-neutral-900 text-neutral-50 dark:bg-neutral-100 dark:text-neutral-900 text-[10px] font-bold flex items-center justify-center shrink-0">
                  3
                </span>
                <p>Audience enters the 4-digit code to read and download your guide with zero friction.</p>
              </div>
            </div>

            {topPerformingResource && (
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-2 text-xs"
                onClick={() => openShareModal(topPerformingResource)}
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Open Share Kit for Top Guide</span>
              </Button>
            )}
          </Card>

          {/* 4. Saved Library Quick Widget */}
          {savedResources.length > 0 && (
            <Card variant="elevated" className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
                  <Bookmark className="w-3.5 h-3.5" />
                  <span>Recent Saved Guides</span>
                </h3>
                <span className="text-xs font-mono text-neutral-500">
                  {savedResources.length} saved
                </span>
              </div>

              <div className="space-y-2">
                {savedResources.slice(0, 2).map(item => (
                  <Link
                    key={item.resourceId}
                    to={`/${item.creatorUsername}/${item.code}`}
                    target="_blank"
                    className="block p-2.5 rounded-xl bg-[#e7ecf3]/70 dark:bg-[#131720]/80 border border-slate-200/60 dark:border-white/5 shadow-clay-inset hover:shadow-clay-sm transition-all"
                  >
                    <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                      {item.title}
                    </p>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                      @{item.creatorUsername}
                    </p>
                  </Link>
                ))}
              </div>

              <Link
                to="/dashboard/saved"
                className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-neutral-100 inline-flex items-center gap-1 pt-1"
              >
                <span>View all saved documents</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </Card>
          )}
        </div>
      </div>

      {/* Social Share Kit Modal */}
      {profile?.username && (
        <SocialShareModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          resource={selectedShareResource}
          username={profile.username}
        />
      )}
    </div>
  );
};
