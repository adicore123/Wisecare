"use client";

import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck,
  UserPlus,
  Users,
  LogIn,
  CheckCircle,
  Sparkles,
  Search,
  Building,
  Lock,
  ArrowRightLeft,
  Copy,
  ExternalLink,
  Check,
  Link2,
  Share2,
  Settings,
  Sliders,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Send,
  Save,
  MessageSquare,
  Smartphone,
  Eye,
  EyeOff,
  Key,
  KeyRound,
  Dices,
  GraduationCap,
  Briefcase,
  Phone,
  Mail,
  User,
  ChevronDown,
  UserCheck,
  X,
  Trash2,
  FileText
} from 'lucide-react';
import { api } from '@/lib/api';
import ConfirmModal from './ConfirmModal';
import Toast from './Toast';
import WhatsAppIcon from './WhatsAppIcon';
import PrivacyPolicyModal from './PrivacyPolicyModal';

// Professional Titles in Therapy, Bodywork, Wellness & Clinical Practice (Categorized)
const THERAPIST_PROFESSIONAL_TITLES = [
  {
    category: 'פסיכולוגיה ופסיכותרפיה',
    titles: [
      'פסיכולוג/ית קליני/ת מומחה/ית',
      'פסיכולוג/ית קליני/ת בכיר/ה',
      'פסיכולוג/ית בהתמחות קלינית',
      'פסיכולוג/ית חינוכי/ת מומחה/ית',
      'פסיכולוג/ית התפתחותי/ת מומחה/ית',
      'פסיכולוג/ית שיקומי/ת מומחה/ית',
      'פסיכולוג/ית רפואי/ת מומחה/ית',
      'פסיכותרפיסט/ית מוסמך/ת (CBT)',
      'פסיכותרפיסט/ית קוגניטיבי-התנהגותי/ת',
      'פסיכותרפיסט/ית פסיכודינמי/ת',
      'פסיכותרפיסט/ית אינטגרטיבי/ת',
      'פסיכואנליטיקאי/ת מוסמך/ת'
    ]
  },
  {
    category: 'NLP, אימון מנטלי ותודעה',
    titles: [
      'מאסטר NLP ומטפל/ת מוסמך/ת (NLP Master Practitioner)',
      'מטפל/ת NLP ודמיון מודרך',
      'פרקטישנר NLP מוסמך/ת (NLP Practitioner)',
      'מאמן/ת אישי/ת ומנטלי/ת (Certified Coach)',
      'מטפל/ת בתת-מודע ו-TLT (Time Line Therapy)',
      'מטפל/ת בטראומה ופוביות ב-NLP',
      'היפנותרפיסט/ית מוסמך/ת'
    ]
  },
  {
    category: 'טיפול במגע, עיסוי ושיקום הגוף',
    titles: [
      'מטפל/ת בעיסוי רפואי ושיקומי',
      'מעסה מוסמך/ת (עיסוי שוודי / משולב)',
      'מטפל/ת בעיסוי רקמות עמוקות וטריגר פוינטס',
      'מטפל/ת במגע אינטגרטיבי (Bodywork)',
      'מטפל/ת בשיאצו בכיר/ה',
      'מטפל/ת בטווינא ורפואה סינית',
      'רפלקסולוג/ית בכיר/ה / מומחה/ית',
      'מטפל/ת קרניו-סקראל (CST)',
      'אוסטיאופת/ית מוסמך/ת (D.O)',
      'כירופרקט/ית מוסמך/ת (D.C)',
      'מטפל/ת בספורטאים ופציעות ספורט'
    ]
  },
  {
    category: 'רפואה משלימה, אינטגרטיבית והוליסטית',
    titles: [
      'מטפל/ת ברפואה סינית (Dip.Ac - דיקור וצמחי מרפא)',
      'נטורופת/ית מוסמך/ת (N.D)',
      'מטפל/ת גוף-נפש הוליסטי',
      'הרבליסט/ית קליני/ת (צמחי מרפא)',
      'הומאופת/ית קלאסי/ת מוסמך/ת',
      'מטפל/ת בתזונה טבעית ואינטגרטיבית',
      'מטפל/ת אייפק (IPEC) ואיזון אנרגטי',
      'מטפל/ת קינסיולוגיה ומוח אחד'
    ]
  },
  {
    category: 'עבודה סוציאלית וטיפול משפחתי',
    titles: [
      'עובד/ת סוציאלי/ת קליני/ת (MSW)',
      'עובד/ת סוציאלי/ת (BSW)',
      'מטפל/ת זוגי/ת ומשפחתי/ת מוסמך/ת',
      'מדריך/ה ומטפל/ת משפחתי/ת',
      'מנחה/ת הורים ומשפחה מוסמך/ת',
      'מגשר/ת משפחתי/ת וזוגי/ת'
    ]
  },
  {
    category: 'טיפול באמצעות אמנויות (הבעה ויצירה)',
    titles: [
      'מטפל/ת באמנות חזותית (M.A.)',
      'מטפל/ת בתנועה ומחול (M.A.)',
      'מטפל/ת במוזיקה (M.A.)',
      'מטפל/ת בדרמה ופסיכודרמה (M.A.)',
      'ביבליותרפיסט/ית מוסמך/ת (M.A.)'
    ]
  },
  {
    category: 'מקצועות הבריאות, שיקום וטיפול רגשי',
    titles: [
      'מרפא/ה בעיסוק (B.O.T / M.Sc)',
      'קלינאי/ת תקשורת (B.A / M.A)',
      'מטפל/ת רגשי/ת מוסמך/ת',
      'מטפל/ת EMDR מוסמך/ת',
      'מטפל/ת נוירופידבק מוסמך/ת',
      'מטפל/ת בגישת Somatic Experiencing (SE)',
      'הידרותרפיסט/ית מוסמך/ת',
      'מטפל/ת ברכיבה טיפולית'
    ]
  },
  {
    category: 'רפואה ופסיכיאטריה',
    titles: [
      'פסיכיאטר/ית מומחה/ית',
      'פסיכיאטר/ית ילדים ונוער',
      'רופא/ה מומחה/ית בפסיכיאטריה',
      'נוירולוג/ית מומחה/ית'
    ]
  }
];

const ALL_TITLES_FLAT = THERAPIST_PROFESSIONAL_TITLES.flatMap(c => c.titles);

// Clinical & Therapeutic Specialties (Categorized)
const THERAPY_SPECIALTIES_CATEGORIZED = [
  {
    category: 'טיפול במגע, עיסוי ושיקום כאב',
    items: [
      'עיסוי רפואי ושיקומי',
      'עיסוי רקמות עמוקות ונקודות טריגר',
      'שחרור כאבים כרוניים ושרירים תפוסים',
      'עיסוי שוודי מרגיע והפגת מתחים',
      'שיאצו וטווינא',
      'רפלקסולוגיה ואיזון מערכות הגוף',
      'פציעות ספורט ושיקום תנועתי',
      'טיפול בכאבי גב, צוואר ומפרקים',
      'עיסוי נשים בהריון ולאחר לידה',
      'טיפול קרניו-סקראל'
    ]
  },
  {
    category: 'NLP, אימון מנטלי ותודעה',
    items: [
      'תכנות נוירו-לשוני (NLP)',
      'שחרור פוביות, פחדים וחרדות ב-NLP',
      'שינוי הרגלים, דפוסים ואמונות מגבילות',
      'דמיון מודרך, הרפיה וחיבור פנימי',
      'אימון מנטלי להצלחה ולהשגת מטרות',
      'שחרור טראומות בקו הזמן (Time Line Therapy)',
      'העלאת דימוי עצמי וביטחון פנימי',
      'התמודדות עם תקיעות ומשברי חיים'
    ]
  },
  {
    category: 'רפואה משלימה וגוף-נפש',
    items: [
      'דיקור סיני (אקופונקטורה)',
      'צמחי מרפא סיניים ומערביים',
      'נטורופתיה ותזונה מבריאה',
      'איזון מערכת העיכול ומטבוליזם',
      'חיזוק מערכת החיסון ומניעת מחלות',
      'איזון הורמונלי ונשי',
      'שילוב גוף-נפש להפחתת סטרס'
    ]
  },
  {
    category: 'מצבי רוח, חרדה וטראומה',
    items: [
      'חרדה, פאניקה ומתח מתמשך',
      'טראומה ופוסט-טראומה (PTSD)',
      'דיכאון, דכדוך ומצבי משבר',
      'וויסות רגשי וסערות רגשיות (DBT)',
      'OCD ומחשבות טורדניות',
      'דימוי עצמי וערך עצמי',
      'אובדן, אבל ושכול'
    ]
  },
  {
    category: 'ילדים, נוער והורות',
    items: [
      'טיפול רגשי בילדים ונוער',
      'הפרעות קשב וריכוז (ADHD)',
      'הדרכת הורים וסמכות הורית',
      'קשיים חברתיים וחרדה חברתית',
      'בעיות התנהגות, כעסים וגבולות',
      'הרטבה, חרדות לילה ופחדים'
    ]
  },
  {
    category: 'זוגיות, משפחה ויחסים',
    items: [
      'טיפול זוגי ומשברי נישואין',
      'שיפור תקשורת ואינטימיות זוגית',
      'משברי גירושין, פרידה ופרק ב׳',
      'טיפול משפחתי רב-דורי',
      'יחסי הורים וילדים בוגרים'
    ]
  },
  {
    category: 'גישות ושיטות טיפול קליניות',
    items: [
      'טיפול קוגניטיבי התנהגותי (CBT)',
      'טיפול EMDR לעיבוד טראומה',
      'פסיכותרפיה פסיכודינמית',
      'טיפול סומטי וחווייתי (SE)',
      'מיינדפולנס וקשיבות (MBSR)',
      'טיפול באמצעות אמנות, תנועה והבעה'
    ]
  }
];

const ALL_SPECIALTIES_FLAT = THERAPY_SPECIALTIES_CATEGORIZED.flatMap(c => c.items);

// Cryptographic Strong Password Generator
const generateStrongPassword = (length = 12) => {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnopqrstuvwxyz';
  const digits = '23456789';
  const special = '!@#$%&*';

  const pick = (chars) => chars[Math.floor(Math.random() * chars.length)];
  const res = [pick(upper), pick(lower), pick(digits), pick(special)];
  const all = upper + lower + digits + special;
  while (res.length < length) {
    res.push(pick(all));
  }
  return res.sort(() => Math.random() - 0.5).join('');
};

// Password Strength Evaluator
const getPasswordStrength = (pwd = '') => {
  const hasMinLength = pwd.length >= 8;
  const hasUpper = /[A-Z]/.test(pwd);
  const hasLower = /[a-z]/.test(pwd);
  const hasDigit = /[0-9]/.test(pwd);
  const hasSpecial = /[^A-Za-z0-9]/.test(pwd);

  let score = 0;
  if (pwd.length >= 8) score += 25;
  if (pwd.length >= 12) score += 15;
  if (hasUpper && hasLower) score += 25;
  if (hasDigit) score += 20;
  if (hasSpecial) score += 15;

  let label = 'חלשה';
  let color = '#ef4444';
  if (score >= 80 && hasMinLength && (hasUpper || hasLower) && hasDigit) {
    label = 'חזקה ומאובטחת 🔒';
    color = 'var(--primary)';
  } else if (score >= 50 && hasMinLength) {
    label = 'בינונית';
    color = '#f59e0b';
  }

  return { score: Math.min(score, 100), label, color, hasMinLength, hasUpper, hasLower, hasDigit, hasSpecial };
};

