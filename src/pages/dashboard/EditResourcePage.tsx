import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase/config';
import { useAuth } from '../../lib/auth/authContext';
import { hashPasswordSHA256 } from '../../lib/utils/cryptoHash';
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
  Eye,
  EyeOff,
  Key,
  Pin,
  Clock,
  Users,
  RefreshCw,
  Radio,
  ChevronDown,
} from 'lucide-react';
import { generateFourDigitCode, isCodeInUseByCreator } from '../../lib/utils/codeGenerator';

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
  const [hasPassword, setHasPassword] = useState<boolean>(false);
  const [password, setPassword] = useState<string>('');
  const [initialPassword, setInitialPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);

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

        if (data.password) {
          setHasPassword(true);
          setPassword(data.password);
          setInitialPassword(data.password);
        }

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
    setCode(generateFourDigitCode());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !resource || !user) return;

    const cleanCode = code.trim();
    const isFourDigit = /^\d{4}$/.test(cleanCode) && parseInt(cleanCode, 10) >= 1000 && parseInt(cleanCode, 10) <= 9999;
    const isLegacySixDigit = /^\d{6}$/.test(cleanCode) && parseInt(cleanCode, 10) >= 100000 && parseInt(cleanCode, 10) <= 999999;
    if (!isFourDigit && !isLegacySixDigit) {
      setError('Access code must be 4 numeric digits (1000–9999) or legacy 6 numeric digits (100000–999999).');
      return;
    }

    const isCodeTaken = await isCodeInUseByCreator(user.uid, cleanCode, id);
    if (isCodeTaken) {
      setError('This access code is already assigned to another active resource. Please choose a different code.');
      return;
    }

    if (hasPassword && !password.trim()) {
      setError('Please enter a password for this document, or uncheck password protection.');
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
      let finalPassword: string | null = null;
      if (hasPassword && password.trim()) {
        const trimmed = password.trim();
        if (trimmed === initialPassword && /^[0-9a-f]{64}$/i.test(trimmed)) {
          finalPassword = trimmed;
        } else {
          finalPassword = await hashPasswordSHA256(trimmed);
        }
      }

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
        password: finalPassword,
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
          className="p-2 rounded-xl text-neutral-600 dark:text-neutral-400 hover:bg-white dark:hover:bg-neutral-800 border border-slate-200/80 dark:border-white/10 shadow-clay-sm transition-all active:scale-95"
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

      <Card className="p-6 sm:p-8 rounded-2xl shadow-clay-card animate-clay-pop border-slate-200/80 dark:border-white/10">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-3.5 rounded-xl bg-red-50/90 dark:bg-red-950/40 border border-red-200/80 dark:border-red-800/80 text-xs text-red-700 dark:text-red-300 flex items-center gap-2 shadow-clay-sm">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-1.5 bg-[#e7ecf3] dark:bg-[#131720] rounded-xl border border-slate-200/70 dark:border-white/5 shadow-clay-inset">
              <button
                type="button"
                onClick={() => setStatus('active')}
                aria-pressed={status === 'active'}
                className={`py-2 px-3 text-xs font-semibold rounded-lg transition-all cursor-pointer active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 dark:focus-visible:ring-neutral-600 flex items-center justify-center gap-2 ${
                  status === 'active'
                    ? 'bg-white dark:bg-[#1a1e28] text-neutral-900 dark:text-neutral-50 shadow-clay-sm border border-slate-200/80 dark:border-white/10'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 border border-transparent'
                }`}
              >
                <span className={`w-2 h-2 rounded-sm ${status === 'active' ? 'bg-emerald-500' : 'bg-neutral-400'}`} />
                <span>Active (accessible via 4-digit code)</span>
              </button>

              <button
                type="button"
                onClick={() => setStatus('disabled')}
                aria-pressed={status === 'disabled'}
                className={`py-2 px-3 text-xs font-semibold rounded-lg transition-all cursor-pointer active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 dark:focus-visible:ring-neutral-600 flex items-center justify-center gap-2 ${
                  status === 'disabled'
                    ? 'bg-white dark:bg-[#1a1e28] text-neutral-900 dark:text-neutral-50 shadow-clay-sm border border-slate-200/80 dark:border-white/10'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 border border-transparent'
                }`}
              >
                <span className={`w-2 h-2 rounded-sm ${status === 'disabled' ? 'bg-amber-500' : 'bg-neutral-400'}`} />
                <span>Disabled (hidden from viewers)</span>
              </button>
            </div>
          </div>

          {/* Advanced Options Collapsible Accordion (Requirement 4) */}
          <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-[#e7ecf3]/50 dark:bg-[#131720]/60 shadow-clay-inset overflow-hidden">
            <button
              type="button"
              onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
              className="w-full p-4 flex items-center justify-between text-left hover:bg-white/40 dark:hover:bg-[#1a1e28]/40 transition-colors cursor-pointer"
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
              <div className="p-5 pt-3 border-t border-slate-200/80 dark:border-white/10 space-y-3.5 animate-fade-in-up">
                {/* 1. Download Permission */}
                <div className="p-3.5 rounded-xl bg-white dark:bg-[#1a1e28] border border-slate-200/80 dark:border-white/10 shadow-clay-sm flex items-start justify-between gap-4">
                  <div className="space-y-0.5">
                    <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                      Allow viewers to download PDF file
                    </span>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      When unchecked, viewers can read the file in the high-fidelity reader, but direct download buttons and PDF export are disabled.
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={allowDownload}
                    aria-label="Allow viewers to download PDF file"
                    onClick={() => setAllowDownload(!allowDownload)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-lg border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 dark:focus-visible:ring-neutral-100 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#1a1e28] shadow-clay-inset active:scale-95 ${
                      allowDownload ? 'bg-neutral-900 dark:bg-neutral-100' : 'bg-slate-300 dark:bg-neutral-800'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-md bg-white dark:bg-[#1a1e28] shadow-clay-sm transition duration-200 ease-in-out ${
                        allowDownload ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* 2. Viewer Library Save Permission (Requirement 3) */}
                <div className="p-3.5 rounded-xl bg-white dark:bg-[#1a1e28] border border-slate-200/80 dark:border-white/10 shadow-clay-sm flex items-start justify-between gap-4">
                  <div className="space-y-0.5">
                    <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                      Allow viewers to save this file to their library
                    </span>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      When checked, visitors with viewer accounts can bookmark and save this document to their personal library to view anytime.
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={allowSave}
                    aria-label="Allow viewers to save this file to their library"
                    onClick={() => setAllowSave(!allowSave)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-lg border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 dark:focus-visible:ring-neutral-100 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#1a1e28] shadow-clay-inset active:scale-95 ${
                      allowSave ? 'bg-neutral-900 dark:bg-neutral-100' : 'bg-slate-300 dark:bg-neutral-800'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-md bg-white dark:bg-[#1a1e28] shadow-clay-sm transition duration-200 ease-in-out ${
                        allowSave ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* 3. Public Listing Visibility */}
                <div className="p-3.5 rounded-xl bg-white dark:bg-[#1a1e28] border border-slate-200/80 dark:border-white/10 shadow-clay-sm flex items-start justify-between gap-4">
                  <div className="space-y-0.5">
                    <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
                      <span>List publicly on Public Profile</span>
                      {!isPublicListing && (
                        <span className="text-[11px] font-normal text-neutral-500 flex items-center gap-1">
                          <EyeOff className="w-3 h-3" /> Unlisted
                        </span>
                      )}
                    </span>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      When unchecked, this resource is unlisted and hidden from your public profile feed. Only visitors with the direct link or access code can access it.
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={isPublicListing}
                    aria-label="List publicly on Public Profile"
                    onClick={() => setIsPublicListing(!isPublicListing)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-lg border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 dark:focus-visible:ring-neutral-100 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#1a1e28] shadow-clay-inset active:scale-95 ${
                      isPublicListing ? 'bg-neutral-900 dark:bg-neutral-100' : 'bg-slate-300 dark:bg-neutral-800'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-md bg-white dark:bg-[#1a1e28] shadow-clay-sm transition duration-200 ease-in-out ${
                        isPublicListing ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* 4. Pin to Top */}
                <div className="p-3.5 rounded-xl bg-white dark:bg-[#1a1e28] border border-slate-200/80 dark:border-white/10 shadow-clay-sm flex items-start justify-between gap-4">
                  <div className="space-y-0.5">
                    <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
                      <Pin className="w-3.5 h-3.5 text-neutral-500" />
                      <span>Pin to top of Profile as Featured</span>
                    </span>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      Highlighted at the top of your document feed for high-priority drops.
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={isPinned}
                    aria-label="Pin to top of Profile as Featured"
                    onClick={() => setIsPinned(!isPinned)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-lg border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 dark:focus-visible:ring-neutral-100 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#1a1e28] shadow-clay-inset active:scale-95 ${
                      isPinned ? 'bg-neutral-900 dark:bg-neutral-100' : 'bg-slate-300 dark:bg-neutral-800'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-md bg-white dark:bg-[#1a1e28] shadow-clay-sm transition duration-200 ease-in-out ${
                        isPinned ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* 5. Drop Expiration */}
                <div className="p-3.5 rounded-xl bg-white dark:bg-[#1a1e28] border border-slate-200/80 dark:border-white/10 shadow-clay-sm space-y-2">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-0.5">
                      <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-neutral-500" />
                        <span>Set drop expiration date & time</span>
                      </span>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">
                        Access is automatically closed after this timestamp.
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={hasExpiration}
                      aria-label="Set drop expiration date & time"
                      onClick={() => setHasExpiration(!hasExpiration)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-lg border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 dark:focus-visible:ring-neutral-100 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#1a1e28] shadow-clay-inset active:scale-95 ${
                        hasExpiration ? 'bg-neutral-900 dark:bg-neutral-100' : 'bg-slate-300 dark:bg-neutral-800'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-md bg-white dark:bg-[#1a1e28] shadow-clay-sm transition duration-200 ease-in-out ${
                          hasExpiration ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {hasExpiration && (
                    <div className="pt-2 max-w-xs">
                      <input
                        type="datetime-local"
                        value={expirationDate}
                        onChange={e => setExpirationDate(e.target.value)}
                        className="w-full h-10 px-3.5 py-2 text-xs rounded-xl border border-slate-200/80 dark:border-white/10 bg-[#e7ecf3]/70 dark:bg-[#12151e]/80 text-neutral-900 dark:text-neutral-100 shadow-clay-inset focus:outline-none focus:bg-white dark:focus:bg-[#1a1e28] focus:shadow-clay-inset-focus transition-all"
                      />
                    </div>
                  )}
                </div>

                {/* 6. Unlock Capacity Cap */}
                <div className="p-3.5 rounded-xl bg-white dark:bg-[#1a1e28] border border-slate-200/80 dark:border-white/10 shadow-clay-sm space-y-2">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-0.5">
                      <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-neutral-500" />
                        <span>Limit maximum unlock capacity</span>
                      </span>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">
                        Access closes once total unique viewers reach this number.
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={hasCapacityCap}
                      aria-label="Limit maximum unlock capacity"
                      onClick={() => setHasCapacityCap(!hasCapacityCap)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-lg border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 dark:focus-visible:ring-neutral-100 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#1a1e28] shadow-clay-inset active:scale-95 ${
                        hasCapacityCap ? 'bg-neutral-900 dark:bg-neutral-100' : 'bg-slate-300 dark:bg-neutral-800'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-md bg-white dark:bg-[#1a1e28] shadow-clay-sm transition duration-200 ease-in-out ${
                          hasCapacityCap ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {hasCapacityCap && (
                    <div className="pt-2 max-w-xs">
                      <input
                        type="number"
                        min="1"
                        placeholder="e.g. 100"
                        value={maxUnlocks}
                        onChange={e => setMaxUnlocks(e.target.value)}
                        className="w-full h-10 px-3.5 py-2 text-xs rounded-xl border border-slate-200/80 dark:border-white/10 bg-[#e7ecf3]/70 dark:bg-[#12151e]/80 text-neutral-900 dark:text-neutral-100 font-mono shadow-clay-inset focus:outline-none focus:bg-white dark:focus:bg-[#1a1e28] focus:shadow-clay-inset-focus transition-all"
                      />
                    </div>
                  )}
                </div>

                {/* 7. Password Protection */}
                <div className="p-3.5 rounded-xl bg-white dark:bg-[#1a1e28] border border-slate-200/80 dark:border-white/10 shadow-clay-sm space-y-2">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-0.5">
                      <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
                        <Key className="w-3.5 h-3.5 text-neutral-500" />
                        <span>Protect document with a password</span>
                      </span>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">
                        Requires visitors to enter this password before they can view or download the document.
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={hasPassword}
                      aria-label="Protect document with a password"
                      onClick={() => setHasPassword(!hasPassword)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-lg border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 dark:focus-visible:ring-neutral-100 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#1a1e28] shadow-clay-inset active:scale-95 ${
                        hasPassword ? 'bg-neutral-900 dark:bg-neutral-100' : 'bg-slate-300 dark:bg-neutral-800'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-md bg-white dark:bg-[#1a1e28] shadow-clay-sm transition duration-200 ease-in-out ${
                          hasPassword ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {hasPassword && (
                    <div className="pt-2 max-w-xs">
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Enter document password"
                          value={password}
                          onChange={e => setPassword(e.target.value)}
                          className="w-full h-10 pl-3.5 pr-10 py-2 text-xs rounded-xl border border-slate-200/80 dark:border-white/10 bg-[#e7ecf3]/70 dark:bg-[#12151e]/80 text-neutral-900 dark:text-neutral-100 font-mono shadow-clay-inset focus:outline-none focus:bg-white dark:focus:bg-[#1a1e28] focus:shadow-clay-inset-focus transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
                          title={showPassword ? 'Hide password' : 'Show password'}
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* 8. Access Code */}
                <div className="p-3.5 rounded-xl bg-white dark:bg-[#1a1e28] border border-slate-200/80 dark:border-white/10 shadow-clay-sm space-y-2">
                  <div className="flex items-start gap-2.5">
                    <Radio className="w-4 h-4 text-neutral-500 mt-0.5 shrink-0" />
                    <div className="flex-1">
                      <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                        4-Digit Access Code
                      </span>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                        The numeric access code (4-digit, or legacy 6-digit) viewers enter to quickly jump to this document.
                      </p>
                    </div>
                  </div>

                  <div className="pt-1 flex items-center gap-2 max-w-xs">
                    <input
                      type="text"
                      maxLength={6}
                      placeholder="e.g. 4827"
                      value={code}
                      onChange={e => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                        setCode(val);
                      }}
                      className="w-32 h-10 px-3 py-2 text-base font-mono font-bold tracking-widest text-center rounded-xl border border-slate-200/80 dark:border-white/10 bg-[#e7ecf3]/70 dark:bg-[#12151e]/80 text-neutral-900 dark:text-neutral-100 shadow-clay-inset focus:outline-none focus:bg-white dark:focus:bg-[#1a1e28] focus:shadow-clay-inset-focus"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="rounded-xl shadow-clay-sm hover:shadow-clay-card"
                      onClick={handleGenerateRandomCode}
                      title="Generate new 4-digit random code"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Random</span>
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200/80 dark:border-white/10">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl shadow-clay-sm"
              onClick={() => navigate('/dashboard/resources')}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" className="rounded-xl" isLoading={saving}>
              <Check className="w-4 h-4" />
              <span>Save Changes</span>
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};
