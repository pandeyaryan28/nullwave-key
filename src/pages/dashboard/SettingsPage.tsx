import React, { useState } from 'react';
import { useAuth } from '../../lib/auth/authContext';
import { uploadImageFile } from '../../lib/storage/storageService';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Check, AlertCircle, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

export const SettingsPage: React.FC = () => {
  const { user, profile, updateCreatorProfile } = useAuth();

  const [displayName, setDisplayName] = useState<string>(profile?.displayName || '');
  const [bio, setBio] = useState<string>(profile?.bio || '');
  const [socialLink, setSocialLink] = useState<string>(profile?.socialLink || '');
  const [photoURL, setPhotoURL] = useState<string>(profile?.photoURL || '');

  const [saving, setSaving] = useState<boolean>(false);
  const [uploadingAvatar, setUploadingAvatar] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];

    setUploadingAvatar(true);
    setError(null);
    try {
      const url = await uploadImageFile('avatars', user.uid, 'profile', file);
      setPhotoURL(url);
      await updateCreatorProfile({ photoURL: url });
      setSuccessMessage('Avatar updated successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to upload avatar.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await updateCreatorProfile({
        displayName: displayName.trim(),
        bio: bio.trim(),
        socialLink: socialLink.trim(),
        photoURL,
      });
      setSuccessMessage('Profile saved successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to save profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
          Wave Station Settings
        </h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
          Customize your public creator station and bio details.
        </p>
      </div>

      <Card className="p-6 sm:p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-3 rounded-md bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 rounded-md bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Profile Picture */}
          <div className="flex items-center gap-5">
            {photoURL ? (
              <img
                src={photoURL}
                alt="Avatar"
                className="w-16 h-16 rounded-md object-cover border border-neutral-200 dark:border-neutral-800"
              />
            ) : (
              <div className="w-16 h-16 rounded-md bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 flex items-center justify-center font-bold text-xl border border-neutral-300 dark:border-neutral-700">
                {displayName ? displayName[0].toUpperCase() : 'C'}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 mb-1">
                Profile Photo
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                disabled={uploadingAvatar}
                className="text-xs text-neutral-600 dark:text-neutral-400 file:mr-3 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-neutral-100 dark:file:bg-neutral-800 file:text-neutral-900 dark:file:text-neutral-100 hover:file:bg-neutral-200"
              />
              {uploadingAvatar && (
                <p className="text-[11px] text-neutral-500 mt-1">Uploading avatar...</p>
              )}
            </div>
          </div>

          {/* Username (Read Only with link) */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
              Username
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                disabled
                value={profile?.username || ''}
                className="w-full h-10 px-3 py-2 text-sm rounded-md border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-800/50 text-neutral-500 dark:text-neutral-400 font-mono select-none"
              />
              {profile?.username && (
                <Link
                  to={`/${profile.username}`}
                  target="_blank"
                  className="px-3 h-10 inline-flex items-center gap-1.5 rounded-md border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-xs font-medium shrink-0"
                >
                  <span>View</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              )}
            </div>
            <p className="text-xs text-neutral-500">
              Your public profile URL is {window.location.origin}/{profile?.username}
            </p>
          </div>

          {/* Display Name */}
          <Input
            label="Creator Name / Brand"
            placeholder="e.g. Aryan Pandey"
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
          />

          {/* Short Bio */}
          <Textarea
            label="Short Bio"
            placeholder="Tell your viewers who you are and what resources you share."
            rows={3}
            value={bio}
            onChange={e => setBio(e.target.value)}
          />

          {/* Social Link */}
          <Input
            label="Social Profile Link (Optional)"
            placeholder="e.g. instagram.com/aryan or twitter.com/aryan"
            value={socialLink}
            onChange={e => setSocialLink(e.target.value)}
            hint="Displayed on your public profile page"
          />

          <div className="flex justify-end pt-4 border-t border-neutral-100 dark:border-neutral-800">
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
