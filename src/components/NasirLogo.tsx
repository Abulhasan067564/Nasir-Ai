import React, { useState, useEffect } from 'react';

export const LOGO_STORAGE_KEY = 'nasir_ai_custom_logo';
export const LOGO_UPDATE_EVENT = 'nasir_ai_logo_changed';

export function saveCustomLogo(dataUrl: string) {
  try {
    localStorage.setItem(LOGO_STORAGE_KEY, dataUrl);
    window.dispatchEvent(new CustomEvent(LOGO_UPDATE_EVENT, { detail: dataUrl }));
  } catch (e) {
    console.error('Failed to save custom logo to localStorage:', e);
  }
}

export function clearCustomLogo() {
  try {
    localStorage.removeItem(LOGO_STORAGE_KEY);
    window.dispatchEvent(new CustomEvent(LOGO_UPDATE_EVENT, { detail: null }));
  } catch (e) {
    console.error('Failed to clear custom logo:', e);
  }
}

export function getCustomLogo(): string | null {
  try {
    return localStorage.getItem(LOGO_STORAGE_KEY);
  } catch {
    return null;
  }
}

interface NasirLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  glow?: boolean;
}

const sizeMap = {
  xs: { box: 'w-5 h-5', inner: 20 },
  sm: { box: 'w-8 h-8', inner: 32 },
  md: { box: 'w-10 h-10', inner: 40 },
  lg: { box: 'w-14 h-14', inner: 56 },
  xl: { box: 'w-20 h-20', inner: 80 },
};

export const NasirLogo: React.FC<NasirLogoProps> = ({
  size = 'md',
  className = '',
  glow = true,
}) => {
  const [customLogoUrl, setCustomLogoUrl] = useState<string | null>(() => getCustomLogo());

  useEffect(() => {
    const handleUpdate = (e: any) => {
      setCustomLogoUrl(e.detail !== undefined ? e.detail : getCustomLogo());
    };

    window.addEventListener(LOGO_UPDATE_EVENT, handleUpdate);
    window.addEventListener('storage', (e) => {
      if (e.key === LOGO_STORAGE_KEY) {
        setCustomLogoUrl(e.newValue);
      }
    });

    return () => {
      window.removeEventListener(LOGO_UPDATE_EVENT, handleUpdate);
    };
  }, []);

  const dimensions = sizeMap[size] || sizeMap.md;

  if (customLogoUrl) {
    return (
      <div
        className={`relative inline-flex items-center justify-center shrink-0 ${dimensions.box} ${className}`}
      >
        {glow && (
          <div className="absolute inset-0 rounded-2xl bg-teal-500/25 blur-md -z-10 animate-pulse pointer-events-none" />
        )}
        <img
          src={customLogoUrl}
          alt="Nasir AI Logo"
          className="w-full h-full object-cover rounded-xl border border-teal-500/30 shadow-md"
        />
      </div>
    );
  }

  // High-fidelity futuristic default Nasir AI insignia
  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 ${dimensions.box} ${className}`}
      title="Nasir AI"
    >
      {glow && (
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-teal-500/30 via-emerald-500/20 to-cyan-500/30 blur-md -z-10 pointer-events-none" />
      )}
      <svg
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-md select-none"
      >
        <defs>
          <linearGradient id="nasir_grad_border" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2dd4bf" />
            <stop offset="50%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>
          <linearGradient id="nasir_grad_core" x1="10%" y1="10%" x2="90%" y2="90%">
            <stop offset="0%" stopColor="#0f172a" />
            <stop offset="100%" stopColor="#022c22" />
          </linearGradient>
          <linearGradient id="nasir_grad_n" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#5eead4" />
            <stop offset="50%" stopColor="#34d399" />
            <stop offset="100%" stopColor="#38bdf8" />
          </linearGradient>
        </defs>

        {/* Outer hexagonal shield background */}
        <path
          d="M32 4L54 16.5V41.5L32 54L10 41.5V16.5L32 4Z"
          fill="url(#nasir_grad_core)"
          stroke="url(#nasir_grad_border)"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />

        {/* Inner neural connection matrix lines */}
        <path
          d="M32 10L48 20V38L32 48L16 38V20L32 10Z"
          stroke="#10b981"
          strokeWidth="0.8"
          strokeDasharray="2 2"
          opacity="0.45"
        />

        {/* Geometric Stylized Bold 'N' Monogram */}
        <path
          d="M21 41V19L29 19L38 34V19L44 19V41L36 41L27 26V41H21Z"
          fill="url(#nasir_grad_n)"
          filter="drop-shadow(0 2px 4px rgba(16, 185, 129, 0.4))"
        />

        {/* Futuristic glowing neural micro-nodes */}
        <circle cx="32" cy="4" r="2.2" fill="#2dd4bf" />
        <circle cx="54" cy="16.5" r="2.2" fill="#38bdf8" />
        <circle cx="54" cy="41.5" r="2.2" fill="#10b981" />
        <circle cx="32" cy="54" r="2.2" fill="#2dd4bf" />
        <circle cx="10" cy="41.5" r="2.2" fill="#34d399" />
        <circle cx="10" cy="16.5" r="2.2" fill="#06b6d4" />
      </svg>
    </div>
  );
};
