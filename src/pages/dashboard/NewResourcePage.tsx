import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { collection, doc, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase/config';
import { useAuth } from '../../lib/auth/authContext';
import { getUniqueCodeForCreator, generateSixDigitCode, isCodeInUseByCreator } from '../../lib/utils/codeGenerator';
import { generatePublicSlug } from '../../lib/utils/slugify';
import { uploadResourceFile, uploadImageFile, MAX_PDF_SIZE_BYTES } from '../../lib/storage/storageService';
import { Resource } from '../../types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import {
  FileText,
  Upload,
  Check,
  Copy,
  ExternalLink,
  ArrowLeft,
  X,
  AlertCircle,
  SlidersHorizontal,
  RefreshCw,
  EyeOff,
  Pin,
  Clock,
  Users,
  ChevronDown,
} from 'lucide-react';

export const NewResourcePage: React.FC = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  // Core Form state
  const [file, setFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [category, setCategory] = useState<string>('');

  // Advanced Options state (collapsed by default)
  const [isAdvancedOpen, setIsAdvancedOpen] = useState<boolean>(false);
  const [allowDownload, setAllowDownload] = useState<boolean>(true);
  const [allowSave, setAllowSave] = useState<boolean>(true);
  const [isPublicListing, setIsPublicListing] = useState<boolean>(true);
  const [isPinned, setIsPinned] = useState<boolean>(false);
  const [hasExpiration, setHasExpiration] = useState<boolean>(false);
  const [expirationDate, setExpirationDate] = useState<string>('');
  const [hasCapacityCap, setHasCapacityCap] = useState<boolean>(false);
  const [maxUnlocks, setMaxUnlocks] = useState<string>('');
  const [useCustomCode, setUseCustomCode] = useState<boolean>(false);
  const [customCode, setCustomCode] = useState<string>('');

  // Processing state
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  // Success Confirmation State
  const [createdResource, setCreatedResource] = useState<Resource | null>(null);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      if (selected.type !== 'application/pdf' && !selected.name.toLowerCase().endsWith('.pdf')) {
        setError('Please select a valid PDF file.');
        return;
      }
      if (selected.size > MAX_PDF_SIZE_BYTES) {
        setError(`PDF size cannot exceed ${MAX_PDF_SIZE_BYTES / (1024 * 1024)}MB.`);
        return;
      }
      setError(null);
      setFile(selected);
      // Auto-populate title if empty
      if (!title) {
        const cleanName = selected.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
        setTitle(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
      }
    }
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      if (!selected.type.startsWith('image/')) {
        setError('Please select a valid image file for the cover.');
        return;
      }
      setError(null);
      setCoverFile(selected);
    }
  };

  const handleGenerateRandomCode = () => {
    setCustomCode(generateSixDigitCode());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile?.username) {
      setError('You must have a username set before uploading resources.');
      return;
    }
    if (!file) {
      setError('Please select a PDF file to upload.');
      return;
    }
    if (!title.trim()) {
      setError('Please enter a title for the resource.');
      return;
    }

    if (useCustomCode) {
      const clean = customCode.trim();
      if (!/^\d{6}$/.test(clean)) {
        setError('Custom access code must be exactly 6 numeric digits (e.g. 582910).');
        return;
      }
      const num = parseInt(clean, 10);
      if (num < 100000 || num > 999999) {
        setError('Custom code must be between 100000 and 999999.');
        return;
      }
    }

    let expiresAtTimestamp: number | null = null;
    if (hasExpiration) {
      if (!expirationDate) {
        setError('Please select an expiration date and time, or disable drop expiration.');
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

    setIsUploading(true);
    setError(null);
    setUploadProgress(10);

    try {
      // 1. Determine 6-digit access code
      let code = '';
      if (useCustomCode) {
        code = customCode.trim();
        const codeTaken = await isCodeInUseByCreator(user.uid, code);
        if (codeTaken) {
          setError('This 6-digit access code is already assigned to one of your active resources. Please choose a different code.');
          setIsUploading(false);
          return;
        }
      } else {
        code = await getUniqueCodeForCreator(user.uid);
      }

      // 2. Prepare internal Firestore document ID and safe public slug
      const resourceRef = doc(collection(db, 'resources'));
      const resourceId = resourceRef.id;
      const publicSlug = generatePublicSlug(title);

      setUploadProgress(25);

      // 3. Upload PDF file
      const fileUrl = await uploadResourceFile(
        user.uid,
        resourceId,
        file,
        progress => setUploadProgress(25 + Math.round(progress * 0.5))
      );

      // 4. Upload optional cover image
      let coverUrl: string | undefined = undefined;
      if (coverFile) {
        coverUrl = await uploadImageFile('covers', user.uid, resourceId, coverFile);
      }

      setUploadProgress(85);

      const now = Date.now();

      const newResource: Resource = {
        id: resourceId,
        creatorId: user.uid,
        creatorUsername: profile.username,
        publicSlug,
        code,
        title: title.trim(),
        description: description.trim(),
        fileUrl,
        fileName: file.name,
        fileSizeBytes: file.size,
        status: 'active',
        createdAt: now,
        updatedAt: now,
        totalViews: 0,
        uniqueViews: 0,
        totalDownloads: 0,
        allowDownload,
        allowSave,
        isPublicListing,
        isPinned,
        expiresAt: expiresAtTimestamp,
        maxUnlocks: maxUnlocksCount,
      };

      if (category.trim()) {
        newResource.category = category.trim();
      }
      if (coverUrl) {
        newResource.coverUrl = coverUrl;
      }

      // 5. Cleanly serialize and save to Firestore
      const firestorePayload = Object.fromEntries(
        Object.entries(newResource).filter(([_, v]) => v !== undefined)
      );
      await setDoc(resourceRef, firestorePayload);

      // Cache in localStorage for offline / mock testing resilience
      try {
        const nullwaveKey = `nullwave_resources_${user.uid}`;
        const unlockrKey = `unlockr_resources_${user.uid}`;
        const existing = JSON.parse(localStorage.getItem(nullwaveKey) || localStorage.getItem(unlockrKey) || '[]');
        const updated = [newResource, ...existing];
        localStorage.setItem(nullwaveKey, JSON.stringify(updated));
        localStorage.setItem(unlockrKey, JSON.stringify(updated));
      } catch {}

      setUploadProgress(100);
      setCreatedResource(newResource);
    } catch (err: unknown) {
      console.error('Resource upload failure:', err);
      setError((err as Error).message || 'Failed to upload resource. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const copyCode = () => {
    if (!createdResource) return;
    navigator.clipboard.writeText(createdResource.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const copyDocLink = () => {
    if (!profile?.username || !createdResource) return;
    const url = `${window.location.origin}/${profile.username}/${createdResource.code}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Confirmation Success View
  if (createdResource) {
    return (
      <div className="max-w-xl mx-auto py-6 space-y-6 animate-fade-in-up">
        <Card className="p-8 text-center border-neutral-300 dark:border-neutral-700 shadow-sm">
          <div className="w-12 h-12 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center mx-auto mb-4 border border-emerald-300 dark:border-emerald-800">
            <Check className="w-6 h-6" />
          </div>

          <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-50 mb-1">
            Document Published Successfully
          </h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-6">
            Your document is live and ready to share with your audience.
          </p>

          {/* Prominent 6-Digit Code Box */}
          <div className="p-6 rounded-lg bg-neutral-100 dark:bg-neutral-800/80 border border-neutral-300 dark:border-neutral-700 mb-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-2">
              6-Digit Access Code
            </p>
            <div className="text-4xl sm:text-5xl font-mono font-bold tracking-widest text-neutral-950 dark:text-neutral-50 my-2">
              {createdResource.code}
            </div>
            <div className="flex items-center justify-center gap-3 mt-4">
              <Button size="md" variant="primary" onClick={copyCode}>
                {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copiedCode ? 'Code Copied!' : 'Copy Code'}</span>
              </Button>

              <Button size="md" variant="outline" onClick={copyDocLink}>
                {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                <span>{copiedLink ? 'Link Copied!' : 'Copy Document Link'}</span>
              </Button>
            </div>
          </div>

          {/* Distribution Badges Summary */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
            {!createdResource.allowDownload && (
              <span className="px-2.5 py-1 text-xs font-medium rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                View Only (Downloads Disabled)
              </span>
            )}
            {createdResource.allowSave === false && (
              <span className="px-2.5 py-1 text-xs font-medium rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700">
                Saving Disabled
              </span>
            )}
            {!createdResource.isPublicListing && (
              <span className="px-2.5 py-1 text-xs font-medium rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700">
                Unlisted Document
              </span>
            )}
            {createdResource.isPinned && (
              <span className="px-2.5 py-1 text-xs font-medium rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                Pinned to Top
              </span>
            )}
            {createdResource.expiresAt && (
              <span className="px-2.5 py-1 text-xs font-medium rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700">
                Expires: {new Date(createdResource.expiresAt).toLocaleDateString()}
              </span>
            )}
            {createdResource.maxUnlocks && (
              <span className="px-2.5 py-1 text-xs font-medium rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700">
                Capacity: {createdResource.maxUnlocks} unlocks
              </span>
            )}
          </div>

          {/* Social Script Helper */}
          <div className="p-4 rounded-md bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-left mb-6 text-xs text-neutral-600 dark:text-neutral-400 space-y-1.5">
            <p className="font-semibold text-neutral-900 dark:text-neutral-200">
              Share link directly:
            </p>
            <p className="font-mono text-xs bg-neutral-100 dark:bg-neutral-800 p-2 rounded border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 select-all">
              {window.location.origin}/{profile?.username}/{createdResource.code}
            </p>
          </div>

          <div className="flex items-center justify-between gap-4 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/dashboard/resources')}
            >
              Back to resources
            </Button>

            <Link
              to={`/${profile?.username}/${createdResource.code}`}
              target="_blank"
            >
              <Button variant="subtle" size="sm">
                <span>Open Document</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="p-1.5 rounded-md text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          aria-label="Back"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
            Upload Resource
          </h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Upload a PDF document to generate an access code with precision distribution controls.
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

          {/* PDF Dropzone */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
              PDF Document *
            </label>

            {!file ? (
              <label className="border-2 border-dashed border-neutral-300 dark:border-neutral-700 rounded-lg p-8 flex flex-col items-center justify-center cursor-pointer hover:border-neutral-400 dark:hover:border-neutral-600 hover:bg-neutral-50/50 dark:hover:bg-neutral-900/50 transition-colors">
                <Upload className="w-8 h-8 text-neutral-400 mb-2" />
                <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                  Click to select PDF or drag and drop
                </span>
                <span className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                  PDF format up to 25MB
                </span>
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            ) : (
              <div className="p-4 rounded-md border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-md bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center text-neutral-700 dark:text-neutral-300">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 truncate max-w-xs">
                      {file.name}
                    </p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 font-mono">
                      {(file.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setFile(null)}
                  className="p-1.5 text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 rounded-md"
                  aria-label="Remove file"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Title */}
          <Input
            label="Resource Title *"
            placeholder="e.g. The Ultimate Startup GTM Guide"
            value={title}
            onChange={e => setTitle(e.target.value)}
            required
          />

          {/* Description */}
          <Textarea
            label="Description"
            placeholder="Provide a concise summary of what viewers will learn or receive in this resource."
            rows={3}
            value={description}
            onChange={e => setDescription(e.target.value)}
          />

          {/* Optional Category */}
          <Input
            label="Category (Optional)"
            placeholder="e.g. Marketing, Engineering, Design, Finance"
            value={category}
            onChange={e => setCategory(e.target.value)}
          />

          {/* Optional Cover Image */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
              Cover Thumbnail (Optional)
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleCoverChange}
              className="text-xs text-neutral-600 dark:text-neutral-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-neutral-100 dark:file:bg-neutral-800 file:text-neutral-900 dark:file:text-neutral-100 hover:file:bg-neutral-200"
            />
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
                        When unchecked, turns on View-Only mode. Viewers can inspect the guide in the reader, but download buttons and raw PDF saving are suppressed.
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
                        When unchecked, this resource is hidden from your public profile feed. Only visitors given the direct link or 6-digit code can unlock it.
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
                        Highlighted at the top of your document feed for high-priority drops and flagship guides.
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
                        <span>Set document expiration date & time</span>
                      </span>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                        Perfect for 24-hour flash drops or cohort deadlines. Access is automatically closed after this timestamp.
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
                        <span>Limit maximum viewer capacity</span>
                      </span>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                        Cap total unlocks (e.g., &quot;First 100 viewers only&quot;). Access closes once the unlock limit is reached.
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
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useCustomCode}
                      onChange={e => {
                        setUseCustomCode(e.target.checked);
                        if (e.target.checked && !customCode) {
                          setCustomCode(generateSixDigitCode());
                        }
                      }}
                      className="mt-0.5 rounded border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 focus:ring-neutral-500"
                    />
                    <div>
                      <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                        Set custom 6-digit access code
                      </span>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                        Pick a memorable 6-digit numeric access code for your audience (defaults to auto-generated).
                      </p>
                    </div>
                  </label>

                  {useCustomCode && (
                    <div className="pl-6 pt-1 flex items-center gap-2 max-w-xs">
                      <input
                        type="text"
                        maxLength={6}
                        placeholder="e.g. 582910"
                        value={customCode}
                        onChange={e => {
                          const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                          setCustomCode(val);
                        }}
                        className="w-36 h-10 px-3 py-2 text-base font-mono font-bold tracking-widest text-center rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100"
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={handleGenerateRandomCode}
                        title="Generate random code"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Random</span>
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Upload Progress */}
          {isUploading && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-neutral-500">
                <span>Uploading and generating access code...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full h-1.5 bg-neutral-200 dark:bg-neutral-800 rounded overflow-hidden">
                <div
                  className="h-full bg-neutral-900 dark:bg-neutral-100 transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-100 dark:border-neutral-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/dashboard/resources')}
              disabled={isUploading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isUploading}
              disabled={!file || !title.trim()}
            >
              Create Resource & Generate Code
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};
