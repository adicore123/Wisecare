"use client";

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Download, X, Share, PlusSquare, Smartphone, Check } from 'lucide-react';

export default function PWAInstallBanner() {
  const pathname = usePathname();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [installedSuccess, setInstalledSuccess] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (pathname?.includes('superadmin')) return;

    // 1. Check if already installed & running in standalone mode
    const checkStandalone = 
      window.matchMedia('(display-mode: standalone)').matches || 
      Boolean((window.navigator as any).standalone);
    
    if (checkStandalone) {
      setIsStandalone(true);
      return;
    }

    // 2. Check dismissal cooldown (7 days)
    const dismissedTime = localStorage.getItem('wisecare_pwa_dismissed');
    if (dismissedTime) {
      const daysSinceDismissed = (Date.now() - parseInt(dismissedTime, 10)) / (1000 * 60 * 60 * 24);
      if (daysSinceDismissed < 7) {
        setIsDismissed(true);
        return;
      }
    }

    // 3. Detect iOS Safari
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    if (isIosDevice) {
      setIsIOS(true);
    }

    // 4. Capture Chrome / Android / Edge install prompt
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    const handleAppInstalled = () => {
      setInstalledSuccess(true);
      setDeferredPrompt(null);
      setTimeout(() => {
        setIsDismissed(true);
      }, 3000);
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstalledSuccess(true);
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    if (typeof window !== 'undefined') {
      localStorage.setItem('wisecare_pwa_dismissed', Date.now().toString());
    }
  };

  // Do not show if already in standalone app, or dismissed, or on desktop without prompt
  if (isStandalone || isDismissed) return null;
  if (!deferredPrompt && !isIOS) return null;

  return (
    <div 
      dir="rtl"
      className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:w-96 z-50 bg-slate-900/95 backdrop-blur-md text-white p-4 rounded-2xl shadow-2xl border border-teal-500/30 transition-all duration-300 animate-in fade-in slide-in-from-bottom-5"
    >
      <div className="flex items-start gap-3">
        {/* App Icon */}
        <div className="relative flex-shrink-0">
          <img 
            src="/pwa-icon.svg" 
            alt="WiseCare Icon" 
            className="w-12 h-12 rounded-xl border border-teal-500/30 shadow-md object-cover bg-slate-950" 
          />
          <div className="absolute -bottom-1 -left-1 w-4 h-4 bg-teal-500 rounded-full border-2 border-slate-900 flex items-center justify-center">
            <Smartphone className="w-2.5 h-2.5 text-slate-950" />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
              התקנת אפליקציית WiseCare
            </h4>
            <button 
              onClick={handleDismiss} 
              className="grid min-h-11 min-w-11 place-items-center rounded-xl text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
              aria-label="סגור את הצעת ההתקנה"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-xs text-slate-300 mt-1 leading-relaxed">
            גישה ישירה מהמסך הראשי ללא שורת כתובת, בממשק עברית מלא (RTL) ובחוויית מובייל מהירה.
          </p>

          {/* Success Message */}
          {installedSuccess && (
            <div className="mt-2.5 flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
              <Check className="w-4 h-4" />
              האפליקציה הותקנה בהצלחה במסך הבית שלך!
            </div>
          )}

          {/* Android / Desktop Chrome Action */}
          {deferredPrompt && !installedSuccess && (
            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={handleInstallClick}
                className="flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-teal-600 px-3 py-2 text-xs font-semibold text-white shadow-lg shadow-teal-950/20 transition-colors hover:bg-teal-500 active:bg-teal-700"
              >
                <Download className="w-3.5 h-3.5" />
                התקן למסך הבית
              </button>
              <button
                onClick={handleDismiss}
                className="min-h-11 px-2.5 py-2 text-xs text-slate-400 transition-colors hover:text-white"
              >
                לא עכשיו
              </button>
            </div>
          )}

          {/* iOS Safari Instructions */}
          {isIOS && !deferredPrompt && !installedSuccess && (
            <div className="mt-3">
              {!showIOSGuide ? (
                <button
                  onClick={() => setShowIOSGuide(true)}
                  className="flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl border border-teal-500/30 bg-teal-600/30 px-3 py-2 text-xs font-semibold text-teal-200 transition-colors hover:bg-teal-600/40"
                >
                  <Share className="w-3.5 h-3.5" />
                  איך להתקין ב-iPhone?
                </button>
              ) : (
                <div className="bg-slate-800/80 p-2.5 rounded-xl text-xs space-y-1.5 border border-slate-700 mt-2 text-slate-200">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-teal-500/20 text-teal-400 font-bold flex items-center justify-center text-[10px]">1</span>
                    <span>לחץ/י על כפתור השיתוף בתחתית Safari</span>
                    <Share className="w-3.5 h-3.5 text-blue-400 inline" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-teal-500/20 text-teal-400 font-bold flex items-center justify-center text-[10px]">2</span>
                    <span>גלול/י ובחר/י <strong>"הוסף למסך הבית"</strong></span>
                    <PlusSquare className="w-3.5 h-3.5 text-slate-300 inline" />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
