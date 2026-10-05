import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../lib/auth/authContext';
import { SavedResource } from '../../types';
import { getSavedResources, removeSavedResource } from '../../lib/storage/savedResourcesService';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import {
  Bookmark,
  FileText,
  ExternalLink,
  Trash2,
  Search,
  Calendar,
  Check,
  Copy,
} from 'lucide-react';

export const SavedResourcesPage: React.FC = () => {
  const { user } = useAuth();
  const [savedItems, setSavedItems] = useState<SavedResource[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchItems = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const items = await getSavedResources(user.uid);
      setSavedItems(items);
    } catch (err) {
      console.error('Failed to load saved resources:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [user]);

  const handleRemove = async (resourceId: string) => {
    if (!user) return;
    try {
      await removeSavedResource(user.uid, resourceId);
      setSavedItems(prev => prev.filter(item => item.resourceId !== resourceId));
    } catch (err) {
      console.error('Failed to remove saved resource:', err);
    }
  };

  const handleCopyLink = (item: SavedResource) => {
    const url = `${window.location.origin}/${item.creatorUsername}/${item.code}`;
    navigator.clipboard.writeText(url);
    setCopiedId(item.resourceId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredItems = savedItems.filter(item => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      item.title.toLowerCase().includes(query) ||
      item.creatorUsername.toLowerCase().includes(query) ||
      (item.creatorDisplayName && item.creatorDisplayName.toLowerCase().includes(query)) ||
      item.code.includes(query)
    );
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" />
        <div className="space-y-3">
          {Array(3).fill(0).map((_, i) => (
            <div key={i} className="h-24 bg-neutral-200 dark:bg-neutral-800 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50 flex items-center gap-2">
            <Bookmark className="w-6 h-6 text-neutral-900 dark:text-neutral-100" />
            <span>Saved Library</span>
          </h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Documents you have saved to view and read anytime.
          </p>
        </div>

        <span className="text-xs font-mono text-neutral-500 dark:text-neutral-400 self-start sm:self-auto">
          {savedItems.length} {savedItems.length === 1 ? 'document' : 'documents'} saved
        </span>
      </div>

      {savedItems.length > 0 && (
        <div className="relative">
          <Input
            placeholder="Search saved documents by title, creator, or code..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9"
          />
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-3 pointer-events-none" />
        </div>
      )}

      {/* Empty State */}
      {savedItems.length === 0 ? (
        <Card className="p-12 text-center border-dashed border-2 border-neutral-300 dark:border-neutral-700">
          <div className="w-12 h-12 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 flex items-center justify-center mx-auto mb-4 border border-neutral-200 dark:border-neutral-700">
            <Bookmark className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 mb-1">
            No saved documents yet
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-sm mx-auto mb-6">
            When you view documents from creators, tap &quot;Save&quot; to keep them in your personal library for easy reading anytime.
          </p>
          <Link to="/">
            <Button variant="outline" size="sm">
              Discover Documents
            </Button>
          </Link>
        </Card>
      ) : filteredItems.length === 0 ? (
        <Card className="p-8 text-center border-neutral-300 dark:border-neutral-700">
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            No saved documents matching &quot;{searchQuery}&quot;.
          </p>
        </Card>
      ) : (
        /* Saved Documents List */
        <div className="space-y-3">
          {filteredItems.map(item => (
            <Card
              key={item.resourceId}
              className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors"
            >
              <div className="flex items-start gap-4 min-w-0">
                <div className="w-10 h-10 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 flex items-center justify-center shrink-0 border border-neutral-200 dark:border-neutral-700">
                  <FileText className="w-5 h-5" />
                </div>

                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                      {item.title}
                    </h3>
                    {item.category && (
                      <Badge variant="neutral" className="text-[10px]">
                        {item.category}
                      </Badge>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-500 dark:text-neutral-400">
                    <Link
                      to={`/${item.creatorUsername}`}
                      className="hover:underline font-medium text-neutral-700 dark:text-neutral-300"
                    >
                      by {item.creatorDisplayName || item.creatorUsername} (@{item.creatorUsername})
                    </Link>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Saved {new Date(item.savedAt).toLocaleDateString()}
                    </span>
                    <span>•</span>
                    <span className="font-mono">
                      {(item.fileSizeBytes / (1024 * 1024)).toFixed(1)} MB
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleCopyLink(item)}
                  title="Copy direct document link"
                  className="text-xs"
                >
                  {copiedId === item.resourceId ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span className="hidden sm:inline">
                    {copiedId === item.resourceId ? 'Copied' : 'Share'}
                  </span>
                </Button>

                <Link
                  to={`/${item.creatorUsername}/${item.code}`}
                  target="_blank"
                >
                  <Button size="sm" variant="primary" className="text-xs">
                    <span>Open</span>
                    <ExternalLink className="w-3 h-3" />
                  </Button>
                </Link>

                <button
                  type="button"
                  onClick={() => handleRemove(item.resourceId)}
                  title="Remove from saved library"
                  aria-label="Remove from saved library"
                  className="p-2 text-neutral-400 hover:text-red-600 dark:hover:text-red-400 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
