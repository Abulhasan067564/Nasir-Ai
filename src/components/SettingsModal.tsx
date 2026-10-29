import React from 'react';
import { X, Globe, Sparkles, Database, Shield, User, Info, Check, Sun, Moon, Palette } from 'lucide-react';
import { Language, Theme } from '../lib/types';
import { translations } from '../lib/translations';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  onLanguageChange: (lang: Language) => void;
  theme?: Theme;
  onThemeChange?: (theme: Theme) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  language,
  onLanguageChange,
  theme = 'dark',
  onThemeChange,
}) => {
  if (!isOpen) return null;
  const t = translations[language];
  const isDark = theme === 'dark';

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className={`border rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh] transition-colors duration-200 ${
        isDark ? 'bg-zinc-950 border-zinc-800 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-900'
      }`}>
        {/* Header */}
        <div className={`px-6 py-4 border-b flex items-center justify-between ${
          isDark ? 'border-zinc-800/80' : 'border-zinc-200'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-teal-400 to-emerald-600 flex items-center justify-center text-zinc-950 font-bold text-sm shadow-sm">
              N
            </div>
            <div>
              <h2 className={`text-base font-bold ${isDark ? 'text-white' : 'text-zinc-900'}`}>{t.settings}</h2>
              <p className={`text-[11px] ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>Nasir AI Configuration & Creator Information</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-1 rounded-lg transition-colors ${
              isDark ? 'text-zinc-400 hover:text-white hover:bg-zinc-800' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 overflow-y-auto text-xs md:text-sm scrollbar-thin scrollbar-thumb-zinc-700">
          {/* Creator Attribution Section */}
          <div className={`p-4 rounded-xl border space-y-2 ${
            isDark
              ? 'bg-gradient-to-br from-teal-950/40 to-emerald-950/30 border-teal-800/40'
              : 'bg-gradient-to-br from-teal-50 to-emerald-50 border-teal-200'
          }`}>
            <div className="flex items-center gap-2 text-teal-600 dark:text-teal-400 font-semibold text-xs uppercase tracking-wider">
              <User className="w-4 h-4" />
              <span>{t.creatorTitle}</span>
            </div>
            <p className={`leading-relaxed text-xs md:text-sm ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
              {language === 'bn' ? t.creatorBio : t.creatorBio}
            </p>
            <div className={`pt-2 border-t space-y-1.5 text-xs ${isDark ? 'border-teal-800/30 text-zinc-400' : 'border-teal-200 text-zinc-600'}`}>
              <div>
                <strong className={isDark ? 'text-zinc-200' : 'text-zinc-800'}>Bengali Query Response:</strong>
                <p className="italic text-teal-600 dark:text-teal-300 mt-0.5">"{t.creatorAnswerBn}"</p>
              </div>
              <div>
                <strong className={isDark ? 'text-zinc-200' : 'text-zinc-800'}>English Query Response:</strong>
                <p className="italic text-teal-600 dark:text-teal-300 mt-0.5">"{t.creatorAnswerEn}"</p>
              </div>
            </div>
          </div>

          {/* Theme Selection Section */}
          {onThemeChange && (
            <div className="space-y-2">
              <label className={`text-xs font-semibold flex items-center gap-1.5 ${
                isDark ? 'text-zinc-300' : 'text-zinc-700'
              }`}>
                <Palette className="w-4 h-4 text-teal-500" />
                <span>Theme Mode / থিম মোড</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => onThemeChange('dark')}
                  className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                    isDark
                      ? 'bg-zinc-900 border-teal-500 text-teal-300 font-semibold shadow-sm'
                      : 'bg-zinc-50 border-zinc-200 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Moon className="w-4 h-4 text-amber-400" />
                    <span>{t.darkMode}</span>
                  </span>
                  {isDark && <Check className="w-4 h-4 text-teal-400" />}
                </button>

                <button
                  type="button"
                  onClick={() => onThemeChange('light')}
                  className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                    !isDark
                      ? 'bg-teal-50 border-teal-500 text-teal-800 font-semibold shadow-xs'
                      : 'bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Sun className="w-4 h-4 text-amber-500" />
                    <span>{t.lightMode}</span>
                  </span>
                  {!isDark && <Check className="w-4 h-4 text-teal-600" />}
                </button>
              </div>
            </div>
          )}

          {/* Language Selection */}
          <div className="space-y-2">
            <label className={`text-xs font-semibold flex items-center gap-1.5 ${
              isDark ? 'text-zinc-300' : 'text-zinc-700'
            }`}>
              <Globe className="w-4 h-4 text-teal-500" />
              <span>Interface Language / ইন্টারফেস ভাষা</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => onLanguageChange('en')}
                className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                  language === 'en'
                    ? isDark
                      ? 'bg-zinc-900 border-teal-500 text-teal-300 font-semibold shadow-sm'
                      : 'bg-teal-50 border-teal-500 text-teal-800 font-semibold shadow-xs'
                    : isDark
                    ? 'bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                    : 'bg-zinc-50 border-zinc-200 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
                }`}
              >
                <span>English (US)</span>
                {language === 'en' && <Check className="w-4 h-4 text-teal-500" />}
              </button>

              <button
                type="button"
                onClick={() => onLanguageChange('bn')}
                className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                  language === 'bn'
                    ? isDark
                      ? 'bg-zinc-900 border-teal-500 text-teal-300 font-semibold shadow-sm'
                      : 'bg-teal-50 border-teal-500 text-teal-800 font-semibold shadow-xs'
                    : isDark
                    ? 'bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                    : 'bg-zinc-50 border-zinc-200 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
                }`}
              >
                <span>বাংলা (Bengali)</span>
                {language === 'bn' && <Check className="w-4 h-4 text-teal-500" />}
              </button>
            </div>
          </div>

          {/* Engine & Database Details */}
          <div className="space-y-2">
            <h3 className={`text-xs font-semibold uppercase tracking-wider ${
              isDark ? 'text-zinc-400' : 'text-zinc-500'
            }`}>
              System Architecture
            </h3>
            <div className={`rounded-xl border divide-y text-xs ${
              isDark
                ? 'bg-zinc-900 border-zinc-800 divide-zinc-800/80'
                : 'bg-zinc-50 border-zinc-200 divide-zinc-200'
            }`}>
              <div className="p-3 flex items-center justify-between">
                <span className={`flex items-center gap-1.5 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                  <Sparkles className="w-3.5 h-3.5 text-teal-500" />
                  AI Foundation Model
                </span>
                <span className={`font-mono font-medium ${isDark ? 'text-zinc-200' : 'text-zinc-900'}`}>gemini-3.8-flash</span>
              </div>
              <div className="p-3 flex items-center justify-between">
                <span className={`flex items-center gap-1.5 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                  <Globe className="w-3.5 h-3.5 text-indigo-500" />
                  Live Web Grounding
                </span>
                <span className="text-emerald-500 font-medium">Google Search Grounding</span>
              </div>
              <div className="p-3 flex items-center justify-between">
                <span className={`flex items-center gap-1.5 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                  <Database className="w-3.5 h-3.5 text-amber-500" />
                  Database Persistence
                </span>
                <span className="text-teal-600 dark:text-teal-400 font-medium">Firebase Cloud Firestore</span>
              </div>
              <div className="p-3 flex items-center justify-between">
                <span className={`flex items-center gap-1.5 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                  <Shield className="w-3.5 h-3.5 text-emerald-500" />
                  Authentication
                </span>
                <span className={`font-medium ${isDark ? 'text-zinc-200' : 'text-zinc-900'}`}>Firebase Auth (Email, Password & Google)</span>
              </div>
            </div>
          </div>

          {/* Note on Educational & Knowledge Focus */}
          <div className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
            isDark
              ? 'bg-zinc-900/50 border-zinc-800/80 text-zinc-400'
              : 'bg-zinc-50 border-zinc-200 text-zinc-600'
          }`}>
            <Info className="w-4 h-4 text-teal-500 shrink-0 mt-0.5" />
            <p>
              Nasir AI is dedicated to educational, career, mathematical, coding, document, and research productivity. In accordance with system guidelines, image and video generation tools are intentionally excluded.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className={`px-6 py-3 border-t flex justify-end ${
          isDark ? 'border-zinc-800/80 bg-zinc-950' : 'border-zinc-200 bg-zinc-50'
        }`}>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-zinc-950 font-semibold text-xs shadow-sm"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
