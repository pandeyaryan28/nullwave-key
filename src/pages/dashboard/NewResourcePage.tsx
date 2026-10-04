import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { collection, doc, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase/config';
import { useAuth } from '../../lib/auth/authContext';
import { getUniqueCodeForCreator } from '../../lib/utils/codeGenerator';
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
} from 'lucide-react';

export const NewResourcePage: React.FC = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  // Form state
  const [file, setFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [category, setCategory] = useState<string>('');

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

    setIsUploading(true);
    setError(null);
    setUploadProgress(10);

    try {
      // 1. Generate unique 6-digit code scoped to this creator
      const code = await getUniqueCodeForCreator(user.uid);

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
        const localKey = `unlockr_resources_${user.uid}`;
        const existing = JSON.parse(localStorage.getItem(localKey) || '[]');
        localStorage.setItem(localKey, JSON.stringify([newResource, ...existing]));
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

  const copyCreatorLink = () => {
    if (!profile?.username) return;
    const url = `${window.location.origin}/${profile.username}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Confirmation Success View (Section 4 Requirement)
  if (createdResource) {
    return (
      <div className="max-w-xl mx-auto py-6 space-y-6">
        <Card className="p-8 text-center border-neutral-300 dark:border-neutral-700 shadow-sm">
          <div className="w-12 h-12 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center mx-auto mb-4 border border-emerald-300 dark:border-emerald-800">
            <Check className="w-6 h-6" />
          </div>

          <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-50 mb-1">
            Resource created
          </h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-6">
            Your resource is published and ready for distribution.
          </p>

          {/* Prominent 6-Digit Code Box */}
          <div className="p-6 rounded-lg bg-neutral-100 dark:bg-neutral-800/80 border border-neutral-300 dark:border-neutral-700 mb-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-2">
              Your 6-Digit Access Code
            </p>
            <div className="text-4xl sm:text-5xl font-mono font-bold tracking-widest text-neutral-950 dark:text-neutral-50 my-2">
              {createdResource.code}
            </div>
            <div className="flex items-center justify-center gap-3 mt-4">
              <Button size="md" variant="primary" onClick={copyCode}>
                {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copiedCode ? 'Code Copied!' : 'Copy code'}</span>
              </Button>

              <Button size="md" variant="outline" onClick={copyCreatorLink}>
                {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                <span>{copiedLink ? 'Link Copied!' : 'Copy creator link'}</span>
              </Button>
            </div>
          </div>

          {/* Reel / Bio Script Helper */}
          <div className="p-4 rounded-md bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-left mb-6 text-xs text-neutral-600 dark:text-neutral-400 space-y-1.5">
            <p className="font-semibold text-neutral-900 dark:text-neutral-200">
              How to share on Instagram Reels & Stories:
            </p>
            <p className="italic">
              &quot;Link in bio (unlockr.com/{profile?.username}). Enter code <span className="font-mono font-bold text-neutral-900 dark:text-neutral-100">{createdResource.code}</span> to get the guide.&quot;
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
              to={`/${profile?.username}/resource/${createdResource.publicSlug}`}
              target="_blank"
            >
              <Button variant="subtle" size="sm">
                <span>Preview page</span>
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
            Upload a PDF document to generate an automatic 6-digit access code.
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
