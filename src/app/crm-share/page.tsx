"use client";

import React, { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Video,
  ExternalLink,
  Loader2,
  Sparkles,
  CheckCircle2,
  ArrowLeft,
  User,
  BookOpen,
  HeartHandshake
} from 'lucide-react';
import Link from 'next/link';

// Detect platform and type from URL
function detectPlatform(urlStr: string) {
  if (!urlStr) return { type: 'link', name: 'קישור כללי', color: 'var(--primary)' };
  try {
    const parsed = new URL(urlStr);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
    const path = parsed.pathname.toLowerCase();

    if (host.includes('facebook.com') || host.includes('fb.watch') || host.includes('fb.com')) {
      const isReel = path.includes('/reel') || path.includes('/share/r');
      const isVideo = isReel || path.includes('/watch') || path.includes('/share/v') || path.includes('/videos/') || path.includes('/video.php') || host.includes('fb.watch') || parsed.searchParams.has('v');
      if (isVideo) {
        return { type: 'video', name: isReel ? 'Facebook Reel' : 'Facebook Video', color: '#1877f2' };
      }
      return { type: 'post', name: 'Facebook Post', color: '#1877f2' };
    }
    if (host.includes('youtube.com') || host.includes('youtu.be')) {
      const isShorts = path.includes('/shorts/');
      return { type: 'video', name: isShorts ? 'YouTube Shorts' : 'YouTube', color: '#ff0000' };
    }
    if (host.includes('instagram.com')) {
      return { type: 'video', name: 'Instagram', color: '#e1306c' };
    }
    if (host.includes('tiktok.com')) {
      return { type: 'video', name: 'TikTok', color: '#000000' };
    }
    if (host.includes('vimeo.com')) {
      return { type: 'video', name: 'Vimeo', color: '#1ab7ea' };
    }
    return { type: 'link', name: host, color: 'var(--primary)' };
  } catch {
    return { type: 'link', name: 'קישור', color: 'var(--primary)' };
  }
}

function ShareTargetContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [redirectingMessage, setRedirectingMessage] = useState('מזהה את התוכן המשותף...');
  const [shareData, setShareData] = useState<{
    url: string;
    title: string;
    description: string;
    platform: { type: string; name: string; color: string };
  }>({
    url: '',
    title: '',
    description: '',
    platform: { type: 'link', name: 'קישור', color: 'var(--primary)' }
  });

  const [portalCodeInput, setPortalCodeInput] = useState('');
  const [manualDestination, setManualDestination] = useState(false);

  useEffect(() => {
    if (!searchParams) return;

    // 1. Extract params
    const rawUrl = searchParams.get('url') || searchParams.get('share_url') || '';
    const rawText = searchParams.get('text') || '';
    const rawTitle = searchParams.get('title') || searchParams.get('share_title') || '';

    // If Facebook / Android passed the link inside the text parameter
    let detectedUrl = rawUrl.trim();
    if (!detectedUrl && rawText) {
      const match = rawText.match(/https?:\/\/[^\s]+/i);
      if (match) {
        detectedUrl = match[0].trim();
      }
    }

    // Clean description (remove the URL from the text so only the user's note/caption remains)
    let cleanDesc = rawText.trim();
    if (detectedUrl && cleanDesc.includes(detectedUrl)) {
      cleanDesc = cleanDesc.replace(detectedUrl, '').trim();
    }

    let cleanTitle = rawTitle.trim();
    if (cleanTitle === 'Facebook' || cleanTitle.toLowerCase() === 'facebook') {
      cleanTitle = '';
    }

    const platform = detectPlatform(detectedUrl);

    const data = {
      url: detectedUrl,
      title: cleanTitle,
      description: cleanDesc,
      platform
    };

    setShareData(data);

    // Save pending share in localStorage as backup
    if (detectedUrl || cleanTitle || cleanDesc) {
      try {
        localStorage.setItem('wisecare_pending_share', JSON.stringify(data));
      } catch { }
    }

    // 2. Check Authentication & Auto-Route
    try {
      const storedUserStr = localStorage.getItem('wisecare_user');
      const token = localStorage.getItem('wisecare_token');
      const lastPortal = localStorage.getItem('wisecare_last_portal');

      // Case A: Therapist is logged in
      if (storedUserStr && token) {
        const user = JSON.parse(storedUserStr);
        const loginCode = user.loginCode || 'dr-sarah-8821';
        setRedirectingMessage(`מעביר אותך לספריית התוכן שלך (${user.name || 'מטפל'})...`);

        const timer = setTimeout(() => {
          const q = new URLSearchParams();
          q.set('share', '1');
          if (detectedUrl) q.set('url', detectedUrl);
          if (cleanTitle) q.set('title', cleanTitle);
          if (cleanDesc) q.set('text', cleanDesc);

          router.replace(`/crm/${loginCode}/content?${q.toString()}`);
        }, 500);

        return () => clearTimeout(timer);
      }

      // Case B: Client has visited their portal recently
      if (lastPortal) {
        setRedirectingMessage('מעביר אותך למרחב האישי שלך...');

        const timer = setTimeout(() => {
          const q = new URLSearchParams();
          q.set('tab', 'content');
          q.set('share', '1');
          if (detectedUrl) q.set('share_url', detectedUrl);
          if (cleanTitle) q.set('share_title', cleanTitle);
          if (cleanDesc) q.set('text', cleanDesc);

          router.replace(`/portal/${lastPortal}?${q.toString()}`);
        }, 500);

        return () => clearTimeout(timer);
      }

      // Case C: Neither logged in - show manual picker
      setLoading(false);
      setManualDestination(true);
    } catch {
      setLoading(false);
      setManualDestination(true);
    }
  }, [searchParams, router]);

  const handleTherapistClick = () => {
    const q = new URLSearchParams();
    q.set('share', '1');
    if (shareData.url) q.set('url', shareData.url);
    if (shareData.title) q.set('title', shareData.title);
    if (shareData.description) q.set('text', shareData.description);
    router.push(`/login?returnUrl=${encodeURIComponent(`/crm-share?${q.toString()}`)}`);
  };

  const handlePortalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!portalCodeInput.trim()) return;
    const code = portalCodeInput.trim();
    const q = new URLSearchParams();
    q.set('tab', 'content');
    q.set('share', '1');
    if (shareData.url) q.set('share_url', shareData.url);
    if (shareData.title) q.set('share_title', shareData.title);
    if (shareData.description) q.set('text', shareData.description);
    router.push(`/portal/${encodeURIComponent(code)}?${q.toString()}`);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary-light/50 via-white to-primary-light/30" dir="rtl">
      <div className="w-full max-w-md bg-white/90 backdrop-blur-md rounded-2xl shadow-xl border border-primary-100/80 p-6 md:p-8 text-center transition-all animate-fadeIn">
        {/* WiseCare Branding — the heart-handshake logo, same as login/CRM/portal */}
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-600 text-white shadow-lg shadow-primary-600/25 mb-4">
          <HeartHandshake size={30} className="animate-pulse" />
        </div>

        <h1 className="text-2xl font-black text-slate-800 mb-1 tracking-tight">
          שיתוף תוכן ל-WiseCare
        </h1>
        <p className="text-sm text-slate-500 mb-6">
          שמירת סרטונים, פוסטים ותכנים טיפוליים היישר למערכת
        </p>

        {/* Loading / Redirecting State */}
        {loading && (
          <div className="py-8 flex flex-col items-center justify-center gap-3">
            <Loader2 size={32} className="text-primary-600 animate-spin" />
            <p className="text-slate-700 font-medium text-sm">
              {redirectingMessage}
            </p>
            {shareData.url && (
              <div className="mt-2 text-xs text-slate-400 bg-slate-50 border border-slate-200/60 rounded-lg px-3 py-1.5 max-w-xs truncate font-mono">
                {shareData.url}
              </div>
            )}
          </div>
        )}

        {/* Manual Destination Picker */}
        {(!loading || manualDestination) && (
          <div className="space-y-5 text-right">
            {/* Shared Item Preview */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 text-slate-700">
              <div className="flex items-center justify-between mb-2">
                <span
                  className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full text-white shadow-sm"
                  style={{ backgroundColor: shareData.platform.color }}
                >
                  <Video size={12} />
                  {shareData.platform.name}
                </span>
                <span className="text-xs text-slate-400">זוהה בהצלחה</span>
              </div>

              {shareData.title && (
                <h3 className="font-bold text-slate-800 text-sm mb-1 line-clamp-2">
                  {shareData.title}
                </h3>
              )}

              {shareData.url ? (
                <a
                  href={shareData.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1 truncate font-mono dir-ltr mt-1"
                >
                  <ExternalLink size={12} className="shrink-0" />
                  <span className="truncate">{shareData.url}</span>
                </a>
              ) : (
                <p className="text-xs text-slate-500">
                  {shareData.description || 'לא זוהה קישור מפורש'}
                </p>
              )}
            </div>

            <div className="text-center">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                לאן תרצה/י לשמור את התוכן?
              </p>
            </div>

            {/* Option 1: Therapist CRM */}
            <button
              type="button"
              onClick={handleTherapistClick}
              className="w-full flex items-center justify-between p-4 rounded-xl border-2 border-primary-500 bg-primary-50/50 hover:bg-primary-50 text-primary-900 transition-all font-medium group text-right shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary-600 text-white flex items-center justify-center shrink-0 shadow-md">
                  <HeartHandshake size={20} />
                </div>
                <div>
                  <div className="font-bold text-sm text-slate-900 group-hover:text-primary-700">
                    שמור לספריית הקליניקה (מטפלים)
                  </div>
                  <div className="text-xs text-slate-500">
                    הוספה לספריית התוכן ושיוך למטופלים
                  </div>
                </div>
              </div>
              <ArrowLeft size={16} className="text-primary-600 transform group-hover:-translate-x-1 transition-transform" />
            </button>

            {/* Option 2: Client Portal */}
            <form onSubmit={handlePortalSubmit} className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary text-white flex items-center justify-center shrink-0 shadow-md">
                  <BookOpen size={20} />
                </div>
                <div>
                  <div className="font-bold text-sm text-slate-900">
                    שמור למרחב האישי (מטופלים)
                  </div>
                  <div className="text-xs text-slate-500">
                    הזן/י את קוד המרחב האישי שלך
                  </div>
                </div>
              </div>

              <div className="flex gap-2 mt-2">
                <input
                  type="text"
                  placeholder="קוד מרחב (למשל: client-123456)"
                  value={portalCodeInput}
                  onChange={e => setPortalCodeInput(e.target.value)}
                  className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary font-mono"
                  dir="ltr"
                />
                <button
                  type="submit"
                  disabled={!portalCodeInput.trim()}
                  className="px-4 py-2 bg-primary text-white text-sm font-bold rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50"
                >
                  שמירה
                </button>
              </div>
            </form>

            <div className="text-center pt-2">
              <Link
                href="/"
                className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
              >
                חזרה לדף הבית של WiseCare
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ShareTargetPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#f4f9f8]" dir="rtl">
        <div className="flex flex-col items-center gap-3 text-slate-600">
          <Loader2 size={32} className="text-primary-600 animate-spin" />
          <span className="text-sm font-medium">טוען WiseCare...</span>
        </div>
      </div>
    }>
      <ShareTargetContent />
    </Suspense>
  );
}
