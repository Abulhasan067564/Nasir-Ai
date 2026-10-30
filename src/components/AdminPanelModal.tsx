import React, { useState, useEffect, useRef } from 'react';
import {
  Shield,
  KeyRound,
  Image,
  Upload,
  RotateCcw,
  Save,
  Check,
  AlertCircle,
  Cpu,
  Sliders,
  Database,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  X,
  FileDown,
  FileUp,
  Palette,
  Sparkles,
  Info,
  Radio,
  Search,
} from 'lucide-react';
import {
  AdminSettings,
  DEFAULT_ADMIN_PASSWORD,
  DEFAULT_ADMIN_SETTINGS,
  getAdminSettings,
  saveAdminSettings,
  verifyAdminPassword,
  changeAdminPassword,
} from '../lib/adminSettings';
import { Conversation, Message, SavedNote, Project, Language, Theme } from '../lib/types';
import { exportAllUserData, importUserData } from '../lib/dataBackup';
import { NasirLogo, clearCustomLogo, saveCustomLogo } from './NasirLogo';

interface AdminPanelModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  theme: Theme;
  conversations: Conversation[];
  messages: Message[];
  savedNotes: SavedNote[];
  projects: Project[];
  userId?: string;
  onDataRestored?: (restored: {
    conversations: Conversation[];
    messages: Message[];
    savedNotes: SavedNote[];
    projects: Project[];
  }) => void;
}

