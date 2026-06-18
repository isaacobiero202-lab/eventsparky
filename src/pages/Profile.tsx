import React, { useState, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useEvents } from '../hooks/useEvents';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { User, Mail, ShieldAlert, Key, Save, UploadCloud, CheckCircle, AlertCircle, Loader } from 'lucide-react';

export function Profile() {
  const { profile, updateProfile, resetPassword, loading: authLoading } = useAuth();
  const { uploadAvatar, loading: uploadLoading } = useEvents();

  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [pwdLoading, setPwdLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      await updateProfile({
        full_name: fullName.trim(),
        avatar_url: avatarUrl,
      });
      setSuccessMsg('Profile updated successfully!');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      console.error('Profile save error:', err);
      setErrorMsg(err.message || 'Failed to update profile details.');
    }
  };

  const handleAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      try {
        setSuccessMsg(null);
        setErrorMsg(null);
        const publicUrl = await uploadAvatar(file);
        if (publicUrl) {
          setAvatarUrl(publicUrl);
          setSuccessMsg('Avatar uploaded! Save changes to persist.');
        }
      } catch (err: any) {
        console.error('Avatar selection upload error:', err);
        setErrorMsg(err.message || 'Avatar upload failed.');
      }
    }
  };

  const handleResetPassword = async () => {
    if (!profile?.email) return;
    setSuccessMsg(null);
    setErrorMsg(null);
    setPwdLoading(true);

    try {
      await resetPassword(profile.email);
      setSuccessMsg('Password reset link sent to your email inbox!');
    } catch (err: any) {
      console.error('Password reset failure:', err);
      setErrorMsg(err.message || 'Could not trigger reset password link.');
    } finally {
      setPwdLoading(false);
    }
  };

  if (!profile) {
    return (
      <div className="py-20">
        <LoadingSpinner size="medium" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-10 px-4">
      {/* Page Title */}
      <div className="mb-8">
        <h1 className="text-3xl font-black text-slate-800 tracking-tight">Account Profile</h1>
        <p className="text-sm font-medium text-slate-500 mt-1">
          Manage your personal details, platform role status, and avatar
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left Column: Avatar & Role Status Card */}
        <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-xs text-center flex flex-col items-center">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept="image/*"
            onChange={handleAvatarFile}
          />

          <div className="relative group cursor-pointer mb-4" onClick={() => fileInputRef.current?.click()}>
            <div className="w-28 h-28 rounded-full overflow-hidden border-2 border-indigo-600 bg-slate-50 relative flex items-center justify-center">
              {avatarUrl ? (
                <img src={avatarUrl} alt={fullName} className="w-full h-full object-cover" />
              ) : (
                <User className="w-12 h-12 text-slate-400" />
              )}
              
              {/* Upload Hover Overlay */}
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition duration-300 rounded-full">
                <UploadCloud className="w-6 h-6 text-white" />
              </div>
            </div>

            {uploadLoading && (
              <div className="absolute inset-0 bg-white/80 rounded-full flex items-center justify-center">
                <Loader className="w-5 h-5 text-indigo-600 animate-spin" />
              </div>
            )}
          </div>

          <h3 className="font-extrabold text-slate-800 text-lg leading-tight truncate">{fullName || 'New Sparkler'}</h3>
          <p className="text-xs text-slate-450 mt-1 h-4">{profile.email}</p>

          <span className="mt-4 px-3.5 py-1 text-xs font-bold uppercase tracking-wider rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100">
            {profile.role}
          </span>

          <p className="text-[11px] text-slate-400 mt-5 leading-normal max-w-xs">
            Standard profile picture is synced securely across all events, listings, and speaker roles.
          </p>
        </div>

        {/* Right Column: Edit inputs form */}
        <div className="md:col-span-2 space-y-6">
          {successMsg && (
            <div className="p-3.5 bg-emerald-50 text-emerald-800 rounded-lg border border-emerald-100 text-xs font-medium flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3.5 bg-rose-50 text-rose-850 rounded-lg border border-rose-100 text-xs font-medium flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Core Profile Information */}
          <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-xs">
            <h3 className="text-base font-extrabold text-slate-800 border-b border-slate-50 pb-3 mb-4">
              Profile Information
            </h3>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.55">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3 w-4.5 h-4.5 text-slate-400" />
                  <input
                    type="text"
                    required
                    className="w-full text-sm pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.55">
                  Account Email Address (Non-modifiable)
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 w-4.5 h-4.5 text-slate-400" />
                  <input
                    type="email"
                    disabled
                    className="w-full text-sm pl-11 pr-4 py-2.5 bg-slate-100 border border-slate-200 text-slate-400 rounded-lg cursor-not-allowed"
                    value={profile.email || ''}
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={authLoading || uploadLoading}
                  className="inline-flex items-center space-x-2 px-5 py-2.5 text-xs font-extrabold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 rounded-lg transition shadow-xs cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>

          {/* Security & Password reset Panel */}
          <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-xs">
            <h3 className="text-base font-extrabold text-slate-800 border-b border-slate-50 pb-3 mb-3">
              Account Security
            </h3>
            <p className="text-xs text-slate-500 mb-4 font-medium leading-relaxed">
              If you logged in using an email and password account, you can update your password credentials anytime by triggering a secure verification links.
            </p>

            <button
              onClick={handleResetPassword}
              disabled={pwdLoading}
              className="inline-flex items-center space-x-2 px-4 py-2.5 text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition cursor-pointer"
            >
              {pwdLoading ? (
                <Loader className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Key className="w-3.5 h-3.5 text-indigo-500" />
              )}
              <span>Trigger Reset Password Email</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
