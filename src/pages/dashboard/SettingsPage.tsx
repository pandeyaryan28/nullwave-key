import React, { useState, useEffect } from 'react';
import { useAuth } from '../../lib/auth/authContext';
import { uploadImageFile } from '../../lib/storage/storageService';
import type { UserProfile } from '../../types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import {
  Check,
  AlertCircle,
  ExternalLink,
  Image as ImageIcon,
  Trash2,
  Instagram,
  Twitter,
  Youtube,
  Linkedin,
  Github,
  Globe,
  MapPin,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const SettingsPage: React.FC = () => {
  const { user, profile, updateCreatorProfile } = useAuth();

  const [displayName, setDisplayName] = useState<string>(profile?.displayName || '');
  const [headline, setHeadline] = useState<string>(profile?.headline || '');
  const [bio, setBio] = useState<string>(profile?.bio || '');
  const [location, setLocation] = useState<string>(profile?.location || '');
  const [photoURL, setPhotoURL] = useState<string>(profile?.photoURL || '');
  const [bannerURL, setBannerURL] = useState<string>(profile?.bannerURL || '');

  const getInitialSocials = (p?: UserProfile | null) => {
    const isDedicated = (domain: string) => Boolean(p?.socialLink?.toLowerCase().includes(domain));
    const isKnown =
      isDedicated('instagram.com') ||
      isDedicated('twitter.com') ||
      isDedicated('x.com') ||
      isDedicated('youtube.com') ||
      isDedicated('linkedin.com') ||
      isDedicated('github.com');

    return {
      instagram: p?.socialLinks?.instagram || (isDedicated('instagram.com') ? p?.socialLink : '') || '',
      twitter: p?.socialLinks?.twitter || (isDedicated('twitter.com') || isDedicated('x.com') ? p?.socialLink : '') || '',
      youtube: p?.socialLinks?.youtube || (isDedicated('youtube.com') ? p?.socialLink : '') || '',
      linkedin: p?.socialLinks?.linkedin || (isDedicated('linkedin.com') ? p?.socialLink : '') || '',
      github: p?.socialLinks?.github || (isDedicated('github.com') ? p?.socialLink : '') || '',
      website: p?.socialLinks?.website || (!p?.socialLinks && !isKnown && p?.socialLink ? p.socialLink : '') || '',
    };
  };

  const [socialLinks, setSocialLinks] = useState(getInitialSocials(profile));

  const [saving, setSaving] = useState<boolean>(false);
  const [uploadingAvatar, setUploadingAvatar] = useState<boolean>(false);
  const [uploadingBanner, setUploadingBanner] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName || '');
      setHeadline(profile.headline || '');
      setBio(profile.bio || '');
      setLocation(profile.location || '');
      setPhotoURL(profile.photoURL || '');
      setBannerURL(profile.bannerURL || '');
      setSocialLinks(getInitialSocials(profile));
    }
  }, [profile]);

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

  const handleRemoveAvatar = async () => {
    setPhotoURL('');
    try {
      await updateCreatorProfile({ photoURL: '' });
      setSuccessMessage('Avatar removed.');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to remove avatar.');
    }
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];

    setUploadingBanner(true);
    setError(null);
    try {
      const url = await uploadImageFile('banners', user.uid, 'banner', file);
      setBannerURL(url);
      await updateCreatorProfile({ bannerURL: url });
      setSuccessMessage('Banner updated successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to upload banner.');
    } finally {
      setUploadingBanner(false);
    }
  };

  const handleRemoveBanner = async () => {
    setBannerURL('');
    try {
      await updateCreatorProfile({ bannerURL: '' });
      setSuccessMessage('Banner removed.');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to remove banner.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    const primarySocial =
      socialLinks.website.trim() ||
      socialLinks.twitter.trim() ||
      socialLinks.instagram.trim() ||
      socialLinks.youtube.trim() ||
      socialLinks.linkedin.trim() ||
      socialLinks.github.trim() ||
      '';

    try {
      await updateCreatorProfile({
        displayName: displayName.trim(),
        headline: headline.trim(),
        bio: bio.trim(),
        location: location.trim(),
        photoURL: photoURL || undefined,
        bannerURL: bannerURL || undefined,
        socialLinks: {
          instagram: socialLinks.instagram.trim() || undefined,
          twitter: socialLinks.twitter.trim() || undefined,
          youtube: socialLinks.youtube.trim() || undefined,
          linkedin: socialLinks.linkedin.trim() || undefined,
          github: socialLinks.github.trim() || undefined,
          website: socialLinks.website.trim() || undefined,
        },
        socialLink: primarySocial,
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
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
          Profile & Account Settings
        </h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
          Customize your public creator profile cover, bio details, and social channels.
        </p>
      </div>

      <Card className="p-6 sm:p-8">
        <form onSubmit={handleSubmit} className="space-y-8">
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

          {/* Banner Cover Image Section */}
          <div className="space-y-3">
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
              Profile Header Banner
            </label>

            <div className="relative w-full h-36 sm:h-44 rounded-lg overflow-hidden border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900">
              {bannerURL ? (
                <img
                  src={bannerURL}
                  alt="Profile Banner"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-neutral-400 dark:text-neutral-600 gap-2">
                  <ImageIcon className="w-8 h-8" />
                  <span className="text-xs">No custom banner set (default gradient will be displayed)</span>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-3">
                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-xs font-medium cursor-pointer transition-colors text-neutral-800 dark:text-neutral-200">
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>{bannerURL ? 'Change Banner' : 'Upload Banner'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleBannerUpload}
                    disabled={uploadingBanner}
                    className="hidden"
                  />
                </label>

                {bannerURL && (
                  <button
                    type="button"
                    onClick={handleRemoveBanner}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 text-xs font-medium transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remove</span>
                  </button>
                )}
              </div>

              <span className="text-xs text-neutral-500 dark:text-neutral-400">
                Recommended 1500 × 500 px • Max 5MB
              </span>
            </div>
          </div>

          {/* Profile Picture Section */}
          <div className="flex items-center gap-5 pt-2 border-t border-neutral-100 dark:border-neutral-800">
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

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
                Profile Avatar
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  disabled={uploadingAvatar}
                  className="text-xs text-neutral-600 dark:text-neutral-400 file:mr-3 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-neutral-100 dark:file:bg-neutral-800 file:text-neutral-900 dark:file:text-neutral-100 hover:file:bg-neutral-200"
                />
                {photoURL && (
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    className="text-xs text-red-600 dark:text-red-400 hover:underline"
                  >
                    Remove
                  </button>
                )}
              </div>
              {uploadingAvatar && (
                <p className="text-[11px] text-neutral-500">Uploading avatar...</p>
              )}
            </div>
          </div>

          {/* Username (Read Only with profile link) */}
          <div className="space-y-1.5 pt-2 border-t border-neutral-100 dark:border-neutral-800">
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
              Profile Handle
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
                  <span>View Profile</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              )}
            </div>
            <p className="text-xs text-neutral-500">
              Your public profile address is {window.location.origin}/{profile?.username}
            </p>
          </div>

          {/* Creator Core Identity */}
          <div className="space-y-4">
            <Input
              label="Display Name / Brand *"
              placeholder="e.g. Aryan Pandey"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              required
            />

            <Input
              label="Headline / Tagline"
              placeholder="e.g. Software Engineer & Designer • Building tools for creators"
              value={headline}
              onChange={e => setHeadline(e.target.value)}
              hint="Appears prominently directly under your name on your public profile"
            />

            <Textarea
              label="Bio"
              placeholder="Tell your viewers who you are, what guides and resources you share, and what they will learn."
              rows={3}
              value={bio}
              onChange={e => setBio(e.target.value)}
            />

            <div className="relative">
              <Input
                label="Location (Optional)"
                placeholder="e.g. San Francisco, CA or London, UK"
                value={location}
                onChange={e => setLocation(e.target.value)}
              />
              <MapPin className="w-4 h-4 text-neutral-400 absolute right-3 top-8 pointer-events-none" />
            </div>
          </div>

          {/* Structured Social Links */}
          <div className="space-y-4 pt-4 border-t border-neutral-100 dark:border-neutral-800">
            <div>
              <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                Connected Social Links
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                Displays crisp icon badges on your public profile header for seamless visitor cross-follow.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="relative">
                <Input
                  label="Instagram"
                  placeholder="instagram.com/username or @handle"
                  value={socialLinks.instagram}
                  onChange={e => setSocialLinks(prev => ({ ...prev, instagram: e.target.value }))}
                />
                <Instagram className="w-4 h-4 text-neutral-400 absolute right-3 top-8 pointer-events-none" />
              </div>

              <div className="relative">
                <Input
                  label="X / Twitter"
                  placeholder="x.com/username or twitter.com/username"
                  value={socialLinks.twitter}
                  onChange={e => setSocialLinks(prev => ({ ...prev, twitter: e.target.value }))}
                />
                <Twitter className="w-4 h-4 text-neutral-400 absolute right-3 top-8 pointer-events-none" />
              </div>

              <div className="relative">
                <Input
                  label="YouTube"
                  placeholder="youtube.com/@channel"
                  value={socialLinks.youtube}
                  onChange={e => setSocialLinks(prev => ({ ...prev, youtube: e.target.value }))}
                />
                <Youtube className="w-4 h-4 text-neutral-400 absolute right-3 top-8 pointer-events-none" />
              </div>

              <div className="relative">
                <Input
                  label="LinkedIn"
                  placeholder="linkedin.com/in/username"
                  value={socialLinks.linkedin}
                  onChange={e => setSocialLinks(prev => ({ ...prev, linkedin: e.target.value }))}
                />
                <Linkedin className="w-4 h-4 text-neutral-400 absolute right-3 top-8 pointer-events-none" />
              </div>

              <div className="relative">
                <Input
                  label="GitHub"
                  placeholder="github.com/username"
                  value={socialLinks.github}
                  onChange={e => setSocialLinks(prev => ({ ...prev, github: e.target.value }))}
                />
                <Github className="w-4 h-4 text-neutral-400 absolute right-3 top-8 pointer-events-none" />
              </div>

              <div className="relative">
                <Input
                  label="Website / Portfolio"
                  placeholder="https://yourportfolio.com"
                  value={socialLinks.website}
                  onChange={e => setSocialLinks(prev => ({ ...prev, website: e.target.value }))}
                />
                <Globe className="w-4 h-4 text-neutral-400 absolute right-3 top-8 pointer-events-none" />
              </div>
            </div>
          </div>

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