export const AdminPanelModal: React.FC<AdminPanelModalProps> = ({
  isOpen,
  onClose,
  language,
  theme,
  conversations,
  messages,
  savedNotes,
  projects,
  userId = 'admin',
  onDataRestored,
}) => {
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('nasir_ai_admin_auth') === 'true';
  });
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');

  // Active admin tab
  const [activeTab, setActiveTab] = useState<'branding' | 'ai' | 'features' | 'data' | 'security'>('branding');

  // Admin settings draft
  const [settings, setSettings] = useState<AdminSettings>(DEFAULT_ADMIN_SETTINGS);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  // Password change state
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [passError, setPassError] = useState('');
  const [passSuccess, setPassSuccess] = useState(false);

  // File import state
  const [importStatus, setImportStatus] = useState<string>('');
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Load settings on open
  useEffect(() => {
    if (isOpen) {
      getAdminSettings().then((loaded) => setSettings(loaded));
      setSaveSuccess(false);
      setSaveMessage('');
      setPassSuccess(false);
      setPassError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Handle password submission to unlock admin
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (verifyAdminPassword(passwordInput)) {
      setIsAuthenticated(true);
      sessionStorage.setItem('nasir_ai_admin_auth', 'true');
      setAuthError('');
      setPasswordInput('');
    } else {
      setAuthError(
        language === 'bn'
          ? 'ভুল পাসওয়ার্ড! ডিফল্ট পাসওয়ার্ড: NasirAdmin@2026!#Secure'
          : 'Incorrect password! Default password: NasirAdmin@2026!#Secure'
      );
    }
  };

  const handleLockAdmin = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('nasir_ai_admin_auth');
  };

  // Handle saving general settings
  const handleSaveSettings = async () => {
    setIsSaving(true);
    setSaveMessage('');
    try {
      const updated = await saveAdminSettings(settings);
      setSettings(updated);
      setSaveSuccess(true);
      setSaveMessage(language === 'bn' ? 'সকল পরিবর্তন সফলভাবে সংরক্ষিত হয়েছে!' : 'All settings saved successfully!');
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setSaveMessage(err?.message || 'Failed to save settings.');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Logo Upload
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert(language === 'bn' ? 'লোগো ফাইল সর্বোচ্চ ২ মেগাবাইট হতে হবে।' : 'Logo file size must be under 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setSettings((prev) => ({ ...prev, siteLogo: result }));
        saveCustomLogo(result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleResetLogo = () => {
    clearCustomLogo();
    setSettings((prev) => ({ ...prev, siteLogo: null }));
  };

  // Handle Password Change
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassError('');
    setPassSuccess(false);

    if (!verifyAdminPassword(currentPass)) {
      setPassError(language === 'bn' ? 'বর্তমান পাসওয়ার্ডটি সঠিক নয়।' : 'Current password is incorrect.');
      return;
    }

    if (newPass.length < 8) {
      setPassError(
        language === 'bn'
          ? 'নতুন পাসওয়ার্ড ন্যূনতম ৮ অক্ষরের হতে হবে।'
          : 'New password must be at least 8 characters long.'
      );
      return;
    }

    if (newPass !== confirmPass) {
      setPassError(language === 'bn' ? 'নতুন পাসওয়ার্ড দুটি মিলছে না।' : 'Passwords do not match.');
      return;
    }

    try {
      await changeAdminPassword(newPass);
      setPassSuccess(true);
      setCurrentPass('');
      setNewPass('');
      setConfirmPass('');
    } catch (err: any) {
      setPassError(err.message || 'Failed to change password.');
    }
  };

  // Handle JSON Data Export
  const handleExportData = () => {
    const res = exportAllUserData(conversations, messages, savedNotes, projects);
    alert(
      language === 'bn'
        ? `ব্যাকআপ ফাইল তৈরি হয়েছে: ${res.filename}`
        : `Backup exported successfully: ${res.filename}`
    );
  };

  // Handle JSON Data Import
  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportStatus(language === 'bn' ? 'ডেটা প্রসেস ও রিস্টোর হচ্ছে...' : 'Processing and restoring data...');

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      if (text) {
        const result = await importUserData(text, userId);
        setIsImporting(false);
        if (result.success) {
          setImportStatus(
            language === 'bn'
              ? `সফলভাবে রিস্টোর হয়েছে: ${result.importedCounts.conversations}টি চ্যাট, ${result.importedCounts.messages}টি মেসেজ, ${result.importedCounts.notes}টি নোট!`
              : `Successfully restored: ${result.importedCounts.conversations} chats, ${result.importedCounts.messages} messages, ${result.importedCounts.notes} notes!`
          );
          if (onDataRestored) {
            onDataRestored(result.restoredData);
          }
        } else {
          setImportStatus(
            language === 'bn'
              ? `রিস্টোর ব্যর্থ: ${result.error}`
              : `Restore failed: ${result.error}`
          );
        }
      }
    };
    reader.readAsText(file);
  };

  const isDark = theme === 'dark';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className={`relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden border transition-all ${
          isDark
            ? 'bg-zinc-950 text-zinc-100 border-zinc-800'
            : 'bg-white text-zinc-900 border-zinc-200'
        }`}
      >
        {/* Top Header */}
        <div
          className={`flex items-center justify-between px-6 py-4 border-b ${
            isDark ? 'border-zinc-800/80 bg-zinc-900/60' : 'border-zinc-200 bg-zinc-50'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold tracking-tight">
                  {language === 'bn' ? 'নাসির এআই এডমিন প্যানেল' : 'Nasir AI Admin Console'}
                </h2>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  v1.2 Master
                </span>
              </div>
              <p className="text-xs text-zinc-500">
                {language === 'bn'
                  ? 'ওয়েবসাইটের লোগো, নাম, এআই ইঞ্জিন এবং সার্বিক কনফিগারেশন নিয়ন্ত্রণ'
                  : 'Manage website branding, logo, AI behavior, and global system configuration'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isAuthenticated && (
              <button
                onClick={handleLockAdmin}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-700/60 transition-colors"
                title="Lock Session"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>{language === 'bn' ? 'লক করুন' : 'Lock'}</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Unauthenticated Password Gate */}
        {!isAuthenticated ? (
          <div className="p-8 flex flex-col items-center justify-center max-w-md mx-auto my-auto text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 shadow-xl shadow-teal-500/10">
              <KeyRound className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-bold">
                {language === 'bn' ? 'এডমিন অ্যাক্সেস যাচাই' : 'Admin Security Verification'}
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                {language === 'bn'
                  ? 'এই প্যানেলে প্রবেশ করতে এডমিন পাসওয়ার্ড দিন। প্রাথমিক ডিফল্ট পাসওয়ার্ড নিচে দেওয়া রয়েছে।'
                  : 'Please enter the admin password to unlock management privileges. Default password is provided below.'}
              </p>
            </div>

            <div className="w-full p-3 rounded-xl bg-zinc-900/90 border border-zinc-800 text-left text-xs space-y-1">
              <div className="flex items-center justify-between text-zinc-400">
                <span>{language === 'bn' ? 'প্রাথমিক ডিফল্ট পাসওয়ার্ড:' : 'Initial Default Password:'}</span>
                <span className="font-mono text-emerald-400 select-all font-semibold">
                  NasirAdmin@2026!#Secure
                </span>
              </div>
              <p className="text-[11px] text-zinc-500">
                {language === 'bn'
                  ? 'এডমিন প্যানেলে লগইন করার পর আপনি এই পাসওয়ার্ড যেকোনো সময় পরিবর্তন করতে পারবেন।'
                  : 'You can change this password anytime in the Security tab after signing in.'}
              </p>
            </div>

            <form onSubmit={handleLogin} className="w-full space-y-4">
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder={language === 'bn' ? 'এডমিন পাসওয়ার্ড দিন...' : 'Enter admin password...'}
                  className={`w-full px-4 py-2.5 rounded-xl border text-sm pr-10 outline-none transition-all ${
                    isDark
                      ? 'bg-zinc-900 border-zinc-700 focus:border-teal-400'
                      : 'bg-zinc-50 border-zinc-300 focus:border-teal-500'
                  }`}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute right-3 top-3 text-zinc-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {authError && (
                <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{authError}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-zinc-950 font-bold text-sm shadow-lg shadow-teal-500/20 active:scale-98 transition-all"
              >
                {language === 'bn' ? 'এডমিন প্রবেশ করুন' : 'Unlock Admin Console'}
              </button>
            </form>
          </div>
        ) : (
          /* Authenticated Admin Dashboard */
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            {/* Sidebar Navigation */}
            <div
              className={`w-full md:w-56 p-3 flex md:flex-col gap-1 overflow-x-auto md:overflow-y-auto border-b md:border-b-0 md:border-r ${
                isDark ? 'border-zinc-800 bg-zinc-900/40' : 'border-zinc-200 bg-zinc-50'
              }`}
            >
              {[
                {
                  id: 'branding',
                  label: language === 'bn' ? 'লোগো ও নাম' : 'Branding & Logo',
                  icon: Image,
                },
                {
                  id: 'ai',
                  label: language === 'bn' ? 'এআই ইঞ্জিন' : 'AI Engine & Prompt',
                  icon: Cpu,
                },
                {
                  id: 'features',
                  label: language === 'bn' ? 'ফিচার নিয়ন্ত্রণ' : 'Feature Controls',
                  icon: Sliders,
                },
                {
                  id: 'data',
                  label: language === 'bn' ? 'ডেটা ব্যাকআপ' : 'Data & Backup',
                  icon: Database,
                },
                {
                  id: 'security',
                  label: language === 'bn' ? 'নিরাপত্তা' : 'Security & Password',
                  icon: KeyRound,
                },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                      isActive
                        ? isDark
                          ? 'bg-teal-500/15 text-teal-300 border border-teal-500/30'
                          : 'bg-teal-50 text-teal-700 border border-teal-200'
                        : isDark
                        ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
                        : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/60'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Main Tab Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* TAB 1: BRANDING & LOGO */}
              {activeTab === 'branding' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-base font-bold text-zinc-100">
                      {language === 'bn' ? 'ওয়েবসাইটের লোগো ও ব্র্যান্ডিং' : 'Website Logo & Branding'}
                    </h3>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      {language === 'bn'
                        ? 'ওয়েবসাইটের লোগো, নাম ও পরিচিতি সরাসরি পরিবর্তন করুন।'
                        : 'Change the application emblem, website name, assistant persona, and tagline.'}
                    </p>
                  </div>

                  {/* Logo Customization Box */}
                  <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/60 space-y-4">
                    <label className="text-xs font-semibold uppercase tracking-wider text-teal-400">
                      {language === 'bn' ? 'ওয়েবসাইটের সক্রিয় লোগো' : 'Current Active Logo'}
                    </label>

                    <div className="flex items-center gap-4">
                      {/* Logo Preview */}
                      <div className="w-16 h-16 rounded-2xl bg-zinc-950 border border-teal-500/30 flex items-center justify-center p-2 shadow-inner">
                        <NasirLogo size="lg" glow={false} />
                      </div>

                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <input
                            ref={logoInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleLogoUpload}
                            className="hidden"
                          />
                          <button
                            type="button"
                            onClick={() => logoInputRef.current?.click()}
                            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-500/40 text-xs font-semibold transition-colors"
                          >
                            <Upload className="w-3.5 h-3.5" />
                            <span>
                              {language === 'bn' ? 'নতুন লোগো আপলোড করুন' : 'Upload New Logo Image'}
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={handleResetLogo}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition-colors"
                            title="Reset to default emblem"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>{language === 'bn' ? 'ডিফল্ট emblem' : 'Reset Default'}</span>
                          </button>
                        </div>
                        <p className="text-[11px] text-zinc-500">
                          {language === 'bn'
                            ? 'PNG, JPG, SVG বা WebP ফাইল সমর্থন করে (অনূর্ধ্ব ২ মেগাবাইট)।'
                            : 'Supports PNG, JPG, SVG, or WebP formats (max 2MB).'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Site Name and Tagline */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-zinc-300">
                        {language === 'bn' ? 'ওয়েবসাইটের নাম' : 'Website Name'}
                      </label>
                      <input
                        type="text"
                        value={settings.siteName}
                        onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 focus:border-teal-400 text-sm outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-zinc-300">
                        {language === 'bn' ? 'সহকারী নাম (Assistant Name)' : 'AI Assistant Name'}
                      </label>
                      <input
                        type="text"
                        value={settings.assistantName}
                        onChange={(e) => setSettings({ ...settings, assistantName: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 focus:border-teal-400 text-sm outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-zinc-300">
                        {language === 'bn' ? 'ট্যাগলাইন (English)' : 'Tagline (English)'}
                      </label>
                      <input
                        type="text"
                        value={settings.siteTagline}
                        onChange={(e) => setSettings({ ...settings, siteTagline: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 focus:border-teal-400 text-sm outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-zinc-300">
                        {language === 'bn' ? 'ট্যাগলাইন (বাংলা)' : 'Tagline (Bengali)'}
                      </label>
                      <input
                        type="text"
                        value={settings.siteTaglineBn}
                        onChange={(e) => setSettings({ ...settings, siteTaglineBn: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 focus:border-teal-400 text-sm outline-none"
                      />
                    </div>
                  </div>

                  {/* Welcome Greetings */}
                  <div className="space-y-4 pt-2">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-zinc-300">
                        {language === 'bn' ? 'স্বাগতম বার্তা (বাংলা)' : 'Welcome Greeting (Bengali)'}
                      </label>
                      <input
                        type="text"
                        value={settings.welcomeGreetingBn}
                        onChange={(e) => setSettings({ ...settings, welcomeGreetingBn: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 focus:border-teal-400 text-sm outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-zinc-300">
                        {language === 'bn' ? 'স্বাগতম বার্তা (English)' : 'Welcome Greeting (English)'}
                      </label>
                      <input
                        type="text"
                        value={settings.welcomeGreetingEn}
                        onChange={(e) => setSettings({ ...settings, welcomeGreetingEn: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 focus:border-teal-400 text-sm outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-zinc-300">
                        {language === 'bn' ? 'ফুটার টেক্সট' : 'Footer Attribution'}
                      </label>
                      <input
                        type="text"
                        value={settings.footerAttribution}
                        onChange={(e) => setSettings({ ...settings, footerAttribution: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 focus:border-teal-400 text-sm outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: AI ENGINE & SYSTEM PROMPT */}
              {activeTab === 'ai' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-base font-bold text-zinc-100">
                      {language === 'bn' ? 'এআই ইঞ্জিন ও সিস্টেম প্রম্পট' : 'AI Engine & Master System Prompt'}
                    </h3>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      {language === 'bn'
                        ? 'নাসির এআই-এর বুদ্ধিমত্তা, উত্তর দেওয়ার স্টাইল এবং মডেল নির্বাচন করুন।'
                        : 'Configure the underlying model, response instructions, and reasoning directives.'}
                    </p>
                  </div>

                  {/* Model Selector */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-zinc-300">
                      {language === 'bn' ? 'ডিফল্ট মডেল নির্বাচন' : 'Default Foundation Model'}
                    </label>
                    <select
                      value={settings.defaultModel}
                      onChange={(e) => setSettings({ ...settings, defaultModel: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 focus:border-teal-400 text-sm outline-none"
                    >
                      <option value="gemini-3.1-flash-lite">
                        gemini-3.1-flash-lite (Ultra-Fast & Zero Overload — Recommended)
                      </option>
                      <option value="gemini-3.5-flash">
                        gemini-3.5-flash (Balanced Speed & High Intelligence)
                      </option>
                      <option value="gemini-3.5-flash-lite">
                        gemini-3.5-flash-lite (Lightweight & Rapid)
                      </option>
                      <option value="gemini-3.8-flash">
                        gemini-3.8-flash (Latest Preview with Auto-Fallback)
                      </option>
                    </select>
                    <p className="text-[11px] text-zinc-500">
                      {language === 'bn'
                        ? 'পাবলিকের পরেও যেন তাৎক্ষণিক দ্রুত উত্তর দিতে পারে, সেজন্য gemini-3.1-flash-lite সার্বাধিক স্থিতিশীল।'
                        : 'gemini-3.1-flash-lite ensures sub-second responses and high uptime both in dev and published modes.'}
                    </p>
                  </div>

                  {/* System Instruction Override */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-zinc-300">
                      {language === 'bn'
                        ? 'কাস্টম সিস্টেম নির্দেশিকা (Custom Instructions Override)'
                        : 'Custom Instructions & Persona Directives'}
                    </label>
                    <textarea
                      rows={6}
                      value={settings.systemInstructionOverride}
                      onChange={(e) => setSettings({ ...settings, systemInstructionOverride: e.target.value })}
                      placeholder={
                        language === 'bn'
                          ? 'এখানে অতিরিক্ত নির্দেশনা লিখতে পারেন, যেমন: "সব প্রশ্নের উত্তর সহজ বাংলায় দিন এবং উদাহরণ অন্তর্ভুক্ত করুন..."'
                          : 'Add custom behavioral rules, tone preferences, or domain guidelines...'
                      }
                      className="w-full p-3.5 rounded-xl bg-zinc-900 border border-zinc-700 focus:border-teal-400 text-xs font-mono outline-none leading-relaxed"
                    />
                  </div>
                </div>
              )}

              {/* TAB 3: FEATURE CONTROLS */}
              {activeTab === 'features' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-base font-bold text-zinc-100">
                      {language === 'bn' ? 'ফিচার সক্রিয়করণ ও নিয়ন্ত্রণ' : 'Global Feature Flags'}
                    </h3>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      {language === 'bn'
                        ? 'ওয়েবসাইটের বিভিন্ন বিশেষ সুবিধা অন বা অফ করুন।'
                        : 'Enable or disable interactive modules across the application.'}
                    </p>
                  </div>

                  <div className="space-y-3">
                    {/* Live Voice Toggle */}
                    <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/60 flex items-center justify-between">
                      <div className="space-y-0.5">
                        <div className="text-sm font-semibold text-zinc-200">
                          {language === 'bn' ? 'সরাসরি লাইভ ভয়েস কল (Live Voice)' : 'Live Voice Calling'}
                        </div>
                        <div className="text-xs text-zinc-400">
                          {language === 'bn'
                            ? 'ব্যবহারকারীরা সরাসরি মুখে কথা বলে হ্যান্ডস-ফ্রি উত্তর শুনতে পারবে।'
                            : 'Enable hands-free audio conversation with speech recognition and synthesis.'}
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.enableLiveVoice}
                        onChange={(e) => setSettings({ ...settings, enableLiveVoice: e.target.checked })}
                        className="w-5 h-5 accent-teal-500 rounded cursor-pointer"
                      />
                    </div>

                    {/* Google Search Grounding Toggle */}
                    <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/60 flex items-center justify-between">
                      <div className="space-y-0.5">
                        <div className="text-sm font-semibold text-zinc-200">
                          {language === 'bn' ? 'লাইভ গুগল সার্চ গ্রাউন্ডিং' : 'Google Search Grounding'}
                        </div>
                        <div className="text-xs text-zinc-400">
                          {language === 'bn'
                            ? 'সাম্প্রতিক তথ্য ও খবরের জন্য গুগল সার্চ থেকে লাইভ সাইটেশন সংগ্রহ।'
                            : 'Ground answers in real-time web search results with verifiable citations.'}
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.enableSearchGrounding}
                        onChange={(e) => setSettings({ ...settings, enableSearchGrounding: e.target.checked })}
                        className="w-5 h-5 accent-teal-500 rounded cursor-pointer"
                      />
                    </div>

                    {/* Voice Typing Toggle */}
                    <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/60 flex items-center justify-between">
                      <div className="space-y-0.5">
                        <div className="text-sm font-semibold text-zinc-200">
                          {language === 'bn' ? 'ভয়েস টাইপিং ইনপুট' : 'Voice Typing Input'}
                        </div>
                        <div className="text-xs text-zinc-400">
                          {language === 'bn'
                            ? 'চ্যাট বক্সে মাইক্রোফোন আইকনে চাপ দিয়ে মুখে বলে লেখার সুবিধা।'
                            : 'Allow users to dictate prompts using the browser Speech-to-Text API.'}
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.enableVoiceTyping}
                        onChange={(e) => setSettings({ ...settings, enableVoiceTyping: e.target.checked })}
                        className="w-5 h-5 accent-teal-500 rounded cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: DATA & BACKUP */}
              {activeTab === 'data' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-base font-bold text-zinc-100">
                      {language === 'bn' ? 'ডেটা ব্যাকআপ ও রিস্টোর' : 'Data Management & JSON Backup'}
                    </h3>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      {language === 'bn'
                        ? 'সকল চ্যাট ইতিহাস ও নোট একটি লোকাল JSON ফাইলে এক্সপোর্ট বা ইমপোর্ট করুন।'
                        : 'Export all user conversations and saved notes into local JSON, or restore from a backup.'}
                    </p>
                  </div>

                  {/* System Stats Overview */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 text-center">
                      <div className="text-2xl font-black text-teal-400">{conversations.length}</div>
                      <div className="text-xs text-zinc-400 mt-0.5">
                        {language === 'bn' ? 'মোট চ্যাট' : 'Conversations'}
                      </div>
                    </div>
                    <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 text-center">
                      <div className="text-2xl font-black text-emerald-400">{messages.length}</div>
                      <div className="text-xs text-zinc-400 mt-0.5">
                        {language === 'bn' ? 'মোট মেসেজ' : 'Messages'}
                      </div>
                    </div>
                    <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 text-center">
                      <div className="text-2xl font-black text-cyan-400">{savedNotes.length}</div>
                      <div className="text-xs text-zinc-400 mt-0.5">
                        {language === 'bn' ? 'সংরক্ষিত নোট' : 'Saved Notes'}
                      </div>
                    </div>
                    <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 text-center">
                      <div className="text-2xl font-black text-purple-400">{projects.length}</div>
                      <div className="text-xs text-zinc-400 mt-0.5">
                        {language === 'bn' ? 'ওয়ার্কস্পেস' : 'Projects'}
                      </div>
                    </div>
                  </div>

                  {/* Export & Import Action Buttons */}
                  <div className="p-5 rounded-xl border border-zinc-800 bg-zinc-900/60 space-y-4">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-teal-400">
                      {language === 'bn' ? 'এক ক্লিকে ব্যাকআপ ও রিস্টোর' : 'One-Click JSON Operations'}
                    </h4>

                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={handleExportData}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-500/40 text-xs font-bold transition-all shadow-md"
                      >
                        <FileDown className="w-4 h-4" />
                        <span>
                          {language === 'bn'
                            ? 'সকল চ্যাট ও নোট JSON-এ ডাউনলোড করুন'
                            : 'Export All Chats & Notes to JSON'}
                        </span>
                      </button>

                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".json,application/json"
                        onChange={handleImportFile}
                        className="hidden"
                      />

                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isImporting}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-xs font-bold transition-all"
                      >
                        <FileUp className="w-4 h-4" />
                        <span>
                          {isImporting
                            ? language === 'bn'
                              ? 'রিস্টোর হচ্ছে...'
                              : 'Restoring...'
                            : language === 'bn'
                            ? 'JSON ব্যাকআপ ফাইল থেকে রিস্টোর করুন'
                            : 'Import / Restore Data from JSON'}
                        </span>
                      </button>
                    </div>

                    {importStatus && (
                      <div className="p-3 rounded-lg bg-teal-500/10 border border-teal-500/30 text-teal-300 text-xs">
                        {importStatus}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 5: SECURITY & ADMIN PASSWORD */}
              {activeTab === 'security' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-base font-bold text-zinc-100">
                      {language === 'bn' ? 'এডমিন পাসওয়ার্ড পরিবর্তন' : 'Change Admin Security Password'}
                    </h3>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      {language === 'bn'
                        ? 'আপনার এডমিন প্যানেল সুরক্ষিত রাখতে একটি শক্তিশালী নতুন পাসওয়ার্ড সেট করুন।'
                        : 'Update the master admin password to secure configuration privileges.'}
                    </p>
                  </div>

                  <form onSubmit={handleChangePassword} className="max-w-md space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-zinc-300">
                        {language === 'bn' ? 'বর্তমান পাসওয়ার্ড' : 'Current Password'}
                      </label>
                      <input
                        type="password"
                        value={currentPass}
                        onChange={(e) => setCurrentPass(e.target.value)}
                        placeholder="Current password..."
                        className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 focus:border-teal-400 text-sm outline-none"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-zinc-300">
                        {language === 'bn' ? 'নতুন শক্তিশালী পাসওয়ার্ড' : 'New Strong Password'}
                      </label>
                      <input
                        type="password"
                        value={newPass}
                        onChange={(e) => setNewPass(e.target.value)}
                        placeholder="At least 8 characters..."
                        className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 focus:border-teal-400 text-sm outline-none"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-zinc-300">
                        {language === 'bn' ? 'নতুন পাসওয়ার্ড পুনরায় লিখুন' : 'Confirm New Password'}
                      </label>
                      <input
                        type="password"
                        value={confirmPass}
                        onChange={(e) => setConfirmPass(e.target.value)}
                        placeholder="Re-type new password..."
                        className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 focus:border-teal-400 text-sm outline-none"
                        required
                      />
                    </div>

                    {passError && (
                      <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{passError}</span>
                      </div>
                    )}

                    {passSuccess && (
                      <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                        <Check className="w-4 h-4 shrink-0" />
                        <span>
                          {language === 'bn'
                            ? 'এডমিন পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে!'
                            : 'Admin password changed successfully! Remember to store your new password safely.'}
                        </span>
                      </div>
                    )}

                    <button
                      type="submit"
                      className="px-5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-zinc-950 font-bold text-xs shadow-md transition-all active:scale-98"
                    >
                      {language === 'bn' ? 'পাসওয়ার্ড পরিবর্তন করুন' : 'Update Admin Password'}
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer Save Actions Bar */}
        {isAuthenticated && (
          <div
            className={`flex items-center justify-between px-6 py-3.5 border-t ${
              isDark ? 'border-zinc-800 bg-zinc-900/80' : 'border-zinc-200 bg-zinc-50'
            }`}
          >
            <div className="flex items-center gap-2 text-xs">
              {saveSuccess ? (
                <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                  <Check className="w-4 h-4" /> {saveMessage}
                </span>
              ) : (
                <span className="text-zinc-500">
                  {language === 'bn'
                    ? 'পরিবর্তন করার পর অবশ্যই "সেভ করুন" বোতামে চাপুন।'
                    : 'Click Save Settings to apply your updates across the site.'}
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white transition-colors"
              >
                {language === 'bn' ? 'বন্ধ করুন' : 'Close'}
              </button>

              <button
                type="button"
                onClick={handleSaveSettings}
                disabled={isSaving}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-zinc-950 font-bold text-xs shadow-lg shadow-teal-500/20 active:scale-98 transition-all disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>
                  {isSaving
                    ? language === 'bn'
                      ? 'সংরক্ষণ হচ্ছে...'
                      : 'Saving...'
                    : language === 'bn'
                    ? 'সেভ করুন'
                    : 'Save Settings'}
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
