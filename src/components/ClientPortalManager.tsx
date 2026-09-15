"use client";

import React, { useState, useEffect } from 'react';
import { 
  HeartHandshake, 
  CheckCircle2, 
  Clock, 
  Sparkles, 
  ArrowRight, 
  Send, 
  Calendar,
  MessageCircle,
  BookOpen,
  CheckSquare,
  Smile,
  Plus,
  Trash2,
  Search,
  Wind,
  Phone,
  HelpCircle,
  FileText,
  Activity,
  ShieldCheck,
  MapPin,
  Compass,
  RefreshCw,
  Heart,
  ExternalLink,
  ChevronLeft,
  Navigation,
  Menu,
  CalendarCheck,
  CalendarPlus,
  Video,
  Library,
  Image,
  Link2,
  AlertCircle,
  Loader2,
  X,
  Lock,
  Eye,
  EyeOff,
  Settings,
  KeyRound,
  Smartphone,
  LogOut,
  Check,
  Delete,
  Edit,
  Edit3
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '@/lib/api';
import ConfirmModal from './ConfirmModal';
import Toast from './Toast';
import WhatsAppIcon from './WhatsAppIcon';
import PrivacyPolicyModal from './PrivacyPolicyModal';
import { applyTheme } from '@/lib/theme';

const HEBREW_DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

const PORTAL_CONTENT_CONFIG = {
  video: { label: 'סרטון', actionLabel: 'צפה בסרטון', Icon: Video },
  article: { label: 'מאמר', actionLabel: 'קרא את המאמר', Icon: FileText },
  post: { label: 'פוסט', actionLabel: 'פתח את הפוסט', Icon: MessageCircle },
  image: { label: 'תמונה', actionLabel: 'צפה בתמונה', Icon: Image },
  link: { label: 'קישור', actionLabel: 'פתח את התוכן', Icon: Link2 }
};

function getHebrewDateString(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr + 'T00:00:00');
    const dayName = HEBREW_DAYS[d.getDay()];
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `יום ${dayName}, ${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  } catch {
    return dateStr;
  }
}

const MOOD_OPTIONS = [
  { 
    id: 'calm', 
    label: 'שלווה ורוגע', 
    emoji: '🌿', 
    color: '#0d9488', 
    prompt: 'איזה יופי, שלווה היא עוגן נפלא. נצל/י את הרגע להעמקה בתרגולים האישיים ✨' 
  },
  { 
    id: 'happy', 
    label: 'שמחה ותקווה', 
    emoji: '☀️', 
    color: '#eab308', 
    prompt: 'אנרגיה חיובית ומעצימה! שמור/י את התחושה הזו כצידה לדרך 💛' 
  },
  { 
    id: 'stressed', 
    label: 'עומס או מתח', 
    emoji: '🌧️', 
    color: '#3b82f6', 
    prompt: 'זה טבעי ומותר לחלוטין להרגיש עומס. קח/י כמה רגעים שקטים בחדר הנשימה המונחית 🌬️' 
  },
  { 
    id: 'tired', 
    label: 'עייפות ומנוחה', 
    emoji: '🌙', 
    color: '#8b5cf6', 
    prompt: 'הגוף והנפש מאותתים לך להאט. מנוחה והרפיה הן חלק בלתי נפרד מתהליך הצמיחה 💜' 
  },
  { 
    id: 'reflective', 
    label: 'מהרהר/ת ומחפש/ת כיוון', 
    emoji: '💭', 
    color: '#ec4899', 
    prompt: 'רגעים של התבוננות פנימית מולידים תובנות עמוקות. תרצה/י לתעד זאת ביומן שלך? 📖' 
  }
];

export default function ClientPortalPage({ portalCode }: { portalCode?: string }) {
  const [featuredContentId, setFeaturedContentId] = useState('');
  const [isSuperAdminImpersonating, setIsSuperAdminImpersonating] = useState(false);
  const [activeTab, setActiveTab] = useState('tasks');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const portalQuery = new URLSearchParams(window.location.search);
      setFeaturedContentId(portalQuery.get('content') || '');
      setIsSuperAdminImpersonating(portalQuery.get('superadmin') === '1');
      if (portalQuery.get('tab') === 'content') {
        setActiveTab('content');
      }
    }
  }, []);
  const [data, setData] = useState(null);
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  // activeTab is initialized and updated above via useEffect
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [expandedContentIds, setExpandedContentIds] = useState(() => new Set());
  
  // Custom alerts and confirms
  const [pendingDeleteInsightId, setPendingDeleteInsightId] = useState(null);
  const [toast, setToast] = useState(null);

  // Sanctuary & Emotional state
  const [selectedMood, setSelectedMood] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const toggleContentExpansion = (contentId) => {
    setExpandedContentIds(current => {
      const next = new Set(current);
      if (next.has(contentId)) next.delete(contentId);
      else next.add(contentId);
      return next;
    });
  };

  // Tasks state
  const [submittingTaskId, setSubmittingTaskId] = useState(null);
  const [reflectionTexts, setReflectionTexts] = useState({});
  const [taskFilter, setTaskFilter] = useState('all');

  // Insights state
  const [isNewInsightOpen, setIsNewInsightOpen] = useState(false);
  const [editingInsightId, setEditingInsightId] = useState<string | null>(null);
  const [insightSearch, setInsightSearch] = useState('');
  const [insightForm, setInsightForm] = useState({
    title: '',
    content: '',
    mood: 'שלווה והקלה',
    intensity: 7
  });
  const [savingInsight, setSavingInsight] = useState(false);

  // Breathing state
  const [breathingPhase, setBreathingPhase] = useState('שאף (4 שניות)');
  const [breathingRunning, setBreathingRunning] = useState(false);
  const [breathingCountdown, setBreathingCountdown] = useState(4);

  // Appointments state
  const [portalAppointments, setPortalAppointments] = useState([]);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [requestForm, setRequestForm] = useState({
    preferredDate: '',
    preferredTime: '10:00',
    type: 'in_person',
    notes: '',
    therapistName: '',
    location: ''
  });
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);

  // Self-Care Management state
  const [isSelfTaskModalOpen, setIsSelfTaskModalOpen] = useState(false);
  const [selfTaskForm, setSelfTaskForm] = useState({
    title: '',
    description: '',
    category: 'אישי',
    dueDate: ''
  });
  const [isSubmittingSelfTask, setIsSubmittingSelfTask] = useState(false);
  const [pendingDeleteTaskId, setPendingDeleteTaskId] = useState(null);

  const [isSelfContentModalOpen, setIsSelfContentModalOpen] = useState(false);
  const [editingContentId, setEditingContentId] = useState<string | null>(null);
  const [selfContentForm, setSelfContentForm] = useState({
    url: '',
    title: '',
    description: '',
    type: 'video',
    imageData: '',
    sourceName: '',
    category: 'אישי'
  });
  const [isSubmittingSelfContent, setIsSubmittingSelfContent] = useState(false);
  const [isUrlPreviewLoading, setIsUrlPreviewLoading] = useState(false);
  const [pendingDeleteContentId, setPendingDeleteContentId] = useState(null);

  const [pendingDeleteAppointmentId, setPendingDeleteAppointmentId] = useState(null);

  // Portal Authentication & Security Gate State
  const authSessionKey = `wisecare_portal_auth_${portalCode}`;
  const [isPortalAuthenticated, setIsPortalAuthenticated] = useState(false);
  const [isAuthChecked, setIsAuthChecked] = useState(false);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Quick 4-Digit PIN Security State
  const [isPinLocked, setIsPinLocked] = useState(false);
  const [enteredPin, setEnteredPin] = useState('');
  const [savedPin, setSavedPin] = useState<string | null>(null);
  const [isPinEnabled, setIsPinEnabled] = useState(false);
  const [pinError, setPinError] = useState('');
  const [pinShake, setPinShake] = useState(false);

  // Client Portal Settings Modal State
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [pinFormNew, setPinFormNew] = useState('');
  const [pinFormConfirm, setPinFormConfirm] = useState('');
  const [settingsMsg, setSettingsMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('wisecare_last_portal', portalCode);
      } catch {}

      // Pre-fill remembered username if available
      const savedUser = localStorage.getItem(`wisecare_saved_user_${portalCode}`);
      if (savedUser) {
        setLoginUsername(savedUser);
      }

      // Check PIN configuration
      const storedPin = localStorage.getItem(`wisecare_pin_${portalCode}`);
      const pinEnabled = localStorage.getItem(`wisecare_pin_enabled_${portalCode}`) === 'true';
      const hasPinConfig = Boolean(pinEnabled && storedPin && storedPin.length === 4);
      setIsPinEnabled(hasPinConfig);
      setSavedPin(storedPin);

      const portalToken = localStorage.getItem('wisecare_portal_token');
      fetch(`/api/portal/${encodeURIComponent(portalCode)}/verify-auth`, {
        headers: portalToken ? { Authorization: `Bearer ${portalToken}` } : {}
      })
        .then(async (res) => {
          if (!res.ok) return null;
          return res.json();
        })
        .then((session) => {
          if (!session?.authenticated) return;
          setIsPortalAuthenticated(true);
          localStorage.setItem(authSessionKey, 'true');
          if (session.token) localStorage.setItem('wisecare_portal_token', session.token);
          setIsPinLocked(hasPinConfig);
        })
        .catch(() => {})
        .finally(() => setIsAuthChecked(true));
    }
  }, [portalCode, authSessionKey]);

  // Handle Physical Keyboard during PIN lock
  useEffect(() => {
    if (!isPinLocked) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        handlePinDigit(e.key);
      } else if (e.key === 'Backspace') {
        handlePinBackspace();
      } else if (e.key === 'Escape') {
        handlePinClear();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPinLocked, enteredPin, savedPin]);

  const handlePinDigit = (digit: string) => {
    if (enteredPin.length >= 4) return;
    const nextPin = enteredPin + digit;
    setEnteredPin(nextPin);
    setPinError('');

    if (nextPin.length === 4) {
      if (nextPin === savedPin) {
        // Unlock immediately!
        setIsPinLocked(false);
        setEnteredPin('');
        setPinError('');
        showToast('המרחב נפתח בהצלחה! שלום וברוך/ה השב/ה ✨');
      } else {
        // Invalid PIN
        setPinShake(true);
        setPinError('קוד PIN שגוי. אנא נסה/י שוב');
        setTimeout(() => {
          setEnteredPin('');
          setPinShake(false);
        }, 500);
      }
    }
  };

  const handlePinBackspace = () => {
    setEnteredPin(prev => prev.slice(0, -1));
    setPinError('');
  };

  const handlePinClear = () => {
    setEnteredPin('');
    setPinError('');
  };

  const handleSwitchToFullLogin = () => {
    setIsPinLocked(false);
    setIsPortalAuthenticated(false);
    setEnteredPin('');
    setPinError('');
  };

  const handleLockPortalNow = () => {
    if (isPinEnabled && savedPin) {
      setIsPinLocked(true);
      setIsSettingsModalOpen(false);
      setMobileMenuOpen(false);
      showToast('המרחב האישי ננעל בהצלחה 🔒');
    } else {
      setIsSettingsModalOpen(true);
      setSettingsMsg({ type: 'error', text: 'כדי לנעול במהירות, יש להגדיר תחילה קוד PIN בן 4 ספרות' });
    }
  };

  const handlePortalLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginUsername.trim() || !loginPassword.trim()) {
      setLoginError('נא להזין שם משתמש וסיסמה');
      return;
    }
    setIsLoggingIn(true);
    setLoginError('');
    try {
      const res = await fetch(`/api/portal/${encodeURIComponent(portalCode)}/verify-auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: loginUsername.trim(),
          password: loginPassword.trim()
        })
      });
      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || 'פרטי התחברות שגויים');
      }

      sessionStorage.setItem(authSessionKey, 'true');
      if (resData.token) localStorage.setItem('wisecare_portal_token', resData.token);

      if (rememberMe) {
        localStorage.setItem(authSessionKey, 'true');
        localStorage.setItem(`wisecare_saved_user_${portalCode}`, loginUsername.trim());
        localStorage.setItem(`wisecare_remember_me_${portalCode}`, 'true');
      } else {
        localStorage.removeItem(authSessionKey);
        localStorage.removeItem(`wisecare_remember_me_${portalCode}`);
      }

      try {
        localStorage.setItem('wisecare_last_portal', portalCode);
      } catch {}

      setIsPortalAuthenticated(true);
      setIsPinLocked(false);
      showToast('ברוך/ה הבא/ה למרחב האישי שלך! ✨');
    } catch (err: any) {
      setLoginError(err.message || 'שגיאה בהתחברות');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handlePortalLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {}
    sessionStorage.removeItem(authSessionKey);
    try {
      localStorage.removeItem(authSessionKey);
      localStorage.removeItem('wisecare_portal_token');
      localStorage.removeItem('wisecare_last_portal');
    } catch {}
    setIsPortalAuthenticated(false);
    setIsPinLocked(false);
    setLoginPassword('');
    setIsSettingsModalOpen(false);
    showToast('התנתקת מהמרחב בהצלחה 🔒');
    if (data?.portalInfo?.isSelfCare) {
      window.location.replace('/join?view=login');
    }
  };

  // Settings Actions
  const handleSaveNewPin = (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsMsg(null);

    if (!/^\d{4}$/.test(pinFormNew)) {
      setSettingsMsg({ type: 'error', text: 'קוד ה-PIN חייב להכיל בדיוק 4 ספרות (0-9)' });
      return;
    }
    if (pinFormNew !== pinFormConfirm) {
      setSettingsMsg({ type: 'error', text: 'אימות הקוד אינו תואם לקוד שהזנת' });
      return;
    }

    try {
      localStorage.setItem(`wisecare_pin_${portalCode}`, pinFormNew);
      localStorage.setItem(`wisecare_pin_enabled_${portalCode}`, 'true');
      setSavedPin(pinFormNew);
      setIsPinEnabled(true);
      setPinFormNew('');
      setPinFormConfirm('');
      setSettingsMsg({ type: 'success', text: 'קוד PIN בן 4 ספרות הוגדר והופעל בהצלחה! 🔒' });
    } catch {
      setSettingsMsg({ type: 'error', text: 'שגיאה בשמירת קוד ה-PIN במכשיר' });
    }
  };

  const handleTogglePinEnabled = (enable: boolean) => {
    setSettingsMsg(null);
    if (!enable) {
      try {
        localStorage.setItem(`wisecare_pin_enabled_${portalCode}`, 'false');
        setIsPinEnabled(false);
        setSettingsMsg({ type: 'success', text: 'נעילת ה-PIN בוטלה. כעת הכניסה מהירה ללא קוד.' });
      } catch {}
    } else {
      if (savedPin && savedPin.length === 4) {
        try {
          localStorage.setItem(`wisecare_pin_enabled_${portalCode}`, 'true');
          setIsPinEnabled(true);
          setSettingsMsg({ type: 'success', text: 'נעילת PIN הופעלה מחדש בהצלחה 🔒' });
        } catch {}
      } else {
        setSettingsMsg({ type: 'error', text: 'נא להזין קוד בן 4 ספרות מטה ולהפעיל אותו' });
      }
    }
  };

  const handleClearSavedCredentials = () => {
    try {
      localStorage.removeItem(authSessionKey);
      localStorage.removeItem(`wisecare_saved_user_${portalCode}`);
      localStorage.removeItem(`wisecare_remember_me_${portalCode}`);
      setSettingsMsg({ type: 'success', text: 'פרטי ההתחברות השמורים נמחקו ממכשיר זה. בכניסה הבאה תידרש/י להזין שם משתמש וסיסמה.' });
    } catch {
      setSettingsMsg({ type: 'error', text: 'שגיאה במחיקת הנתונים השמורים' });
    }
  };

  useEffect(() => {
    loadPortalAll();
  }, [portalCode]);

  useEffect(() => {
    if (activeTab !== 'content' || !featuredContentId || !data?.content?.length) return undefined;

    const frameId = window.requestAnimationFrame(() => {
      const featuredCard = document.getElementById(`portal-content-${featuredContentId}`);
      if (!featuredCard) return;

      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      featuredCard.scrollIntoView({
        behavior: prefersReducedMotion ? 'auto' : 'smooth',
        block: 'center'
      });
      featuredCard.focus({ preventScroll: true });
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [activeTab, data, featuredContentId]);

  const loadPortalAll = async () => {
    try {
      setLoading(true);
      const [portalRes, insightsRes, appointmentsRes] = await Promise.all([
        api.getPortalData(portalCode),
        api.getPortalInsights(portalCode),
        api.getPortalAppointments(portalCode).catch(() => [])
      ]);
      setData(portalRes);
      setInsights(insightsRes || []);
      setPortalAppointments(appointmentsRes || []);
      
      // Synchronize clinic theme palette
      if (portalRes?.portalInfo?.themeId) {
        applyTheme(portalRes.portalInfo.themeId);
      }

      const initialReflections = {};
      (portalRes.tasks || []).forEach(t => {
        initialReflections[t.id] = t.clientNotes || '';
      });
      setReflectionTexts(initialReflections);
    } catch (err) {
      setError(err.message || 'לא ניתן לטעון את המרחב האישי');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestAppointmentSubmit = async (e) => {
    e.preventDefault();
    if (!requestForm.preferredDate) {
      showToast('נא לבחור תאריך מועדף לפגישה', 'error');
      return;
    }
    setIsSubmittingRequest(true);
    try {
      await api.requestPortalAppointment(portalCode, requestForm);
      if (data?.portalInfo?.isSelfCare) {
        showToast('הפגישה תועדה ונשמרה בהצלחה ביומן האישי שלך! 📅');
      } else {
        showToast('בקשת התור הוגשה בהצלחה! נעדכן אותך בוואטסאפ ברגע שהמועד יאושר על ידי המטפל/ת 🌿');
      }
      setIsRequestModalOpen(false);
      setRequestForm({
        preferredDate: '',
        preferredTime: '10:00',
        type: 'in_person',
        notes: '',
        therapistName: '',
        location: ''
      });
      const updatedApts = await api.getPortalAppointments(portalCode);
      setPortalAppointments(updatedApts || []);
    } catch (err) {
      showToast(err.message || 'שגיאה בשליחת בקשת התור', 'error');
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  // Self-Care Task handlers
  const handleCreateSelfTask = async (e) => {
    e.preventDefault();
    if (!selfTaskForm.title.trim()) {
      showToast('נא להזין כותרת למשימה או לתרגול', 'error');
      return;
    }
    setIsSubmittingSelfTask(true);
    try {
      await api.createPortalSelfTask(portalCode, selfTaskForm);
      showToast('המשימה נוספה למרחב האישי שלך בהצלחה! 🌱');
      setIsSelfTaskModalOpen(false);
      setSelfTaskForm({
        title: '',
        description: '',
        category: 'אישי',
        dueDate: ''
      });
      confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
      const updated = await api.getPortalData(portalCode);
      setData(updated);
    } catch (err) {
      showToast(err.message || 'שגיאה בהוספת משימה', 'error');
    } finally {
      setIsSubmittingSelfTask(false);
    }
  };

  const confirmDeleteSelfTask = async () => {
    if (!pendingDeleteTaskId) return;
    try {
      await api.deletePortalSelfTask(portalCode, pendingDeleteTaskId);
      showToast('המשימה נמחקה מהמרחב');
      setData(prev => ({
        ...prev,
        tasks: (prev?.tasks || []).filter(t => t.id !== pendingDeleteTaskId)
      }));
    } catch (err) {
      showToast(err.message || 'שגיאה במחיקת משימה', 'error');
    } finally {
      setPendingDeleteTaskId(null);
    }
  };

  // Self-Care Content handlers
  const handlePreviewSelfContentUrl = async (urlToPreview?: string) => {
    const targetUrl = urlToPreview || selfContentForm.url;
    if (!targetUrl || !targetUrl.trim()) return;
    setIsUrlPreviewLoading(true);
    try {
      const preview = await api.previewContentUrl(targetUrl.trim());
      if (preview) {
        setSelfContentForm(prev => ({
          ...prev,
          title: preview.title || prev.title,
          description: preview.description || prev.description,
          imageData: preview.image || prev.imageData,
          type: preview.type || prev.type,
          sourceName: preview.sourceName || prev.sourceName
        }));
        showToast('פרטי הקישור זוהו בהצלחה! ✨');
      }
    } catch (err) {
      console.warn('URL preview error:', err);
    } finally {
      setIsUrlPreviewLoading(false);
    }
  };

  // Auto-open content modal if arriving via share target link
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const shareUrl = params.get('share_url') || params.get('url') || '';
    const shareText = params.get('text') || '';
    const detectedUrl = shareUrl || shareText.match(/https?:\/\/[^\s]+/)?.[0] || '';
    const shareTitle = params.get('share_title') || params.get('title') || '';
    if (detectedUrl || shareTitle) {
      setActiveTab('content');
      const isPostUrl = (detectedUrl.includes('facebook.com') || detectedUrl.includes('fb.com')) &&
        (detectedUrl.includes('/share/p/') || detectedUrl.includes('/posts/') || detectedUrl.includes('permalink.php'));
      setSelfContentForm(prev => ({
        ...prev,
        url: detectedUrl,
        type: isPostUrl ? 'post' : prev.type,
        sourceName: isPostUrl ? 'Facebook Post' : prev.sourceName,
        title: (shareTitle && shareTitle !== 'Facebook') ? shareTitle : prev.title,
        description: detectedUrl ? shareText.replace(detectedUrl, '').trim() : shareText
      }));
      setIsSelfContentModalOpen(true);
      if (detectedUrl) {
        handlePreviewSelfContentUrl(detectedUrl);
      }
      try {
        window.history.replaceState({}, document.title, window.location.pathname);
      } catch {}
    }
  }, [portalCode]);

  const handleOpenEditSelfContent = (item: any) => {
    setEditingContentId(item.id);
    setSelfContentForm({
      url: item.url || '',
      title: item.title || '',
      description: item.description || '',
      type: item.type || 'video',
      imageData: item.imageData || '',
      sourceName: item.sourceName || '',
      category: item.category || 'אישי'
    });
    setIsSelfContentModalOpen(true);
  };

  const handleCreateSelfContent = async (e) => {
    e.preventDefault();
    if (!selfContentForm.url.trim() && !selfContentForm.description.trim()) {
      showToast('נא להזין קישור או תוכן', 'error');
      return;
    }
    setIsSubmittingSelfContent(true);
    try {
      if (editingContentId) {
        const res = await api.updatePortalSelfContent(portalCode, editingContentId, selfContentForm);
        showToast('התוכן עודכן בהצלחה! ✨');
        if (res?.item) {
          setData(prev => ({
            ...prev,
            content: (prev?.content || []).map(c => c.id === editingContentId ? { ...c, ...res.item } : c)
          }));
        }
      } else {
        const newItem = await api.addPortalSelfContent(portalCode, selfContentForm);
        showToast('התוכן נוסף לספרייה האישית שלך בהצלחה! 🎬');
        confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
        if (newItem && newItem.id) {
          setData(prev => ({
            ...prev,
            content: [newItem, ...(prev?.content || []).filter(c => c.id !== newItem.id)]
          }));
        }
      }
      setIsSelfContentModalOpen(false);
      setEditingContentId(null);
      setSelfContentForm({
        url: '',
        title: '',
        description: '',
        type: 'video',
        imageData: '',
        sourceName: '',
        category: 'אישי'
      });
      // Switch to content tab so the user sees the saved post/video immediately
      setActiveTab('content');
      const updated = await api.getPortalData(portalCode);
      if (updated) {
        setData(updated);
      }
    } catch (err: any) {
      showToast(err.message || 'שגיאה בשמירת תוכן', 'error');
    } finally {
      setIsSubmittingSelfContent(false);
    }
  };

  const confirmDeleteSelfContent = async () => {
    if (!pendingDeleteContentId) return;
    try {
      await api.removePortalSelfContent(portalCode, pendingDeleteContentId);
      showToast('התוכן הוסר מהמרחב האישי');
      setData(prev => ({
        ...prev,
        content: (prev?.content || []).filter(c => c.id !== pendingDeleteContentId)
      }));
    } catch (err) {
      showToast(err.message || 'שגיאה בהסרת תוכן', 'error');
    } finally {
      setPendingDeleteContentId(null);
    }
  };

  const confirmDeleteSelfAppointment = async () => {
    if (!pendingDeleteAppointmentId) return;
    try {
      await api.deletePortalAppointment(portalCode, pendingDeleteAppointmentId);
      showToast('הפגישה נמחקה מהיומן');
      setPortalAppointments(prev => prev.filter(a => a.id !== pendingDeleteAppointmentId));
    } catch (err) {
      showToast(err.message || 'שגיאה במחיקת פגישה', 'error');
    } finally {
      setPendingDeleteAppointmentId(null);
    }
  };

  // Task completion toggle
  const handleToggleCompleted = async (task) => {
    const nextCompleted = !task.completed;
    setSubmittingTaskId(task.id);

    try {
      await api.updatePortalTaskStatus(
        portalCode, 
        task.id, 
        nextCompleted, 
        reflectionTexts[task.id] || ''
      );

      if (nextCompleted) {
        confetti({
          particleCount: 80,
          spread: 75,
          origin: { y: 0.6 }
        });
        showToast('כל הכבוד! התרגול סומן כהושלם בהצלחה 🌱');
      }

      // Reload
      const updated = await api.getPortalData(portalCode);
      setData(updated);
    } catch (err) {
      showToast('שגיאה בעדכון משימה: ' + err.message, 'error');
    } finally {
      setSubmittingTaskId(null);
    }
  };

  const handleSaveReflection = async (taskId) => {
    setSubmittingTaskId(taskId);
    try {
      const task = data.tasks.find(t => t.id === taskId);
      await api.updatePortalTaskStatus(
        portalCode,
        taskId,
        task?.completed,
        reflectionTexts[taskId]
      );
      showToast('המשוב והתובנות שלך עודכנו ונשמרו למפגש הבא! 🕊️');
      const updated = await api.getPortalData(portalCode);
      setData(updated);
    } catch (err) {
      showToast('שגיאה בשמירת המשוב: ' + err.message, 'error');
    } finally {
      setSubmittingTaskId(null);
    }
  };

  // Add or Edit Insight / Thought entry
  const handleOpenEditInsight = (item: any) => {
    setEditingInsightId(item.id);
    setInsightForm({
      title: item.title || '',
      content: item.content || '',
      mood: item.mood || 'שלווה והקלה',
      intensity: item.intensity || 7
    });
    setIsNewInsightOpen(true);
  };

  const handleCreateInsight = async (e) => {
    e.preventDefault();
    if (!insightForm.content.trim()) {
      showToast('נא למלא תוכן לתובנה', 'error');
      return;
    }

    setSavingInsight(true);
    try {
      if (editingInsightId) {
        await api.updatePortalInsight(portalCode, editingInsightId, insightForm);
        showToast('התובנה עודכנה ביומן האישי שלך בהצלחה! ✨');
      } else {
        await api.addPortalInsight(portalCode, insightForm);
        showToast('התובנה נשמרה ביומן האישי שלך בהצלחה! ✨');
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.5 } });
      }
      setInsightForm({
        title: '',
        content: '',
        mood: 'שלווה והקלה',
        intensity: 7
      });
      setIsNewInsightOpen(false);
      setEditingInsightId(null);
      const updatedInsights = await api.getPortalInsights(portalCode);
      setInsights(updatedInsights);
    } catch (err: any) {
      showToast('שגיאה בשמירת התובנה: ' + (err.message || ''), 'error');
    } finally {
      setSavingInsight(false);
    }
  };

  const confirmDeleteInsight = async () => {
    if (!pendingDeleteInsightId) return;
    try {
      await api.deletePortalInsight(portalCode, pendingDeleteInsightId);
      setInsights(prev => prev.filter(i => i.id !== pendingDeleteInsightId));
      showToast('התיעוד נמחק מהיומן האישי שלך');
    } catch (err) {
      showToast('שגיאה במחיקה: ' + err.message, 'error');
    } finally {
      setPendingDeleteInsightId(null);
    }
  };

  // Quick save mood from checkin to diary
  const handleSaveMoodToJournal = (moodObj) => {
    setInsightForm({
      title: `הרגשה ברגע זה: ${moodObj.label}`,
      content: moodObj.prompt,
      mood: moodObj.label,
      intensity: moodObj.id === 'stressed' ? 8 : moodObj.id === 'calm' ? 4 : 6
    });
    setActiveTab('insights');
    setIsNewInsightOpen(true);
  };

  // Guided breathing loop
  useEffect(() => {
    let interval = null;
    if (breathingRunning) {
      interval = setInterval(() => {
        setBreathingCountdown(prev => {
          if (prev > 1) return prev - 1;
          // Switch phase
          if (breathingPhase.startsWith('שאף')) {
            setBreathingPhase('החזק (7 שניות)');
            return 7;
          } else if (breathingPhase.startsWith('החזק')) {
            setBreathingPhase('נשוף לאט (8 שניות)');
            return 8;
          } else {
            setBreathingPhase('שאף (4 שניות)');
            return 4;
          }
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [breathingRunning, breathingPhase]);

  // Hebrew time-based greeting calculation
  const getGreetingData = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      return { text: 'בוקר אור ומלא כוחות', emoji: '🌅' };
    } else if (hour >= 12 && hour < 17) {
      return { text: 'צהריים שלווים ונעימים', emoji: '☀️' };
    } else if (hour >= 17 && hour < 21) {
      return { text: 'ערב רגוע וטוב', emoji: '🌆' };
    } else {
      return { text: 'לילה שקט ומחזק', emoji: '🌙' };
    }
  };

  const greeting = getGreetingData();

  const formattedHebrewDate = new Intl.DateTimeFormat('he-IL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(new Date());

  if (loading) {
    return (
      <div className="portal-layout" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <Sparkles size={46} color="var(--primary, #0d9488)" style={{ animation: 'spin 2s linear infinite' }} />
          <h3 style={{ marginTop: '18px', color: 'var(--primary-hover, #0f766e)', fontWeight: 800, fontSize: '1.25rem' }}>
            טוען את המרחב הטיפולי האישי שלך...
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '6px' }}>
            מכין את התרגולים, התובנות והכלים השקטים עבורך
          </p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="portal-layout" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', minHeight: '100vh' }}>
        <div className="modal-card" style={{ maxWidth: '500px', textAlign: 'center', padding: '40px 28px' }}>
          <div style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: '#fef2f2',
            color: '#dc2626',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px'
          }}>
            <HelpCircle size={32} />
          </div>
          <h3 style={{ color: '#991b1b', marginBottom: '10px', fontSize: '1.3rem' }}>מרחב אישי לא נמצא</h3>
          <p style={{ color: '#64748b', fontSize: '0.96rem', lineHeight: 1.6 }}>
            הקישור שבו השתמשת אינו תקף או שפג תוקפו. אנא פנה/י למטפל/ת שלך לקבלת קישור אישי מעודכן.
          </p>
        </div>
      </div>
    );
  }

  if (data?.portalInfo?.hasPassword && !isAuthChecked) {
    return (
      <div className="portal-layout" style={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }} role="status">
        <Loader2 className="animate-spin" size={30} />
      </div>
    );
  }

  // Security Gate: If client has password and has no valid remembered session
  if (data?.portalInfo?.hasPassword && !isPortalAuthenticated) {
    return (
      <div className="portal-layout" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '24px 16px', background: 'linear-gradient(145deg, #f0fdfa 0%, #f8fafc 100%)' }}>
        <div className="modal-card" style={{ maxWidth: '440px', width: '100%', padding: '36px 28px', borderRadius: '24px', boxShadow: '0 20px 50px rgba(15, 23, 42, 0.08)', border: '1px solid #ccfbf1' }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '20px',
              background: 'var(--primary-light, #ccfbf1)',
              color: 'var(--primary-hover, #0f766e)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              boxShadow: '0 8px 20px rgba(13, 148, 136, 0.15)'
            }}>
              <Lock size={30} />
            </div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', margin: '0 0 6px 0' }}>
              כניסה למרחב האישי
            </h2>
            <p style={{ fontSize: '0.88rem', color: '#64748b', margin: 0, lineHeight: 1.5 }}>
              {data.portalInfo.clinicName || 'WiseCare מרחב טיפולי'}
              {data.portalInfo.therapist?.name ? ` • ${data.portalInfo.therapist.name}` : ''}
            </p>
            <div style={{
              marginTop: '12px',
              padding: '8px 12px',
              background: '#f0fdf4',
              borderRadius: '10px',
              border: '1px solid #bbf7d0',
              fontSize: '0.8rem',
              color: '#166534',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}>
              <ShieldCheck size={15} color="#16a34a" />
              <span>מרחב מאובטח ומוגן לשמירה על פרטיותך</span>
            </div>
          </div>

          <form onSubmit={handlePortalLogin}>
            {loginError && (
              <div style={{
                background: '#fef2f2',
                color: '#dc2626',
                border: '1px solid #fecaca',
                padding: '10px 14px',
                borderRadius: '10px',
                fontSize: '0.88rem',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <AlertCircle size={16} />
                <span>{loginError}</span>
              </div>
            )}

            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '0.88rem', fontWeight: 700, color: '#334155', marginBottom: '6px', display: 'block' }}>
                שם משתמש
              </label>
              <input 
                type="text"
                className="form-control"
                placeholder="הזן/י שם משתמש או טלפון"
                dir="ltr"
                style={{ textAlign: 'right', fontSize: '0.98rem', padding: '12px 14px', borderRadius: '12px' }}
                required
                value={loginUsername}
                onChange={e => setLoginUsername(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '22px' }}>
              <label style={{ fontSize: '0.88rem', fontWeight: 700, color: '#334155', marginBottom: '6px', display: 'block' }}>
                סיסמה אישית
              </label>
              <div style={{ position: 'relative' }}>
                <input 
                  type={showLoginPassword ? 'text' : 'password'}
                  className="form-control"
                  placeholder="הזן/י את סיסמתך"
                  dir="ltr"
                  style={{ textAlign: 'right', fontSize: '0.98rem', padding: '12px 14px', paddingLeft: '40px', borderRadius: '12px' }}
                  required
                  value={loginPassword}
                  onChange={e => setLoginPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  {showLoginPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', cursor: 'pointer' }} onClick={() => setRememberMe(!rememberMe)}>
              <input 
                type="checkbox" 
                id="rememberMeCheckbox"
                checked={rememberMe} 
                onChange={e => setRememberMe(e.target.checked)}
                style={{ width: '18px', height: '18px', accentColor: '#0d9488', cursor: 'pointer' }} 
              />
              <label htmlFor="rememberMeCheckbox" style={{ fontSize: '0.88rem', color: '#475569', fontWeight: 600, cursor: 'pointer', userSelect: 'none' }}>
                זכור אותי במכשיר זה (כניסה אוטומטית בעתיד)
              </label>
            </div>

            <button 
              type="submit"
              className="btn btn-primary"
              disabled={isLoggingIn}
              style={{
                width: '100%',
                padding: '14px',
                fontSize: '1rem',
                fontWeight: 700,
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              {isLoggingIn ? <Loader2 size={18} className="spin" /> : <Lock size={18} />}
              <span>{isLoggingIn ? 'מאמת פרטי כניסה...' : 'כניסה למרחב האישי 🔐'}</span>
            </button>
          </form>

          <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '0.82rem', color: '#64748b', lineHeight: 1.5 }}>
            לא קיבלת או שכחת את פרטי הגישה?
            <br />
            פנה/י למטפל/ת שלך לקבלת תזכורת עם הסיסמה בוואטסאפ.
          </div>
        </div>
      </div>
    );
  }

  // Security Gate 2: Quick 4-Digit PIN Lock Screen (when authenticated on device & PIN is enabled)
  if (data?.portalInfo?.hasPassword && isPortalAuthenticated && isPinLocked) {
    return (
      <div className="portal-pin-wrapper">
        <div className={`portal-pin-card ${pinShake ? 'portal-pin-shake' : ''}`}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '22px',
            background: 'rgba(45, 212, 191, 0.15)',
            color: '#2dd4bf',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            border: '1px solid rgba(45, 212, 191, 0.3)',
            boxShadow: '0 8px 24px rgba(45, 212, 191, 0.2)'
          }}>
            <Lock size={30} />
          </div>

          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ffffff', margin: '0 0 6px 0' }}>
            מרחב אישי נעול
          </h2>
          <p style={{ fontSize: '0.88rem', color: '#94a3b8', margin: '0 0 4px 0' }}>
            {data.portalInfo.clientName} • {data.portalInfo.clinicName || 'WiseCare'}
          </p>
          <div style={{ fontSize: '0.82rem', color: '#5eead4', marginTop: '6px' }}>
            הזינו קוד PIN בן 4 ספרות לפתיחה מהירה
          </div>

          {pinError && (
            <div style={{
              marginTop: '16px',
              padding: '9px 14px',
              background: 'rgba(239, 68, 68, 0.2)',
              border: '1px solid rgba(239, 68, 68, 0.45)',
              borderRadius: '12px',
              color: '#fca5a5',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}>
              <AlertCircle size={15} />
              <span>{pinError}</span>
            </div>
          )}

          {/* 4 Dots Indicator */}
          <div className="portal-pin-dots">
            {[0, 1, 2, 3].map(index => (
              <div 
                key={index} 
                className={`portal-pin-dot ${index < enteredPin.length ? 'is-filled' : ''}`} 
              />
            ))}
          </div>

          {/* Numeric Keypad */}
          <div className="portal-pin-keypad">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
              <button
                key={num}
                type="button"
                className="portal-pin-key"
                onClick={() => handlePinDigit(num)}
              >
                {num}
              </button>
            ))}
            <button
              type="button"
              className="portal-pin-key is-action"
              onClick={handlePinClear}
              title="נקה הכל"
            >
              C
            </button>
            <button
              type="button"
              className="portal-pin-key"
              onClick={() => handlePinDigit('0')}
            >
              0
            </button>
            <button
              type="button"
              className="portal-pin-key is-action"
              onClick={handlePinBackspace}
              title="מחק ספרה אחרונה"
            >
              ⌫
            </button>
          </div>

          {/* Switch to Full Password Login Link */}
          <div style={{ marginTop: '30px', paddingTop: '20px', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
            <button
              type="button"
              onClick={handleSwitchToFullLogin}
              style={{
                background: 'none',
                border: 'none',
                color: '#5eead4',
                fontSize: '0.84rem',
                fontWeight: 600,
                cursor: 'pointer',
                textDecoration: 'underline',
                textUnderlineOffset: '4px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <KeyRound size={15} />
              <span>שכחת את ה-PIN? כניסה עם שם משתמש וסיסמה</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { portalInfo, tasks, content = [] } = data;
  const isDirectContentView = activeTab === 'content' && Boolean(featuredContentId);
  const displayedContent = isDirectContentView
    ? [...content].sort((a, b) => Number(b.id === featuredContentId) - Number(a.id === featuredContentId))
    : content;
  const completedTasks = tasks.filter(t => t.completed);
  const pendingTasks = tasks.filter(t => !t.completed);
  const progressPercent = tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0;

  const filteredTasks = tasks.filter(t => {
    if (taskFilter === 'pending') return !t.completed;
    if (taskFilter === 'completed') return t.completed;
    return true;
  });

  const filteredInsights = insights.filter(i => {
    return i.title.toLowerCase().includes(insightSearch.toLowerCase()) ||
           i.content.toLowerCase().includes(insightSearch.toLowerCase()) ||
           (i.mood && i.mood.includes(insightSearch));
  });

  // Encouraging microcopy based on task progress
  const getProgressEncouragement = () => {
    if (tasks.length === 0) return 'אין משימות פתוחות כרגע. זהו זמן מצוין למנוחה ולהתבוננות 🌿';
    if (progressPercent === 100) return 'נפלא! כל התרגולים לשבוע זה הושלמו בגאווה גדולה 🌟';
    if (progressPercent >= 50) return 'התקדמות מרשימה! כבר עברת מעל חצי מהדרך, כל צעד בונה חוסן 🌱';
    if (progressPercent > 0) return 'התחלה מעולה. צעד אחר צעד, בדיוק בקצב שנכון ומדויק עבורך 🍃';
    return 'מרחב התרגול ממתין לך – קח/י נשימה עמוקה והתחל/י כשתרגיש/י מוכן/ה 🕊️';
  };


  // Therapist WhatsApp link
  const therapistPhoneRaw = portalInfo.therapist?.phone ? portalInfo.therapist.phone.replace(/[^0-9]/g, '') : '';
  const therapistWaPhone = therapistPhoneRaw.startsWith('0') ? '972' + therapistPhoneRaw.slice(1) : therapistPhoneRaw;
  const therapistWaUrl = therapistWaPhone 
    ? `https://wa.me/${therapistWaPhone}?text=${encodeURIComponent(`שלום ${portalInfo.therapist?.name || ''}, פונה אליך מתוך המרחב האישי שלי ב-WiseCare.`)}`
    : null;

  return (
    <div className={`app-container portal-app ${isDirectContentView ? 'portal-direct-content' : ''}`}>
      {/* Patient Custom Sanctuary Sidebar */}
      {mobileMenuOpen && (
        <div className="sidebar-overlay" onClick={() => setMobileMenuOpen(false)} />
      )}
      <aside className={`sidebar ${mobileMenuOpen ? 'mobile-open' : ''}`} style={{ background: 'var(--bg-sidebar-gradient, linear-gradient(180deg, #07191d 0%, #0b2226 100%))' }}>
        {/* Brand */}
        <div className="sidebar-header" style={{ borderBottom: '1px solid var(--sidebar-border, rgba(255, 255, 255, 0.12))' }}>
          <div className="brand-icon" style={{ background: 'var(--brand-gradient, linear-gradient(135deg, #14b8a6 0%, #0d9488 100%))' }}>
            <HeartHandshake size={24} />
          </div>
          <div className="brand-info">
            <h2>WiseCare <Sparkles size={15} color="#5eead4" /></h2>
            <span>המרחב הטיפולי האישי שלי</span>
          </div>
          <button 
            type="button" 
            className="mobile-close-btn" 
            onClick={() => setMobileMenuOpen(false)}
            title="סגור תפריט"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          <div className="nav-section-title" style={{ color: 'var(--sidebar-active-color, #99f6e4)' }}>תפריט המרחב</div>

          <button 
            className={`nav-item ${activeTab === 'tasks' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('tasks');
              setMobileMenuOpen(false);
            }}
            style={{ 
              color: activeTab === 'tasks' ? 'var(--sidebar-active-color, #2dd4bf)' : '#ccfbf1',
              background: activeTab === 'tasks' ? 'var(--bg-sidebar-active, rgba(255, 255, 255, 0.12))' : 'transparent'
            }}
          >
            <CheckSquare size={19} />
            <span>משימות ותרגולים</span>
            {pendingTasks.length > 0 && (
              <span className="nav-badge" style={{ background: '#f59e0b', color: '#1e293b', fontWeight: 800 }}>
                {pendingTasks.length}
              </span>
            )}
          </button>

          <button
            type="button"
            className={`nav-item ${activeTab === 'content' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('content');
              setMobileMenuOpen(false);
            }}
            style={{
              color: activeTab === 'content' ? 'var(--sidebar-active-color, #2dd4bf)' : '#ccfbf1',
              background: activeTab === 'content' ? 'var(--bg-sidebar-active, rgba(255, 255, 255, 0.12))' : 'transparent'
            }}
            aria-current={activeTab === 'content' ? 'page' : undefined}
          >
            <Library size={19} />
            <span>תוכן בשבילי</span>
            {content.length > 0 && (
              <span className="nav-badge" style={{ background: 'rgba(255, 255, 255, 0.2)' }}>
                {content.length}
              </span>
            )}
          </button>

          <button 
            className={`nav-item ${activeTab === 'appointments' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('appointments');
              setMobileMenuOpen(false);
            }}
            style={{ 
              color: activeTab === 'appointments' ? 'var(--sidebar-active-color, #2dd4bf)' : '#ccfbf1',
              background: activeTab === 'appointments' ? 'var(--bg-sidebar-active, rgba(255, 255, 255, 0.12))' : 'transparent'
            }}
          >
            <CalendarCheck size={19} />
            <span>התורים שלי</span>
            {portalAppointments.filter(a => a.status === 'confirmed' && a.date >= new Date().toISOString().split('T')[0]).length > 0 && (
              <span className="nav-badge" style={{ background: '#10b981', color: '#ffffff' }}>
                {portalAppointments.filter(a => a.status === 'confirmed' && a.date >= new Date().toISOString().split('T')[0]).length}
              </span>
            )}
          </button>

          <button 
            className={`nav-item ${activeTab === 'insights' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('insights');
              setMobileMenuOpen(false);
            }}
            style={{ 
              color: activeTab === 'insights' ? 'var(--sidebar-active-color, #2dd4bf)' : '#ccfbf1',
              background: activeTab === 'insights' ? 'var(--bg-sidebar-active, rgba(255, 255, 255, 0.12))' : 'transparent'
            }}
          >
            <BookOpen size={19} />
            <span>יומן תובנות ומחשבות</span>
            {insights.length > 0 && (
              <span className="nav-badge" style={{ background: 'rgba(255, 255, 255, 0.2)' }}>
                {insights.length}
              </span>
            )}
          </button>

          <button 
            className={`nav-item ${activeTab === 'breathing' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('breathing');
              setMobileMenuOpen(false);
            }}
            style={{ 
              color: activeTab === 'breathing' ? 'var(--sidebar-active-color, #2dd4bf)' : '#ccfbf1',
              background: activeTab === 'breathing' ? 'var(--bg-sidebar-active, rgba(255, 255, 255, 0.12))' : 'transparent'
            }}
          >
            <Wind size={19} />
            <span>הרפיה ונשימה מונחית</span>
          </button>

          {!portalInfo.isSelfCare && (
            <button 
              className={`nav-item ${activeTab === 'clinic' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('clinic');
                setMobileMenuOpen(false);
              }}
              style={{ 
                color: activeTab === 'clinic' ? 'var(--sidebar-active-color, #2dd4bf)' : '#ccfbf1',
                background: activeTab === 'clinic' ? 'var(--bg-sidebar-active, rgba(255, 255, 255, 0.12))' : 'transparent'
              }}
            >
              <MapPin size={19} />
              <span>פרטי קליניקה והגעה</span>
            </button>
          )}
        </nav>

        {/* Therapist Direct Contact in Sidebar */}
        {portalInfo.therapist && (
          <div style={{
            margin: '12px 14px',
            padding: '16px',
            borderRadius: '16px',
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.14)',
            color: 'white'
          }}>
            <div style={{ fontSize: '0.74rem', color: 'var(--sidebar-active-color, #99f6e4)', fontWeight: 700, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              מטפל/ת מלווה
            </div>
            <div style={{ fontWeight: 800, fontSize: '1rem', color: '#ffffff' }}>{portalInfo.therapist.name}</div>
            <div style={{ fontSize: '0.8rem', color: '#e0f2fe', marginTop: '2px' }}>{portalInfo.therapist.title}</div>
            
            {portalInfo.therapist.specialty && (
              <div style={{ fontSize: '0.76rem', color: 'rgba(255, 255, 255, 0.7)', marginTop: '4px' }}>
                {portalInfo.therapist.specialty}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
              {therapistWaUrl && (
                <a 
                  href={therapistWaUrl} 
                  target="_blank" 
                  rel="noreferrer"
                  className="btn"
                  style={{
                    background: '#25D366',
                    color: '#ffffff',
                    padding: '7px 12px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    textDecoration: 'none',
                    border: 'none',
                    boxShadow: '0 2px 6px rgba(37, 211, 102, 0.3)'
                  }}
                >
                  <WhatsAppIcon size={16} color="#ffffff" />
                  <span>הודעה ב-WhatsApp</span>
                </a>
              )}

              {portalInfo.therapist.phone && (
                <a 
                  href={`tel:${portalInfo.therapist.phone}`}
                  style={{
                    fontSize: '0.8rem',
                    color: '#e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    textDecoration: 'none',
                    padding: '5px',
                    borderRadius: '6px',
                    background: 'rgba(255, 255, 255, 0.06)'
                  }}
                >
                  <Phone size={13} color="var(--sidebar-active-color, #2dd4bf)" />
                  <span dir="ltr">{portalInfo.therapist.phone}</span>
                </a>
              )}
            </div>
          </div>
        )}

        {/* Patient Profile Footer */}
        <div className="sidebar-footer" style={{ borderTop: '1px solid var(--sidebar-border, rgba(255, 255, 255, 0.12))' }}>
          <div className="user-profile-badge" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div className="user-avatar" style={{ background: 'var(--primary, #0d9488)', border: '2px solid #5eead4' }}>
                {portalInfo.firstName.charAt(0)}
              </div>
              <div className="user-meta">
                <div className="user-name">{portalInfo.clientName}</div>
                <div className="user-role" style={{ color: 'var(--sidebar-active-color, #99f6e4)' }}>
                  {portalInfo.isSelfCare ? 'מרחב אישי עצמאי' : 'מרחב אישי ומאובטח'}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                type="button"
                onClick={() => {
                  setSettingsMsg(null);
                  setIsSettingsModalOpen(true);
                  setMobileMenuOpen(false);
                }}
                style={{
                  background: 'rgba(255, 255, 255, 0.12)',
                  color: '#e2e8f0',
                  border: '1px solid rgba(255, 255, 255, 0.25)',
                  borderRadius: '8px',
                  padding: '6px 9px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
                title="הגדרות אבטחה ופרטיות המרחב"
              >
                <Settings size={13} />
                <span>הגדרות</span>
              </button>
              <button
                type="button"
                onClick={handlePortalLogout}
                style={{
                  background: 'rgba(239, 68, 68, 0.2)',
                  color: '#fca5a5',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  borderRadius: '8px',
                  padding: '6px 9px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
                title="התנתקות מהמרחב"
              >
                <Lock size={12} />
                <span>יציאה</span>
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Sanctuary Content */}
      <div className="main-wrapper">
        {/* SuperAdmin Direct Impersonation Banner */}
        {isSuperAdminImpersonating && (
          <div style={{
            background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
            color: '#ffffff',
            padding: '12px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            borderBottom: '2px solid #6366f1',
            boxShadow: '0 4px 14px rgba(30, 27, 75, 0.25)',
            position: 'sticky',
            top: 0,
            zIndex: 100,
            direction: 'rtl'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                background: 'rgba(99, 102, 241, 0.35)',
                border: '1px solid rgba(165, 180, 252, 0.5)',
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <ShieldCheck size={20} color="#a5b4fc" />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.94rem', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span>מצב מנהל ראשי (SuperAdmin): כניסה ישירה ללא סיסמה 🔑</span>
                  <span style={{
                    background: '#4f46e5',
                    color: '#ffffff',
                    fontSize: '0.72rem',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontWeight: 600
                  }}>
                    {portalInfo.isSelfCare ? 'מרחב עצמאי (Self-Care)' : 'מרחב משויך לקליניקה'}
                  </span>
                </div>
                <div style={{ fontSize: '0.8rem', color: '#c7d2fe', marginTop: '2px' }}>
                  אתה צופה במרחב האישי של <strong>{portalInfo.clientName}</strong> (קוד פורטל: {portalCode})
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setIsPrivacyOpen(true)}
                style={{
                  background: 'rgba(255, 255, 255, 0.12)',
                  color: '#ffffff',
                  border: '1px solid rgba(255, 255, 255, 0.25)',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                מדיניות פרטיות
              </button>

              <button
                type="button"
                onClick={() => {
                  window.location.href = '/superadmin';
                }}
                style={{
                  background: '#ffffff',
                  color: '#1e1b4b',
                  border: 'none',
                  padding: '7px 16px',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '0.84rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                }}
              >
                <ArrowRight size={15} />
                <span>חזור לפאנל SuperAdmin</span>
              </button>
            </div>
          </div>
        )}

        {/* Sleek Top Navbar */}
        <header className="top-navbar portal-top-navbar">
          <div className="portal-navbar-primary">
            <button
              type="button"
              className="mobile-menu-btn"
              onClick={() => setMobileMenuOpen(true)}
              title="פתח תפריט אישי"
              aria-label="פתח תפריט אישי"
            >
              <Menu size={22} />
            </button>

            <div className="portal-security-pill">
              <ShieldCheck size={16} aria-hidden="true" />
              <span className="portal-security-text">מרחב אישי מוצפן • {portalInfo.clinicName}</span>
            </div>
          </div>

          <div className="portal-navbar-actions">
            <div className="portal-date-summary">
              <div>
                <Calendar size={14} aria-hidden="true" />
                <span>{formattedHebrewDate}</span>
              </div>
              <span className="portal-navbar-divider" aria-hidden="true" />
              <div>
                הושלמו: <strong>{completedTasks.length}/{tasks.length} תרגולים</strong>
              </div>
            </div>

            {isPinEnabled && (
              <button
                type="button"
                onClick={handleLockPortalNow}
                className="portal-nav-btn portal-nav-btn-lock"
                title="נעילת מסך מהירה עם קוד PIN"
                aria-label="נעילת מסך מהירה"
              >
                <Lock size={14} />
                <span className="portal-btn-label">נעילה</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setSettingsMsg(null);
                setIsSettingsModalOpen(true);
              }}
              className="portal-nav-btn portal-nav-btn-settings"
              title="הגדרות אבטחה ופרטיות המרחב"
              aria-label="הגדרות אבטחה ופרטיות המרחב"
            >
              <Settings size={14} />
              <span className="portal-btn-label">הגדרות</span>
            </button>

            <button
              type="button"
              onClick={handlePortalLogout}
              className="portal-nav-btn portal-nav-btn-logout"
              title="התנתקות מהמרחב"
              aria-label="התנתקות מהמרחב"
            >
              <LogOut size={14} />
              <span className="portal-btn-label">התנתקות</span>
            </button>
          </div>
        </header>

        {/* Content Body */}
        <main className="content-body portal-content-body">

          {/* ========================================================================= */}
          {/* BRIGHT & ELEGANT PERSONAL SANCTUARY HERO BANNER                           */}
          {/* ========================================================================= */}
          {!isDirectContentView && <div className="portal-sanctuary-hero">
            <div className="portal-hero-body">
              {/* Profile & Welcoming Details */}
              <div className="portal-hero-profile">
                <div className="portal-avatar-box">
                  <Smile size={28} color="#ffffff" />
                </div>

                <div className="portal-hero-text">
                  <h1>
                    <span>{greeting.emoji}</span>
                    <span>{greeting.text}, {portalInfo.firstName} יקר/ה</span>
                    <Sparkles size={20} color="rgba(255, 255, 255, 0.85)" />
                  </h1>
                  <p>
                    זהו המרחב הטיפולי האישי והמוגן שלך. מקום בטוח לעצור לרגע, לנשום עמוק, לעקוב אחר ההתקדמות ולתרגל בקצב המדויק עבורך.
                  </p>

                  <div className="portal-hero-chips">
                    <span className="portal-chip portal-chip-secure">
                      <ShieldCheck size={14} /> אזור מוגן ופרטי
                    </span>
                    {portalInfo.therapist ? (
                      <span className="portal-chip">
                        <HeartHandshake size={14} color="#ffffff" /> בליווי: {portalInfo.therapist.name}
                      </span>
                    ) : (
                      <span className="portal-chip">
                        <Sparkles size={14} color="#ffffff" /> מרחב עצמאי לרווחה אישית
                      </span>
                    )}
                    {!portalInfo.isSelfCare && (
                      <span className="portal-chip">
                        <Compass size={14} color="#ffffff" /> {portalInfo.clinicName}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>}


          {/* ========================================================================= */}
          {/* TAB 1: משימות ותרגולים להמשך עבודה בבית                                   */}
          {/* ========================================================================= */}
          {activeTab === 'tasks' && (
            <div>
              <div className={`page-header portal-content-header ${isDirectContentView ? 'is-direct' : ''}`}>
                <div className="page-title-group">
                  <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                    {portalInfo.isSelfCare ? 'משימות ותרגולים אישיים' : 'משימות ותרגולים להמשך עבודה בבית'}
                  </h2>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
                    {portalInfo.isSelfCare 
                      ? 'הגדר/י לעצמך יעדים, תרגולים והרגלים בריאים. סמן/י ביצוע כשהשלמת.' 
                      : `המשימות נקבעו על ידי ${portalInfo.therapist?.name || 'המטפל/ת שלך'}. סמן/י ביצוע וצרף/י רפלקציה לקראת המפגש הבא.`}
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <button 
                    type="button"
                    onClick={() => setIsSelfTaskModalOpen(true)}
                    className="btn btn-primary"
                    style={{ fontSize: '0.85rem', padding: '8px 16px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Plus size={16} />
                    <span>הוסף משימה / תרגול</span>
                  </button>
                  <button 
                    onClick={() => setTaskFilter('all')}
                    className={`btn ${taskFilter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ fontSize: '0.85rem', padding: '8px 16px' }}
                  >
                    הכל ({tasks.length})
                  </button>
                  <button 
                    onClick={() => setTaskFilter('pending')}
                    className={`btn ${taskFilter === 'pending' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ fontSize: '0.85rem', padding: '8px 16px' }}
                  >
                    לביצוע ({pendingTasks.length})
                  </button>
                  <button 
                    onClick={() => setTaskFilter('completed')}
                    className={`btn ${taskFilter === 'completed' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ fontSize: '0.85rem', padding: '8px 16px' }}
                  >
                    הושלמו ({completedTasks.length})
                  </button>
                </div>
              </div>

              {/* Tasks List */}
              {filteredTasks.length === 0 ? (
                <div className="card-table" style={{ textAlign: 'center', padding: '56px 20px', color: '#64748b' }}>
                  <div style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    background: '#f0fdfa',
                    color: 'var(--primary, #0d9488)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px'
                  }}>
                    <Sparkles size={32} />
                  </div>
                  <h4 style={{ color: '#0f172a', fontSize: '1.15rem', fontWeight: 700 }}>
                    {taskFilter === 'completed' ? 'טרם הושלמו משימות בסינון זה' : 'אין כרגע משימות להצגה בסינון זה'}
                  </h4>
                  <p style={{ fontSize: '0.9rem', color: '#64748b', marginTop: '6px' }}>
                    {taskFilter === 'pending' ? 'איזה יופי! כל התרגולים לשבוע זה כבר הושלמו 🌟' : 'כאשר המטפל/ת יוסיפו תרגולים, הם יופיעו כאן מיד.'}
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                  {filteredTasks.map(task => (
                    <div 
                      key={task.id} 
                      className={`client-task-card ${task.completed ? 'is-completed' : ''}`}
                    >
                      <div className="client-task-header">
                        {/* Checkbox for completing (client can check/uncheck) */}
                        <button 
                          type="button"
                          className={`task-checkbox-custom ${task.completed ? 'checked' : ''}`}
                          onClick={() => handleToggleCompleted(task)}
                          disabled={submittingTaskId === task.id}
                          title={task.completed ? 'סמן כטרם הושלם' : 'סמן כהושלם בהצלחה!'}
                          style={{
                            background: task.completed ? 'var(--primary, #0d9488)' : '#ffffff',
                            borderColor: task.completed ? 'var(--primary, #0d9488)' : '#cbd5e1'
                          }}
                        >
                          {task.completed && <CheckCircle2 size={20} color="#ffffff" />}
                        </button>

                        <div className="client-task-content">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                            <span className="badge badge-info" style={{ fontSize: '0.78rem' }}>
                              {task.category || 'תרגול ביתי'}
                            </span>
                            {task.dueDate && (
                              <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Calendar size={13} /> יעד לביצוע: {task.dueDate}
                              </span>
                            )}
                            {task.completed && (
                              <span className="badge badge-success" style={{ fontSize: '0.78rem', background: '#dcfce7', color: '#15803d' }}>
                                ✨ הושלם על ידך!
                              </span>
                            )}
                            {task.isSelfCreated || portalInfo.isSelfCare ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginRight: 'auto' }}>
                                <span style={{ fontSize: '0.75rem', color: '#0d9488', fontWeight: 700, background: '#f0fdfa', padding: '2px 8px', borderRadius: '6px' }}>
                                  🌱 תרגול אישי
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setPendingDeleteTaskId(task.id)}
                                  className="btn-icon"
                                  title="מחק משימה זו"
                                  style={{ padding: '4px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#ef4444' }}
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            ) : (
                              <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginRight: 'auto' }}>
                                הוגדר ע"י המטפל/ת
                              </span>
                            )}
                          </div>

                          <h3 className="client-task-title" style={{ fontSize: '1.2rem', marginBottom: '8px' }}>
                            {task.title}
                          </h3>

                          {task.description && (
                            <p className="client-task-desc" style={{ fontSize: '0.96rem', lineHeight: 1.6, color: '#475569' }}>
                              {task.description}
                            </p>
                          )}

                          {/* Client Reflection Feedback Box */}
                          <div className="client-task-notes-box" style={{ marginTop: '18px', background: '#f8fafc', borderRadius: '12px' }}>
                            <label style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              fontSize: '0.86rem',
                              fontWeight: 700,
                              color: 'var(--primary-hover, #0f766e)',
                              marginBottom: '8px'
                            }}>
                              <FileText size={15} />
                              <span>{portalInfo.isSelfCare ? 'הערות ותובנות אישיות (איך הרגשת? מה לקחת מהתרגול?):' : 'משוב ותובנות למטפל/ת שלך (איך הרגשת? מה עלה במהלך התרגול?):'}</span>
                            </label>

                            <div style={{ display: 'flex', gap: '10px' }}>
                              <input 
                                type="text"
                                className="form-control"
                                placeholder="כתוב/י כאן מחשבות, שאלות או חוויות שיעלו למפגש הבא..."
                                value={reflectionTexts[task.id] !== undefined ? reflectionTexts[task.id] : ''}
                                onChange={(e) => setReflectionTexts({
                                  ...reflectionTexts,
                                  [task.id]: e.target.value
                                })}
                                style={{ background: '#ffffff' }}
                              />
                              <button 
                                type="button"
                                onClick={() => handleSaveReflection(task.id)}
                                disabled={submittingTaskId === task.id}
                                className="btn btn-secondary"
                                style={{ padding: '8px 18px', fontSize: '0.85rem', whiteSpace: 'nowrap', borderColor: 'var(--primary, #0d9488)', color: 'var(--primary-hover, #0f766e)' }}
                              >
                                <Send size={14} />
                                <span>עדכן משוב</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Content selected by the therapist — read only for the patient */}
          {activeTab === 'content' && (
            <section aria-labelledby="portal-content-title">
              <div className="page-header" style={{ marginBottom: '20px' }}>
                <div className="page-title-group">
                  <span className="eyebrow"><Library size={15} /> {portalInfo.isSelfCare ? 'הספרייה האישית שלך' : 'נבחר במיוחד עבורך'}</span>
                  <h2 id="portal-content-title" style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                    {portalInfo.isSelfCare ? 'סרטונים ומאמרים למרחב שלי' : 'תוכן בשבילי'}
                  </h2>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
                    {portalInfo.isSelfCare 
                      ? 'סרטונים מיוטיוב, פייסבוק רילס, טיקטוק, ומאמרים ששמרת לעצמך לצפייה בקצב שלך.' 
                      : 'סרטונים, מאמרים וכלים שהמטפל/ת שלך בחר/ה כחלק מהליווי הטיפולי.'}
                  </p>
                </div>

                {portalInfo.isSelfCare && <div>
                  <button
                    type="button"
                    onClick={() => setIsSelfContentModalOpen(true)}
                    className="btn btn-primary"
                    style={{ fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Plus size={16} />
                    <span>הוסף סרטון, פוסט או מאמר</span>
                  </button>
                </div>}
              </div>

              {content.length === 0 ? (
                <div className="content-empty">
                  <div className="content-empty-icon"><Library size={30} /></div>
                  <h2>{portalInfo.isSelfCare ? 'הספרייה האישית שלך ריקה כרגע' : 'עדיין לא נוסף תוכן למרחב שלך'}</h2>
                  <p>
                    {portalInfo.isSelfCare 
                      ? 'תוכל/י להדביק קישורים מיוטיוב, פייסבוק רילס, טיקטוק או מאמרים שעושים לך טוב!' 
                      : 'כאשר המטפל/ת ישתפו איתך תוכן מתאים, הוא יופיע כאן באופן מסודר.'}
                  </p>
                  {portalInfo.isSelfCare && (
                    <button
                      type="button"
                      onClick={() => setIsSelfContentModalOpen(true)}
                      className="btn btn-primary"
                      style={{ marginTop: '14px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    >
                      <Plus size={16} />
                      <span>הוסף פריט תוכן ראשון</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="portal-content-grid">
                  {displayedContent.map(item => {
                    const config = PORTAL_CONTENT_CONFIG[item.type] || PORTAL_CONTENT_CONFIG.link;
                    const ContentIcon = config.Icon;
                    const isFeatured = item.id === featuredContentId;
                    const isExpanded = expandedContentIds.has(item.id);
                    const canExpand = Boolean(item.description) && (item.type === 'article' || !item.url);
                    return (
                      <article
                        id={`portal-content-${item.id}`}
                        className={`portal-content-card ${!item.url && !item.imageData ? 'is-text-only' : ''} ${isFeatured ? 'is-featured' : ''} ${isExpanded ? 'is-expanded' : ''}`}
                        key={item.assignmentId || item.id}
                        tabIndex={isFeatured ? -1 : undefined}
                      >
                        <div className="portal-content-card-media">
                          {item.imageData
                            ? <img src={item.imageData} alt="" loading="lazy" />
                            : <ContentIcon size={40} aria-hidden="true" />}
                        </div>
                        <div className="portal-content-card-body">
                          {isFeatured && (
                            <span className="featured-content-label">
                              <CheckCircle2 size={14} aria-hidden="true" />
                              התוכן שנשלח אליך עכשיו
                            </span>
                          )}
                          <div className="portal-content-card-meta">
                            <ContentIcon size={14} aria-hidden="true" />
                            <span>{config.label}</span>
                            <span aria-hidden="true">•</span>
                            <span>{item.category || 'כללי'}</span>
                          </div>
                          <h3>{item.title}</h3>
                          {item.description && (
                            <p 
                              className={isExpanded ? 'is-expanded' : ''}
                              style={isExpanded ? { whiteSpace: 'pre-wrap', lineHeight: 1.7, marginTop: '8px', color: '#1e293b' } : {}}
                            >
                              {item.description}
                            </p>
                          )}
                        </div>
                        <div className="portal-content-card-actions">
                          {item.url && item.type !== 'article' && (
                            <a className="btn btn-primary" href={item.url} target="_blank" rel="noreferrer">
                              <ExternalLink size={16} aria-hidden="true" />
                              <span>{config.actionLabel}</span>
                            </a>
                          )}
                          {item.url && item.type === 'article' && (
                            <a className="btn btn-secondary" href={item.url} target="_blank" rel="noreferrer" style={{ fontSize: '0.8rem' }}>
                              <ExternalLink size={14} aria-hidden="true" />
                              <span>קישור מקור</span>
                            </a>
                          )}
                          {!item.url && item.type === 'image' && item.imageData && (
                            <a className="btn btn-primary" href={item.imageData} target="_blank" rel="noreferrer">
                              <ExternalLink size={16} aria-hidden="true" />
                              <span>צפה בתמונה</span>
                            </a>
                          )}
                          {canExpand && (
                            <button
                              type="button"
                              className="btn btn-secondary portal-content-expand"
                              onClick={() => toggleContentExpansion(item.id)}
                              aria-expanded={isExpanded}
                            >
                              <BookOpen size={16} aria-hidden="true" />
                              <span>{isExpanded ? 'סגור תוכן' : item.type === 'article' ? 'קרא את המאמר המלא' : 'קרא עוד'}</span>
                            </button>
                          )}
                          {(portalInfo.isSelfCare || !portalInfo.therapist || item.category === 'אישי') && (
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                              <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => handleOpenEditSelfContent(item)}
                                style={{ color: 'var(--primary, #0d9488)', borderColor: 'var(--primary-light, #ccfbf1)', padding: '6px 12px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                title="ערוך פריט תוכן זה"
                              >
                                <Edit size={14} />
                                <span>ערוך</span>
                              </button>
                              <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => setPendingDeleteContentId(item.id)}
                                style={{ color: '#ef4444', borderColor: '#fecaca', padding: '6px 12px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                title="הסר פריט זה מהמרחב האישי"
                              >
                                <Trash2 size={14} />
                                <span>הסר</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: יומן תובנות ומחשבות אישי                                           */}
          {/* ========================================================================= */}
          {activeTab === 'insights' && (
            <div>
              <div className="page-header">
                <div className="page-title-group">
                  <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                    יומן תובנות ומחשבות אישי
                  </h2>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
                    מקום בטוח ואינטימי לתעד מה עבר עליך במהלך השבוע, רגשות, אירועים ותובנות. הכל נשמר מסודר לפי תאריך ושעה.
                  </p>
                </div>

                <button 
                  className="btn btn-primary"
                  onClick={() => setIsNewInsightOpen(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <Plus size={18} />
                  <span>תיעוד תובנה / מחשבה חדשה</span>
                </button>
              </div>

              {/* Insights Table Card */}
              <div className="card-table">
                <div className="card-toolbar">
                  <div className="search-input-wrapper">
                    <Search size={18} color="#94a3b8" />
                    <input 
                      type="text" 
                      placeholder="חיפוש ביומן לפי מילות מפתח או מצב רוח..."
                      value={insightSearch}
                      onChange={e => setInsightSearch(e.target.value)}
                    />
                  </div>

                  <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>
                    סה"כ {filteredInsights.length} תובנות מתועדות
                  </span>
                </div>

                {/* Desktop Table View */}
                <div className="portal-insights-table-container">
                  <div className="table-responsive">
                    <table className="custom-table">
                      <thead>
                        <tr>
                          <th style={{ width: '160px' }}>תאריך ושעה</th>
                          <th style={{ width: '150px' }}>מצב רוח</th>
                          <th style={{ width: '220px' }}>כותרת התובנה / האירוע</th>
                          <th>פירוט מלא של מה שעבר עלי</th>
                          <th style={{ width: '130px' }}>עוצמת רגש</th>
                          <th style={{ textAlign: 'left', width: '80px' }}>פעולות</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredInsights.length === 0 ? (
                          <tr>
                            <td colSpan={6} style={{ textAlign: 'center', padding: '48px 20px', color: '#94a3b8' }}>
                              <BookOpen size={36} color="var(--primary, #0d9488)" style={{ margin: '0 auto 10px', opacity: 0.7 }} />
                              <div style={{ fontWeight: 700, fontSize: '1rem', color: '#475569' }}>
                                עדיין לא תיעדת תובנות השבוע
                              </div>
                              <p style={{ fontSize: '0.86rem', marginTop: '4px' }}>
                                לחץ/י על "תיעוד תובנה / מחשבה חדשה" למעלה כדי להוסיף רשומה ראשונה.
                              </p>
                            </td>
                          </tr>
                        ) : (
                          filteredInsights.map(item => (
                            <tr key={item.id}>
                              <td>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                  <span style={{ fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.88rem' }}>
                                    <Calendar size={13} color="var(--primary, #0d9488)" /> {item.recordedDate || new Date(item.createdAt).toLocaleDateString('he-IL')}
                                  </span>
                                  <span style={{ fontSize: '0.78rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <Clock size={12} /> שעה: {item.recordedTime || new Date(item.createdAt).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                              </td>

                              <td>
                                <span className="badge badge-info" style={{ fontWeight: 700 }}>
                                  <Smile size={13} /> {item.mood}
                                </span>
                              </td>

                              <td>
                                <strong style={{ color: '#0f172a', fontSize: '0.95rem' }}>{item.title}</strong>
                              </td>

                              <td>
                                <p style={{ fontSize: '0.92rem', color: '#334155', lineHeight: 1.5, whiteSpace: 'pre-wrap', margin: 0 }}>
                                  {item.content}
                                </p>
                              </td>

                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <div style={{
                                    width: '100%',
                                    maxWidth: '70px',
                                    height: '8px',
                                    background: '#e2e8f0',
                                    borderRadius: '4px',
                                    overflow: 'hidden'
                                  }}>
                                    <div style={{
                                      width: `${item.intensity * 10}%`,
                                      height: '100%',
                                      background: item.intensity > 7 ? '#ef4444' : item.intensity > 4 ? 'var(--primary, #0d9488)' : '#3b82f6'
                                    }} />
                                  </div>
                                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b' }}>
                                    {item.intensity}/10
                                  </span>
                                </div>
                              </td>

                              <td style={{ textAlign: 'left' }}>
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                  <button 
                                    onClick={() => handleOpenEditInsight(item)}
                                    className="btn-icon" 
                                    title="ערוך תובנה זו"
                                    style={{ color: 'var(--primary, #0d9488)', padding: '6px' }}
                                  >
                                    <Edit size={16} />
                                  </button>
                                  <button 
                                    onClick={() => setPendingDeleteInsightId(item.id)}
                                    className="btn-icon" 
                                    title="מחק רשומה זו"
                                    style={{ color: '#ef4444', padding: '6px' }}
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Mobile Cards View */}
                <div className="portal-insights-cards-container">
                  {filteredInsights.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 16px', color: '#94a3b8', background: '#f8fafc', borderRadius: '16px' }}>
                      <BookOpen size={36} color="var(--primary, #0d9488)" style={{ margin: '0 auto 10px', opacity: 0.7 }} />
                      <div style={{ fontWeight: 700, fontSize: '1rem', color: '#475569' }}>
                        עדיין לא תיעדת תובנות השבוע
                      </div>
                      <p style={{ fontSize: '0.86rem', marginTop: '4px' }}>
                        לחץ/י על "תיעוד תובנה / מחשבה חדשה" כדי להתחיל.
                      </p>
                    </div>
                  ) : (
                    filteredInsights.map(item => (
                      <div key={item.id} className="insight-mobile-card">
                        <div className="insight-card-header">
                          <div className="insight-card-datetime">
                            <Calendar size={14} color="var(--primary, #0d9488)" />
                            <span>{item.recordedDate || new Date(item.createdAt).toLocaleDateString('he-IL')}</span>
                            <span>•</span>
                            <Clock size={13} />
                            <span>{item.recordedTime || new Date(item.createdAt).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>

                          <span className="badge badge-info" style={{ fontWeight: 700, fontSize: '0.82rem' }}>
                            <Smile size={13} /> {item.mood}
                          </span>
                        </div>

                        {item.title && item.title !== 'תובנה אישית' && item.title !== 'תובנה שבועית' ? (
                          <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#0f172a', lineHeight: 1.4 }}>
                            {item.title}
                          </div>
                        ) : null}

                        <div className="insight-card-body">
                          {item.content}
                        </div>

                        <div className="insight-card-footer">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>עוצמת רגש:</span>
                            <div style={{
                              width: '54px',
                              height: '7px',
                              background: '#e2e8f0',
                              borderRadius: '4px',
                              overflow: 'hidden'
                            }}>
                              <div style={{
                                width: `${item.intensity * 10}%`,
                                height: '100%',
                                background: item.intensity > 7 ? '#ef4444' : item.intensity > 4 ? 'var(--primary, #0d9488)' : '#3b82f6'
                              }} />
                            </div>
                            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569' }}>
                              {item.intensity}/10
                            </span>
                          </div>

                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <button 
                              onClick={() => handleOpenEditInsight(item)}
                              className="btn-icon" 
                              title="ערוך תובנה זו"
                              style={{ color: 'var(--primary, #0d9488)', padding: '6px' }}
                            >
                              <Edit size={16} />
                            </button>
                            <button 
                              onClick={() => setPendingDeleteInsightId(item.id)}
                              className="btn-icon" 
                              title="מחק רשומה זו"
                              style={{ color: '#ef4444', padding: '6px' }}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* New / Edit Insight Modal */}
              {isNewInsightOpen && (
                <div className="modal-overlay" onClick={() => { setIsNewInsightOpen(false); setEditingInsightId(null); }}>
                  <div className="modal-card" style={{ maxWidth: '680px' }} onClick={e => e.stopPropagation()}>
                    <div className="modal-header">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '12px',
                          background: 'var(--primary-light, #ccfbf1)',
                          color: 'var(--primary-hover, #0f766e)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <BookOpen size={20} />
                        </div>
                        <div>
                          <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>
                            {editingInsightId ? 'עריכת תובנה / מחשבה אישית' : 'תיעוד תובנה ומחשבה אישית'}
                          </h3>
                          <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '2px 0 0 0' }}>
                            {editingInsightId ? 'עדכן/י את הפרטים, התובנות או עוצמת הרגש' : 'רשום/י מה עבר עליך, מה הרגשת ואילו מחשבות עלו'}
                          </p>
                        </div>
                      </div>
                    </div>

                    <form onSubmit={handleCreateInsight}>
                      <div className="modal-body">
                        <div className="form-group">
                          <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>כותרת האירוע / התובנה</span>
                            <span style={{ color: '#64748b', fontWeight: 500, fontSize: '0.82rem' }}>(אופציונלי)</span>
                          </label>
                          <input 
                            type="text" 
                            className="form-control" 
                            placeholder="למשל: שיחה מאתגרת בעבודה / רגע של שלווה בפארק / מחשבה על שינוי (לא חובה)"
                            value={insightForm.title}
                            onChange={e => setInsightForm({ ...insightForm, title: e.target.value })}
                          />
                        </div>

                        <div className="form-row">
                          <div className="form-group">
                            <label>איך הרגשת? (מצב רוח עיקרי)</label>
                            <select 
                              className="form-control"
                              value={insightForm.mood}
                              onChange={e => setInsightForm({ ...insightForm, mood: e.target.value })}
                            >
                              <option value="שלווה והקלה">שלווה והקלה ✨</option>
                              <option value="שמחה ותקווה">שמחה ותקווה ☀️</option>
                              <option value="הצלחה וסיפוק">הצלחה וסיפוק 💪</option>
                              <option value="חרדה שנרגעה">חרדה שנרגעה 🌿</option>
                              <option value="עומס או מתח">עומס או מתח ⚡</option>
                              <option value="עצב או בדידות">עצב או בדידות 🌧️</option>
                              <option value="כעס ותסכול">כעס ותסכול 🔥</option>
                              <option value="גאווה בעצמי">גאווה בעצמי ⭐</option>
                            </select>
                          </div>

                          <div className="form-group">
                            <label>עוצמת הרגש (1 עד 10): {insightForm.intensity}</label>
                            <input 
                              type="range" 
                              min="1" 
                              max="10" 
                              style={{ width: '100%', marginTop: '10px' }}
                              value={insightForm.intensity}
                              onChange={e => setInsightForm({ ...insightForm, intensity: Number(e.target.value) })}
                            />
                          </div>
                        </div>

                        <div className="form-group">
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                            <label style={{ margin: 0 }}>מה עבר עליך? פרט/י מה קרה ומה התובנה שלך *</label>
                            <span style={{ fontSize: '0.8rem', color: 'var(--primary, #0d9488)', fontWeight: 600 }}>
                              מרחב כתיבה מרווח ✍️
                            </span>
                          </div>
                          <textarea 
                            className="form-control insight-textarea-expanded" 
                            placeholder="תאר/י את הסיטואציה, מה המחשבות שעלו לך בראש, כיצד הגבת, ומה למדת מזה... כתוב/י בחופשיות, המקום כאן לרשותך."
                            required
                            value={insightForm.content}
                            onChange={e => setInsightForm({ ...insightForm, content: e.target.value })}
                          />
                        </div>

                        <div style={{
                          background: '#f0fdf4',
                          border: '1px solid #bbf7d0',
                          borderRadius: '12px',
                          padding: '12px 16px',
                          fontSize: '0.84rem',
                          color: '#166534',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}>
                          <ShieldCheck size={18} color="#16a34a" />
                          <span>התיעוד יישמר באופן פרטי ומאובטח, ויהיה זמין גם למטפל/ת שלך כהכנה למפגש הבא.</span>
                        </div>
                      </div>

                      <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={() => { setIsNewInsightOpen(false); setEditingInsightId(null); }}>
                          ביטול
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={savingInsight}>
                          {savingInsight ? 'שומר ביומן...' : editingInsightId ? 'שמור שינויים בתובנה ✨' : 'שמור ותעד ביומן ✨'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: מרחב הרפיה ונשימה מונחית (4-7-8)                                   */}
          {/* ========================================================================= */}
          {activeTab === 'breathing' && (
            <div style={{ maxWidth: '680px', margin: '0 auto', textAlign: 'center' }}>
              <div className="page-header" style={{ justifyContent: 'center', textAlign: 'center' }}>
                <div className="page-title-group">
                  <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                    תרגול נשימה וויסות רגשי (4-7-8)
                  </h2>
                  <p style={{ color: '#64748b', fontSize: '0.92rem', marginTop: '4px' }}>
                    טכניקה קלינית להפחתת מתח מיידית, הרגעת מערכת העצבים והחזרת השקט הפנימי
                  </p>
                </div>
              </div>

              <div className="card-table" style={{ padding: '48px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', borderRadius: '20px' }}>
                {/* Breathing Circle */}
                <div style={{
                  width: '230px',
                  height: '230px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--primary-light, #ccfbf1) 0%, #99f6e4 100%)',
                  border: '8px solid var(--primary, #0d9488)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: breathingRunning ? '0 0 45px var(--primary-glow, rgba(13, 148, 136, 0.45))' : 'var(--shadow-md)',
                  transform: breathingRunning && breathingPhase.startsWith('שאף') ? 'scale(1.18)' : 'scale(1)',
                  transition: 'all 3.5s ease-in-out',
                  marginBottom: '32px'
                }}>
                  <Wind size={40} color="var(--primary-hover, #0f766e)" />
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--primary-hover, #0f766e)', marginTop: '8px' }}>
                    {breathingRunning ? breathingPhase : 'מוכן לתרגול'}
                  </div>
                  {breathingRunning && (
                    <div style={{ fontSize: '2.2rem', fontWeight: 900, color: 'var(--primary, #0d9488)', marginTop: '4px' }}>
                      {breathingCountdown}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '14px', marginBottom: '28px' }}>
                  <button 
                    onClick={() => {
                      setBreathingRunning(!breathingRunning);
                      if (!breathingRunning) {
                        setBreathingPhase('שאף (4 שניות)');
                        setBreathingCountdown(4);
                      }
                    }}
                    className={`btn ${breathingRunning ? 'btn-danger' : 'btn-primary'}`}
                    style={{ padding: '12px 32px', fontSize: '1.1rem', fontWeight: 700 }}
                  >
                    {breathingRunning ? 'עצור תרגול' : 'התחל תרגול נשימות 🌿'}
                  </button>
                </div>

                <div style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '16px',
                  padding: '20px 24px',
                  textAlign: 'right',
                  width: '100%',
                  fontSize: '0.92rem',
                  lineHeight: 1.7,
                  color: '#475569'
                }}>
                  <strong style={{ color: '#0f172a', fontSize: '0.98rem' }}>הוראות ביצוע שלב אחר שלב:</strong>
                  <ul style={{ paddingRight: '22px', marginTop: '8px', marginBottom: 0 }}>
                    <li><strong>שאף/י:</strong> שאיפה איטית ועמוקה דרך האף במשך 4 שניות – הרגש/י את הבטן מתמלאת.</li>
                    <li><strong>החזק/י:</strong> עצור/י את האוויר בעדינות וברוגע למשך 7 שניות.</li>
                    <li><strong>נשוף/י:</strong> שחרר/י את האוויר לאט, ברכות ובשקט דרך הפה במשך 8 שניות.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 4: פרטי הקליניקה והגעה למפגש                                          */}
          {/* ========================================================================= */}
          {activeTab === 'clinic' && (
            <div style={{ maxWidth: '800px', margin: '0 auto' }}>
              <div className="page-header" style={{ marginBottom: '20px' }}>
                <div className="page-title-group">
                  <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                    פרטי הקליניקה והגעה למפגש
                  </h2>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
                    כל המידע הדרוש לך לקראת הגעה רגועה ונוחה למפגש הבא
                  </p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
                {/* Location & Arrival Card */}
                <div className="portal-clinic-card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '12px',
                      background: 'var(--primary-light, #ccfbf1)',
                      color: 'var(--primary-hover, #0f766e)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <MapPin size={24} />
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                        {portalInfo.clinicName}
                      </h3>
                      <span style={{ fontSize: '0.82rem', color: '#64748b' }}>כתובת ומיקום הקליניקה</span>
                    </div>
                  </div>

                  <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.92rem', color: '#1e293b' }}>
                      <Navigation size={16} color="var(--primary, #0d9488)" />
                      <span>{portalInfo.clinicAddress || 'לא צוינה כתובת'} {portalInfo.clinicCity ? `• ${portalInfo.clinicCity}` : ''}</span>
                    </div>

                    {portalInfo.clinicFloor && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.88rem', color: '#475569' }}>
                        <span style={{ fontWeight: 700 }}>קומה / כניסה:</span>
                        <span>{portalInfo.clinicFloor}</span>
                      </div>
                    )}
                  </div>

                  {portalInfo.clinicArrivalInstructions && (
                    <div style={{
                      background: '#fffbeb',
                      border: '1px solid #fef3c7',
                      borderRadius: '12px',
                      padding: '12px 14px',
                      fontSize: '0.86rem',
                      lineHeight: 1.5,
                      color: '#92400e'
                    }}>
                      <strong>🚗 הוראות הגעה, חניה וקודן:</strong>
                      <p style={{ margin: '4px 0 0 0' }}>{portalInfo.clinicArrivalInstructions}</p>
                    </div>
                  )}

                  {portalInfo.clinicAddress && (
                    <a 
                      href={`https://waze.com/ul?q=${encodeURIComponent(portalInfo.clinicAddress + ' ' + (portalInfo.clinicCity || ''))}`}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-primary"
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', textDecoration: 'none' }}
                    >
                      <Navigation size={16} />
                      <span>נווט באמצעות Waze</span>
                    </a>
                  )}
                </div>

                {/* Therapist Contact Card */}
                {portalInfo.therapist && (
                  <div className="portal-clinic-card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '12px',
                        background: '#e0e7ff',
                        color: '#4338ca',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <HeartHandshake size={24} />
                      </div>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                          {portalInfo.therapist.name}
                        </h3>
                        <span style={{ fontSize: '0.82rem', color: '#64748b' }}>{portalInfo.therapist.title}</span>
                      </div>
                    </div>

                    <p style={{ fontSize: '0.88rem', color: '#475569', lineHeight: 1.5, margin: 0 }}>
                      זמינ/ה לכל שאלה, תיאום או בירור לקראת המפגש הבא שלך.
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: 'auto' }}>
                      {therapistWaUrl && (
                        <a 
                          href={therapistWaUrl} 
                          target="_blank" 
                          rel="noreferrer"
                          className="btn"
                          style={{
                            background: '#25D366',
                            color: '#ffffff',
                            padding: '10px 16px',
                            fontWeight: 700,
                            borderRadius: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            textDecoration: 'none'
                          }}
                        >
                          <WhatsAppIcon size={20} color="#ffffff" />
                          <span>שלח/י הודעת WhatsApp ישירה</span>
                        </a>
                      )}

                      {portalInfo.therapist.phone && (
                        <a 
                          href={`tel:${portalInfo.therapist.phone}`}
                          className="btn btn-secondary"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            textDecoration: 'none'
                          }}
                        >
                          <Phone size={16} />
                          <span>התקשר/י למטפל/ת ({portalInfo.therapist.phone})</span>
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 5: התורים והפגישות שלי                                                 */}
          {/* ========================================================================= */}
          {activeTab === 'appointments' && (
            <div style={{ maxWidth: '850px', margin: '0 auto' }}>
              <div className="page-header" style={{ marginBottom: '24px' }}>
                <div className="page-title-group">
                  <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                    {portalInfo.isSelfCare ? 'יומן פגישות ומפגשים' : 'התורים והפגישות שלי'}
                  </h2>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
                    {portalInfo.isSelfCare 
                      ? 'תיעוד מועדי פגישות טיפוליות, בדיקות ומפגשים אישיים – בקרה מלאה בידיים שלך.' 
                      : 'צפייה במועדי המפגשים שנקבעו, קבלת פרטי הגעה ותזכורות, ובקשת תור חדש'}
                  </p>
                </div>

                <div>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => setIsRequestModalOpen(true)}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    <CalendarPlus size={18} />
                    <span>{portalInfo.isSelfCare ? 'תעד פגישה ביומן' : 'בקש/י תור חדש'}</span>
                  </button>
                </div>
              </div>

              {/* Highlight: Next Upcoming Confirmed Appointment */}
              {(() => {
                const todayStr = new Date().toISOString().split('T')[0];
                const nextApt = portalAppointments.find(a => a.status === 'confirmed' && a.date >= todayStr);

                if (!nextApt) return null;

                const aptWaText = `שלום ${portalInfo.therapist?.name || ''}, פונה בנוגע לפגישתנו שנקבעה ל-${nextApt.date} בשעה ${nextApt.time}.`;
                const aptWaUrl = therapistWaPhone ? `https://wa.me/${therapistWaPhone}?text=${encodeURIComponent(aptWaText)}` : null;

                return (
                  <div style={{
                    background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                    border: '1px solid #bbf7d0',
                    borderRadius: 'var(--radius-xl)',
                    padding: '24px',
                    marginBottom: '28px',
                    boxShadow: '0 8px 24px rgba(22, 163, 74, 0.08)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                        <div style={{
                          width: '52px',
                          height: '52px',
                          borderRadius: '14px',
                          background: '#16a34a',
                          color: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 4px 12px rgba(22, 163, 74, 0.25)',
                          flexShrink: 0
                        }}>
                          <CalendarCheck size={28} />
                        </div>
                        <div>
                          <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#15803d', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            הפגישה הקרובה שלך ✨
                          </div>
                          <h3 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#14532d', margin: '4px 0 8px 0' }}>
                            {getHebrewDateString(nextApt.date)} בשעה {nextApt.time}
                          </h3>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', fontSize: '0.88rem', color: '#166534' }}>
                            <span><strong>משך:</strong> {nextApt.durationMinutes || 50} דקות</span>
                            <span>•</span>
                            <span><strong>סוג:</strong> {nextApt.typeName || (nextApt.type === 'zoom' ? 'וידאו (Zoom)' : 'בקליניקה')}</span>
                            {portalInfo.therapist && (
                              <>
                                <span>•</span>
                                <span><strong>בליווי:</strong> {portalInfo.therapist.name}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <span className="badge badge-success" style={{ fontSize: '0.84rem', padding: '6px 14px' }}>
                        <CheckCircle2 size={14} /> מועד מאושר וסגור
                      </span>
                    </div>

                    <div style={{
                      marginTop: '18px',
                      padding: '14px 18px',
                      background: 'rgba(255, 255, 255, 0.85)',
                      borderRadius: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '14px',
                      flexWrap: 'wrap'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', color: '#1f2937' }}>
                        <MapPin size={16} color="#16a34a" />
                        <span><strong>מיקום / פרטים:</strong> {nextApt.location || portalInfo.clinicAddress || 'קליניקה'}</span>
                      </div>

                      {aptWaUrl && (
                        <a
                          href={aptWaUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-secondary"
                          style={{ fontSize: '0.82rem', padding: '6px 14px', display: 'inline-flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}
                        >
                          <WhatsAppIcon size={14} />
                          <span>צ'אט בנוגע למועד זה</span>
                        </a>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Pending Requests Notice */}
              {portalAppointments.some(a => a.status === 'pending') && (
                <div style={{
                  background: '#fffbeb',
                  border: '1px solid #fef3c7',
                  borderRadius: '12px',
                  padding: '16px 20px',
                  marginBottom: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <Clock size={20} color="#d97706" />
                  <div>
                    <strong style={{ color: '#92400e', fontSize: '0.92rem' }}>
                      ישנה בקשת תור שהגשת וממתינה לאישור המטפל/ת ⏳
                    </strong>
                    <div style={{ fontSize: '0.84rem', color: '#b45309', marginTop: '2px' }}>
                      הודעת אישור ופרטי התור יישלחו אליך בוואטסאפ ברגע שהמטפל/ת יאשר את המועד.
                    </div>
                  </div>
                </div>
              )}

              {/* Full Appointments List Card */}
              <div className="card">
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#1e293b' }}>
                    היסטוריית פגישות ומועדים עתידיים
                  </h3>
                  <span style={{ fontSize: '0.82rem', color: '#64748b' }}>
                    סה"כ {portalAppointments.length} רשומות
                  </span>
                </div>

                <div style={{ padding: '16px 20px' }}>
                  {portalAppointments.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
                      <CalendarCheck size={40} color="#cbd5e1" style={{ margin: '0 auto 12px auto' }} />
                      <div style={{ fontSize: '1rem', fontWeight: 600, color: '#334155' }}>
                        טרם נרשמו תורים במערכת
                      </div>
                      <p style={{ fontSize: '0.86rem', marginTop: '4px' }}>
                        באפשרותך ללחוץ על "בקש/י תור חדש" כדי לבחור תאריך ושעה רצויים.
                      </p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {portalAppointments.map(apt => (
                        <div
                          key={apt.id}
                          style={{
                            border: '1px solid #e2e8f0',
                            borderRadius: '12px',
                            padding: '16px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '14px',
                            flexWrap: 'wrap',
                            background: apt.status === 'confirmed' ? '#ffffff' : '#fafafa'
                          }}
                        >
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <strong style={{ fontSize: '1.05rem', color: '#0f172a' }}>
                                {getHebrewDateString(apt.date)}
                              </strong>
                              <span style={{ fontSize: '0.9rem', color: 'var(--primary, #0d9488)', fontWeight: 700 }}>
                                בשעה {apt.time}
                              </span>
                              <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                                ({apt.durationMinutes || 50} דק')
                              </span>
                            </div>

                            <div style={{ fontSize: '0.86rem', color: '#475569', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              {apt.type === 'zoom' ? (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#2563eb' }}>
                                  <Video size={14} /> פגישת וידאו (Zoom)
                                </span>
                              ) : (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#0d9488' }}>
                                  <MapPin size={14} /> {apt.location || 'בקליניקה'}
                                </span>
                              )}
                              {apt.notes && <span>• "{apt.notes}"</span>}
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {apt.status === 'confirmed' ? (
                              <span className="badge badge-success" style={{ fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <CheckCircle2 size={13} /> מאושר
                              </span>
                            ) : apt.status === 'pending' ? (
                              <span className="badge badge-warning" style={{ fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <Clock size={13} /> ממתין לאישור המטפל/ת
                              </span>
                            ) : apt.status === 'completed' ? (
                              <span className="badge" style={{ background: '#f1f5f9', color: '#475569', fontSize: '0.8rem' }}>
                                הושלם
                              </span>
                            ) : (
                              <span className="badge badge-danger" style={{ fontSize: '0.8rem' }}>
                                בוטל
                              </span>
                            )}

                            {(portalInfo.isSelfCare || apt.isSelfManaged) && (
                              <button
                                type="button"
                                onClick={() => setPendingDeleteAppointmentId(apt.id)}
                                className="btn-icon"
                                title="מחק פגישה זו"
                                style={{ padding: '4px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#ef4444' }}
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

        </main>

        {/* Portal Sanctuary Footer */}
        <footer style={{
          marginTop: '32px',
          padding: '24px 20px',
          borderTop: '1px solid #e2e8f0',
          background: '#ffffff',
          borderRadius: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              background: '#ecfdf5',
              color: '#0d9488',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <HeartHandshake size={18} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>
                WiseCare Sanctuary 🌿
              </div>
              <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                {portalInfo.isSelfCare 
                  ? 'מרחב אישי ועצמאי – מוגן, מוצפן ופרטי לחלוטין (ללא גישת מטפלים)' 
                  : `בליווי ${portalInfo.therapist?.name || 'הקליניקה'} • כל הנתונים תחת חיסיון רפואי ואבטחה מתקדמת`}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.78rem',
              color: '#15803d',
              background: '#f0fdf4',
              padding: '4px 10px',
              borderRadius: '20px',
              border: '1px solid #bbf7d0'
            }}>
              <ShieldCheck size={14} />
              <span>הצפנת נתונים 256-bit</span>
            </div>

            <button
              type="button"
              onClick={() => setIsPrivacyOpen(true)}
              style={{
                background: 'none',
                border: 'none',
                color: '#0f766e',
                fontWeight: 700,
                fontSize: '0.84rem',
                cursor: 'pointer',
                textDecoration: 'underline',
                padding: 0
              }}
            >
              מדיניות פרטיות ואבטחת מידע
            </button>
          </div>
        </footer>
      </div>

      {/* ========================================================================= */}
      {/* MODAL: בקשת תור חדש מהפורטל                                               */}
      {/* ========================================================================= */}
      {/* ========================================================================= */}
      {/* MODAL: בקשת תור / תיעוד פגישה מהפורטל                                      */}
      {/* ========================================================================= */}
      {isRequestModalOpen && (
        <div className="modal-overlay" onClick={() => setIsRequestModalOpen(false)}>
          <div className="modal-card" style={{ maxWidth: '480px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{portalInfo.isSelfCare ? 'תיעוד פגישה ביומן האישי' : 'בקשת תור לפגישה טיפולית'}</h2>
              <button type="button" className="close-btn" onClick={() => setIsRequestModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleRequestAppointmentSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <p style={{ margin: 0, fontSize: '0.88rem', color: '#64748b', lineHeight: 1.5 }}>
                  {portalInfo.isSelfCare 
                    ? 'תעד/י את מועד הפגישה הבאה שלך, שם המטפל/ת או הרופא/ה ומיקום – לניהול סדר יום רגוע ובשליטה.' 
                    : 'בחרו תאריך ושעה הנוחים לכם. הבקשה תועבר ישירות למטפל/ת, ואישור רשמי יישלח אליכם בוואטסאפ.'}
                </p>

                {portalInfo.isSelfCare && (
                  <div className="form-group">
                    <label>שם המטפל/ת, הרופא/ה או נושא הפגישה</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="למשל: ד״ר ישראלי - פסיכולוג, או בדיקה תקופתית"
                      value={requestForm.therapistName || ''}
                      onChange={e => setRequestForm({ ...requestForm, therapistName: e.target.value })}
                    />
                  </div>
                )}

                <div className="form-group">
                  <label>תאריך הפגישה *</label>
                  <input
                    type="date"
                    className="form-control"
                    min={new Date().toISOString().split('T')[0]}
                    value={requestForm.preferredDate}
                    onChange={e => setRequestForm({ ...requestForm, preferredDate: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>שעה *</label>
                  <select
                    className="form-control"
                    value={requestForm.preferredTime}
                    onChange={e => setRequestForm({ ...requestForm, preferredTime: e.target.value })}
                  >
                    <option value="08:00">08:00 בבוקר</option>
                    <option value="09:00">09:00 בבוקר</option>
                    <option value="10:00">10:00 בבוקר</option>
                    <option value="11:00">11:00 בבוקר</option>
                    <option value="12:00">12:00 בצהריים</option>
                    <option value="13:00">13:00 בצהריים</option>
                    <option value="14:00">14:00 בצהריים</option>
                    <option value="15:00">15:00 אחה"צ</option>
                    <option value="16:00">16:00 אחה"צ</option>
                    <option value="17:00">17:00 אחה"צ</option>
                    <option value="18:00">18:00 בערב</option>
                    <option value="19:00">19:00 בערב</option>
                    <option value="20:00">20:00 בערב</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>סוג פגישה</label>
                  <select
                    className="form-control"
                    value={requestForm.type}
                    onChange={e => setRequestForm({ ...requestForm, type: e.target.value })}
                  >
                    <option value="in_person">פגישה פרונטלית בקליניקה</option>
                    <option value="zoom">פגישת וידאו מרחוק (Zoom)</option>
                    <option value="phone">שיחה טלפונית</option>
                  </select>
                </div>

                {portalInfo.isSelfCare && (
                  <div className="form-group">
                    <label>מיקום או כתובת הפגישה (אופציונלי)</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="למשל: רחוב הרצל 10, תל אביב או קישור לזום"
                      value={requestForm.location || ''}
                      onChange={e => setRequestForm({ ...requestForm, location: e.target.value })}
                    />
                  </div>
                )}

                <div className="form-group">
                  <label>נקודות שחשוב לי להעלות / הערות (אופציונלי)</label>
                  <textarea
                    className="form-control"
                    rows={2}
                    placeholder="לדוגמה: שאלות למפגש, תובנות מהשבוע, נושאים להתמקדות..."
                    value={requestForm.notes}
                    onChange={e => setRequestForm({ ...requestForm, notes: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsRequestModalOpen(false)}>
                  ביטול
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSubmittingRequest}>
                  {isSubmittingRequest 
                    ? 'שומר פגישה...' 
                    : portalInfo.isSelfCare 
                      ? 'שמור פגישה ביומן האישי ✨' 
                      : 'שלח בקשת תור למטפל/ת'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: הוספת משימה / תרגול אישי למרחב                                      */}
      {/* ========================================================================= */}
      {isSelfTaskModalOpen && (
        <div className="modal-overlay" onClick={() => setIsSelfTaskModalOpen(false)}>
          <div className="modal-card" style={{ maxWidth: '480px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>הוספת משימה או תרגול אישי</h2>
              <button type="button" className="close-btn" onClick={() => setIsSelfTaskModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateSelfTask}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <p style={{ margin: 0, fontSize: '0.88rem', color: '#64748b', lineHeight: 1.5 }}>
                  הגדר/י לעצמך יעד יומי, תרגול נשימות, הליכה מודעת או כל הרגל שחשוב לך לטפח.
                </p>

                <div className="form-group">
                  <label>כותרת המשימה / התרגול *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="למשל: תרגיל נשימה 4-7-8 לפני השינה"
                    value={selfTaskForm.title}
                    onChange={e => setSelfTaskForm({ ...selfTaskForm, title: e.target.value })}
                    required
                    autoFocus
                  />
                </div>

                <div className="form-group">
                  <label>קטגוריה</label>
                  <select
                    className="form-control"
                    value={selfTaskForm.category}
                    onChange={e => setSelfTaskForm({ ...selfTaskForm, category: e.target.value })}
                  >
                    <option value="אישי">אישי</option>
                    <option value="רוגע וויסות">רוגע וויסות</option>
                    <option value="גוף ונשימה">גוף ונשימה</option>
                    <option value="הרגל יומי">הרגל יומי</option>
                    <option value="כתיבה והתבוננות">כתיבה והתבוננות</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>תאריך יעד לביצוע (אופציונלי)</label>
                  <input
                    type="date"
                    className="form-control"
                    value={selfTaskForm.dueDate}
                    onChange={e => setSelfTaskForm({ ...selfTaskForm, dueDate: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>פירוט או הנחיות לעצמי (אופציונלי)</label>
                  <textarea
                    className="form-control"
                    rows={2}
                    placeholder="הערות שיעזרו לך לבצע את התרגול בנחת..."
                    value={selfTaskForm.description}
                    onChange={e => setSelfTaskForm({ ...selfTaskForm, description: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsSelfTaskModalOpen(false)}>
                  ביטול
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSubmittingSelfTask}>
                  {isSubmittingSelfTask ? 'מוסיף משימה...' : 'הוסף למרחב האישי 🌱'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: הוספה או עריכה של סרטון/מאמר למרחב האישי                             */}
      {/* ========================================================================= */}
      {isSelfContentModalOpen && (
        <div className="modal-overlay" onClick={() => { setIsSelfContentModalOpen(false); setEditingContentId(null); }}>
          <div className="modal-card" style={{ maxWidth: '520px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingContentId ? 'עריכת פריט תוכן במרחב שלי' : 'הוספת סרטון, פוסט או מאמר למרחב שלי'}</h2>
              <button type="button" className="close-btn" onClick={() => { setIsSelfContentModalOpen(false); setEditingContentId(null); }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateSelfContent}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <p style={{ margin: 0, fontSize: '0.88rem', color: '#64748b', lineHeight: 1.5 }}>
                  הדבק/י קישור מ-<strong>YouTube, Facebook (סרטונים ופוסטים), TikTok, Instagram</strong> או מאמר אינטרנטי. המערכת תזהה את הפרטים באופן אוטומטי.
                </p>

                <div className="form-group">
                  <label>כתובת קישור (URL) *</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="url"
                      className="form-control"
                      placeholder="https://... קישור ליוטיוב, פייסבוק (פוסט/סרטון), טיקטוק או אינסטגרם"
                      value={selfContentForm.url}
                      onChange={e => {
                        const val = e.target.value;
                        setSelfContentForm(prev => ({ ...prev, url: val }));
                        if (val && val.startsWith('http') && val.length > 15) {
                          handlePreviewSelfContentUrl(val);
                        }
                      }}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => handlePreviewSelfContentUrl()}
                      disabled={isUrlPreviewLoading || !selfContentForm.url}
                      className="btn btn-secondary"
                      style={{ padding: '8px 14px', whiteSpace: 'nowrap', fontSize: '0.84rem' }}
                    >
                      {isUrlPreviewLoading ? <Loader2 size={16} className="spin" /> : <Sparkles size={16} />}
                      <span>{isUrlPreviewLoading ? 'מזהה...' : 'זהה קישור'}</span>
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label>כותרת הפריט (אופציונלי - מתמלא אוטומטית)</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="כותרת הסרטון או המאמר..."
                    value={selfContentForm.title}
                    onChange={e => setSelfContentForm({ ...selfContentForm, title: e.target.value })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label>סוג תוכן</label>
                    <select
                      className="form-control"
                      value={selfContentForm.type}
                      onChange={e => setSelfContentForm({ ...selfContentForm, type: e.target.value })}
                    >
                      <option value="video">סרטון</option>
                      <option value="article">מאמר</option>
                      <option value="post">פוסט מרשת חברתית</option>
                      <option value="link">קישור כללי</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>קטגוריה</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="למשל: נשימות, השראה"
                      value={selfContentForm.category}
                      onChange={e => setSelfContentForm({ ...selfContentForm, category: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>הערה אישית או תיאור (מדוע זה עוזר לי?)</label>
                  <textarea
                    className="form-control"
                    rows={2}
                    placeholder="לדוגמה: לראות כשיש מתח בערב, נותן השראה..."
                    value={selfContentForm.description}
                    onChange={e => setSelfContentForm({ ...selfContentForm, description: e.target.value })}
                  />
                </div>

                {selfContentForm.imageData && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                    <img 
                      src={selfContentForm.imageData} 
                      alt="" 
                      style={{ width: '60px', height: '40px', objectFit: 'cover', borderRadius: '6px' }} 
                    />
                    <div style={{ fontSize: '0.82rem', color: '#334155' }}>
                      <strong>תצוגה מקדימה זוהתה בהצלחה!</strong>
                      <div style={{ color: '#64748b' }}>{selfContentForm.sourceName || 'סרטון'}</div>
                    </div>
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => { setIsSelfContentModalOpen(false); setEditingContentId(null); }}>
                  ביטול
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSubmittingSelfContent}>
                  {isSubmittingSelfContent ? 'שומר תוכן...' : editingContentId ? 'שמור שינויים בתוכן 🎬' : 'שמור בספרייה שלי 🎬'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom UI Confirmation Dialog - Delete Task */}
      <ConfirmModal 
        isOpen={Boolean(pendingDeleteTaskId)}
        onClose={() => setPendingDeleteTaskId(null)}
        onConfirm={confirmDeleteSelfTask}
        title="מחיקת משימה"
        message="האם את/ה בטוח/ה שברצונך למחוק משימה זו מהמרחב האישי שלך?"
        confirmText="כן, מחק משימה"
        cancelText="ביטול"
        isDanger={true}
      />

      {/* Custom UI Confirmation Dialog - Delete Content */}
      <ConfirmModal 
        isOpen={Boolean(pendingDeleteContentId)}
        onClose={() => setPendingDeleteContentId(null)}
        onConfirm={confirmDeleteSelfContent}
        title="הסרת תוכן מהמרחב"
        message="האם את/ה בטוח/ה שברצונך להסיר פריט תוכן זה מהספרייה האישית שלך?"
        confirmText="כן, הסר תוכן"
        cancelText="ביטול"
        isDanger={true}
      />

      {/* Custom UI Confirmation Dialog - Delete Appointment */}
      <ConfirmModal 
        isOpen={Boolean(pendingDeleteAppointmentId)}
        onClose={() => setPendingDeleteAppointmentId(null)}
        onConfirm={confirmDeleteSelfAppointment}
        title="מחיקת פגישה"
        message="האם את/ה בטוח/ה שברצונך למחוק פגישה זו מיומן הפגישות שלך?"
        confirmText="כן, מחק פגישה"
        cancelText="ביטול"
        isDanger={true}
      />

      {/* Custom UI Confirmation Dialog - Delete Insight */}
      <ConfirmModal 
        isOpen={Boolean(pendingDeleteInsightId)}
        onClose={() => setPendingDeleteInsightId(null)}
        onConfirm={confirmDeleteInsight}
        title="מחיקת תיעוד מהיומן"
        message="האם אתה בטוח שברצונך למחוק תיעוד זה מהיומן האישי שלך? הפעולה הינה לצמיתות ולא ניתן לשחזר אותה."
        confirmText="כן, מחק תיעוד"
        cancelText="ביטול"
        isDanger={true}
      />

      {/* Custom UI Toast Notification (replacing native browser alerts) */}
      <Toast 
        message={toast?.message} 
        type={toast?.type} 
        onClose={() => setToast(null)} 
      />

      {/* Privacy Policy Modal */}
      <PrivacyPolicyModal
        isOpen={isPrivacyOpen}
        onClose={() => setIsPrivacyOpen(false)}
      />

      {/* Client Portal: Settings & Security Modal */}
      {isSettingsModalOpen && (
        <div 
          className="portal-settings-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsSettingsModalOpen(false);
            }
          }}
        >
          <div className="portal-settings-modal-card">
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '14px',
                  background: 'rgba(13, 148, 136, 0.12)',
                  color: '#0d9488',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Settings size={24} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                    הגדרות אבטחה ופרטיות המרחב
                  </h3>
                  <p style={{ fontSize: '0.84rem', color: '#64748b', margin: '4px 0 0 0' }}>
                    הגנת פרטיות המרחב, נעילת PIN מהירה וניהול המכשיר
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsSettingsModalOpen(false)}
                style={{
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: '50%',
                  width: '34px',
                  height: '34px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#64748b'
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Notification alert within settings */}
            {settingsMsg && (
              <div style={{
                marginBottom: '16px',
                padding: '12px 14px',
                borderRadius: '12px',
                fontSize: '0.88rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: settingsMsg.type === 'success' ? '#f0fdf4' : '#fef2f2',
                border: `1px solid ${settingsMsg.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
                color: settingsMsg.type === 'success' ? '#166534' : '#dc2626'
              }}>
                {settingsMsg.type === 'success' ? <CheckCircle2 size={18} color="#16a34a" /> : <AlertCircle size={18} color="#dc2626" />}
                <span>{settingsMsg.text}</span>
              </div>
            )}

            {/* Section 1: 4-Digit PIN Lock */}
            <div className="portal-settings-section">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <KeyRound size={18} color="#0d9488" />
                  <span style={{ fontWeight: 800, fontSize: '0.98rem', color: '#0f172a' }}>
                    נעילת PIN מהירה (4 ספרות)
                  </span>
                </div>
                <label className="portal-settings-toggle">
                  <input
                    type="checkbox"
                    checked={isPinEnabled}
                    onChange={(e) => handleTogglePinEnabled(e.target.checked)}
                  />
                  <span className="portal-settings-slider" />
                </label>
              </div>

              <p style={{ fontSize: '0.84rem', color: '#64748b', lineHeight: 1.5, margin: '0 0 14px 0' }}>
                הגנה מפני מי שמחזיק בטלפון שלך. כשנעילת PIN מופעלת, בכניסה למרחב מקישים 4 ספרות בלבד במקום שם משתמש וסיסמה ארוכים.
              </p>

              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontWeight: 700,
                marginBottom: '16px',
                background: isPinEnabled ? '#ecfdf5' : '#fef3c7',
                color: isPinEnabled ? '#047857' : '#b45309',
                border: `1px solid ${isPinEnabled ? '#a7f3d0' : '#fde68a'}`
              }}>
                {isPinEnabled ? <ShieldCheck size={14} /> : <AlertCircle size={14} />}
                <span>{isPinEnabled ? 'נעילת PIN פעילה במכשיר זה 🔒' : 'נעילת PIN אינה פעילה כרגע'}</span>
              </div>

              {/* Set / Change PIN Form */}
              <form onSubmit={handleSaveNewPin} style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '14px' }}>
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#334155', marginBottom: '10px' }}>
                  {isPinEnabled ? 'שינוי או עדכון קוד PIN (4 ספרות)' : 'הגדרת קוד PIN בן 4 ספרות'}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                  <div>
                    <label style={{ fontSize: '0.78rem', color: '#64748b', display: 'block', marginBottom: '4px' }}>
                      קוד PIN חדש (4 ספרות)
                    </label>
                    <input
                      type="password"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={4}
                      dir="ltr"
                      placeholder="••••"
                      value={pinFormNew}
                      onChange={e => setPinFormNew(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      className="form-control"
                      style={{ textAlign: 'center', letterSpacing: '6px', fontSize: '1.2rem', fontWeight: 800, padding: '8px', borderRadius: '10px' }}
                      required
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.78rem', color: '#64748b', display: 'block', marginBottom: '4px' }}>
                      אימות קוד PIN
                    </label>
                    <input
                      type="password"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={4}
                      dir="ltr"
                      placeholder="••••"
                      value={pinFormConfirm}
                      onChange={e => setPinFormConfirm(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      className="form-control"
                      style={{ textAlign: 'center', letterSpacing: '6px', fontSize: '1.2rem', fontWeight: 800, padding: '8px', borderRadius: '10px' }}
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '10px',
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  <Lock size={15} />
                  <span>שמור והפעל קוד PIN 🔒</span>
                </button>
              </form>
            </div>

            {/* Section 2: Device Remember Me Status */}
            <div className="portal-settings-section">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <Smartphone size={18} color="#0d9488" />
                <span style={{ fontWeight: 800, fontSize: '0.98rem', color: '#0f172a' }}>
                  שמירת כניסה במכשיר זה
                </span>
              </div>
              <p style={{ fontSize: '0.84rem', color: '#64748b', lineHeight: 1.5, margin: '0 0 12px 0' }}>
                המכשיר שלך זוכר את פרטי החיבור כך שאין צורך להזין מחדש שם משתמש וסיסמה בכל פעם שאת/ה חוזר/ת למרחב.
              </p>
              <button
                type="button"
                onClick={handleClearSavedCredentials}
                style={{
                  background: '#ffffff',
                  color: '#475569',
                  border: '1px solid #cbd5e1',
                  borderRadius: '10px',
                  padding: '8px 14px',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Trash2 size={14} color="#64748b" />
                <span>נקה פרטי התחברות שמורים ממכשיר זה</span>
              </button>
            </div>

            {/* Section 3: Account & Clinic Summary */}
            <div className="portal-settings-section" style={{ fontSize: '0.86rem', color: '#475569' }}>
              <div style={{ fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>פרטי החשבון שלך</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span>שם מטופל/ת:</span>
                <strong>{portalInfo.clientName}</strong>
              </div>
              {loginUsername && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span>שם משתמש:</span>
                  <strong dir="ltr">{loginUsername}</strong>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>קליניקה / מרחב:</span>
                <strong>{portalInfo.clinicName || 'WiseCare'}</strong>
              </div>
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px' }}>
              {isPinEnabled && (
                <button
                  type="button"
                  onClick={handleLockPortalNow}
                  style={{
                    background: 'rgba(13, 148, 136, 0.1)',
                    color: '#0d9488',
                    border: '1px solid rgba(13, 148, 136, 0.3)',
                    borderRadius: '12px',
                    padding: '11px',
                    fontWeight: 700,
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  <Lock size={16} />
                  <span>נעילת מסך עכשיו</span>
                </button>
              )}

              <button
                type="button"
                onClick={handlePortalLogout}
                style={{
                  gridColumn: isPinEnabled ? 'auto' : '1 / -1',
                  background: 'rgba(239, 68, 68, 0.08)',
                  color: '#dc2626',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '12px',
                  padding: '11px',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <LogOut size={16} />
                <span>התנתקות מלאה מהמרחב</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