export default function SuperAdminPage({
  currentAdmin: initialAdmin,
  onImpersonateTherapist,
  onBackToTherapist
}: {
  currentAdmin?: any;
  onImpersonateTherapist?: any;
  onBackToTherapist?: any;
} = {}) {
  const [currentAdmin, setCurrentAdmin] = useState<any>(initialAdmin);
  const [authChecked, setAuthChecked] = useState(false);
  const [loginUsername, setLoginUsername] = useState('adicore123');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('wisecare_token');
      const uStr = localStorage.getItem('wisecare_user');
      let user = null;
      if (uStr) {
        try { user = JSON.parse(uStr); } catch {}
      }
      if (token && user && user.role === 'superadmin') {
        setCurrentAdmin(user);
      } else if (initialAdmin && initialAdmin.role === 'superadmin') {
        setCurrentAdmin(initialAdmin);
      } else {
        setCurrentAdmin(null);
      }
      setAuthChecked(true);
    }
  }, [initialAdmin]);

  const handleSuperAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginUsername.trim() || !loginPassword.trim()) {
      setLoginError('נא להזין שם משתמש וסיסמה');
      return;
    }
    setLoginLoading(true);
    setLoginError('');
    try {
      const res = await api.login(loginUsername.trim(), loginPassword.trim(), { adminPortal: true });
      if (!res.user || res.user.role !== 'superadmin') {
        throw new Error('משתמש זה אינו מורשה לניהול ראשי (SuperAdmin)');
      }
      localStorage.setItem('wisecare_user', JSON.stringify(res.user));
      localStorage.setItem('wisecare_token', res.token);
      setCurrentAdmin(res.user);
      setLoginPassword('');
    } catch (err: any) {
      setLoginError(err.message || 'שם משתמש או סיסמה שגויים');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleSuperAdminLogout = async () => {
    try {
      await api.logout();
    } catch {
      // Ignore
    }
    setCurrentAdmin(null);
  };

  const [activeTab, setActiveTab] = useState('therapists'); // 'therapists' | 'clients' | 'settings'
  const [stats, setStats] = useState(null);
  const [therapists, setTherapists] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [clientFilter, setClientFilter] = useState('all'); // 'all' | 'clinic' | 'self_care'
  const [showArchived, setShowArchived] = useState(false);
  // Patients of a therapist shown inline (expandable row) in the therapists table
  const [expandedTherapistId, setExpandedTherapistId] = useState<string | null>(null);

  const clientsOfTherapist = (therapistId: string) => clients.filter((c: any) => c.therapistId === therapistId);
  const selfCareClientsOnly = clients.filter((c: any) => c.isSelfCare);
  const [impersonatingClientId, setImpersonatingClientId] = useState(null);
  const [impersonatingTherapistId, setImpersonatingTherapistId] = useState<string | null>(null);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAddSelfCareModalOpen, setIsAddSelfCareModalOpen] = useState(false);
  const [selfCareFormData, setSelfCareFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    goal: 'calm',
    privacyPolicy: false,
    sendWhatsApp: true
  });
  const [showAddPassword, setShowAddPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    password: '',
    email: '',
    phone: '',
    title: '',
    specialty: '',
    sendWhatsApp: true
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [copiedClientId, setCopiedClientId] = useState(null);
  const [sendingWhatsAppId, setSendingWhatsAppId] = useState(null);
  const [newTherapistSuccess, setNewTherapistSuccess] = useState(null);

  // Professional Title Combobox State
  const titleDropdownRef = useRef(null);
  const [isTitleDropdownOpen, setIsTitleDropdownOpen] = useState(false);
  const [titleFilter, setTitleFilter] = useState('');

  // Clinical Specialty Combobox State
  const specialtyDropdownRef = useRef(null);
  const [isSpecialtyDropdownOpen, setIsSpecialtyDropdownOpen] = useState(false);
  const [specialtyFilter, setSpecialtyFilter] = useState('');

  // Close Combobox Dropdowns on Outside Click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (titleDropdownRef.current && !titleDropdownRef.current.contains(e.target)) {
        setIsTitleDropdownOpen(false);
      }
      if (specialtyDropdownRef.current && !specialtyDropdownRef.current.contains(e.target)) {
        setIsSpecialtyDropdownOpen(false);
      }
    };
    if (isTitleDropdownOpen || isSpecialtyDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isTitleDropdownOpen, isSpecialtyDropdownOpen]);

  // Reset Credentials Modal State
  const [resetModalTherapist, setResetModalTherapist] = useState(null);
  const [resetFormData, setResetFormData] = useState({ password: '', sendWhatsApp: true });
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resettingSaving, setResettingSaving] = useState(false);

  // Delete Modals State
  const [deleteTherapistModal, setDeleteTherapistModal] = useState<any>(null);
  const [deletingTherapist, setDeletingTherapist] = useState(false);
  const [deleteClientModal, setDeleteClientModal] = useState<any>(null);
  const [deletingClient, setDeletingClient] = useState(false);

  // SuperAdmin Automation & WhatsApp Settings State
  const [activeTemplateKey, setActiveTemplateKey] = useState<'therapist' | 'article' | 'media'>('therapist');
  const [superadminSettings, setSuperadminSettings] = useState({
    autoSendTherapistInviteWhatsApp: true,
    therapistInviteMessageTemplate: `שלום {{name}} יקר/ה,
הוגדר עבורך בהצלחה חשבון מטפל/ת אישי במערכת WiseCare 🌿

להלן פרטי הגישה האישיים שלך למערכת:
🔗 קישור כניסה ייחודי למרחב שלך:
{{loginUrl}}

👤 שם משתמש: {{username}}
🔑 סיסמה ראשונית: {{password}}

כתובת ישירה למרחב העבודה (CRM):
{{crmUrl}}

בברכה,
הנהלת המערכת WiseCare`,
    autoSendContentNotificationWhatsApp: true,
    articleNotificationTemplate: `שלום {{firstName}} יקר/ה,
שותף איתך מאמר חדש לקריאה במרחב האישי של WiseCare:
📖 *{{title}}*

לקריאת המאמר במרחב הטיפולי שלך:
{{portalUrl}}

קריאה מעשירה ויום נעים! 🌿`,
    mediaNotificationTemplate: `שלום {{firstName}} יקר/ה,
שותף איתך תוכן חדש (סרטון / פוסט) במרחב האישי של WiseCare:
🎬 *{{title}}*

לצפייה בתוכן במרחב הטיפולי שלך:
{{portalUrl}}

צפייה מהנה ויום נפלא! ✨`,
    greenApiInstanceId: '',
    greenApiToken: '',
    clinicName: 'WiseCare'
  });
  const [greenApiStatus, setGreenApiStatus] = useState(null);
  const [savingSettings, setSavingSettings] = useState(false);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const getTherapistLoginUrl = (loginCode) => {
    return typeof window !== 'undefined' ? `${window.location.origin}/login/${loginCode}` : `/login/${loginCode}`;
  };

  const handleCopyLoginLink = (therapist) => {
    const url = getTherapistLoginUrl(therapist.loginCode);
    navigator.clipboard.writeText(url);
    setCopiedId(therapist.id);
    showToast(`הקישור הייחודי של ${therapist.name} הועתק ללוח! 📋`);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleSendWhatsAppInvite = async (therapist) => {
    try {
      setSendingWhatsAppId(therapist.id);
      await api.sendTherapistInviteWhatsApp(therapist.id);
      showToast(`הודעת הוואטסאפ עם פרטי ההתחברות נשלחה בהצלחה למספר של ${therapist.name} דרך האוטומציה (Green API)! 🚀`);
      if (newTherapistSuccess && newTherapistSuccess.id === therapist.id) {
        setNewTherapistSuccess(prev => prev ? ({ ...prev, whatsappStatus: { sent: true } }) : null);
      }
    } catch (err: any) {
      showToast('שגיאה בשליחת וואטסאפ באוטומציה: ' + (err.message || ''), 'error');
    } finally {
      setSendingWhatsAppId(null);
    }
  };

  useEffect(() => {
    if (authChecked && currentAdmin && currentAdmin.role === 'superadmin') {
      loadData();
    }
  }, [authChecked, currentAdmin]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsRes, therapistsRes, settingsRes, clientsRes] = await Promise.all([
        api.getSuperadminStats(),
        api.getTherapists(),
        api.getSuperadminSettings().catch(() => null),
        api.getSuperadminClients(showArchived).catch(() => [])
      ]);
      setStats(statsRes);
      setTherapists(therapistsRes || []);
      setClients(clientsRes || []);
      if (settingsRes?.settings) {
        setSuperadminSettings(prev => ({
          ...prev,
          ...settingsRes.settings
        }));
      }
      if (settingsRes?.greenApiStatus) {
        setGreenApiStatus(settingsRes.greenApiStatus);
      }
    } catch (err) {
      setError(err.message || 'שגיאה בטעינת נתוני SuperAdmin');
    } finally {
      setLoading(false);
    }
  };

  /** Mini patient cards — rendered inside an expanded therapist row (desktop + mobile) */
  const renderPatientsList = (therapistId: string) => {
    const list = clientsOfTherapist(therapistId);
    if (list.length === 0) {
      return (
        <div style={{ textAlign: 'center', color: '#64748b', fontSize: '0.9rem', padding: '16px' }}>
          אין מטופלים משויכים למטפל/ת זה
        </div>
      );
    }
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '10px' }}>
        {list.map((c: any) => {
          const name = `${c.firstName || ''} ${c.lastName || ''}`.trim() || 'מטופל/ת';
          return (
            <div key={c.id} style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '10px 12px', background: '#ffffff',
              border: '1px solid #e2e8f0', borderRadius: '10px'
            }}>
              <div style={{
                width: '34px', height: '34px', borderRadius: '50%', flexShrink: 0,
                background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%)',
                color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: '0.9rem'
              }}>
                {name.charAt(0)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
                  <span style={{
                    fontSize: '0.66rem', fontWeight: 700, padding: '1px 8px', borderRadius: '100px',
                    background: c.portalEnabled !== false ? 'var(--primary-faint)' : '#f8fafc',
                    color: c.portalEnabled !== false ? 'var(--primary-hover, color-mix(in srgb, var(--primary) 85%, black))' : '#64748b'
                  }}>
                    {c.portalEnabled !== false ? 'מרחב אישי' : 'קליניקה בלבד'}
                  </span>
                </div>
                <div style={{ fontSize: '0.76rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span dir="ltr">{c.phone || 'אין טלפון'}</span>
                  {c.phone && (
                    <a
                      href={`https://wa.me/${c.phone.replace(/[^0-9]/g, '').startsWith('0') ? '972' + c.phone.replace(/[^0-9]/g, '').slice(1) : c.phone.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      title="פנה למטופל/ת ב-WhatsApp"
                      style={{ display: 'inline-flex', alignItems: 'center' }}
                    >
                      <WhatsAppIcon size={13} />
                    </a>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDeleteClientModal(c)}
                className="btn btn-secondary"
                title={`מחיקת סביבת המשתמש ${name} לצמיתות`}
                style={{ padding: '5px 8px', fontSize: '0.75rem', color: '#dc2626', borderColor: '#fecaca', background: '#fef2f2', flexShrink: 0 }}
              >
                <Trash2 size={13} />
              </button>
            </div>
          );
        })}
      </div>
    );
  };

  const handleCopyClientPortalLink = (client) => {
    const origin = window.location.origin;
    const url = `${origin}/portal/${client.portalCode}`;    navigator.clipboard.writeText(url);
    setCopiedClientId(client.id);
    showToast(`הקישור הישיר למרחב של ${client.firstName || ''} הועתק ללוח! 📋`);
    setTimeout(() => setCopiedClientId(null), 2500);
  };

  const handleImpersonateTherapist = async (therapist: any) => {
    if (onImpersonateTherapist) {
      try {
        await onImpersonateTherapist(therapist);
        return;
      } catch (err) {
        console.warn('onImpersonateTherapist callback failed, falling back to internal handler:', err);
      }
    }

    try {
      setImpersonatingTherapistId(therapist.id);
      showToast(`מתחבר למרחב הטיפולי של ${therapist.name}... 🔑`);

      // 1. Call API to get signed impersonation token
      const res = await api.impersonate(therapist.id);

      // 2. Preserve SuperAdmin token so admin can return back safely
      const currentToken = localStorage.getItem('wisecare_token');
      if (currentToken) {
        localStorage.setItem('wisecare_admin_token', currentToken);
      }

      // 3. Store therapist session
      if (res.token) {
        localStorage.setItem('wisecare_token', res.token);
      }
      if (res.user) {
        localStorage.setItem('wisecare_user', JSON.stringify(res.user));
      }
      localStorage.setItem('wisecare_is_impersonating', 'true');

      // 4. Navigate directly to the therapist's CRM workspace
      const targetCode = therapist.loginCode || res.user?.loginCode || 'dr-sarah-8821';
      showToast(`התחברת בהצלחה למרחב של ${therapist.name}! מעביר למערכת... 🚀`);

      setTimeout(() => {
        window.location.href = `/crm/${targetCode}/clients`;
      }, 300);
    } catch (err: any) {
      console.error('Impersonate therapist error:', err);
      showToast('שגיאה בכניסה למרחב המטפל: ' + (err.message || 'שגיאת שרת'), 'error');
    } finally {
      setImpersonatingTherapistId(null);
    }
  };

  const handleImpersonateClient = async (client) => {
    try {
      setImpersonatingClientId(client.id);
      const res = await api.impersonateClient(client.id);
      if (res.token) {
        localStorage.setItem('wisecare_client_token', res.token);
      }
      showToast(`כניסה ישירה כמנהל ראשי למרחב של ${client.firstName || ''} ${client.lastName || ''}... 🔑`);
      setTimeout(() => {
        window.location.href = `/portal/${res.portalCode}?superadmin=1`;
      }, 400);
    } catch (err) {
      showToast('שגיאה בכניסה למרחב הלקוח: ' + err.message, 'error');
    } finally {
      setImpersonatingClientId(null);
    }
  };

  const handleSaveSettings = async (e) => {
    if (e) e.preventDefault();
    try {
      setSavingSettings(true);
      const res = await api.updateSuperadminSettings(superadminSettings);
      if (res.settings) {
        setSuperadminSettings(prev => ({ ...prev, ...res.settings }));
      }
      showToast('הגדרות המערכת ואוטומציית ה-WhatsApp נשמרו בהצלחה! 💾');
    } catch (err) {
      showToast('שגיאה בשמירת הגדרות: ' + err.message, 'error');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleRefreshGreenApiStatus = async () => {
    try {
      const res = await api.getSuperadminSettings();
      if (res.greenApiStatus) {
        setGreenApiStatus(res.greenApiStatus);
        showToast('סטטוס Green API עודכן בהצלחה');
      }
    } catch (err) {
      showToast('שגיאה בבדיקת סטטוס: ' + err.message, 'error');
    }
  };

  const handleInsertPlaceholder = (tag: string) => {
    setSuperadminSettings(prev => {
      if (activeTemplateKey === 'article') {
        return {
          ...prev,
          articleNotificationTemplate: (prev.articleNotificationTemplate || '') + ' ' + tag + ' '
        };
      }
      if (activeTemplateKey === 'media') {
        return {
          ...prev,
          mediaNotificationTemplate: (prev.mediaNotificationTemplate || '') + ' ' + tag + ' '
        };
      }
      return {
        ...prev,
        therapistInviteMessageTemplate: (prev.therapistInviteMessageTemplate || '') + ' ' + tag + ' '
      };
    });
  };

  const getPreviewMessage = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://wisecare.health';

    if (activeTemplateKey === 'article') {
      let tpl = superadminSettings.articleNotificationTemplate || 'שלום {{firstName}} יקר/ה,\nשותף איתך מאמר חדש לקריאה במרחב האישי של WiseCare:\n📖 *{{title}}*\n\nלקריאת המאמר במרחב הטיפולי שלך:\n{{portalUrl}}\n\nקריאה מעשירה ויום נעים! 🌿';
      const samplePortalUrl = `${origin}/portal/patient-sample?tab=content&subtab=articles&content=article-1`;
      return tpl
        .replace(/\{\{firstName\}\}/g, 'יונתן')
        .replace(/\{firstName\}/g, 'יונתן')
        .replace(/\{\{title\}\}/g, 'כלים מעשיים לוויסות רגשי והרגעת חרדה')
        .replace(/\{title\}/g, 'כלים מעשיים לוויסות רגשי והרגעת חרדה')
        .replace(/\{\{portalUrl\}\}/g, samplePortalUrl)
        .replace(/\{portalUrl\}/g, samplePortalUrl)
        .replace(/\{\{clinicName\}\}/g, superadminSettings.clinicName || 'WiseCare')
        .replace(/\{\{therapistName\}\}/g, 'ד״ר מיכל כהן');
    }

    if (activeTemplateKey === 'media') {
      let tpl = superadminSettings.mediaNotificationTemplate || 'שלום {{firstName}} יקר/ה,\nשותף איתך תוכן חדש (סרטון / פוסט) במרחב האישי של WiseCare:\n🎬 *{{title}}*\n\nלצפייה בתוכן במרחב הטיפולי שלך:\n{{portalUrl}}\n\nצפייה מהנה ויום נפלא! ✨';
      const samplePortalUrl = `${origin}/portal/patient-sample?tab=content&subtab=media&content=video-1`;
      return tpl
        .replace(/\{\{firstName\}\}/g, 'יונתן')
        .replace(/\{firstName\}/g, 'יונתן')
        .replace(/\{\{title\}\}/g, 'תרגול נשימות מודרך מיוטיוב להורדת סטרס')
        .replace(/\{title\}/g, 'תרגול נשימות מודרך מיוטיוב להורדת סטרס')
        .replace(/\{\{portalUrl\}\}/g, samplePortalUrl)
        .replace(/\{portalUrl\}/g, samplePortalUrl)
        .replace(/\{\{clinicName\}\}/g, superadminSettings.clinicName || 'WiseCare')
        .replace(/\{\{therapistName\}\}/g, 'ד״ר מיכל כהן');
    }

    let tpl = superadminSettings.therapistInviteMessageTemplate || '';
    const sampleLoginUrl = `${origin}/login/dr-cohen-4921`;
    const sampleCrmUrl = `${origin}/crm/dr-cohen-4921`;

    return tpl
      .replace(/\{\{name\}\}/g, 'ד״ר מיכל כהן')
      .replace(/\{\{loginUrl\}\}/g, sampleLoginUrl)
      .replace(/\{\{username\}\}/g, 'michal_c')
      .replace(/\{\{password\}\}/g, 'SecurePass982')
      .replace(/\{\{crmUrl\}\}/g, sampleCrmUrl)
      .replace(/\{\{clinicName\}\}/g, superadminSettings.clinicName || 'WiseCare');
  };

  const handleOpenAddModal = () => {
    setFormData({
      name: '',
      username: '',
      password: '',
      email: '',
      phone: '',
      title: '',
      specialty: '',
      sendWhatsApp: true
    });
    setShowAddPassword(false);
    setIsTitleDropdownOpen(false);
    setTitleFilter('');
    setIsSpecialtyDropdownOpen(false);
    setSpecialtyFilter('');
    setIsAddModalOpen(true);
  };

  const handleOpenAddSelfCareModal = () => {
    setSelfCareFormData({
      fullName: '',
      phone: '',
      email: '',
      username: '',
      password: '',
      confirmPassword: '',
      goal: 'calm',
      privacyPolicy: false,
      sendWhatsApp: true
    });
    setShowAddPassword(false);
    setIsAddSelfCareModalOpen(true);
  };

  const handleCreateSelfCareUser = async (e) => {
    e.preventDefault();
    if (!selfCareFormData.fullName.trim() || !selfCareFormData.username.trim() || !selfCareFormData.password.trim()) {
      showToast('נא למלא שם, שם משתמש וסיסמה', 'error');
      return;
    }
    if (selfCareFormData.password !== selfCareFormData.confirmPassword) {
      showToast('אימות הסיסמה אינו תואם לסיסמה שהוזנה', 'error');
      return;
    }
    if (!selfCareFormData.privacyPolicy) {
      showToast('חובה לאשר את מדיניות הפרטיות ותנאי השימוש', 'error');
      return;
    }
    setSaving(true);
    try {
      const res = await api.joinSelfCare({
        fullName: selfCareFormData.fullName,
        phone: selfCareFormData.phone,
        email: selfCareFormData.email,
        username: selfCareFormData.username,
        password: selfCareFormData.password,
        goal: selfCareFormData.goal,
        sendWhatsApp: selfCareFormData.sendWhatsApp !== false
      });
      setIsAddSelfCareModalOpen(false);
      loadData();
      if (res?.whatsappSent) {
        showToast('משתמש מרחב אישי נוצר ופרטי החשבון נשלחו לוואטסאפ! 🚀', 'success');
      } else {
        showToast('משתמש מרחב אישי חדש נוצר בהצלחה!', 'success');
      }
    } catch (err) {
      showToast(err.response?.data?.error || err.message || 'שגיאה ביצירת המשתמש', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateTherapist = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.username.trim() || !formData.password.trim()) {
      showToast('נא למלא שם, שם משתמש וסיסמה', 'error');
      return;
    }

    const cleanUsername = formData.username.trim();
    if (!/^[a-zA-Z0-9_.-]{3,30}$/.test(cleanUsername)) {
      showToast('שם משתמש אינו תקין: אותיות באנגלית, ספרות, נקודות או קווים תחתונים בלבד (ללא רווחים)', 'error');
      return;
    }

    if (formData.password.length < 8) {
      showToast('הסיסמה קצרה מדי: נדרשים לפחות 8 תווים לרמת אבטחה מקצועית', 'error');
      return;
    }

    setSaving(true);
    try {
      const res = await api.createTherapist({
        ...formData,
        username: cleanUsername,
        sendWhatsApp: formData.sendWhatsApp !== false
      });
      setIsAddModalOpen(false);
      const createdTherapist = res.therapist || {
        ...formData,
        username: cleanUsername,
        loginCode: res.loginCode,
        loginUrl: res.loginUrl
      };
      setNewTherapistSuccess({
        ...createdTherapist,
        plainPassword: formData.password,
        whatsappStatus: res.whatsappStatus
      });
      setFormData({
        name: '',
        username: '',
        password: '',
        email: '',
        phone: '',
        title: '',
        specialty: '',
        sendWhatsApp: true
      });
      await loadData();
      if (res.whatsappStatus?.sent) {
        showToast('מטפל חדש נוסף ופרטי ההתחברות נשלחו אוטומטית לוואטסאפ! 🚀');
      } else {
        showToast('מטפל חדש נוסף בהצלחה למערכת! 👏');
      }
    } catch (err) {
      showToast('שגיאה ביצירת מטפל: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleResetCredentials = async (e) => {
    if (e) e.preventDefault();
    if (!resetModalTherapist) return;
    if (!resetFormData.password || resetFormData.password.length < 8) {
      showToast('הסיסמה חייבת להכיל לפחות 8 תווים לרמת אבטחה מקצועית', 'error');
      return;
    }

    try {
      setResettingSaving(true);
      const res = await api.resetTherapistCredentials(resetModalTherapist.id, {
        password: resetFormData.password,
        sendWhatsApp: resetFormData.sendWhatsApp !== false
      });
      showToast(`סיסמת המטפל/ת ${resetModalTherapist.name} עודכנה בהצלחה! 🔐`);
      if (res.whatsappStatus?.sent) {
        showToast(`הסיסמה החדשה נשלחה ישירות לוואטסאפ של המטפל! 🚀`);
      }
      setResetModalTherapist(null);
      setResetFormData({ password: '', sendWhatsApp: true });
      await loadData();
    } catch (err) {
      showToast('שגיאה באיפוס סיסמה: ' + err.message, 'error');
    } finally {
      setResettingSaving(false);
    }
  };

  const handleToggleActive = async (therapist) => {
    try {
      await api.updateTherapist(therapist.id, {
        active: !therapist.active
      });
      await loadData();
      showToast(`סטטוס המטפל ${therapist.name} עודכן בהצלחה`);
    } catch (err) {
      showToast('שגיאה בעדכון סטטוס: ' + err.message, 'error');
    }
  };

  const handleConfirmDeleteTherapist = async () => {
    if (!deleteTherapistModal) return;
    try {
      setDeletingTherapist(true);
      await api.deleteTherapist(deleteTherapistModal.id);
      showToast(`סביבת המטפל "${deleteTherapistModal.name}" נמחקה בהצלחה כולל כל נתוני הקליניקה 🗑️`);
      setDeleteTherapistModal(null);
      await loadData();
    } catch (err: any) {
      showToast('שגיאה במחיקת סביבת המטפל: ' + err.message, 'error');
    } finally {
      setDeletingTherapist(false);
    }
  };

  const handleConfirmDeleteClient = async () => {
    if (!deleteClientModal) return;
    try {
      setDeletingClient(true);
      await api.deleteClient(deleteClientModal.id);
      showToast(`סביבת המשתמש / מרחב אישי של "${deleteClientModal.firstName || ''} ${deleteClientModal.lastName || ''}" נמחקה בהצלחה 🗑️`);
      setDeleteClientModal(null);
      await loadData();
    } catch (err: any) {
      showToast('שגיאה במחיקת סביבת המשתמש: ' + err.message, 'error');
    } finally {
      setDeletingClient(false);
    }
  };

  const filtered = therapists.filter(t =>
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (t.specialty && t.specialty.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (!authChecked) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center', color: '#6366f1' }}>
          <RefreshCw size={36} style={{ margin: '0 auto 16px', animation: 'spin 1s linear infinite' }} />
          <p style={{ color: '#64748b', fontWeight: 600 }}>טוען נתוני אבטחה...</p>
        </div>
      </div>
    );
  }

  if (!currentAdmin || currentAdmin.role !== 'superadmin') {
    return (
      <div style={{
        minHeight: '80vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        direction: 'rtl'
      }}>
        <div style={{
          width: '100%',
          maxWidth: '440px',
          background: '#ffffff',
          borderRadius: '20px',
          boxShadow: '0 20px 40px -15px rgba(99, 102, 241, 0.15), 0 0 0 1px rgba(99, 102, 241, 0.1)',
          padding: '36px 32px',
          textAlign: 'center'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #e0e7ff 0%, #ede9fe 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
            color: '#6366f1',
            boxShadow: '0 8px 16px -4px rgba(99, 102, 241, 0.2)'
          }}>
            <ShieldCheck size={36} />
          </div>

          <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#1e293b', marginBottom: '8px' }}>
            גישה מאובטחת ל-SuperAdmin
          </h2>
          <p style={{ fontSize: '0.88rem', color: '#64748b', marginBottom: '24px', lineHeight: 1.5 }}>
            מרחב זה מאובטח ומוגבל למנהלי מערכת מורשים בלבד. נא להזין פרטי כניסה.
          </p>

          {loginError && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '12px 14px',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '10px',
              color: '#b91c1c',
              fontSize: '0.85rem',
              marginBottom: '20px',
              textAlign: 'right'
            }}>
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleSuperAdminLogin} style={{ textAlign: 'right' }}>
            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                שם משתמש
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  value={loginUsername}
                  onChange={e => setLoginUsername(e.target.value)}
                  placeholder="הזן שם משתמש (למשל adicore123)"
                  style={{
                    width: '100%',
                    padding: '12px 14px 12px 38px',
                    borderRadius: '10px',
                    border: '1.5px solid #e2e8f0',
                    fontSize: '0.95rem',
                    outline: 'none',
                    direction: 'ltr',
                    textAlign: 'left',
                    boxSizing: 'border-box'
                  }}
                  required
                />
                <User size={18} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                סיסמת גישה
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showLoginPassword ? 'text' : 'password'}
                  value={loginPassword}
                  onChange={e => setLoginPassword(e.target.value)}
                  placeholder="הזן סיסמת SuperAdmin"
                  style={{
                    width: '100%',
                    padding: '12px 38px 12px 14px',
                    borderRadius: '10px',
                    border: '1.5px solid #e2e8f0',
                    fontSize: '0.95rem',
                    outline: 'none',
                    direction: 'ltr',
                    textAlign: 'left',
                    boxSizing: 'border-box'
                  }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  {showLoginPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                color: '#ffffff',
                border: 'none',
                fontWeight: 700,
                fontSize: '0.98rem',
                cursor: loginLoading ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              {loginLoading ? (
                <>
                  <RefreshCw size={18} style={{ animation: 'spin 1s linear infinite' }} />
                  <span>מאמת פרטי כניסה...</span>
                </>
              ) : (
                <>
                  <LogIn size={18} />
                  <span>התחברות למערכת הניהול</span>
                </>
              )}
            </button>
          </form>

          <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #f1f5f9' }}>
            <a
              href="/login"
              style={{ fontSize: '0.82rem', color: '#6366f1', textDecoration: 'none', fontWeight: 600 }}
            >
              מעבר למסך כניסת מטפלים ומטופלים &larr;
            </a>
          </div>
        </div>

        <Toast
          message={toast?.message}
          type={toast?.type}
          onClose={() => setToast(null)}
        />
      </div>
    );
  }

  return (
    <div>
      {/* Top Header */}
      <div className="page-header superadmin-header">
        <div className="page-title-group">
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ShieldCheck size={28} color="#6366f1" /> פאנל מנהל מערכת ראשי (SuperAdmin)
          </h1>
          <p>
            ניהול כלל המטפלים והיוזרים במערכת, בקרה כוללת ואפשרות כניסה לסביבה של כל מטפל (Impersonation)
          </p>
        </div>

        <div className="superadmin-header-actions">
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 12px',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '10px'
          }}>
            <ShieldCheck size={16} color="#6366f1" />
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>
              {currentAdmin.name || currentAdmin.username}
            </span>
            <button
              type="button"
              onClick={handleSuperAdminLogout}
              title="התנתק"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '2px', display: 'flex', alignItems: 'center' }}
            >
              <LogIn size={15} style={{ transform: 'rotate(180deg)' }} />
            </button>
          </div>

          <button
            className="btn btn-primary"
            style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-hover, color-mix(in srgb, var(--primary) 85%, black)) 100%)' }}
            onClick={handleOpenAddSelfCareModal}
          >
            <UserPlus size={18} />
            <span>הוסף מטופל (מרחב אישי)</span>
          </button>
          
          <button
            className="btn btn-primary"
            style={{ background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' }}
            onClick={handleOpenAddModal}
          >
            <UserPlus size={18} />
            <span>הוסף מטפל חדש</span>
          </button>
        </div>
      </div>

      {/* SuperAdmin Navigation Subtabs */}
      <div className="superadmin-tabs-scroll">
        <button
          type="button"
          onClick={() => setActiveTab('therapists')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            fontSize: '0.95rem',
            fontWeight: 700,
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            borderBottom: activeTab === 'therapists' ? '3px solid #6366f1' : '3px solid transparent',
            color: activeTab === 'therapists' ? '#4f46e5' : '#64748b',
            marginBottom: '-2px',
            transition: 'all 0.2s ease'
          }}
        >
          <Users size={18} />
          <span>ניהול מטפלים וקליניקות</span>
          <span style={{
            background: activeTab === 'therapists' ? '#e0e7ff' : '#f1f5f9',
            color: activeTab === 'therapists' ? '#4338ca' : '#64748b',
            fontSize: '0.75rem',
            padding: '2px 8px',
            borderRadius: '12px',
            fontWeight: 700
          }}>
            {therapists.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('clients')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            fontSize: '0.95rem',
            fontWeight: 700,
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            borderBottom: activeTab === 'clients' ? '3px solid var(--primary)' : '3px solid transparent',
            color: activeTab === 'clients' ? 'var(--primary-hover, color-mix(in srgb, var(--primary) 85%, black))' : '#64748b',
            marginBottom: '-2px',
            transition: 'all 0.2s ease'
          }}
        >
          <UserCheck size={18} />
          <span>מרחבים עצמאיים</span>
          <span style={{
            background: activeTab === 'clients' ? 'var(--primary-light, color-mix(in srgb, var(--primary) 15%, white))' : '#f1f5f9',
            color: activeTab === 'clients' ? 'var(--primary-hover, color-mix(in srgb, var(--primary) 85%, black))' : '#64748b',
            fontSize: '0.75rem',
            padding: '2px 8px',
            borderRadius: '12px',
            fontWeight: 700
          }}>
            {selfCareClientsOnly.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('settings')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            fontSize: '0.95rem',
            fontWeight: 700,
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            borderBottom: activeTab === 'settings' ? '3px solid #6366f1' : '3px solid transparent',
            color: activeTab === 'settings' ? '#4f46e5' : '#64748b',
            marginBottom: '-2px',
            transition: 'all 0.2s ease'
          }}
        >
          <WhatsAppIcon size={18} />
          <span>הגדרות מערכת ואוטומציית WhatsApp</span>
          <span style={{
            background: superadminSettings.autoSendTherapistInviteWhatsApp ? 'var(--primary-light)' : '#f1f5f9',
            color: superadminSettings.autoSendTherapistInviteWhatsApp ? 'var(--primary-hover)' : '#64748b',
            fontSize: '0.72rem',
            padding: '2px 8px',
            borderRadius: '12px',
            fontWeight: 700
          }}>
            {superadminSettings.autoSendTherapistInviteWhatsApp ? 'פעיל' : 'כבוי'}
          </span>
        </button>
      </div>

      {/* Therapists Tab Content */}
      {activeTab === 'therapists' && (
        <>
          {/* Global Stats */}
          {stats && (
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon purple">
                  <Users size={26} />
                </div>
                <div className="stat-info">
                  <div className="stat-val">{stats.totalTherapists}</div>
                  <div className="stat-lbl">סה"כ מטפלים במערכת</div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon emerald">
                  <Building size={26} />
                </div>
                <div className="stat-info">
                  <div className="stat-val">{stats.totalClients}</div>
                  <div className="stat-lbl">סה"כ מטופלים ולקוחות</div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon blue">
                  <CheckCircle size={26} />
                </div>
                <div className="stat-info">
                  <div className="stat-val">{stats.completedTasks} / {stats.totalTasks}</div>
                  <div className="stat-lbl">משימות שהושלמו בבית</div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon amber">
                  <Sparkles size={26} />
                </div>
                <div className="stat-info">
                  <div className="stat-val">{stats.completionRate}%</div>
                  <div className="stat-lbl">שיעור היענות גלובלי</div>
                </div>
              </div>
            </div>
          )}

          {/* Therapists Table */}
          <div className="card-table">
            <div className="card-toolbar superadmin-search-wrapper">
              <div className="search-input-wrapper">
                <Search size={18} color="#94a3b8" />
                <input
                  type="text"
                  placeholder="חיפוש מטפל לפי שם, יוזר או התמחות..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>

              <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                נמצאו {filtered.length} מטפלים
              </span>
            </div>

            <div className="table-responsive superadmin-table-desktop">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>שם המטפל / קליניקה</th>
                    <th>שם משתמש</th>
                    <th>תואר והתמחות</th>
                    <th>טלפון / אימייל</th>
                    <th>כמות לקוחות</th>
                    <th>משימות פעילות</th>
                    <th>סטטוס</th>
                    <th>קישור כניסה ייחודי</th>
                    <th style={{ textAlign: 'left' }}>כניסה וסביבה</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(therapist => (
                    <React.Fragment key={therapist.id}>
                    <tr>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700
                          }}>
                            {therapist.name.charAt(0)}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: '#0f172a' }}>{therapist.name}</div>
                            <div style={{ fontSize: '0.78rem', color: '#64748b' }}>נוצר: {new Date(therapist.createdAt).toLocaleDateString('he-IL')}</div>
                          </div>
                        </div>
                      </td>

                      <td>
                        <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', fontSize: '0.85rem' }}>
                          {therapist.username}
                        </code>
                      </td>

                      <td>
                        <div style={{ fontWeight: 500 }}>{therapist.title}</div>
                        <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{therapist.specialty}</div>
                      </td>

                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.88rem' }}>
                          <span>{therapist.phone || '-'}</span>
                          {therapist.phone && (
                            <a
                              href={`https://wa.me/${therapist.phone.replace(/[^0-9]/g, '').startsWith('0') ? '972' + therapist.phone.replace(/[^0-9]/g, '').slice(1) : therapist.phone.replace(/[^0-9]/g, '')}`}
                              target="_blank"
                              rel="noreferrer"
                              title="פנה למטפל/ת ב-WhatsApp"
                              style={{ display: 'inline-flex', alignItems: 'center' }}
                            >
                              <WhatsAppIcon size={16} />
                            </a>
                          )}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{therapist.email}</div>
                      </td>

                      <td>
                        <button
                          type="button"
                          onClick={() => setExpandedTherapistId(expandedTherapistId === therapist.id ? null : therapist.id)}
                          className="badge badge-info"
                          style={{
                            cursor: 'pointer', border: '1px solid #c7d2fe', display: 'inline-flex',
                            alignItems: 'center', gap: '6px',
                            background: expandedTherapistId === therapist.id ? '#e0e7ff' : undefined
                          }}
                          title="לחץ להצגת כל המטופלים של מטפל/ת זה"
                        >
                          {clientsOfTherapist(therapist.id).length} מטופלים
                          <span style={{ fontSize: '0.7rem', transition: 'transform 0.15s ease', display: 'inline-block', transform: expandedTherapistId === therapist.id ? 'rotate(180deg)' : 'none' }}>
                            ▼
                          </span>
                        </button>
                      </td>

                      <td>
                        <span className="badge badge-neutral">{therapist.activeTasksCount || 0} משימות</span>
                      </td>

                      <td>
                        <button
                          onClick={() => handleToggleActive(therapist)}
                          className={`badge ${therapist.active ? 'badge-success' : 'badge-warning'}`}
                          style={{ cursor: 'pointer', border: 'none' }}
                          title="לחץ לשינוי סטטוס פעילות"
                        >
                          {therapist.active ? 'פעיל' : 'מושבת'}
                        </button>
                      </td>

                      {/* Unique Login Link & Sharing */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'nowrap' }}>
                          <code style={{
                            background: 'rgba(99, 102, 241, 0.08)',
                            color: '#4338ca',
                            border: '1px solid rgba(99, 102, 241, 0.25)',
                            padding: '3px 7px',
                            borderRadius: '6px',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            direction: 'ltr',
                            whiteSpace: 'nowrap'
                          }}>
                            /login/{therapist.loginCode}
                          </code>

                          <button
                            type="button"
                            onClick={() => handleCopyLoginLink(therapist)}
                            className="btn btn-secondary"
                            style={{
                              padding: '4px 7px',
                              fontSize: '0.75rem',
                              borderRadius: '6px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px'
                            }}
                            title="העתק קישור מלא ללוח"
                          >
                            {copiedId === therapist.id ? <Check size={13} color="var(--primary)" /> : <Copy size={13} />}
                            <span>{copiedId === therapist.id ? 'הועתק' : 'העתק'}</span>
                          </button>

                          <a
                            href={getTherapistLoginUrl(therapist.loginCode)}
                            target="_blank"
                            rel="noreferrer"
                            className="btn btn-secondary"
                            style={{
                              padding: '4px 7px',
                              fontSize: '0.75rem',
                              borderRadius: '6px',
                              display: 'inline-flex',
                              alignItems: 'center'
                            }}
                            title="פתח חלון כניסה של המטפל"
                          >
                            <ExternalLink size={13} />
                          </a>

                          <button
                            type="button"
                            onClick={() => handleSendWhatsAppInvite(therapist)}
                            disabled={sendingWhatsAppId === therapist.id}
                            className="btn btn-secondary"
                            style={{
                              padding: '4px 8px',
                              fontSize: '0.75rem',
                              borderRadius: '6px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              color: 'var(--primary-hover)',
                              borderColor: 'var(--primary-light)',
                              background: 'var(--primary-faint)'
                            }}
                            title="שלח פרטי התחברות וקישור בוואטסאפ של המטפל/ת"
                          >
                            <WhatsAppIcon size={14} />
                            <span>{sendingWhatsAppId === therapist.id ? 'שולח...' : 'שלח'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setResetModalTherapist(therapist);
                              setResetFormData({ password: '', sendWhatsApp: Boolean(therapist.phone) });
                            }}
                            className="btn btn-secondary"
                            style={{
                              padding: '4px 8px',
                              fontSize: '0.75rem',
                              borderRadius: '6px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              color: '#4f46e5',
                              borderColor: '#c7d2fe',
                              background: '#eef2ff'
                            }}
                            title="איפוס וקביעת סיסמה מאובטחת למטפל"
                          >
                            <Key size={13} />
                            <span>איפוס סיסמה</span>
                          </button>
                        </div>
                      </td>

                      <td style={{ textAlign: 'left' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            disabled={impersonatingTherapistId === therapist.id}
                            onClick={() => handleImpersonateTherapist(therapist)}
                            className="btn btn-primary"
                            style={{
                              padding: '6px 14px',
                              fontSize: '0.82rem',
                              background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              opacity: impersonatingTherapistId === therapist.id ? 0.75 : 1,
                              cursor: impersonatingTherapistId === therapist.id ? 'wait' : 'pointer'
                            }}
                            title={`התחבר ישירות למרחב הטיפול /crm/${therapist.loginCode}`}
                          >
                            {impersonatingTherapistId === therapist.id ? (
                              <>
                                <RefreshCw size={14} className="animate-spin" />
                                <span>מתחבר למרחב...</span>
                              </>
                            ) : (
                              <>
                                <LogIn size={14} />
                                <span>הכנס למרחב שלו</span>
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => setDeleteTherapistModal(therapist)}
                            className="btn btn-secondary"
                            style={{
                              padding: '6px 10px',
                              fontSize: '0.82rem',
                              borderRadius: '8px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              color: '#dc2626',
                              borderColor: '#fecaca',
                              background: '#fef2f2'
                            }}
                            title={`מחיקת סביבת המטפל ${therapist.name} לצמיתות`}
                          >
                            <Trash2 size={14} />
                            <span>מחק סביבה</span>
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Expanded row — the therapist's patients */}
                    {expandedTherapistId === therapist.id && (
                      <tr style={{ background: '#f8fafc' }}>
                        <td colSpan={9} style={{ padding: '14px 18px', borderTop: '1px dashed #e2e8f0', borderBottom: '1px dashed #e2e8f0' }}>
                          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#4338ca', marginBottom: '10px' }}>
                            👥 המטופלים של {therapist.name} ({clientsOfTherapist(therapist.id).length})
                          </div>
                          {renderPatientsList(therapist.id)}
                        </td>
                      </tr>
                    )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Responsive Cards for Therapists */}
            <div className="superadmin-cards-mobile" style={{ padding: '12px' }}>
              {filtered.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 16px', color: '#64748b' }}>
                  לא נמצאו מטפלים
                </div>
              ) : (
                filtered.map(therapist => (
                  <div key={therapist.id} className="superadmin-mobile-card">
                    {/* Header */}
                    <div className="superadmin-mobile-card-header">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div className="superadmin-mobile-card-avatar" style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)' }}>
                          {therapist.name.charAt(0)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.98rem', color: '#0f172a' }}>{therapist.name}</div>
                          <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{therapist.title || 'מטפל/ת'} • {therapist.specialty || 'קליניקה'}</div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleToggleActive(therapist)}
                        className={`badge ${therapist.active ? 'badge-success' : 'badge-warning'}`}
                        style={{ cursor: 'pointer', border: 'none', padding: '4px 10px' }}
                        title="לחץ לשינוי סטטוס"
                      >
                        {therapist.active ? 'פעיל' : 'מושבת'}
                      </button>
                    </div>

                    {/* Metadata Row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', fontSize: '0.82rem' }}>
                      <code style={{ background: '#f1f5f9', padding: '2px 8px', borderRadius: '6px', color: '#475569' }}>
                        @{therapist.username}
                      </code>
                      <button
                        type="button"
                        onClick={() => setExpandedTherapistId(expandedTherapistId === therapist.id ? null : therapist.id)}
                        className="badge badge-info"
                        style={{ cursor: 'pointer', border: '1px solid #c7d2fe', display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.76rem' }}
                        title="לחץ להצגת כל המטופלים של מטפל/ת זה"
                      >
                        👥 {clientsOfTherapist(therapist.id).length} מטופלים
                        <span style={{ fontSize: '0.68rem', display: 'inline-block', transform: expandedTherapistId === therapist.id ? 'rotate(180deg)' : 'none' }}>▼</span>
                      </button>
                      <span className="badge badge-neutral">{therapist.activeTasksCount || 0} משימות</span>
                    </div>

                    {/* Expanded patients (mobile) */}
                    {expandedTherapistId === therapist.id && (
                      <div style={{ background: '#f8fafc', border: '1px dashed #e2e8f0', borderRadius: '10px', padding: '10px' }}>
                        {renderPatientsList(therapist.id)}
                      </div>
                    )}

                    {/* Contact Row */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', padding: '8px 12px', borderRadius: '10px', fontSize: '0.84rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Phone size={14} color="#64748b" />
                        <span dir="ltr">{therapist.phone || 'אין טלפון'}</span>
                      </div>
                      {therapist.phone && (
                        <a
                          href={`https://wa.me/${therapist.phone.replace(/[^0-9]/g, '').startsWith('0') ? '972' + therapist.phone.replace(/[^0-9]/g, '').slice(1) : therapist.phone.replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-secondary"
                          style={{ padding: '4px 10px', fontSize: '0.78rem', color: 'var(--primary-hover)', borderColor: 'var(--primary-light)', background: 'var(--primary-faint)' }}
                        >
                          <WhatsAppIcon size={14} />
                          <span>וואטסאפ</span>
                        </a>
                      )}
                    </div>

                    {/* Link & Invite Row */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => handleCopyLoginLink(therapist)}
                        className="btn btn-secondary"
                        style={{ fontSize: '0.8rem', padding: '8px', justifyContent: 'center' }}
                      >
                        {copiedId === therapist.id ? <Check size={14} color="var(--primary)" /> : <Copy size={14} />}
                        <span>{copiedId === therapist.id ? 'הועתק' : 'העתק קישור'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSendWhatsAppInvite(therapist)}
                        disabled={sendingWhatsAppId === therapist.id}
                        className="btn btn-secondary"
                        style={{ fontSize: '0.8rem', padding: '8px', justifyContent: 'center', color: 'var(--primary-hover)', borderColor: 'var(--primary-light)', background: 'var(--primary-faint)' }}
                      >
                        <WhatsAppIcon size={14} />
                        <span>{sendingWhatsAppId === therapist.id ? 'שולח...' : 'שלח פרטים'}</span>
                      </button>
                    </div>

                    {/* Impersonation & Actions */}
                    <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                      <button
                        type="button"
                        onClick={() => handleImpersonateTherapist(therapist)}
                        disabled={impersonatingTherapistId === therapist.id}
                        className="btn btn-primary"
                        style={{
                          flex: 1,
                          background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
                          fontSize: '0.86rem',
                          padding: '10px',
                          justifyContent: 'center'
                        }}
                      >
                        {impersonatingTherapistId === therapist.id ? (
                          <>
                            <RefreshCw size={14} className="animate-spin" />
                            <span>מתחבר...</span>
                          </>
                        ) : (
                          <>
                            <LogIn size={15} />
                            <span>כניסה לסביבתו</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setResetModalTherapist(therapist);
                          setResetFormData({ password: '', sendWhatsApp: Boolean(therapist.phone) });
                        }}
                        className="btn btn-secondary"
                        style={{ padding: '10px', fontSize: '0.8rem' }}
                        title="איפוס סיסמה"
                      >
                        <Key size={15} />
                      </button>

                      <button
                        type="button"
                        onClick={() => setDeleteTherapistModal(therapist)}
                        className="btn btn-secondary"
                        style={{ padding: '10px', fontSize: '0.8rem', color: '#dc2626', borderColor: '#fecaca', background: '#fef2f2' }}
                        title="מחק סביבה"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}

      {/* Settings & WhatsApp Automation Tab Content */}
      {activeTab === 'settings' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Main Info Banner */}
          <div style={{
            background: 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)',
            border: '1px solid #c7d2fe',
            borderRadius: '16px',
            padding: '20px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{
                width: '52px',
                height: '52px',
                borderRadius: '14px',
                background: 'linear-gradient(135deg, #25d366 0%, #128c7e 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                boxShadow: '0 4px 12px rgba(37, 211, 102, 0.25)',
                flexShrink: 0
              }}>
                <WhatsAppIcon size={30} />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#1e1b4b' }}>
                  אוטומציית הודעות WhatsApp בעת פתיחת מטפל חדש
                </h2>
                <p style={{ margin: '4px 0 0', fontSize: '0.9rem', color: '#4338ca', lineHeight: '1.5' }}>
                  כאשר סופראדמין פותח יוזר או מטפל חדש במערכת, כל פרטי ההתחברות (קישור ייחודי, שם משתמש וסיסמה) נשלחים אוטומטית לוואטסאפ שלו.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: greenApiStatus?.stateInstance === 'authorized' ? 'var(--primary-light)' : '#fef3c7',
                border: `1px solid ${greenApiStatus?.stateInstance === 'authorized' ? 'color-mix(in srgb, var(--primary) 40%, white)' : '#fde68a'}`,
                color: greenApiStatus?.stateInstance === 'authorized' ? 'var(--primary-hover)' : '#b45309',
                padding: '6px 12px',
                borderRadius: '20px',
                fontSize: '0.82rem',
                fontWeight: 700
              }}>
                <span style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: greenApiStatus?.stateInstance === 'authorized' ? 'var(--primary)' : '#f59e0b',
                  display: 'inline-block'
                }}></span>
                <span>Green API: {greenApiStatus?.stateInstance === 'authorized' ? 'מחובר (Authorized)' : (greenApiStatus?.stateInstance || 'נבדק')}</span>
              </div>

              <button
                type="button"
                onClick={handleRefreshGreenApiStatus}
                className="btn btn-secondary"
                style={{ padding: '6px 12px', fontSize: '0.82rem' }}
                title="בדוק סטטוס חיבור Green API כעת"
              >
                <RefreshCw size={14} />
                <span>רענן חיבור</span>
              </button>
            </div>
          </div>

          {/* Settings Grid: Form on the right (RTL), Live WhatsApp preview on the left */}
          <div className="superadmin-settings-grid">
            {/* Left Column in RTL: Settings Form Controls */}
            <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Automation Toggle Switch Card */}
              <div style={{
                background: 'white',
                border: '1px solid #e2e8f0',
                borderRadius: '16px',
                padding: '20px 24px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
                  <div>
                    <label
                      htmlFor="autoSendWhatsAppToggle"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '1rem',
                        fontWeight: 700,
                        color: '#0f172a',
                        cursor: 'pointer',
                        margin: 0
                      }}
                    >
                      <WhatsAppIcon size={20} />
                      <span>שליחה אוטומטית בעת יצירת מטפל חדש</span>
                    </label>
                    <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#64748b', lineHeight: '1.4' }}>
                      ברגע שנשמר מטפל חדש עם מספר טלפון, תישלח אליו הודעה מיידית עם פרטי החשבון.
                    </p>
                  </div>

                  {/* Toggle Switch */}
                  <label style={{ position: 'relative', display: 'inline-block', width: '50px', height: '28px', flexShrink: 0, cursor: 'pointer' }}>
                    <input
                      id="autoSendWhatsAppToggle"
                      type="checkbox"
                      checked={superadminSettings.autoSendTherapistInviteWhatsApp}
                      onChange={e => setSuperadminSettings({
                        ...superadminSettings,
                        autoSendTherapistInviteWhatsApp: e.target.checked
                      })}
                      style={{ opacity: 0, width: 0, height: 0 }}
                    />
                    <span style={{
                      position: 'absolute',
                      cursor: 'pointer',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      backgroundColor: superadminSettings.autoSendTherapistInviteWhatsApp ? 'var(--primary)' : '#cbd5e1',
                      transition: '.3s',
                      borderRadius: '34px'
                    }}>
                      <span style={{
                        position: 'absolute',
                        content: '""',
                        height: '20px',
                        width: '20px',
                        left: superadminSettings.autoSendTherapistInviteWhatsApp ? '26px' : '4px',
                        bottom: '4px',
                        backgroundColor: 'white',
                        transition: '.3s',
                        borderRadius: '50%',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                      }}></span>
                    </span>
                  </label>
                </div>
              </div>

              {/* Message Template Editor Card */}
              <div style={{
                background: 'white',
                border: '1px solid #e2e8f0',
                borderRadius: '16px',
                padding: '24px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>
                      עריכת תבניות הודעות WhatsApp במערכת
                    </h3>
                    <p style={{ margin: '3px 0 0', fontSize: '0.84rem', color: '#64748b' }}>
                      בחר/י את סוג ההודעה שברצונך להגדיר. המערכת תחליף את התגיות בערכים האמיתיים בזמן שליחה.
                    </p>
                  </div>
                </div>

                {/* Template Switcher Tabs */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
                  <button
                    type="button"
                    onClick={() => setActiveTemplateKey('therapist')}
                    style={{
                      padding: '8px 14px',
                      borderRadius: '8px',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '0.86rem',
                      fontWeight: 700,
                      background: activeTemplateKey === 'therapist' ? '#4f46e5' : '#f1f5f9',
                      color: activeTemplateKey === 'therapist' ? '#ffffff' : '#475569',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <User size={15} />
                    <span>הזמנת מטפל חדש</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTemplateKey('article')}
                    style={{
                      padding: '8px 14px',
                      borderRadius: '8px',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '0.86rem',
                      fontWeight: 700,
                      background: activeTemplateKey === 'article' ? 'var(--primary)' : '#f1f5f9',
                      color: activeTemplateKey === 'article' ? '#ffffff' : '#475569',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <FileText size={15} />
                    <span>הודעת שיתוף מאמר למטופל 📖</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTemplateKey('media')}
                    style={{
                      padding: '8px 14px',
                      borderRadius: '8px',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '0.86rem',
                      fontWeight: 700,
                      background: activeTemplateKey === 'media' ? '#7c3aed' : '#f1f5f9',
                      color: activeTemplateKey === 'media' ? '#ffffff' : '#475569',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <Share2 size={15} />
                    <span>הודעת שיתוף סרטון / פוסט למטופל 🎬</span>
                  </button>
                </div>

                {/* Placeholders Quick Insertion Bar */}
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '8px',
                  marginBottom: '14px',
                  background: '#f8fafc',
                  padding: '12px',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0'
                }}>
                  {(activeTemplateKey === 'therapist' ? [
                    { tag: '{{name}}', label: 'שם המטפל' },
                    { tag: '{{loginUrl}}', label: 'קישור התחברות אישי' },
                    { tag: '{{username}}', label: 'שם משתמש' },
                    { tag: '{{password}}', label: 'סיסמה ראשונית' },
                    { tag: '{{crmUrl}}', label: 'קישור למרחב הטיפול (CRM)' },
                    { tag: '{{clinicName}}', label: 'שם הקליניקה/המערכת' },
                  ] : [
                    { tag: '{{firstName}}', label: 'שם המטופל' },
                    { tag: '{{title}}', label: 'כותרת המאמר/התוכן' },
                    { tag: '{{portalUrl}}', label: 'קישור ישיר למרחב האישי' },
                    { tag: '{{type}}', label: 'סוג התוכן (מאמר / סרטון)' },
                    { tag: '{{clinicName}}', label: 'שם הקליניקה' },
                    { tag: '{{therapistName}}', label: 'שם המטפל/ת' }
                  ]).map(p => (
                    <button
                      key={p.tag}
                      type="button"
                      onClick={() => handleInsertPlaceholder(p.tag)}
                      className="btn btn-secondary"
                      style={{
                        padding: '4px 10px',
                        fontSize: '0.78rem',
                        borderRadius: '6px',
                        background: 'white',
                        border: '1px solid #cbd5e1',
                        color: '#334155',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                      title={`הוסף את ${p.label} למיקום הסמן`}
                    >
                      <span style={{ color: activeTemplateKey === 'article' ? 'var(--primary)' : activeTemplateKey === 'media' ? '#7c3aed' : '#4f46e5', fontWeight: 700, direction: 'ltr' }}>{p.tag}</span>
                      <span style={{ color: '#64748b', fontSize: '0.72rem' }}>({p.label})</span>
                    </button>
                  ))}
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  {activeTemplateKey === 'therapist' && (
                    <textarea
                      rows={10}
                      className="form-control"
                      style={{
                        fontFamily: 'inherit',
                        fontSize: '0.9rem',
                        lineHeight: '1.6',
                        padding: '14px',
                        borderRadius: '10px',
                        border: '1px solid #cbd5e1',
                        whiteSpace: 'pre-wrap',
                        direction: 'rtl'
                      }}
                      value={superadminSettings.therapistInviteMessageTemplate || ''}
                      onChange={e => setSuperadminSettings({
                        ...superadminSettings,
                        therapistInviteMessageTemplate: e.target.value
                      })}
                      placeholder="הזן את נוסח ההודעה שתישלח למטפל בוואטסאפ..."
                    />
                  )}

                  {activeTemplateKey === 'article' && (
                    <textarea
                      rows={10}
                      className="form-control"
                      style={{
                        fontFamily: 'inherit',
                        fontSize: '0.9rem',
                        lineHeight: '1.6',
                        padding: '14px',
                        borderRadius: '10px',
                        border: '1px solid #cbd5e1',
                        whiteSpace: 'pre-wrap',
                        direction: 'rtl'
                      }}
                      value={superadminSettings.articleNotificationTemplate || ''}
                      onChange={e => setSuperadminSettings({
                        ...superadminSettings,
                        articleNotificationTemplate: e.target.value
                      })}
                      placeholder="הזן את נוסח ההודעה שתישלח למטופל בעת שיתוף מאמר..."
                    />
                  )}

                  {activeTemplateKey === 'media' && (
                    <textarea
                      rows={10}
                      className="form-control"
                      style={{
                        fontFamily: 'inherit',
                        fontSize: '0.9rem',
                        lineHeight: '1.6',
                        padding: '14px',
                        borderRadius: '10px',
                        border: '1px solid #cbd5e1',
                        whiteSpace: 'pre-wrap',
                        direction: 'rtl'
                      }}
                      value={superadminSettings.mediaNotificationTemplate || ''}
                      onChange={e => setSuperadminSettings({
                        ...superadminSettings,
                        mediaNotificationTemplate: e.target.value
                      })}
                      placeholder="הזן את נוסח ההודעה שתישלח למטופל בעת שיתוף סרטון או פוסט..."
                    />
                  )}
                </div>
              </div>

              {/* General System & Clinic Info Card */}
              <div style={{
                background: 'white',
                border: '1px solid #e2e8f0',
                borderRadius: '16px',
                padding: '24px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
              }}>
                <h3 style={{ margin: '0 0 16px', fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
                  הגדרות קליניקה ומזהי שרת
                </h3>

                <div className="form-row">
                  <div className="form-group">
                    <label>שם המערכת / הקליניקה (מופיע בהודעות)</label>
                    <input
                      type="text"
                      className="form-control"
                      value={superadminSettings.clinicName || ''}
                      onChange={e => setSuperadminSettings({
                        ...superadminSettings,
                        clinicName: e.target.value
                      })}
                      placeholder="WiseCare"
                    />
                  </div>

                  <div className="form-group">
                    <label>Green API Instance ID</label>
                    <input
                      type="text"
                      className="form-control"
                      value={superadminSettings.greenApiInstanceId || ''}
                      onChange={e => setSuperadminSettings({
                        ...superadminSettings,
                        greenApiInstanceId: e.target.value
                      })}
                      placeholder="מוגדר מראש משרת ה-Backend"
                    />
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div>
                <button
                  type="submit"
                  disabled={savingSettings}
                  className="btn btn-primary"
                  style={{
                    padding: '12px 28px',
                    fontSize: '1rem',
                    fontWeight: 700,
                    background: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 14px rgba(79, 70, 229, 0.25)'
                  }}
                >
                  <Save size={18} />
                  <span>{savingSettings ? 'שומר שינויים...' : 'שמור הגדרות מערכת ואוטומציה'}</span>
                </button>
              </div>
            </form>

            {/* Right Column in RTL: Live WhatsApp Preview */}
            <div style={{
              position: 'sticky',
              top: '20px',
              background: '#efeae2',
              backgroundImage: 'radial-gradient(#d1d7db 1px, transparent 1px)',
              backgroundSize: '20px 20px',
              borderRadius: '24px',
              border: '1px solid #d1d7db',
              overflow: 'hidden',
              boxShadow: '0 8px 30px rgba(0,0,0,0.1)'
            }}>
              {/* WhatsApp Phone Mock Header */}
              <div style={{
                background: '#075e54',
                color: 'white',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                boxShadow: '0 2px 5px rgba(0,0,0,0.15)'
              }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: '#25d366',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '1.1rem',
                  color: 'white'
                }}>
                  <WhatsAppIcon size={24} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                    {superadminSettings.clinicName || 'WiseCare'} מערכת
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--primary-light)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--primary)', display: 'inline-block' }}></span>
                    <span>מחובר כעת (בוט אוטומטי)</span>
                  </div>
                </div>
              </div>

              {/* Chat Bubble Area */}
              <div style={{ padding: '20px 16px', minHeight: '380px' }}>
                <div style={{
                  textAlign: 'center',
                  marginBottom: '16px'
                }}>
                  <span style={{
                    background: activeTemplateKey === 'article' ? 'var(--primary-light, color-mix(in srgb, var(--primary) 15%, white))' : activeTemplateKey === 'media' ? '#ede9fe' : '#e1f3fb',
                    color: activeTemplateKey === 'article' ? 'var(--primary-hover, color-mix(in srgb, var(--primary) 85%, black))' : activeTemplateKey === 'media' ? '#6d28d9' : '#0284c7',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    padding: '3px 10px',
                    borderRadius: '12px',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                  }}>
                    {activeTemplateKey === 'article' ? 'הודעת שיתוף מאמר שתישלח למטופל בוואטסאפ 📖' :
                     activeTemplateKey === 'media' ? 'הודעת שיתוף סרטון/מדיה שתישלח למטופל בוואטסאפ 🎬' :
                     'הודעה אוטומטית שתישלח למטפל בעת פתיחת חשבון'}
                  </span>
                </div>

                {/* WhatsApp Message Bubble */}
                <div style={{
                  background: '#ffffff',
                  borderRadius: '12px 12px 0 12px',
                  padding: '12px 14px',
                  maxWidth: '92%',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
                  position: 'relative',
                  fontSize: '0.88rem',
                  lineHeight: '1.55',
                  color: '#111b21',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  direction: 'rtl'
                }}>
                  {getPreviewMessage()}

                  {/* WhatsApp Metadata */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    gap: '4px',
                    marginTop: '6px',
                    fontSize: '0.68rem',
                    color: '#667781'
                  }}>
                    <span>10:00</span>
                    <span style={{ color: '#53bdeb', fontWeight: 800 }}>✓✓</span>
                  </div>
                </div>
              </div>

              {/* Preview Footer Note */}
              <div style={{
                background: '#ffffff',
                borderTop: '1px solid #e2e8f0',
                padding: '10px 14px',
                fontSize: '0.78rem',
                color: '#64748b',
                textAlign: 'center'
              }}>
                {activeTemplateKey === 'article' ? 'תצוגה מקדימה של הודעת WhatsApp עבור שיתוף מאמר' :
                 activeTemplateKey === 'media' ? 'תצוגה מקדימה של הודעת WhatsApp עבור שיתוף סרטון / פוסט' :
                 'תצוגה מקדימה בזמן אמת של הודעת הוואטסאפ שתגיע למטפל'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* All Clients & Self-Care Users Tab Content */}
      {activeTab === 'clients' && (() => {
        const totalClients = clients.length;
        const selfCareClients = clients.filter(c => c.isSelfCare);
        const clinicClients = clients.filter(c => !c.isSelfCare);

        const filteredClients = clients.filter(c => {
          // This tab shows ONLY standalone (self-care) spaces — therapist
          // patients live inside their therapist's expandable row
          if (!c.isSelfCare) return false;

          if (!clientSearchTerm.trim()) return true;
          const query = clientSearchTerm.trim().toLowerCase();
          const fullName = `${c.firstName || ''} ${c.lastName || ''}`.toLowerCase();
          const email = (c.email || '').toLowerCase();
          const phone = (c.phone || '').replace(/[^0-9]/g, '');
          const portalCode = (c.portalCode || '').toLowerCase();

          return (
            fullName.includes(query) ||
            email.includes(query) ||
            phone.includes(query.replace(/[^0-9]/g, '')) ||
            portalCode.includes(query)
          );
        });

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Global Clients Stats Banner */}
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon purple">
                  <Users size={26} />
                </div>
                <div className="stat-info">
                  <div className="stat-val">{totalClients}</div>
                  <div className="stat-lbl">סה"כ לקוחות ומטופלים במערכת</div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon green" style={{ background: 'var(--primary-light)', color: 'var(--primary-hover)' }}>
                  <Sparkles size={26} />
                </div>
                <div className="stat-info">
                  <div className="stat-val">{selfCareClients.length}</div>
                  <div className="stat-lbl">משתמשי מרחב עצמאי (Self-Care)</div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon blue" style={{ background: '#e0f2fe', color: '#0369a1' }}>
                  <Building size={26} />
                </div>
                <div className="stat-info">
                  <div className="stat-val">{clinicClients.length}</div>
                  <div className="stat-lbl">מטופלים משויכים לקליניקות</div>
                </div>
              </div>
            </div>

            {/* Quick Informational Notice on SuperAdmin Direct Access */}
            <div style={{
              background: 'linear-gradient(135deg, var(--primary-faint) 0%, var(--primary-faint) 100%)',
              border: '1px solid var(--primary-light)',
              borderRadius: '16px',
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: 'var(--primary)',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 6px color-mix(in srgb, var(--primary) 30%, transparent)'
                }}>
                  <Key size={20} />
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.96rem', color: '#064e3b' }}>
                    כניסת מנהל ראשי (SuperAdmin) ישירה לכל מרחב ללא צורך בסיסמה
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--primary-hover)', marginTop: '2px' }}>
                    כמנהל מערכת, באפשרותך להיכנס ישירות למרחב של כל מטופל או משתמש עצמאי בלחיצה אחת לצורך מתן תמיכה, בדיקת תקינות או סיוע.
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsPrivacyOpen(true)}
                className="btn btn-secondary"
                style={{
                  padding: '6px 14px',
                  fontSize: '0.82rem',
                  borderColor: 'color-mix(in srgb, var(--primary) 40%, white)',
                  background: '#ffffff',
                  color: 'var(--primary-hover)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <ShieldCheck size={14} color="var(--primary)" />
                <span>מדיניות פרטיות ואבטחה</span>
              </button>
            </div>

            {/* Clients Table Card */}
            <div className="card">
              <div className="card-header superadmin-search-wrapper" style={{ flexWrap: 'wrap', gap: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  {/* Search Bar */}
                  <div className="search-bar" style={{ minWidth: '280px' }}>
                    <Search size={18} />
                    <input
                      type="text"
                      placeholder="חיפוש לפי שם, טלפון, אימייל, קוד פורטל..."
                      value={clientSearchTerm}
                      onChange={e => setClientSearchTerm(e.target.value)}
                    />
                    {clientSearchTerm && (
                      <button
                        type="button"
                        onClick={() => setClientSearchTerm('')}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '0 6px' }}
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>

                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: '8px',
                    background: 'var(--primary-faint)', border: '1px solid var(--primary-glow, color-mix(in srgb, var(--primary) 30%, white))',
                    padding: '6px 14px', borderRadius: '100px',
                    fontSize: '0.82rem', fontWeight: 600, color: 'var(--primary-hover, color-mix(in srgb, var(--primary) 85%, black))'
                  }} title="מטופלים המשויכים למטפלים מוצגים בטאב 'ניהול מטפלים' — בתוך השורה של המטפל שלהם">
                    🌿 מרחבים עצמאיים בלבד ({selfCareClientsOnly.length})
                  </div>

                  <label style={{
                    display: 'inline-flex', alignItems: 'center', gap: '8px',
                    fontSize: '0.84rem', color: '#475569', fontWeight: 600,
                    cursor: 'pointer', userSelect: 'none'
                  }} title="לקוחות שנמחקו (ארכיון) מוסתרים כברירת מחדל">
                    <input
                      type="checkbox"
                      checked={showArchived}
                      onChange={async (e) => {
                        const next = e.target.checked;
                        setShowArchived(next);
                        try {
                          const res = await api.getSuperadminClients(next).catch(() => []);
                          setClients(res || []);
                        } catch { /* keep previous list */ }
                      }}
                    />
                    הצגת ארכיון
                  </label>
                </div>

                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                  נמצאו {filteredClients.length} לקוחות
                </span>
              </div>

              <div className="table-responsive superadmin-table-desktop">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>שם הלקוח / מטופל</th>
                      <th>סוג מרחב ושיוך</th>
                      <th>קוד וקישור כניסה</th>
                      <th>טלפון ואימייל</th>
                      <th>משימות ותרגולים</th>
                      <th style={{ textAlign: 'left' }}>גישת SuperAdmin ללא סיסמה</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredClients.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
                          <Users size={36} color="#cbd5e1" style={{ margin: '0 auto 12px auto', display: 'block' }} />
                          <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>לא נמצאו לקוחות מתאימים</div>
                          <div style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: '4px' }}>
                            נסה לשנות את מונח החיפוש או הסינון
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredClients.map(client => {
                        const displayName = `${client.firstName || ''} ${client.lastName || ''}`.trim() || 'לקוח ללא שם';
                        const firstLetter = displayName.charAt(0);
                        const isSelf = Boolean(client.isSelfCare);

                        return (
                          <tr key={client.id || client.portalCode}>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{
                                  width: '38px',
                                  height: '38px',
                                  borderRadius: '50%',
                                  background: isSelf
                                    ? 'linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%)'
                                    : 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
                                  color: 'white',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontWeight: 700,
                                  fontSize: '0.95rem'
                                }}>
                                  {firstLetter}
                                </div>
                                <div>
                                  <div style={{ fontWeight: 600, color: client.archived ? '#94a3b8' : '#0f172a', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                    {displayName}
                                    {client.archived && (
                                      <span style={{
                                        fontSize: '0.68rem', fontWeight: 700, padding: '2px 9px', borderRadius: '100px',
                                        background: '#f1f5f9', color: '#64748b', border: '1px solid #e2e8f0'
                                      }}>
                                        בארכיון
                                      </span>
                                    )}
                                  </div>
                                  <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                                    {client.createdAt ? `נוצר: ${new Date(client.createdAt).toLocaleDateString('he-IL')}` : 'פעיל במערכת'}
                                  </div>
                                </div>
                              </div>
                            </td>

                            <td>
                              {isSelf ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                  <span style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    background: 'var(--primary-faint)',
                                    color: 'var(--primary-hover)',
                                    border: '1px solid var(--primary-light)',
                                    padding: '3px 8px',
                                    borderRadius: '8px',
                                    fontSize: '0.78rem',
                                    fontWeight: 700,
                                    width: 'fit-content'
                                  }}>
                                    🌿 מרחב עצמאי (Self-Care)
                                  </span>
                                  <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
                                    אינו תלוי במטפל (פרטיות מלאה)
                                  </span>
                                </div>
                              ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                  <span style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    background: '#eef2ff',
                                    color: '#4338ca',
                                    border: '1px solid #c7d2fe',
                                    padding: '3px 8px',
                                    borderRadius: '8px',
                                    fontSize: '0.78rem',
                                    fontWeight: 700,
                                    width: 'fit-content'
                                  }}>
                                    🏥 {client.therapist?.name || 'משויך לקליניקה'}
                                  </span>
                                  <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
                                    {client.therapist?.title || 'קליניקה מנוהלת'}
                                  </span>
                                </div>
                              )}
                            </td>

                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'nowrap' }}>
                                <code style={{
                                  background: isSelf ? 'color-mix(in srgb, var(--primary) 8%, transparent)' : 'rgba(99, 102, 241, 0.08)',
                                  color: isSelf ? 'var(--primary-hover, color-mix(in srgb, var(--primary) 85%, black))' : '#4338ca',
                                  border: `1px solid ${isSelf ? 'color-mix(in srgb, var(--primary) 25%, transparent)' : 'rgba(99, 102, 241, 0.25)'}`,
                                  padding: '3px 7px',
                                  borderRadius: '6px',
                                  fontSize: '0.78rem',
                                  fontWeight: 600,
                                  direction: 'ltr',
                                  whiteSpace: 'nowrap'
                                }}>
                                  /portal/{client.portalCode}
                                </code>

                                <button
                                  type="button"
                                  onClick={() => handleCopyClientPortalLink(client)}
                                  className="btn btn-secondary"
                                  style={{
                                    padding: '4px 7px',
                                    fontSize: '0.75rem',
                                    borderRadius: '6px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px'
                                  }}
                                  title="העתק קישור מלא למרחב"
                                >
                                  {copiedClientId === client.id ? <Check size={13} color="var(--primary)" /> : <Copy size={13} />}
                                  <span>{copiedClientId === client.id ? 'הועתק' : 'העתק'}</span>
                                </button>

                                <a
                                  href={`/portal/${client.portalCode}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="btn btn-secondary"
                                  style={{
                                    padding: '4px 7px',
                                    fontSize: '0.75rem',
                                    borderRadius: '6px',
                                    display: 'inline-flex',
                                    alignItems: 'center'
                                  }}
                                  title="פתח קישור חיצוני לפורטל"
                                >
                                  <ExternalLink size={13} />
                                </a>
                              </div>
                            </td>

                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.88rem' }}>
                                <span>{client.phone || '-'}</span>
                                {client.phone && (
                                  <a
                                    href={`https://wa.me/${client.phone.replace(/[^0-9]/g, '').startsWith('0') ? '972' + client.phone.replace(/[^0-9]/g, '').slice(1) : client.phone.replace(/[^0-9]/g, '')}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    title="שלח הודעה ב-WhatsApp"
                                    style={{ display: 'inline-flex', alignItems: 'center' }}
                                  >
                                    <WhatsAppIcon size={16} />
                                  </a>
                                )}
                              </div>
                              <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{client.email || 'אין כתובת מייל'}</div>
                            </td>

                            <td>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155' }}>
                                  {client.completedTasksCount || 0} / {client.tasksCount || 0} הושלמו
                                </span>
                                <div style={{
                                  width: '100px',
                                  height: '6px',
                                  borderRadius: '3px',
                                  background: '#e2e8f0',
                                  overflow: 'hidden'
                                }}>
                                  <div style={{
                                    width: client.tasksCount ? `${Math.min(100, Math.round(((client.completedTasksCount || 0) / client.tasksCount) * 100))}%` : '0%',
                                    height: '100%',
                                    background: isSelf ? 'var(--primary)' : '#6366f1'
                                  }} />
                                </div>
                              </div>
                            </td>

                            <td style={{ textAlign: 'left' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-end' }}>
                                <button
                                  type="button"
                                  onClick={() => handleImpersonateClient(client)}
                                  disabled={impersonatingClientId === client.id}
                                  className="btn btn-primary"
                                  style={{
                                    padding: '7px 16px',
                                    fontSize: '0.84rem',
                                    background: isSelf
                                      ? 'linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%)'
                                      : 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    boxShadow: isSelf
                                      ? '0 2px 8px color-mix(in srgb, var(--primary) 30%, transparent)'
                                      : '0 2px 8px rgba(79, 70, 229, 0.3)'
                                  }}
                                  title="התחבר ישירות למרחב הלקוח ללא סיסמה כמנהל ראשי"
                                >
                                  <Key size={14} />
                                  <span>{impersonatingClientId === client.id ? 'מתחבר למרחב...' : 'כניסה למרחב (ללא סיסמה) 🔑'}</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => setDeleteClientModal(client)}
                                  className="btn btn-secondary"
                                  style={{
                                    padding: '7px 10px',
                                    fontSize: '0.84rem',
                                    borderRadius: '8px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    color: '#dc2626',
                                    borderColor: '#fecaca',
                                    background: '#fef2f2'
                                  }}
                                  title={`מחיקת סביבת המשתמש ${client.firstName || ''} ${client.lastName || ''} לצמיתות`}
                                >
                                  <Trash2 size={14} />
                                  <span>מחק מרחב</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile Responsive Cards for Clients */}
              <div className="superadmin-cards-mobile" style={{ padding: '12px' }}>
                {filteredClients.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '32px 16px', color: '#64748b' }}>
                    לא נמצאו לקוחות מתאימים
                  </div>
                ) : (
                  filteredClients.map(client => {
                    const displayName = `${client.firstName || ''} ${client.lastName || ''}`.trim() || 'לקוח ללא שם';
                    const firstLetter = displayName.charAt(0);
                    const isSelf = Boolean(client.isSelfCare);

                    return (
                      <div key={client.id || client.portalCode} className="superadmin-mobile-card">
                        {/* Header */}
                        <div className="superadmin-mobile-card-header">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div 
                              className="superadmin-mobile-card-avatar"
                              style={{
                                background: isSelf
                                  ? 'linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%)'
                                  : 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)'
                              }}
                            >
                              {firstLetter}
                            </div>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: '0.98rem', color: client.archived ? '#94a3b8' : '#0f172a', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                {displayName}
                                {client.archived && (
                                  <span style={{
                                    fontSize: '0.68rem', fontWeight: 700, padding: '2px 9px', borderRadius: '100px',
                                    background: '#f1f5f9', color: '#64748b', border: '1px solid #e2e8f0'
                                  }}>
                                    בארכיון
                                  </span>
                                )}
                              </div>
                              <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                                {isSelf ? '🌿 מרחב עצמאי (Self-Care)' : `🏥 ${client.therapist?.name || 'משויך לקליניקה'}`}
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => setDeleteClientModal(client)}
                            className="btn btn-secondary"
                            style={{ padding: '6px 8px', color: '#dc2626', borderColor: '#fecaca', background: '#fef2f2' }}
                            title="מחק מרחב"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>

                        {/* Portal Link Row */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', padding: '8px 12px', borderRadius: '10px', fontSize: '0.82rem' }}>
                          <code style={{ color: isSelf ? 'var(--primary-hover, color-mix(in srgb, var(--primary) 85%, black))' : '#4338ca', direction: 'ltr', fontWeight: 600 }}>
                            /portal/{client.portalCode}
                          </code>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              type="button"
                              onClick={() => handleCopyClientPortalLink(client)}
                              className="btn btn-secondary"
                              style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                              title="העתק קישור"
                            >
                              {copiedClientId === client.id ? <Check size={13} color="var(--primary)" /> : <Copy size={13} />}
                            </button>
                            <a
                              href={`/portal/${client.portalCode}`}
                              target="_blank"
                              rel="noreferrer"
                              className="btn btn-secondary"
                              style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                              title="פתח מרחב"
                            >
                              <ExternalLink size={13} />
                            </a>
                          </div>
                        </div>

                        {/* Phone & Contact */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.84rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#475569' }}>
                            <Phone size={14} color="#64748b" />
                            <span dir="ltr">{client.phone || 'אין טלפון'}</span>
                          </div>
                          {client.phone && (
                            <a
                              href={`https://wa.me/${client.phone.replace(/[^0-9]/g, '').startsWith('0') ? '972' + client.phone.replace(/[^0-9]/g, '').slice(1) : client.phone.replace(/[^0-9]/g, '')}`}
                              target="_blank"
                              rel="noreferrer"
                              className="btn btn-secondary"
                              style={{ padding: '4px 10px', fontSize: '0.78rem', color: 'var(--primary-hover)', borderColor: 'var(--primary-light)', background: 'var(--primary-faint)' }}
                            >
                              <WhatsAppIcon size={14} />
                              <span>וואטסאפ</span>
                            </a>
                          )}
                        </div>

                        {/* Direct Impersonation Action */}
                        <button
                          type="button"
                          onClick={() => handleImpersonateClient(client)}
                          disabled={impersonatingClientId === client.id}
                          className="btn btn-primary"
                          style={{
                            width: '100%',
                            padding: '10px',
                            fontSize: '0.86rem',
                            background: isSelf
                              ? 'linear-gradient(135deg, var(--primary) 0%, var(--primary-hover, color-mix(in srgb, var(--primary) 85%, black)) 100%)'
                              : 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px'
                          }}
                        >
                          {impersonatingClientId === client.id ? (
                            <>
                              <RefreshCw size={14} className="animate-spin" />
                              <span>מתחבר למרחב...</span>
                            </>
                          ) : (
                            <>
                              <KeyRound size={15} />
                              <span>כניסת מנהל ראשי ישירה למרחב</span>
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Add Self-Care Client Modal */}
      {isAddSelfCareModalOpen && (
        <div className="modal-overlay" onClick={() => setIsAddSelfCareModalOpen(false)}>
          <div className="modal-card" style={{ maxWidth: '640px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header" style={{ padding: '18px 24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, var(--primary-light, color-mix(in srgb, var(--primary) 15%, white)) 0%, var(--primary-glow, color-mix(in srgb, var(--primary) 30%, white)) 100%)',
                  color: 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 8px color-mix(in srgb, var(--primary) 15%, transparent)'
                }}>
                  <UserPlus size={22} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
                    הוספת מטופל - מרחב אישי חדש
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
                    פתיחת חשבון עצמאי שלא תלוי במטפל (Self-Care)
                  </p>
                </div>
              </div>
              <button 
                type="button" 
                className="close-btn" 
                onClick={() => setIsAddSelfCareModalOpen(false)}
                aria-label="סגור חלון"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateSelfCareUser} autoComplete="off">
              <div style={{ position: 'absolute', opacity: 0, height: 0, width: 0, zIndex: -1, overflow: 'hidden', pointerEvents: 'none' }} tabIndex={-1} aria-hidden="true">
                <input type="text" name="prevent_autofill_admin_user" tabIndex={-1} autoComplete="off" defaultValue="" />
                <input type="password" name="prevent_autofill_admin_pass" tabIndex={-1} autoComplete="new-password" defaultValue="" />
              </div>

              <div className="modal-body" style={{ padding: '20px 24px', maxHeight: '72vh', overflowY: 'auto' }}>
                <div className="form-group" style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '0.86rem', color: '#1e293b' }}>
                    <User size={15} color="var(--primary)" />
                    <span>שם מלא *</span>
                  </label>
                  <input 
                    type="text" 
                    className="form-control" 
                    required
                    placeholder="לדוגמה: ישראל ישראלי"
                    value={selfCareFormData.fullName}
                    onChange={e => setSelfCareFormData({ ...selfCareFormData, fullName: e.target.value })}
                  />
                </div>

                <div className="form-row" style={{ marginBottom: '14px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '0.86rem', color: '#1e293b' }}>
                      <Phone size={15} color="var(--primary)" />
                      <span>טלפון נייד *</span>
                    </label>
                    <input 
                      type="tel" 
                      className="form-control" 
                      required
                      placeholder="050-1234567"
                      value={selfCareFormData.phone}
                      onChange={e => setSelfCareFormData({ ...selfCareFormData, phone: e.target.value })}
                      style={{ direction: 'ltr', textAlign: 'right' }}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '0.86rem', color: '#1e293b' }}>
                      <Mail size={15} color="var(--primary)" />
                      <span>כתובת אימייל</span>
                    </label>
                    <input 
                      type="email" 
                      className="form-control" 
                      placeholder="client@example.com"
                      value={selfCareFormData.email}
                      onChange={e => setSelfCareFormData({ ...selfCareFormData, email: e.target.value })}
                      style={{ direction: 'ltr', textAlign: 'right' }}
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '14px' }}>
                  <label style={{ fontWeight: 700, fontSize: '0.86rem', color: '#1e293b' }}>בחר/י מטרה עיקרית *</label>
                  <select 
                    className="form-control"
                    value={selfCareFormData.goal}
                    onChange={e => setSelfCareFormData({ ...selfCareFormData, goal: e.target.value })}
                  >
                    <option value="calm">נשימות, ויסות לחצים ורוגע נפשי</option>
                    <option value="habits">ניהול תרגולים, הרגלים ומשימות יומיומיות</option>
                    <option value="sessions">תיעוד פגישות טיפוליות ונקודות לשיחה</option>
                    <option value="content">שמירת סרטונים ומאמרים שעושים לי טוב</option>
                  </select>
                </div>

                {/* WhatsApp Opt-in Card */}
                <div style={{
                  background: 'linear-gradient(135deg, var(--primary-faint) 0%, var(--primary-light) 100%)',
                  border: '1px solid color-mix(in srgb, var(--primary) 40%, white)',
                  borderRadius: '12px',
                  padding: '11px 16px',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  boxShadow: '0 2px 6px color-mix(in srgb, var(--primary) 8%, transparent)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: 'var(--primary)',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <WhatsAppIcon size={18} />
                    </div>
                    <div>
                      <label htmlFor="selfCareSendWhatsApp" style={{ cursor: 'pointer', margin: 0, fontSize: '0.88rem', fontWeight: 700, color: '#14532d', display: 'block' }}>
                        שליחת פרטי התחברות וקישור למרחב האישי בוואטסאפ
                      </label>
                      <span style={{ fontSize: '0.73rem', color: 'var(--primary-hover)' }}>
                        הודעה אישית ומעוצבת עם שם המשתמש, הסיסמה והקישור תישלח לנייד
                      </span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    id="selfCareSendWhatsApp"
                    checked={selfCareFormData.sendWhatsApp !== false}
                    onChange={e => setSelfCareFormData({ ...selfCareFormData, sendWhatsApp: e.target.checked })}
                    style={{ width: '20px', height: '20px', accentColor: 'var(--primary)', cursor: 'pointer', flexShrink: 0 }}
                  />
                </div>

                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '16px', marginTop: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <KeyRound size={16} color="var(--primary)" />
                      <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a' }}>פרטי גישה למרחב העצמאי</span>
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label style={{ margin: 0, fontWeight: 700, fontSize: '0.86rem', color: '#1e293b' }}>שם משתמש *</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        required
                        value={selfCareFormData.username}
                        onChange={e => setSelfCareFormData({ ...selfCareFormData, username: e.target.value })}
                        style={{ direction: 'ltr', fontFamily: 'monospace' }}
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label style={{ margin: 0, fontWeight: 700, fontSize: '0.86rem', color: '#1e293b' }}>סיסמה *</label>
                      <div style={{ position: 'relative' }}>
                        <input 
                          type={showAddPassword ? "text" : "password"} 
                          className="form-control" 
                          required
                          value={selfCareFormData.password}
                          onChange={e => setSelfCareFormData({ ...selfCareFormData, password: e.target.value })}
                          style={{ paddingLeft: '38px', direction: 'ltr' }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowAddPassword(!showAddPassword)}
                          style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '4px' }}
                        >
                          {showAddPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="form-group" style={{ marginTop: '10px', marginBottom: 0 }}>
                    <label style={{ margin: 0, fontWeight: 700, fontSize: '0.86rem', color: '#1e293b' }}>אימות סיסמה *</label>
                    <input 
                      type={showAddPassword ? "text" : "password"} 
                      className="form-control" 
                      required
                      value={selfCareFormData.confirmPassword}
                      onChange={e => setSelfCareFormData({ ...selfCareFormData, confirmPassword: e.target.value })}
                      style={{ direction: 'ltr' }}
                    />
                  </div>
                </div>

                <div style={{ marginTop: '20px', background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', margin: 0 }}>
                    <input
                      type="checkbox"
                      checked={selfCareFormData.privacyPolicy}
                      onChange={(e) => setSelfCareFormData({...selfCareFormData, privacyPolicy: e.target.checked})}
                      style={{ marginTop: '4px', width: '18px', height: '18px', accentColor: 'var(--primary)', cursor: 'pointer' }}
                    />
                    <div>
                      <span style={{ fontSize: '0.9rem', color: '#1e293b', fontWeight: 600 }}>אני מאשר/ת את <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsPrivacyOpen(true); }} style={{ background: 'none', border: 'none', padding: 0, color: '#2563eb', textDecoration: 'underline', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem' }}>מדיניות הפרטיות ותנאי השימוש</button> של המערכת.</span>
                      <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>המידע האישי יישמר בצורה מאובטחת ומוצפנת.</p>
                    </div>
                  </label>
                </div>
              </div>

              <div className="modal-footer" style={{ padding: '16px 24px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsAddSelfCareModalOpen(false)}>ביטול</button>
                <button type="submit" className="btn btn-primary" disabled={saving} style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-hover, color-mix(in srgb, var(--primary) 85%, black)) 100%)' }}>
                  {saving ? 'יוצר משתמש...' : 'שמור יוזר חדש'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Therapist Modal */}
      {isAddModalOpen && (() => {
        const currentTitleSearch = (titleFilter || formData.title || '').trim().toLowerCase();
        const filteredCategories = THERAPIST_PROFESSIONAL_TITLES.map(cat => ({
          category: cat.category,
          titles: currentTitleSearch
            ? cat.titles.filter(t => t.toLowerCase().includes(currentTitleSearch))
            : cat.titles
        })).filter(cat => cat.titles.length > 0);
        const totalFilteredTitles = filteredCategories.reduce((acc, cat) => acc + cat.titles.length, 0);

        const currentSpecialtySearch = (specialtyFilter || '').trim().toLowerCase();
        const filteredSpecialtyCategories = THERAPY_SPECIALTIES_CATEGORIZED.map(cat => ({
          category: cat.category,
          items: currentSpecialtySearch
            ? cat.items.filter(item => item.toLowerCase().includes(currentSpecialtySearch))
            : cat.items
        })).filter(cat => cat.items.length > 0);
        const totalFilteredSpecialties = filteredSpecialtyCategories.reduce((acc, cat) => acc + cat.items.length, 0);

        const selectedSpecialtiesList = formData.specialty
          ? formData.specialty.split(',').map(s => s.trim()).filter(Boolean)
          : [];

        const toggleSpecialty = (item: string) => {
          const exists = selectedSpecialtiesList.some(s => s.toLowerCase() === item.toLowerCase());
          let nextList: string[];
          if (exists) {
            nextList = selectedSpecialtiesList.filter(s => s.toLowerCase() !== item.toLowerCase());
          } else {
            nextList = [...selectedSpecialtiesList, item];
          }
          setFormData({ ...formData, specialty: nextList.join(', ') });
        };

        return (
          <div className="modal-overlay" onClick={() => setIsAddModalOpen(false)}>
            <div className="modal-card" style={{ maxWidth: '640px' }} onClick={e => e.stopPropagation()}>
              <div className="modal-header" style={{ padding: '18px 24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)',
                    color: '#0284c7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 8px rgba(2, 132, 199, 0.15)'
                  }}>
                    <UserPlus size={22} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
                      הוספת מטפל/ת חדש/ה למערכת
                    </h3>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
                      הגדרת פרטי קליניקה, תואר טיפולי והנפקת הרשאות כניסה
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  className="close-btn"
                  onClick={() => setIsAddModalOpen(false)}
                  aria-label="סגור חלון"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleCreateTherapist} autoComplete="off">
                {/* Invisible decoy inputs to divert aggressive browser password managers */}
                <div style={{ position: 'absolute', opacity: 0, height: 0, width: 0, zIndex: -1, overflow: 'hidden', pointerEvents: 'none' }} tabIndex={-1} aria-hidden="true">
                  <input type="text" name="prevent_autofill_admin_user" tabIndex={-1} autoComplete="off" defaultValue="" />
                  <input type="password" name="prevent_autofill_admin_pass" tabIndex={-1} autoComplete="new-password" defaultValue="" />
                </div>

                <div className="modal-body" style={{ padding: '20px 24px', maxHeight: '72vh', overflowY: 'auto' }}>

                  {/* Full Name */}
                  <div className="form-group" style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '0.86rem', color: '#1e293b' }}>
                      <User size={15} color="#4f46e5" />
                      <span>שם מלא של המטפל/ת *</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      required
                      name="therapist_display_fullname"
                      autoComplete="off"
                      placeholder="לדוגמה: ד״ר שרה לוי או מיכל כהן"
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>

                  {/* Row: Professional Title (Combobox) & Specialties (Combobox) */}
                  <div className="form-row" style={{ marginBottom: '14px' }}>
                    {/* Professional Title Combobox */}
                    <div className="form-group" style={{ marginBottom: 0, position: 'relative' }} ref={titleDropdownRef}>
                      <div style={{ height: '26px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <label style={{ margin: 0, fontWeight: 700, fontSize: '0.86rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <GraduationCap size={15} color="#4f46e5" />
                          <span>תואר מקצועי</span>
                        </label>
                        <span style={{ fontSize: '0.72rem', color: '#6366f1', fontWeight: 600 }}>רשימה או טקסט חופשי</span>
                      </div>

                      <div style={{ position: 'relative' }}>
                        <input
                          type="text"
                          className="form-control"
                          autoComplete="off"
                          placeholder="בחר מהרשימה או הקלד חופשי..."
                          value={formData.title}
                          onChange={e => {
                            setFormData({ ...formData, title: e.target.value });
                            setTitleFilter(e.target.value);
                            setIsTitleDropdownOpen(true);
                          }}
                          onFocus={() => setIsTitleDropdownOpen(true)}
                          style={{
                            paddingLeft: '38px',
                            borderColor: isTitleDropdownOpen ? '#6366f1' : undefined
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => setIsTitleDropdownOpen(prev => !prev)}
                          style={{
                            position: 'absolute',
                            left: '6px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: isTitleDropdownOpen ? '#e0e7ff' : 'transparent',
                            border: 'none',
                            borderRadius: '6px',
                            width: '30px',
                            height: '30px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            color: isTitleDropdownOpen ? '#4f46e5' : '#64748b',
                            transition: 'all 0.2s'
                          }}
                          title="פתח / סגור רשימת תארים מקצועיים"
                        >
                          <ChevronDown size={17} style={{ transform: isTitleDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                        </button>
                      </div>

                      {/* Floating Rich Categorized Dropdown Menu */}
                      {isTitleDropdownOpen && (
                        <div className="custom-dropdown-menu">
                          <div style={{
                            padding: '6px 14px 8px 14px',
                            borderBottom: '1px solid #f1f5f9',
                            fontSize: '0.74rem',
                            color: '#64748b',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            background: '#f8fafc'
                          }}>
                            <span>תארים מקצועיים נפוצים ({totalFilteredTitles}):</span>
                            {formData.title && (
                              <button
                                type="button"
                                onClick={() => {
                                  setFormData({ ...formData, title: '' });
                                  setTitleFilter('');
                                }}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: '#ef4444',
                                  cursor: 'pointer',
                                  fontSize: '0.72rem',
                                  fontWeight: 600
                                }}
                              >
                                נקה בחירה
                              </button>
                            )}
                          </div>

                          {totalFilteredTitles === 0 ? (
                            <div style={{ padding: '14px', textAlign: 'center', color: '#64748b', fontSize: '0.82rem' }}>
                              <div>לא נמצא תואר מוגדר מראש התואם לחיפוש.</div>
                              <div style={{ color: '#4f46e5', fontWeight: 600, marginTop: '4px' }}>
                                הטקסט שהקלדת יישמר כתואר מותאם אישית ✨
                              </div>
                            </div>
                          ) : (
                            filteredCategories.map(cat => (
                              <div key={cat.category} style={{ marginBottom: '4px' }}>
                                <div style={{
                                  padding: '5px 14px',
                                  fontSize: '0.71rem',
                                  fontWeight: 800,
                                  color: '#475569',
                                  background: '#f1f5f9',
                                  letterSpacing: '0.2px'
                                }}>
                                  {cat.category}
                                </div>
                                {cat.titles.map(titleOption => {
                                  const isSelected = formData.title === titleOption;
                                  return (
                                    <div
                                      key={titleOption}
                                      onClick={() => {
                                        setFormData({ ...formData, title: titleOption });
                                        setIsTitleDropdownOpen(false);
                                      }}
                                      style={{
                                        padding: '7px 14px',
                                        fontSize: '0.83rem',
                                        color: isSelected ? '#4338ca' : '#1e293b',
                                        background: isSelected ? '#eef2ff' : 'transparent',
                                        fontWeight: isSelected ? 700 : 500,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        transition: 'background 0.15s'
                                      }}
                                      onMouseEnter={e => {
                                        if (!isSelected) e.currentTarget.style.background = '#f8fafc';
                                      }}
                                      onMouseLeave={e => {
                                        if (!isSelected) e.currentTarget.style.background = 'transparent';
                                      }}
                                    >
                                      <span>{titleOption}</span>
                                      {isSelected && <Check size={15} color="#4f46e5" />}
                                    </div>
                                  );
                                })}
                              </div>
                            ))
                          )}
                        </div>
                      )}

                      {/* Quick selection chips below title */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
                        {['פסיכולוג/ית קליני/ת', 'עו"ס קליני/ת (MSW)', 'פסיכותרפיסט/ית CBT', 'מאסטר NLP ומטפל/ת', 'מטפל/ת בעיסוי רפואי', 'רפואה סינית ודיקור', 'מטפל/ת באמנות'].map(chip => (
                          <button
                            key={chip}
                            type="button"
                            onClick={() => {
                              setFormData({ ...formData, title: chip });
                              setIsTitleDropdownOpen(false);
                            }}
                            style={{
                              background: formData.title.includes(chip) ? '#e0e7ff' : '#f8fafc',
                              border: `1px solid ${formData.title.includes(chip) ? '#c7d2fe' : '#e2e8f0'}`,
                              color: formData.title.includes(chip) ? '#4338ca' : '#475569',
                              fontSize: '0.7rem',
                              padding: '2px 7px',
                              borderRadius: '10px',
                              cursor: 'pointer',
                              fontWeight: formData.title.includes(chip) ? 700 : 500,
                              transition: 'all 0.15s'
                            }}
                          >
                            {chip}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Specialties Custom Combobox */}
                    <div className="form-group" style={{ marginBottom: 0, position: 'relative' }} ref={specialtyDropdownRef}>
                      <div style={{ height: '26px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <label style={{ margin: 0, fontWeight: 700, fontSize: '0.86rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <Briefcase size={15} color="var(--primary)" />
                          <span>תחומי התמחות</span>
                        </label>
                        <span style={{ fontSize: '0.72rem', color: 'var(--primary)', fontWeight: 600 }}>רשימה או בחירה מרובה</span>
                      </div>

                      <div style={{ position: 'relative' }}>
                        <input
                          type="text"
                          className="form-control"
                          autoComplete="off"
                          placeholder="בחר מהרשימה או הקלד (מופרד בפסיק)..."
                          value={formData.specialty}
                          onChange={e => {
                            setFormData({ ...formData, specialty: e.target.value });
                            setSpecialtyFilter(e.target.value);
                            setIsSpecialtyDropdownOpen(true);
                          }}
                          onFocus={() => setIsSpecialtyDropdownOpen(true)}
                          style={{
                            paddingLeft: '38px',
                            borderColor: isSpecialtyDropdownOpen ? 'var(--primary)' : undefined
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => setIsSpecialtyDropdownOpen(prev => !prev)}
                          style={{
                            position: 'absolute',
                            left: '6px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: isSpecialtyDropdownOpen ? 'var(--primary-light)' : 'transparent',
                            border: 'none',
                            borderRadius: '6px',
                            width: '30px',
                            height: '30px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            color: isSpecialtyDropdownOpen ? 'var(--primary)' : '#64748b',
                            transition: 'all 0.2s'
                          }}
                          title="פתח / סגור רשימת תחומי התמחות"
                        >
                          <ChevronDown size={17} style={{ transform: isSpecialtyDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                        </button>
                      </div>

                      {/* Floating Rich Categorized Specialties Dropdown Menu */}
                      {isSpecialtyDropdownOpen && (
                        <div className="custom-dropdown-menu">
                          <div style={{
                            padding: '6px 14px 8px 14px',
                            borderBottom: '1px solid #f1f5f9',
                            fontSize: '0.74rem',
                            color: '#64748b',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            background: '#f8fafc'
                          }}>
                            <span>תחומי התמחות נפוצים ({totalFilteredSpecialties}):</span>
                            {selectedSpecialtiesList.length > 0 && (
                              <button
                                type="button"
                                onClick={() => {
                                  setFormData({ ...formData, specialty: '' });
                                  setSpecialtyFilter('');
                                }}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: '#ef4444',
                                  cursor: 'pointer',
                                  fontSize: '0.72rem',
                                  fontWeight: 600
                                }}
                              >
                                נקה בחירה
                              </button>
                            )}
                          </div>

                          {totalFilteredSpecialties === 0 ? (
                            <div style={{ padding: '14px', textAlign: 'center', color: '#64748b', fontSize: '0.82rem' }}>
                              <div>לא נמצא תחום מוגדר מראש התואם לחיפוש.</div>
                              <div style={{ color: 'var(--primary)', fontWeight: 600, marginTop: '4px' }}>
                                הטקסט שהקלדת יישמר ישירות כתחום התמחות מותאם אישית ✨
                              </div>
                            </div>
                          ) : (
                            filteredSpecialtyCategories.map(cat => (
                              <div key={cat.category} style={{ marginBottom: '4px' }}>
                                <div style={{
                                  padding: '5px 14px',
                                  fontSize: '0.71rem',
                                  fontWeight: 800,
                                  color: '#475569',
                                  background: '#f1f5f9',
                                  letterSpacing: '0.2px'
                                }}>
                                  {cat.category}
                                </div>
                                {cat.items.map(specialtyOption => {
                                  const isSelected = selectedSpecialtiesList.some(
                                    s => s.toLowerCase() === specialtyOption.toLowerCase()
                                  );
                                  return (
                                    <div
                                      key={specialtyOption}
                                      onClick={() => toggleSpecialty(specialtyOption)}
                                      style={{
                                        padding: '7px 14px',
                                        fontSize: '0.83rem',
                                        color: isSelected ? 'var(--primary-hover)' : '#1e293b',
                                        background: isSelected ? 'var(--primary-faint)' : 'transparent',
                                        fontWeight: isSelected ? 700 : 500,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        transition: 'background 0.15s'
                                      }}
                                      onMouseEnter={e => {
                                        if (!isSelected) e.currentTarget.style.background = '#f8fafc';
                                      }}
                                      onMouseLeave={e => {
                                        if (!isSelected) e.currentTarget.style.background = 'transparent';
                                      }}
                                    >
                                      <span>{specialtyOption}</span>
                                      {isSelected && <Check size={15} color="var(--primary)" />}
                                    </div>
                                  );
                                })}
                              </div>
                            ))
                          )}
                        </div>
                      )}

                      {/* Quick specialty suggestion chips */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
                        {['חרדה וטראומה (PTSD)', 'עיסוי רפואי ושיקום כאב', 'NLP ודמיון מודרך', 'דיקור ורפואה סינית', 'ילדים ונוער', 'טיפול זוגי', 'CBT'].map(chip => {
                          const isChipSelected = selectedSpecialtiesList.some(
                            s => s.toLowerCase() === chip.toLowerCase() || chip.toLowerCase().includes(s.toLowerCase())
                          );
                          return (
                            <button
                              key={chip}
                              type="button"
                              onClick={() => toggleSpecialty(chip)}
                              style={{
                                background: isChipSelected ? 'var(--primary-light)' : '#f8fafc',
                                border: `1px solid ${isChipSelected ? 'color-mix(in srgb, var(--primary) 40%, white)' : '#e2e8f0'}`,
                                color: isChipSelected ? 'var(--primary-hover)' : '#475569',
                                fontSize: '0.7rem',
                                padding: '2px 8px',
                                borderRadius: '10px',
                                cursor: 'pointer',
                                fontWeight: isChipSelected ? 700 : 500,
                                transition: 'all 0.15s'
                              }}
                            >
                              {isChipSelected ? '✓ ' : '+ '} {chip}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Row: Phone & Email */}
                  <div className="form-row" style={{ marginBottom: '14px' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <div style={{ height: '26px', display: 'flex', alignItems: 'center', marginBottom: '6px' }}>
                        <label style={{ margin: 0, fontWeight: 700, fontSize: '0.86rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <Phone size={15} color="#0284c7" />
                          <span>טלפון נייד</span>
                        </label>
                      </div>
                      <input
                        type="tel"
                        className="form-control"
                        placeholder="050-1234567"
                        value={formData.phone}
                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                        style={{ direction: 'ltr', textAlign: 'right' }}
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <div style={{ height: '26px', display: 'flex', alignItems: 'center', marginBottom: '6px' }}>
                        <label style={{ margin: 0, fontWeight: 700, fontSize: '0.86rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <Mail size={15} color="#0284c7" />
                          <span>כתובת אימייל</span>
                        </label>
                      </div>
                      <input
                        type="email"
                        className="form-control"
                        placeholder="therapist@example.com"
                        value={formData.email}
                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                        style={{ direction: 'ltr', textAlign: 'right' }}
                      />
                    </div>
                  </div>

                  {/* WhatsApp Opt-in Card */}
                  <div style={{
                    background: 'linear-gradient(135deg, var(--primary-faint) 0%, var(--primary-light) 100%)',
                    border: '1px solid color-mix(in srgb, var(--primary) 40%, white)',
                    borderRadius: '12px',
                    padding: '11px 16px',
                    marginBottom: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    boxShadow: '0 2px 6px color-mix(in srgb, var(--primary) 8%, transparent)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        background: 'var(--primary)',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <WhatsAppIcon size={18} />
                      </div>
                      <div>
                        <label htmlFor="modalSendWhatsApp" style={{ cursor: 'pointer', margin: 0, fontSize: '0.88rem', fontWeight: 700, color: '#14532d', display: 'block' }}>
                          שליחת פרטי התחברות וקישור אישי בוואטסאפ
                        </label>
                        <span style={{ fontSize: '0.73rem', color: 'var(--primary-hover)' }}>
                          הודעה אישית ומעוצבת תישלח אוטומטית למספר הנייד שהוזן
                        </span>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      id="modalSendWhatsApp"
                      checked={formData.sendWhatsApp !== false}
                      onChange={e => setFormData({ ...formData, sendWhatsApp: e.target.checked })}
                      style={{ width: '20px', height: '20px', accentColor: 'var(--primary)', cursor: 'pointer', flexShrink: 0 }}
                    />
                  </div>

                  {/* Dedicated Credentials & Security Card */}
                  <div style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '14px',
                    padding: '16px',
                    marginTop: '6px'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '12px',
                      paddingBottom: '8px',
                      borderBottom: '1px solid #e2e8f0'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <KeyRound size={16} color="#4f46e5" />
                        <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a' }}>
                          פרטי גישה למרחב הטיפולי (WiseCare CRM)
                        </span>
                      </div>
                      <span style={{
                        background: '#eef2ff',
                        color: '#4338ca',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '6px',
                        border: '1px solid #c7d2fe'
                      }}>
                        כניסה מאובטחת
                      </span>
                    </div>

                    <div className="form-row">
                      {/* Username Column */}
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <div style={{ height: '28px', display: 'flex', alignItems: 'center', marginBottom: '6px' }}>
                          <label style={{ margin: 0, fontWeight: 700, fontSize: '0.86rem', color: '#1e293b' }}>
                            שם משתמש להתחברות *
                          </label>
                        </div>
                        <input
                          type="text"
                          className="form-control"
                          required
                          name="therapist_account_handle"
                          autoComplete="off"
                          placeholder="dr_sarah"
                          value={formData.username}
                          onChange={e => setFormData({ ...formData, username: e.target.value })}
                          style={{ direction: 'ltr', fontFamily: 'monospace', minHeight: '44px' }}
                        />
                        <div style={{ minHeight: '20px', marginTop: '5px', display: 'flex', alignItems: 'center' }}>
                          <small style={{ fontSize: '0.73rem', color: '#64748b' }}>
                            אותיות באנגלית, מספרים, נקודות או קו תחתון
                          </small>
                        </div>
                      </div>

                      {/* Password Column */}
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <div style={{ height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                          <label style={{ margin: 0, fontWeight: 700, fontSize: '0.86rem', color: '#1e293b' }}>
                            סיסמה ראשונית *
                          </label>
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, password: generateStrongPassword(12) }))}
                            className="btn btn-secondary"
                            style={{
                              padding: '2px 8px',
                              fontSize: '0.72rem',
                              borderRadius: '6px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              background: '#ffffff',
                              borderColor: '#c7d2fe',
                              color: '#4338ca',
                              cursor: 'pointer',
                              fontWeight: 600
                            }}
                            title="חולל סיסמה חזקה ומאובטחת באופן אקראי"
                          >
                            <Dices size={13} color="#4f46e5" />
                            <span>חולל סיסמה 🎲</span>
                          </button>
                        </div>

                        <div style={{ position: 'relative' }}>
                          <input
                            type="text"
                            className="form-control"
                            required
                            name="therapist_security_token"
                            autoComplete="off"
                            placeholder="סיסמה בת 8+ תווים"
                            value={formData.password}
                            onChange={e => setFormData({ ...formData, password: e.target.value })}
                            style={{
                              paddingLeft: '38px',
                              direction: 'ltr',
                              fontFamily: showAddPassword ? 'monospace' : 'inherit',
                              ['WebkitTextSecurity' as any]: showAddPassword ? 'none' : 'disc',
                              minHeight: '44px'
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => setShowAddPassword(!showAddPassword)}
                            style={{
                              position: 'absolute',
                              left: '8px',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              color: '#64748b',
                              padding: '4px',
                              display: 'flex',
                              alignItems: 'center'
                            }}
                            title={showAddPassword ? 'הסתר סיסמה' : 'הצג סיסמה'}
                          >
                            {showAddPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>

                        <div style={{ minHeight: '20px', marginTop: '5px' }}>
                          {!formData.password ? (
                            <small style={{ fontSize: '0.73rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span>🔒</span>
                              <span>לפחות 8 תווים לרמת אבטחה מקצועית</span>
                            </small>
                          ) : (
                            (() => {
                              const strength = getPasswordStrength(formData.password);
                              return (
                                <div style={{ marginTop: '2px' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', marginBottom: '3px' }}>
                                    <span style={{ color: '#475569' }}>חוזק סיסמה:</span>
                                    <span style={{ color: strength.color, fontWeight: 700 }}>{strength.label}</span>
                                  </div>
                                  <div style={{ height: '4px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                                    <div style={{ height: '100%', width: `${strength.score}%`, background: strength.color, transition: 'width 0.3s ease' }} />
                                  </div>
                                </div>
                              );
                            })()
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                </div>

                <div className="modal-footer" style={{ padding: '16px 24px' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setIsAddModalOpen(false)}>
                    ביטול
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? 'יוצר מטפל...' : 'שמור מטפל חדש'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* New Therapist Created Success Modal */}
      {newTherapistSuccess && (
        <div className="modal-overlay" onClick={() => setNewTherapistSuccess(null)}>
          <div className="modal-card" style={{ maxWidth: '520px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header" style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '12px',
                  background: 'var(--primary-light)',
                  color: 'var(--primary-hover)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Sparkles size={22} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
                    מטפל חדש נוסף בהצלחה! 🎉
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b' }}>
                    נוצר קישור כניסה ייחודי ופרטי התחברות עבור {newTherapistSuccess.name}
                  </p>
                </div>
              </div>
            </div>

            <div className="modal-body" style={{ padding: '20px' }}>
              {/* WhatsApp Status Alert */}
              {newTherapistSuccess.whatsappStatus?.sent ? (
                <div style={{
                  background: 'var(--primary-light)',
                  border: '1px solid color-mix(in srgb, var(--primary) 40%, white)',
                  borderRadius: '10px',
                  padding: '12px 16px',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  color: 'var(--primary-hover)',
                  fontSize: '0.88rem',
                  fontWeight: 600
                }}>
                  <WhatsAppIcon size={20} />
                  <span>הודעת וואטסאפ עם קישור הכניסה ופרטי הגישה נשלחה בהצלחה למספר {newTherapistSuccess.phone}! 🚀</span>
                </div>
              ) : newTherapistSuccess.phone ? (
                <div style={{
                  background: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  borderRadius: '10px',
                  padding: '12px 16px',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '10px',
                  color: '#1e40af',
                  fontSize: '0.84rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <WhatsAppIcon size={18} />
                    <span>ניתן לשלוח למטפל את פרטי ההתחברות ישירות לוואטסאפ:</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSendWhatsAppInvite(newTherapistSuccess)}
                    disabled={sendingWhatsAppId === newTherapistSuccess.id}
                    className="btn btn-secondary"
                    style={{
                      padding: '4px 10px',
                      fontSize: '0.78rem',
                      background: 'white',
                      borderColor: '#93c5fd',
                      color: '#1d4ed8'
                    }}
                  >
                    שלח כעת
                  </button>
                </div>
              ) : null}

              {/* Unique Link Box */}
              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '16px'
              }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '8px' }}>
                  קישור כניסה אישי למטפל:
                </label>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'white',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  gap: '8px'
                }}>
                  <span style={{ direction: 'ltr', fontFamily: 'monospace', fontWeight: 600, color: '#4f46e5', fontSize: '0.88rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {getTherapistLoginUrl(newTherapistSuccess.loginCode)}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyLoginLink(newTherapistSuccess)}
                    className="btn btn-secondary"
                    style={{ padding: '4px 10px', fontSize: '0.78rem', whiteSpace: 'nowrap' }}
                  >
                    <Copy size={13} />
                    <span>העתק</span>
                  </button>
                </div>
              </div>

              {/* Credentials Box */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px',
                marginBottom: '16px'
              }}>
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '12px', borderRadius: '10px' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '4px' }}>שם משתמש:</div>
                  <strong style={{ fontSize: '0.95rem', color: '#0f172a', fontFamily: 'monospace' }}>
                    {newTherapistSuccess.username}
                  </strong>
                </div>
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '12px', borderRadius: '10px' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '4px' }}>סיסמה ראשונית:</div>
                  <strong style={{ fontSize: '0.95rem', color: '#0f172a', fontFamily: 'monospace' }}>
                    {newTherapistSuccess.plainPassword || '******'}
                  </strong>
                </div>
              </div>

              <p style={{ fontSize: '0.82rem', color: '#64748b', lineHeight: '1.5', margin: 0 }}>
                המטפל/ת ייכנסו דרך הקישור הזה בלבד, יזינו את שם המשתמש והסיסמה ויגיעו ישירות למרחב הניהול האישי שלהם.
              </p>
            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', borderTop: '1px solid #e2e8f0', paddingTop: '14px' }}>
              <button
                type="button"
                onClick={() => {
                  const fullText = `שלום ${newTherapistSuccess.name},\nברוך הבא למערכת ניהול הקליניקה WiseCare!\n\nלהלן קישור הכניסה האישי שלך:\n🔗 ${getTherapistLoginUrl(newTherapistSuccess.loginCode)}\n\nפרטי התחברות:\n👤 שם משתמש: ${newTherapistSuccess.username}\n🔑 סיסמה: ${newTherapistSuccess.plainPassword || ''}\n\nבהצלחה!`;
                  navigator.clipboard.writeText(fullText);
                  showToast('כל פרטי ההתחברות והקישור הועתקו ללוח! 📋');
                }}
                className="btn btn-secondary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Copy size={15} />
                <span>העתק את כל הפרטים</span>
              </button>

              <div style={{ display: 'flex', gap: '8px' }}>
                {!newTherapistSuccess.whatsappStatus?.sent && newTherapistSuccess.phone && (
                  <button
                    type="button"
                    onClick={() => handleSendWhatsAppInvite(newTherapistSuccess)}
                    disabled={sendingWhatsAppId === newTherapistSuccess.id}
                    className="btn btn-secondary"
                    style={{
                      background: 'var(--primary-faint)',
                      borderColor: 'var(--primary-light)',
                      color: 'var(--primary-hover)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <WhatsAppIcon size={16} />
                    <span>{sendingWhatsAppId === newTherapistSuccess.id ? 'שולח באוטומציה...' : 'שלח עכשיו באוטומציה'}</span>
                  </button>
                )}

                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setNewTherapistSuccess(null)}
                  style={{ minWidth: '100px' }}
                >
                  סיום וסגירה
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password / Update Credentials Modal */}
      {resetModalTherapist && (
        <div className="modal-overlay" onClick={() => setResetModalTherapist(null)}>
          <div className="modal-card" style={{ maxWidth: '480px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: '#eef2ff',
                  color: '#4f46e5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Key size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>איפוס וקביעת סיסמה מאובטחת</h3>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>עבור: {resetModalTherapist.name} ({resetModalTherapist.username})</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleResetCredentials} autoComplete="off">
              {/* Invisible decoy inputs to divert browser password managers */}
              <div style={{ position: 'absolute', opacity: 0, height: 0, width: 0, zIndex: -1, overflow: 'hidden', pointerEvents: 'none' }} tabIndex={-1} aria-hidden="true">
                <input type="text" name="prevent_autofill_reset_user" tabIndex={-1} autoComplete="off" defaultValue="" />
                <input type="password" name="prevent_autofill_reset_pass" tabIndex={-1} autoComplete="new-password" defaultValue="" />
              </div>

              <div className="modal-body" style={{ padding: '20px' }}>
                <div style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  marginBottom: '16px',
                  fontSize: '0.84rem',
                  color: '#475569'
                }}>
                  <div>שם משתמש: <strong style={{ color: '#0f172a', fontFamily: 'monospace' }}>{resetModalTherapist.username}</strong></div>
                  <div style={{ marginTop: '4px' }}>קישור אישי: <code style={{ color: '#4f46e5', direction: 'ltr', display: 'inline-block' }}>/login/{resetModalTherapist.loginCode}</code></div>
                </div>

                <div className="form-group">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <label style={{ margin: 0, fontWeight: 700 }}>סיסמה חדשה ומאובטחת *</label>
                    <button
                      type="button"
                      onClick={() => setResetFormData(prev => ({ ...prev, password: generateStrongPassword(12) }))}
                      className="btn btn-secondary"
                      style={{ padding: '2px 8px', fontSize: '0.72rem', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                    >
                      <Dices size={13} color="#4f46e5" />
                      <span>חולל סיסמה 🎲</span>
                    </button>
                  </div>

                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      className="form-control"
                      required
                      name="reset_therapist_access_key"
                      autoComplete="off"
                      value={resetFormData.password}
                      onChange={e => setResetFormData({ ...resetFormData, password: e.target.value })}
                      style={{
                        paddingLeft: '38px',
                        direction: 'ltr',
                        fontFamily: showResetPassword ? 'monospace' : 'inherit',
                        ['WebkitTextSecurity' as any]: showResetPassword ? 'none' : 'disc'
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowResetPassword(!showResetPassword)}
                      style={{
                        position: 'absolute',
                        left: '8px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#64748b',
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                      title={showResetPassword ? 'הסתר סיסמה' : 'הצג סיסמה'}
                    >
                      {showResetPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>

                  {resetFormData.password && (
                    <div style={{ marginTop: '8px' }}>
                      {(() => {
                        const strength = getPasswordStrength(resetFormData.password);
                        return (
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.74rem', marginBottom: '4px' }}>
                              <span style={{ color: '#475569' }}>חוזק אבטחה:</span>
                              <span style={{ color: strength.color, fontWeight: 700 }}>{strength.label}</span>
                            </div>
                            <div style={{ height: '5px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden', marginBottom: '6px' }}>
                              <div style={{ height: '100%', width: `${strength.score}%`, background: strength.color, transition: 'width 0.3s ease' }} />
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', fontSize: '0.7rem' }}>
                              <span style={{ color: strength.hasMinLength ? 'var(--primary)' : '#94a3b8' }}>{strength.hasMinLength ? '✓' : '○'} 8+ תווים</span>
                              <span style={{ color: (strength.hasUpper || strength.hasLower) ? 'var(--primary)' : '#94a3b8' }}>{(strength.hasUpper || strength.hasLower) ? '✓' : '○'} אותיות</span>
                              <span style={{ color: strength.hasDigit ? 'var(--primary)' : '#94a3b8' }}>{strength.hasDigit ? '✓' : '○'} ספרות</span>
                              <span style={{ color: strength.hasSpecial ? 'var(--primary)' : '#94a3b8' }}>{strength.hasSpecial ? '✓' : '○'} תווים מיוחדים</span>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>

                {resetModalTherapist.phone ? (
                  <div style={{
                    background: 'var(--primary-faint)',
                    border: '1px solid var(--primary-light)',
                    borderRadius: '10px',
                    padding: '10px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    marginTop: '16px'
                  }}>
                    <input
                      type="checkbox"
                      id="resetSendWhatsApp"
                      checked={resetFormData.sendWhatsApp !== false}
                      onChange={e => setResetFormData({ ...resetFormData, sendWhatsApp: e.target.checked })}
                      style={{ width: '18px', height: '18px', accentColor: 'var(--primary)', cursor: 'pointer' }}
                    />
                    <label htmlFor="resetSendWhatsApp" style={{ cursor: 'pointer', margin: 0, fontSize: '0.86rem', fontWeight: 600, color: 'var(--primary-hover)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <WhatsAppIcon size={16} />
                      <span>שלח את הסיסמה החדשה אוטומטית לוואטסאפ של המטפל ({resetModalTherapist.phone})</span>
                    </label>
                  </div>
                ) : (
                  <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '12px' }}>
                    * למטפל זה לא הוגדר מספר טלפון, לכן לא תישלח הודעת וואטסאפ אוטומטית.
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setResetModalTherapist(null)}>
                  ביטול
                </button>
                <button type="submit" className="btn btn-primary" disabled={resettingSaving}>
                  {resettingSaving ? 'מעדכן סיסמה...' : 'שמור סיסמה חדשה'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Delete Therapist Environment Modal */}
      {deleteTherapistModal && (
        <ConfirmModal
          isOpen={Boolean(deleteTherapistModal)}
          onClose={() => setDeleteTherapistModal(null)}
          onConfirm={handleConfirmDeleteTherapist}
          title="מחיקת סביבת מטפל לצמיתות"
          message={`האם אתה בטוח שברצונך למחוק לצמיתות את סביבת המטפל/ת "${deleteTherapistModal.name}" (${deleteTherapistModal.username})? כל המטופלים, המשימות, הפגישות והתכנים בקליניקה זו יימחקו לצמיתות ללא אפשרות שחזור.`}
          confirmText="כן, מחק סביבת מטפל לצמיתות"
          cancelText="ביטול"
          isDanger={true}
          loading={deletingTherapist}
        />
      )}

      {/* Confirm Delete Client / Self-Care User Environment Modal */}
      {deleteClientModal && (
        <ConfirmModal
          isOpen={Boolean(deleteClientModal)}
          onClose={() => setDeleteClientModal(null)}
          onConfirm={handleConfirmDeleteClient}
          title="מחיקת סביבת משתמש / מרחב אישי לצמיתות"
          message={`האם אתה בטוח שברצונך למחוק לצמיתות את המרחב של "${deleteClientModal.firstName || ''} ${deleteClientModal.lastName || ''}" (פורטל: ${deleteClientModal.portalCode})? כל הנתונים, המשימות והתובנות יימחקו לצמיתות ללא אפשרות שחזור.`}
          confirmText="כן, מחק סביבת משתמש לצמיתות"
          cancelText="ביטול"
          isDanger={true}
          loading={deletingClient}
        />
      )}

      {/* Custom UI Toast */}
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
    </div>
  );
}
