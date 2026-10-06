import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';
import { db } from '../../lib/firebase/config';
import { useAuth } from '../../lib/auth/authContext';
import { Resource } from '../../types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import {
  FileText,
  Copy,
  Check,
  ExternalLink,
  Plus,
  Trash2,
  Edit,
  Power,
  Link as LinkIcon,
  Pin,
  EyeOff,
  Clock,
  Users,
  Key,
} from 'lucide-react';

export const ResourcesListPage: React.FC = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchResources = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const q = query(collection(db, 'resources'), where('creatorId', '==', user.uid));
      const snap = await getDocs(q);
      const list: Resource[] = snap.docs.map(
        d => ({ id: d.id, ...d.data() } as Resource)
      );
      list.sort((a, b) => b.createdAt - a.createdAt);
      setResources(list);
    } catch (err) {
      console.error('Failed to load resources:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResources();
  }, [user]);

  const handleCopyCode = (resourceId: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeId(resourceId);
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  const handleCopyLink = (resource: Resource) => {
    if (!profile?.username) return;
    const url = `${window.location.origin}/${profile.username}/${resource.code}`;
    navigator.clipboard.writeText(url);
    setCopiedLinkId(resource.id);
    setTimeout(() => setCopiedLinkId(null), 2000);
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

  const handleDelete = async (resourceId: string) => {
    if (!window.confirm('Are you sure you want to delete this resource? Viewers will no longer be able to access it.')) {
      return;
    }

    setDeletingId(resourceId);
    try {
      await deleteDoc(doc(db, 'resources', resourceId));
      setResources(prev => prev.filter(r => r.id !== resourceId));
    } catch (err) {
      console.error('Error deleting resource:', err);
      alert('Failed to delete resource.');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" />
        <div className="h-32 bg-neutral-200 dark:bg-neutral-800 rounded-lg animate-pulse" />
        <div className="h-32 bg-neutral-200 dark:bg-neutral-800 rounded-lg animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
            Resources
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
            Manage your digital library, codes, and distribution links.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => navigate('/dashboard/resources/new')}
        >
          <Plus className="w-4 h-4" />
          <span>Upload Resource</span>
        </Button>
      </div>

      {resources.length === 0 ? (
        <Card className="p-12 text-center border-dashed border-2">
          <div className="w-12 h-12 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 flex items-center justify-center mx-auto mb-4 border border-neutral-200 dark:border-neutral-700">
            <FileText className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 mb-2">
            No resources yet
          </h2>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 max-w-sm mx-auto mb-6">
            Upload your first guide or document to generate its 4-digit access code.
          </p>
          <Button
            size="md"
            variant="primary"
            onClick={() => navigate('/dashboard/resources/new')}
          >
            <Plus className="w-4 h-4" />
            <span>Upload PDF</span>
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {resources.map(res => (
            <Card
              key={res.id}
              className="p-5 sm:p-6 transition-all hover:border-neutral-300 dark:hover:border-neutral-700"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                {/* Left Info */}
                <div className="flex items-start gap-4 min-w-0 flex-1">
                  {res.coverUrl ? (
                    <img
                      src={res.coverUrl}
                      alt={res.title}
                      className="w-16 h-16 rounded-md object-cover border border-neutral-200 dark:border-neutral-800 shrink-0"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 flex items-center justify-center shrink-0 border border-neutral-200 dark:border-neutral-700">
                      <FileText className="w-7 h-7" />
                    </div>
                  )}

                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100 truncate mr-1">
                        {res.title}
                      </h2>
                      <Badge variant={res.status === 'active' ? 'success' : 'neutral'}>
                        {res.status}
                      </Badge>
                      {res.password && (
                        <Badge variant="neutral" className="text-[10px] py-0 px-1.5 flex items-center gap-1">
                          <Key className="w-2.5 h-2.5" />
                          <span>Password Protected</span>
                        </Badge>
                      )}
                      {res.isPinned && (
                        <Badge variant="success" className="text-[10px] py-0 px-1.5 flex items-center gap-1">
                          <Pin className="w-2.5 h-2.5" />
                          <span>Pinned</span>
                        </Badge>
                      )}
                      {res.allowDownload === false && (
                        <Badge variant="warning" className="text-[10px] py-0 px-1.5 flex items-center gap-1">
                          <EyeOff className="w-2.5 h-2.5" />
                          <span>View Only</span>
                        </Badge>
                      )}
                      {res.isPublicListing === false && (
                        <Badge variant="neutral" className="text-[10px] py-0 px-1.5 flex items-center gap-1">
                          <EyeOff className="w-2.5 h-2.5" />
                          <span>Unlisted</span>
                        </Badge>
                      )}
                      {res.expiresAt && (
                        Date.now() > res.expiresAt ? (
                          <Badge variant="error" className="text-[10px] py-0 px-1.5 flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" />
                            <span>Expired</span>
                          </Badge>
                        ) : (
                          <Badge variant="neutral" className="text-[10px] py-0 px-1.5 flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" />
                            <span>Expires {new Date(res.expiresAt).toLocaleDateString()}</span>
                          </Badge>
                        )
                      )}
                      {res.maxUnlocks && (
                        (res.uniqueViews || 0) >= res.maxUnlocks ? (
                          <Badge variant="error" className="text-[10px] py-0 px-1.5 flex items-center gap-1">
                            <Users className="w-2.5 h-2.5" />
                            <span>Cap Reached ({res.uniqueViews}/{res.maxUnlocks})</span>
                          </Badge>
                        ) : (
                          <Badge variant="neutral" className="text-[10px] py-0 px-1.5 flex items-center gap-1">
                            <Users className="w-2.5 h-2.5" />
                            <span>Cap: {res.uniqueViews}/{res.maxUnlocks}</span>
                          </Badge>
                        )
                      )}
                      {res.category && (
                        <Badge variant="neutral">{res.category}</Badge>
                      )}
                    </div>

                    {res.description && (
                      <p className="text-xs text-neutral-600 dark:text-neutral-400 line-clamp-2">
                        {res.description}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-500 dark:text-neutral-400 pt-1">
                      <span>{(res.fileSizeBytes / (1024 * 1024)).toFixed(1)} MB PDF</span>
                      <span>•</span>
                      <span>{res.totalViews} views</span>
                      <span>•</span>
                      <span>{res.uniqueViews} unique</span>
                      <span>•</span>
                      <span>{res.totalDownloads} downloads</span>
                      <span>•</span>
                      <span>{new Date(res.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                {/* Right: Prominent Code Box & Actions */}
                <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 shrink-0 self-start lg:self-center border-t lg:border-t-0 pt-4 lg:pt-0 border-neutral-100 dark:border-neutral-800 w-full lg:w-auto justify-between lg:justify-end">
                  {/* Central "Copy Code" Feature */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleCopyCode(res.id, res.code)}
                      title="Copy access code"
                      className="px-3.5 py-2 rounded-md border border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors flex items-center gap-2"
                    >
                      <span className="font-mono text-base font-bold tracking-widest text-neutral-950 dark:text-neutral-50">
                        {res.code}
                      </span>
                      {copiedCodeId === res.id ? (
                        <Check className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Copy className="w-4 h-4 text-neutral-500" />
                      )}
                    </button>
                  </div>

                  {/* Other Action Buttons */}
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleCopyLink(res)}
                      title="Copy public link"
                      className="p-2 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-md transition-colors"
                    >
                      {copiedLinkId === res.id ? (
                        <Check className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <LinkIcon className="w-4 h-4" />
                      )}
                    </button>

                    {profile?.username && (
                      <Link
                        to={`/${profile.username}/${res.code}`}
                        target="_blank"
                        title="Open resource"
                        className="p-2 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-md transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Link>
                    )}

                    <Link
                      to={`/dashboard/resources/${res.id}/edit`}
                      title="Edit resource"
                      className="p-2 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-md transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </Link>

                    <button
                      onClick={() => handleToggleStatus(res)}
                      title={res.status === 'active' ? 'Disable resource' : 'Enable resource'}
                      className={`p-2 rounded-md transition-colors ${
                        res.status === 'active'
                          ? 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                          : 'text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                      }`}
                    >
                      <Power className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleDelete(res.id)}
                      disabled={deletingId === res.id}
                      title="Delete resource"
                      className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-md transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
