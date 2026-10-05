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
import {
  ArrowLeft,
  Check,
  AlertCircle,
  SlidersHorizontal,
  EyeOff,
  Pin,
  Clock,
  Users,
  RefreshCw,
  Radio,
  ChevronDown,
} from 'lucide-react';
import { generateSixDigitCode, isCodeInUseByCreator } from '../../lib/utils/codeGenerator';

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

  // Distribution controls
  const [isAdvancedOpen, setIsAdvancedOpen] = useState<boolean>(false);
  const [code, setCode] = useState<string>('');
  const [allowDownload, setAllowDownload] = useState<boolean>(true);
  const [allowSave, setAllowSave] = useState<boolean>(true);
  const [isPublicListing, setIsPublicListing] = useState<boolean>(true);
  const [isPinned, setIsPinned] = useState<boolean>(false);
  const [hasExpiration, setHasExpiration] = useState<boolean>(false);
  const [expirationDate, setExpirationDate] = useState<string>('');
  const [hasCapacityCap, setHasCapacityCap] = useState<boolean>(false);
  const [maxUnlocks, setMaxUnlocks] = useState<string>('');

  useEffect(() => {
    if (!id || !user) return;

    const fetchResource = async () => {
      setLoading(true);
      try {
        let data: Resource | null = null;
        const snap = await getDoc(doc(db, 'resources', id));
        if (snap.exists()) {
          data = { id: snap.id, ...snap.data() } as Resource;
        } else {
          // Check local storage fallback
          try {
            const nullwaveKey = `nullwave_resources_${user.uid}`;
            const unlockrKey = `unlockr_resources_${user.uid}`;
            const localList = JSON.parse(
              localStorage.getItem(nullwaveKey) || localStorage.getItem(unlockrKey) || '[]'
            ) as Resource[];
            data = localList.find(r => r.id === id) || null;
          } catch {}
        }

        if (!data) {
          setError('Resource not found.');
          setLoading(false);
          return;
        }

        if (data.creatorId !== user.uid) {
          setError('You do not have permission to edit this resource.');
          setLoading(false);
          return;
        }

        setResource(data);
        setCode(data.code || '');
        setTitle(data.title);
        setDescription(data.description || '');
        setCategory(data.category || '');
        setStatus(data.status);
        setAllowDownload(data.allowDownload !== false);
        setAllowSave(data.allowSave !== false);
        setIsPublicListing(data.isPublicListing !== false);
        setIsPinned(Boolean(data.isPinned));

        if (data.expiresAt) {
          setHasExpiration(true);
          const d = new Date(data.expiresAt);
          // Format for datetime-local (YYYY-MM-DDTHH:mm)
          const tzOffset = d.getTimezoneOffset() * 60000;
          const localISOTime = new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
          setExpirationDate(localISOTime);
        }

        if (data.maxUnlocks) {
          setHasCapacityCap(true);
          setMaxUnlocks(data.maxUnlocks.toString());
        }
      } catch (err) {
        console.error('Error fetching resource:', err);
        setError('Failed to load resource.');
      } finally {
        setLoading(false);
      }
    };

    fetchResource();
  }, [id, user]);

  const handleGenerateRandomCode = () => {
    setCode(generateSixDigitCode());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !resource || !user) return;

    const cleanCode = code.trim();
    if (!/^\d{6}$/.test(cleanCode)) {
      setError('Access code must be exactly 6 numeric digits (e.g. 582910).');
      return;
    }
    const numCode = parseInt(cleanCode, 10);
    if (numCode < 100000 || numCode > 999999) {
      setError('Access code must be between 100000 and 999999.');
      return;
    }

    const isCodeTaken = await isCodeInUseByCreator(user.uid, cleanCode, id);
    if (isCodeTaken) {
      setError('This 6-digit access code is already assigned to another active resource. Please choose a different code.');
      return;
    }

    let expiresAtTimestamp: number | null = null;
    if (hasExpiration) {
      if (!expirationDate) {
        setError('Please select an expiration date or uncheck the drop expiration toggle.');
        return;
      }
      const parsedTime = new Date(expirationDate).getTime();
      if (isNaN(parsedTime)) {
        setError('Invalid expiration date format.');
        return;
      }
      expiresAtTimestamp = parsedTime;
    }

    let maxUnlocksCount: number | null = null;
    if (hasCapacityCap) {
      const capNum = parseInt(maxUnlocks, 10);
      if (isNaN(capNum) || capNum <= 0) {
        setError('Please enter a valid positive number for max unlock capacity.');
        return;
      }
      maxUnlocksCount = capNum;
    }

    setSaving(true);
    setError(null);

    try {
      const updatedFields = {
        title: title.trim(),
        description: description.trim(),
        category: category.trim() || null,
        status,
        code: cleanCode,
        allowDownload,
        allowSave,
        isPublicListing,
        isPinned,
        expiresAt: expiresAtTimestamp,
        maxUnlocks: maxUnlocksCount,
        updatedAt: Date.now(),
      };

      try {
        await updateDoc(doc(db, 'resources', id), updatedFields);
      } catch (fbErr) {
        console.warn('Firestore update warning, falling back to local storage:', fbErr);
      }

      // Update local storage cache
      if (user) {
        try {
          const nullwaveKey = `nullwave_resources_${user.uid}`;
          const unlockrKey = `unlockr_resources_${user.uid}`;
          const localList = JSON.parse(
            localStorage.getItem(nullwaveKey) || localStorage.getItem(unlockrKey) || '[]'
          ) as Resource[];
          const updated = localList.map(r => (r.id === id ? { ...r, ...updatedFields } : r));
          localStorage.setItem(nullwaveKey, JSON.stringify(updated));
          localStorage.setItem(unlockrKey, JSON.stringify(updated));
        } catch {}
      }

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
            Code: <span className="font-mono font-bold text-neutral-800 dark:text-neutral-200">{code || resource?.code}</span>
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

          {/* Advanced Options Collapsible Accordion (Requirement 4) */}
          <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50 overflow-hidden">
            <button
              type="button"
              onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
              className="w-full p-4 flex items-center justify-between text-left hover:bg-neutral-100/50 dark:hover:bg-neutral-800/40 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-neutral-700 dark:text-neutral-300" />
                <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                  Advanced Options
                </h2>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-neutral-500 transition-transform duration-200 ${
                  isAdvancedOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {isAdvancedOpen && (
              <div className="p-5 pt-2 border-t border-neutral-200 dark:border-neutral-800 space-y-5 animate-fade-in-up">
                {/* 1. Download Permission */}
                <div className="space-y-1">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allowDownload}
                      onChange={e => setAllowDownload(e.target.checked)}
                      className="mt-0.5 rounded border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 focus:ring-neutral-500"
                    />
                    <div>
                      <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                        Allow viewers to download PDF file
                      </span>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                        When unchecked, viewers can read the file in the high-fidelity reader, but direct download buttons and PDF export are disabled.
                      </p>
                    </div>
                  </label>
                </div>

                {/* 2. Viewer Library Save Permission (Requirement 3) */}
                <div className="space-y-1 pt-2 border-t border-neutral-200/60 dark:border-neutral-800/60">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allowSave}
                      onChange={e => setAllowSave(e.target.checked)}
                      className="mt-0.5 rounded border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 focus:ring-neutral-500"
                    />
                    <div>
                      <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                        Allow viewers to save this file to their library
                      </span>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                        When checked, visitors with viewer accounts can bookmark and save this document to their personal library to view anytime.
                      </p>
                    </div>
                  </label>
                </div>

                {/* 3. Public Listing Visibility */}
                <div className="space-y-1 pt-2 border-t border-neutral-200/60 dark:border-neutral-800/60">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isPublicListing}
                      onChange={e => setIsPublicListing(e.target.checked)}
                      className="mt-0.5 rounded border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 focus:ring-neutral-500"
                    />
                    <div>
                      <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
                        <span>List publicly on Public Profile</span>
                        {!isPublicListing && (
                          <span className="text-[11px] font-normal text-neutral-500 flex items-center gap-1">
                            <EyeOff className="w-3 h-3" /> Unlisted
                          </span>
                        )}
                      </span>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                        When unchecked, this resource is unlisted and hidden from your public profile feed. Only visitors with the direct link or 6-digit code can access it.
                      </p>
                    </div>
                  </label>
                </div>

                {/* 4. Pin to Top */}
                <div className="space-y-1 pt-2 border-t border-neutral-200/60 dark:border-neutral-800/60">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isPinned}
                      onChange={e => setIsPinned(e.target.checked)}
                      className="mt-0.5 rounded border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 focus:ring-neutral-500"
                    />
                    <div>
                      <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
                        <Pin className="w-3.5 h-3.5 text-neutral-500" />
                        <span>Pin to top of Profile as Featured</span>
                      </span>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                        Highlighted at the top of your document feed for high-priority drops.
                      </p>
                    </div>
                  </label>
                </div>

                {/* 5. Drop Expiration */}
                <div className="space-y-2 pt-2 border-t border-neutral-200/60 dark:border-neutral-800/60">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasExpiration}
                      onChange={e => setHasExpiration(e.target.checked)}
                      className="mt-0.5 rounded border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 focus:ring-neutral-500"
                    />
                    <div>
                      <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-neutral-500" />
                        <span>Set drop expiration date & time</span>
                      </span>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                        Access is automatically closed after this timestamp.
                      </p>
                    </div>
                  </label>

                  {hasExpiration && (
                    <div className="pl-6 pt-1 max-w-xs">
                      <input
                        type="datetime-local"
                        value={expirationDate}
                        onChange={e => setExpirationDate(e.target.value)}
                        className="w-full h-10 px-3 py-2 text-xs rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100"
                      />
                    </div>
                  )}
                </div>

                {/* 6. Unlock Capacity Cap */}
                <div className="space-y-2 pt-2 border-t border-neutral-200/60 dark:border-neutral-800/60">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasCapacityCap}
                      onChange={e => setHasCapacityCap(e.target.checked)}
                      className="mt-0.5 rounded border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 focus:ring-neutral-500"
                    />
                    <div>
                      <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-neutral-500" />
                        <span>Limit maximum unlock capacity</span>
                      </span>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                        Access closes once total unique viewers reach this number.
                      </p>
                    </div>
                  </label>

                  {hasCapacityCap && (
                    <div className="pl-6 pt-1 max-w-xs">
                      <input
                        type="number"
                        min="1"
                        placeholder="e.g. 100"
                        value={maxUnlocks}
                        onChange={e => setMaxUnlocks(e.target.value)}
                        className="w-full h-10 px-3 py-2 text-xs rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 font-mono"
                      />
                    </div>
                  )}
                </div>

                {/* 7. Custom 6-Digit Code */}
                <div className="space-y-2 pt-2 border-t border-neutral-200/60 dark:border-neutral-800/60">
                  <div className="flex items-start gap-2.5">
                    <Radio className="w-4 h-4 text-neutral-500 mt-0.5 shrink-0" />
                    <div className="flex-1">
                      <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                        6-Digit Access Code
                      </span>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                        The numeric access code viewers enter on your profile to unlock this document.
                      </p>
                    </div>
                  </div>

                  <div className="pl-6 pt-1 flex items-center gap-2 max-w-xs">
                    <input
                      type="text"
                      maxLength={6}
                      placeholder="e.g. 582910"
                      value={code}
                      onChange={e => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                        setCode(val);
                      }}
                      className="w-36 h-10 px-3 py-2 text-base font-mono font-bold tracking-widest text-center rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleGenerateRandomCode}
                      title="Generate new random code"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Random</span>
                    </Button>
                  </div>
                </div>
              </div>
            )}
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
