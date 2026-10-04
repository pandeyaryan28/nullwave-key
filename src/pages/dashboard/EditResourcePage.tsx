import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase/config';
import { useAuth } from '../../lib/auth/authContext';
import { Resource } from '../../types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { ArrowLeft, Check, AlertCircle } from 'lucide-react';

export const EditResourcePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [resource, setResource] = useState<Resource | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const [status, setStatus] = useState<'active' | 'disabled'>('active');

  useEffect(() => {
    if (!id || !user) return;

    const fetchResource = async () => {
      setLoading(true);
      try {
        const snap = await getDoc(doc(db, 'resources', id));
        if (!snap.exists()) {
          setError('Resource not found.');
          setLoading(false);
          return;
        }
        const data = { id: snap.id, ...snap.data() } as Resource;
        if (data.creatorId !== user.uid) {
          setError('You do not have permission to edit this resource.');
          setLoading(false);
          return;
        }

        setResource(data);
        setTitle(data.title);
        setDescription(data.description || '');
        setCategory(data.category || '');
        setStatus(data.status);
      } catch (err) {
        console.error('Error fetching resource:', err);
        setError('Failed to load resource.');
      } finally {
        setLoading(false);
      }
    };

    fetchResource();
  }, [id, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !resource) return;

    setSaving(true);
    setError(null);

    try {
      await updateDoc(doc(db, 'resources', id), {
        title: title.trim(),
        description: description.trim(),
        category: category.trim() || null,
        status,
        updatedAt: Date.now(),
      });
      navigate('/dashboard/resources');
    } catch (err) {
      console.error('Failed to update resource:', err);
      setError('Failed to save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-xl mx-auto space-y-4 py-8">
        <div className="h-8 w-40 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" />
        <div className="h-64 bg-neutral-200 dark:bg-neutral-800 rounded-lg animate-pulse" />
      </div>
    );
  }

  if (error && !resource) {
    return (
      <div className="max-w-xl mx-auto py-8 text-center space-y-4">
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        <Button variant="outline" size="sm" onClick={() => navigate('/dashboard/resources')}>
          Back to Resources
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/dashboard/resources')}
          className="p-1.5 rounded-md text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          aria-label="Back"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
            Edit Resource
          </h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Code: <span className="font-mono font-bold text-neutral-800 dark:text-neutral-200">{resource?.code}</span>
          </p>
        </div>
      </div>

      <Card className="p-6 sm:p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-3 rounded-md bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Input
            label="Resource Title *"
            value={title}
            onChange={e => setTitle(e.target.value)}
            required
          />

          <Textarea
            label="Description"
            rows={4}
            value={description}
            onChange={e => setDescription(e.target.value)}
          />

          <Input
            label="Category"
            value={category}
            onChange={e => setCategory(e.target.value)}
          />

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
              Access Status
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm text-neutral-800 dark:text-neutral-200 cursor-pointer">
                <input
                  type="radio"
                  name="status"
                  value="active"
                  checked={status === 'active'}
                  onChange={() => setStatus('active')}
                  className="rounded text-neutral-900 dark:text-neutral-100"
                />
                <span>Active (accessible via 6-digit code)</span>
              </label>

              <label className="flex items-center gap-2 text-sm text-neutral-800 dark:text-neutral-200 cursor-pointer">
                <input
                  type="radio"
                  name="status"
                  value="disabled"
                  checked={status === 'disabled'}
                  onChange={() => setStatus('disabled')}
                  className="rounded text-neutral-900 dark:text-neutral-100"
                />
                <span>Disabled (hidden from viewers)</span>
              </label>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-100 dark:border-neutral-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/dashboard/resources')}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={saving}>
              <Check className="w-4 h-4" />
              <span>Save Changes</span>
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};
