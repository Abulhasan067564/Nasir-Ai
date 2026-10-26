import React, { useState } from 'react';
import {
  X,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
  KeyRound,
  ShieldCheck,
} from 'lucide-react';
import { Language, UserProfile } from '../lib/types';
import {
  signInWithEmail,
  signUpWithEmail,
  resetPassword,
  signInWithGoogle,
} from '../lib/firebase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  onSuccess: (profile: UserProfile) => void;
  guestUid?: string;
}

const AVATAR_OPTIONS = [
  { id: 'emerald', label: 'Emerald Glow', gradient: 'from-emerald-500 to-teal-400', icon: '⚡' },
  { id: 'indigo', label: 'Cosmic Indigo', gradient: 'from-indigo-500 to-violet-500', icon: '🌌' },
  { id: 'teal', label: 'Cyber Teal', gradient: 'from-teal-400 to-cyan-500', icon: '💎' },
  { id: 'gold', label: 'Solar Gold', gradient: 'from-amber-400 to-yellow-500', icon: '✨' },
  { id: 'ruby', label: 'Ruby Blaze', gradient: 'from-rose-500 to-red-500', icon: '🔥' },
];

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  language,
  onSuccess,
  guestUid,
}) => {
  const isBn = language === 'bn';
  const [tab, setTab] = useState<'signin' | 'signup' | 'forgot'>('signin');

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState(AVATAR_OPTIONS[0]);

  // Status
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);

  if (!isOpen) return null;

  const resetForm = () => {
    setName('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setError(null);
    setResetSent(false);
  };

  const mapAuthError = (errMessage: string) => {
    if (errMessage.includes('invalid-credential') || errMessage.includes('wrong-password') || errMessage.includes('user-not-found')) {
      return isBn
        ? 'ইমেইল বা পাসওয়ার্ড সঠিক নয়। অনুগ্রহ করে পুনরায় চেষ্টা করুন।'
        : 'Invalid email or password. Please verify and try again.';
    }
    if (errMessage.includes('email-already-in-use')) {
      return isBn
        ? 'এই ইমেইলটি দিয়ে ইতিমধ্যে একটি অ্যাকাউন্ট রয়েছে। দয়া করে সাইন ইন করুন।'
        : 'This email is already in use. Please sign in instead.';
    }
    if (errMessage.includes('weak-password')) {
      return isBn
        ? 'পাসওয়ার্ডটি অত্যন্ত দুর্বল। অনুগ্রহ করে কমপক্ষে ৬ অক্ষরের পাসওয়ার্ড দিন।'
        : 'Password is too weak. Please use at least 6 characters.';
    }
    if (errMessage.includes('invalid-email')) {
      return isBn
        ? 'অনুগ্রহ করে একটি সঠিক ইমেইল/জিমেইল ঠিকানা লিখুন।'
        : 'Please enter a valid email address.';
    }
    return errMessage;
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError(isBn ? 'ইমেইল এবং পাসওয়ার্ড প্রদান করুন।' : 'Please enter your email and password.');
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const prof = await signInWithEmail(email.trim(), password, guestUid);
      onSuccess(prof);
      onClose();
      resetForm();
    } catch (err: any) {
      setError(mapAuthError(err?.message || 'Sign in failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError(isBn ? 'অনুগ্রহ করে আপনার নাম লিখুন।' : 'Please enter your full name.');
      return;
    }
    if (!email.trim()) {
      setError(isBn ? 'অনুগ্রহ করে আপনার ইমেইল/জিমেইল লিখুন।' : 'Please enter your email address.');
      return;
    }
    if (password.length < 6) {
      setError(isBn ? 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।' : 'Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError(isBn ? 'উভয় পাসওয়ার্ড মেলেনি!' : 'Passwords do not match!');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const avatarPhotoUrl = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(name.trim() + '_' + selectedAvatar.id)}`;
      const prof = await signUpWithEmail(
        email.trim(),
        password,
        name.trim(),
        avatarPhotoUrl,
        guestUid
      );
      onSuccess(prof);
      onClose();
      resetForm();
    } catch (err: any) {
      setError(mapAuthError(err?.message || 'Sign up failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError(isBn ? 'অনুগ্রহ করে আপনার নিবন্ধিত ইমেইল লিখুন।' : 'Please enter your registered email address.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      await resetPassword(email.trim());
      setResetSent(true);
    } catch (err: any) {
      setError(mapAuthError(err?.message || 'Password reset request failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      const prof = await signInWithGoogle(guestUid);
      onSuccess(prof);
      onClose();
      resetForm();
    } catch (err: any) {
      setError(mapAuthError(err?.message || 'Google sign-in canceled or failed.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-zinc-950/95 border border-zinc-800/90 rounded-3xl shadow-2xl overflow-hidden p-6 sm:p-8 flex flex-col space-y-6">
        {/* Glow ambient background element */}
        <div className="absolute -top-24 -left-24 w-56 h-56 bg-teal-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-56 h-56 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-start justify-between relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-teal-500 via-emerald-400 to-indigo-500 p-0.5 shadow-lg shadow-teal-500/20 flex items-center justify-center">
              <div className="w-full h-full bg-zinc-950 rounded-[14px] flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-teal-400" />
              </div>
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide">
                Nasir AI <span className="text-teal-400 font-semibold text-sm">Account</span>
              </h2>
              <p className="text-xs text-zinc-400">
                {tab === 'signin' && (isBn ? 'আপনার অ্যাকাউন্টে লগইন করুন' : 'Sign in to access synced chats')}
                {tab === 'signup' && (isBn ? 'নতুন নাসির এআই অ্যাকাউন্ট খুলুন' : 'Create your free account')}
                {tab === 'forgot' && (isBn ? 'পাসওয়ার্ড উদ্ধার করুন' : 'Recover your password')}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              resetForm();
              onClose();
            }}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav Tabs */}
        {tab !== 'forgot' && (
          <div className="grid grid-cols-2 p-1 bg-zinc-900/80 border border-zinc-800 rounded-2xl relative z-10">
            <button
              type="button"
              onClick={() => {
                setTab('signin');
                setError(null);
              }}
              className={`py-2 text-xs font-semibold rounded-xl transition-all ${
                tab === 'signin'
                  ? 'bg-gradient-to-r from-teal-500 to-emerald-500 text-zinc-950 shadow-md font-bold'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              {isBn ? 'সাইন ইন (লগইন)' : 'Sign In'}
            </button>
            <button
              type="button"
              onClick={() => {
                setTab('signup');
                setError(null);
              }}
              className={`py-2 text-xs font-semibold rounded-xl transition-all ${
                tab === 'signup'
                  ? 'bg-gradient-to-r from-teal-500 to-emerald-500 text-zinc-950 shadow-md font-bold'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              {isBn ? 'নতুন অ্যাকাউন্ট (সাইন আপ)' : 'Sign Up'}
            </button>
          </div>
        )}

        {/* Error Notification */}
        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-start gap-2.5 relative z-10 animate-in fade-in duration-150">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {/* Form: SIGN IN */}
        {tab === 'signin' && (
          <form onSubmit={handleSignIn} className="space-y-4 relative z-10">
            <div>
              <label className="text-xs font-medium text-zinc-300 block mb-1.5">
                {isBn ? 'জিমেইল / ইমেইল' : 'Email Address / Gmail'}
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@gmail.com"
                  required
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-3.5 py-2.5 text-xs sm:text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-zinc-300">
                  {isBn ? 'পাসওয়ার্ড' : 'Password'}
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setTab('forgot');
                    setError(null);
                    setResetSent(false);
                  }}
                  className="text-xs text-teal-400 hover:text-teal-300 transition-colors"
                >
                  {isBn ? 'পাসওয়ার্ড ভুলে গেছেন?' : 'Forgot Password?'}
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-10 py-2.5 text-xs sm:text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-zinc-950 font-bold text-xs sm:text-sm shadow-lg shadow-teal-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{isBn ? 'লগইন হচ্ছে...' : 'Signing In...'}</span>
                </>
              ) : (
                <>
                  <span>{isBn ? 'সাইন ইন করুন' : 'Sign In'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3 pt-2">
              <div className="flex-1 h-px bg-zinc-800" />
              <span className="text-[11px] text-zinc-500 uppercase tracking-wider">
                {isBn ? 'অথবা' : 'or'}
              </span>
              <div className="flex-1 h-px bg-zinc-800" />
            </div>

            {/* Google Sign-in Button */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-850 hover:border-zinc-700 text-zinc-200 font-medium text-xs sm:text-sm active:scale-[0.98] transition-all flex items-center justify-center gap-3 cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{isBn ? 'গুগল দিয়ে চালিয়ে যান' : 'Continue with Google'}</span>
            </button>
          </form>
        )}

        {/* Form: SIGN UP */}
        {tab === 'signup' && (
          <form onSubmit={handleSignUp} className="space-y-3.5 relative z-10 max-h-[70vh] overflow-y-auto pr-1">
            <div>
              <label className="text-xs font-medium text-zinc-300 block mb-1">
                {isBn ? 'আপনার পূর্ণ নাম' : 'Full Name'}
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={isBn ? 'মো. নাসির উদ্দীন' : 'Nasir Uddin'}
                  required
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-3.5 py-2 text-xs sm:text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-zinc-300 block mb-1">
                {isBn ? 'জিমেইল / ইমেইল ঠিকানা' : 'Email Address / Gmail'}
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@gmail.com"
                  required
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-3.5 py-2 text-xs sm:text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all"
                />
              </div>
            </div>

            {/* Avatar Logo Theme Selection */}
            <div>
              <label className="text-xs font-medium text-zinc-300 block mb-1.5">
                {isBn ? 'প্রোফাইল লোগো / অবতার ব্যাজ' : 'Avatar Logo Theme'}
              </label>
              <div className="flex items-center gap-2 overflow-x-auto py-1">
                {AVATAR_OPTIONS.map((av) => (
                  <button
                    key={av.id}
                    type="button"
                    onClick={() => setSelectedAvatar(av)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[11px] font-medium transition-all shrink-0 ${
                      selectedAvatar.id === av.id
                        ? 'border-teal-400 bg-teal-500/20 text-white'
                        : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <span>{av.icon}</span>
                    <span>{av.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-zinc-300 block mb-1">
                {isBn ? 'পাসওয়ার্ড (কমপক্ষে ৬ অক্ষর)' : 'Password (min. 6 characters)'}
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-10 py-2 text-xs sm:text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-zinc-300 block mb-1">
                {isBn ? 'পাসওয়ার্ড নিশ্চিত করুন' : 'Confirm Password'}
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-3.5 py-2 text-xs sm:text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-zinc-950 font-bold text-xs sm:text-sm shadow-lg shadow-teal-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{isBn ? 'অ্যাকাউন্ট তৈরি হচ্ছে...' : 'Creating Account...'}</span>
                </>
              ) : (
                <>
                  <span>{isBn ? 'অ্যাকাউন্ট তৈরি করুন' : 'Create Nasir AI Account'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* Form: FORGOT PASSWORD */}
        {tab === 'forgot' && (
          <div className="space-y-4 relative z-10">
            {resetSent ? (
              <div className="p-5 rounded-2xl bg-teal-500/10 border border-teal-500/30 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-teal-500/20 text-teal-400 mx-auto flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-white">
                  {isBn ? 'রিসেট লিংক পাঠানো হয়েছে!' : 'Password Reset Email Sent!'}
                </h3>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  {isBn
                    ? `আমরা ${email} ঠিকানায় একটি পাসওয়ার্ড রিসেট লিংক পাঠিয়েছি। অনুগ্রহ করে আপনার জিমেইল ইনবক্স অথবা স্প্যাম ফোল্ডার চেক করুন।`
                    : `We sent a password reset link to ${email}. Please check your inbox and spam folder.`}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setTab('signin');
                    setResetSent(false);
                  }}
                  className="mt-3 px-4 py-2 rounded-xl bg-teal-500 text-zinc-950 font-bold text-xs hover:bg-teal-400 transition-colors"
                >
                  {isBn ? 'সাইন ইন-এ ফিরে যান' : 'Back to Sign In'}
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 text-zinc-300 text-xs flex items-start gap-2.5">
                  <KeyRound className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    {isBn
                      ? 'আপনার জিমেইল/ইমেইল লিখুন। আপনার পাসওয়ার্ড রিসেট করার একটি নিরাপদ লিঙ্ক পাঠিয়ে দেওয়া হবে।'
                      : 'Enter your registered email address to receive a secure password reset link.'}
                  </p>
                </div>

                <div>
                  <label className="text-xs font-medium text-zinc-300 block mb-1.5">
                    {isBn ? 'নিবন্ধিত জিমেইল / ইমেইল' : 'Registered Email Address'}
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your.email@gmail.com"
                      required
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-3.5 py-2.5 text-xs sm:text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all"
                    />
                  </div>
                </div>

                <div className="flex gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setTab('signin');
                      setError(null);
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold transition-colors"
                  >
                    {isBn ? 'বাতিল' : 'Cancel'}
                  </button>

                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-zinc-950 font-bold text-xs shadow-md shadow-teal-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>{isBn ? 'রিসেট লিংক পাঠান' : 'Send Reset Link'}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
