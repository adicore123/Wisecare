"use client";

import React, { useEffect, useState } from 'react';
import {
  FileSignature, Plus, Pencil, Trash2, Copy, Eye, Send, CheckCircle2,
  Clock, X, FileText, Loader2, Users, ShieldAlert, ChevronDown, ChevronUp, Printer,
  Check, ExternalLink, Search, MessageCircle
} from 'lucide-react';
import { api } from '@/lib/api';
import ConfirmModal from './ConfirmModal';
import Toast from './Toast';
import WhatsAppIcon from './WhatsAppIcon';
import SearchableClientSelect from './SearchableClientSelect';


type Section = { heading: string; body: string };
type RequiredField = { label: string; type: 'checkbox' | 'text' | 'date' };

type Template = {
  id: string;
  name: string;
  title: string;
  introText: string;
  sections: Section[];
  requiredFields: RequiredField[];
  footerText: string;
  requiresSignature: boolean;
  accentColor: string;
  active: boolean;
  createdAt: string;
  sentCount?: number;
  signedCount?: number;
};

const ACCENT_CHOICES = ['var(--primary)', '#4f46e5', '#7c3aed', '#0369a1', '#b91c1c', '#0f172a'];

// Built-in starter templates the therapist can duplicate instead of writing from scratch
const FORM_PRESETS: { key: string; label: string; description: string; build: (clinicName: string) => Omit<Template, 'id' | 'createdAt'> }[] = [
  {
    key: 'consent',
    label: 'הסכמה מדעת לטיפול',
    description: 'הסכמה לטיפול רגשי/פסיכולוגי — יעדים, גבולות סודיות וזכויות המטופל',
    build: (clinicName) => ({
      name: 'הסכמה מדעת לטיפול',
      title: 'טופס הסכמה מדעת לטיפול רגשי',
      introText: `ברוכ/ה הבא/ה לתהליך הטיפולי ב${clinicName}.\n\nלפני תחילת הליווי הטיפולי, חשוב לנו שתכיר/י את מסגרת הטיפול, זכויותייך וגבולות הסודיות. נא לקרוא בעיון, לאשר את הסעיפים ולחתום בתיבת החתימה בתחתית המסמך.`,
      sections: [
        { heading: 'מהות הטיפול', body: 'הטיפול הרגשי כולל מפגשים סדירים בהם נעבוד יחד על רווחתך הנפשית, ויסות רגשי, התמודדות עם משברים ופיתוח כלים אישיים. הטיפול אינו מהווה תחליף לייעוץ רפואי או פסיכיאטרי, ובמידת הצורך יופנה/י להתייעצות נוספת.' },
        { heading: 'סודיות ופרטיות', body: 'כל תוכן המפגשים חסוי ושמור, ואינו מועבר לגורם כלשהו ללא הסכמתך המפורשת בכתב. יוצאות מן הכלל: חובה חוקית המוטלת על המטפל/ת על-פי דין, חשש לפגיעה עצמית או באחר, וכן פיקוח מקצועי אנונימי במסגרת הדרכה קלינית.' },
        { heading: 'ביטול ודחיית מפגשים', body: 'ביטול מפגש מתאפשר עד 24 שעות לפני מועדו ללא חיוב. ביטול בתוך 24 השעות או היעדרות שלא במועד יחויבו בתשלום מלא עבור המפגש.' },
        { heading: 'סיום הטיפול', body: 'הטיפול הינו התהליך התנדבותי וניתן להפסיקו בכל עת. מומלץ לקיים מפגש סיכום לסגירת התהליך באופן מסודר ובריא.' }
      ],
      requiredFields: [
        { label: 'קראתי והבנתי את תנאי הטיפול ואת גבולות הסודיות', type: 'checkbox' },
        { label: 'אני מסכים/ה לקבל טיפול רגשי ומאשר/ת את תנאי הביטול', type: 'checkbox' }
      ],
      footerText: 'החתימה בעיגול בתיבה למטה מהווה אישור מחייב של הטופס.',
      requiresSignature: true,
      accentColor: 'var(--primary)',
      active: true
    })
  },
  {
    key: 'contract',
    label: 'חוזה טיפולי',
    description: 'הסכם שירותים מקצועי: תשלום, תדירות, נהלי ביטול וציפיות הדדיות',
    build: (clinicName) => ({
      name: 'חוזה טיפולי',
      title: 'חוזה לקבלת שירותי טיפול',
      introText: `הסכם זה מסדיר את היחסים ביני לבינך במסגרת הליווי הטיפולי ב${clinicName}. נא לקרוא, לאשר ולחתום.`,
      sections: [
        { heading: 'דמי הטיפול ותשלום', body: 'עלות מפגש ותדירותו ייקבעו בין הצדדים בעל-פה או בכתב. התשלום מתבצע בסוף כל מפגש או בחיוב מוסכם מראש, אלא אם הוסכם אחרת.' },
        { heading: 'תדירות והתחייבות', body: 'תדירות המפגשים תיקבע במשותף. התמדה וסדירות הינן חלק מהותי מהתהליך הטיפולי ומשפיעות על תוצאותיו.' },
        { heading: 'התחייבות המטפל/ת', body: 'אני מתחייב/ת לשמור על סודיות מלאה, לעבוד במקצועיות ובהתאם לכללי האתיקה של הפרופסיה, ולהדרך בפיקוח מקצועי שוטף.' },
        { heading: 'ביטולים ודחיות', body: 'ביטול מפגש עד 24 שעות לפני מועדו — ללא חיוב. מטעמי התארגנות, ביטול בתוך 24 השעות או היעדרות יחויבו במלוא עלות המפגש.' }
      ],
      requiredFields: [
        { label: 'אני מאשר/ת את תנאי החוזה, לרבות מדיניות הביטולים והתשלום', type: 'checkbox' }
      ],
      footerText: 'חתימה על חוזה זה מהווה הסכמה מחייבת לתנאיו.',
      requiresSignature: true,
      accentColor: '#4f46e5',
      active: true
    })
  },
  {
    key: 'health',
    label: 'הצהרת בריאות',
    description: 'גילוי נאות על מצב רפואי, תרופות והיסטוריה רלוונטית לטיפול',
    build: (clinicName) => ({
      name: 'הצהרת בריאות',
      title: 'הצהרת בריאות וגילוי נאות',
      introText: `לצורך התאמת הטיפול ולביטחונך, נא למלא ולאשר את הצהרת הבריאות הבאה. המידע חסוי ומשמש לטיפול בלבד.`,
      sections: [
        { heading: 'הנחיות מילוי', body: 'יש לענות ביושר ובמלואה על כל הסעיפים. במידה וקיים מידע רפואי רלוונטי נוסף (טיפול תרופתי, אשפוזים, אבחנות), נא לציינו.' },
        { heading: 'חשיבות המידע', body: 'מידע רפואי מסוים (תרופות פסיכיאטריות, מצבים רפואיים כרוניים, הריון וכדומה) עשוי להשפיע על התאמת הטיפול ועל בטיחותו. גילוי נאות מגן עליך.' }
      ],
      requiredFields: [
        { label: 'אני מצהיר/ה כי אין לי מידע רפואי שעלול לסכן את בריאותי במהלך הטיפול', type: 'checkbox' },
        { label: 'רשימת תרופות נוכחית (או "אין")', type: 'text' },
        { label: 'אבחנות או טיפולים רפואיים רלוונטיים (או "אין")', type: 'text' }
      ],
      footerText: 'הצהרה זו חסויה ונשמרת בתיק הטיפולי בהתאם לחוק זכויות החולה.',
      requiresSignature: true,
      accentColor: '#0369a1',
      active: true
    })
  },
  {
    key: 'touch',
    label: 'הצהרת מגע פיזי / עיסוי',
    description: 'למטפלים בעלי מגע פיזי, עיסויים או טיפול בגוף — הצהרת בריאות והסכמה מיוחדת וביטוח אחריות',
    build: (clinicName) => ({
      name: 'הצהרת מגע פיזי ועיסוי',
      title: 'הצהרת בריאות והסכמה לטיפול במגע',
      introText: `הטיפול ב${clinicName} כולל ליווי המשלב מגע פיזי / עיסוי. מטפל/ת מוסמך/ת לכך, והטיפול מבוצע בהסכמה מלאה, בגבולות מקצועיים ובלבוש הולם. הצהרה זו נדרשת מטעמי בטיחות וביטוח.`,
      sections: [
        { heading: 'אופי הטיפול במגע', body: 'הטיפול במגע כולל עבודה ישירה על הגוף באזורים שהוגדרו והוסכמו מראש. ניתן לבקש להפסיק או לשנות כל חלק בטיפול בכל רגע, ללא כל הסבר.' },
        { heading: 'הצהרת בריאות נדרשת', body: 'בגלל אופי הטיפול, חובה לגלות מצבים רפואיים: הריון, פציעות, ניתוחים, בעיות עור, מחלות דלקתיות, לחץ דם, תרופות מדללות דם או כל מצב אחר. אי-גילוי עלול להזיק לבריאותך.' },
        { heading: 'גבולות מקצועיים', body: 'הטיפול ניתן במסגרת מקצועית בלבד. כל פנייה שאינה בתחום זה אינה חלק מהטיפול ותסורב. יש לדווח על אי-נוחות כלשהי באופן מיידי.' },
        { heading: 'אחריות וביטוח', body: 'המטפל/ת מבוטח/ת בביטוח אחריות מקצועית. ההצהרה המלאה מטעמך מהווה תנאי לקבלת הטיפול.' }
      ],
      requiredFields: [
        { label: 'אני מצהיר/ה כי מצבי הבריאותי מאפשר קבלת טיפול במגע, וגיליתי כל מצב רפואי רלוונטי', type: 'checkbox' },
        { label: 'אני נותן/ת את הסכמתי החופשית לטיפול הכולל מגע פיזי, ומבין/ה שאני רשאי/ת לעצור אותו בכל עת', type: 'checkbox' },
        { label: 'מצבים רפואיים, פציעות, הריון או תרופות (או "אין")', type: 'text' }
      ],
      footerText: 'הצהרה זו הינה תנאי לקבלת טיפול במגע ונשמרת בתיק הטיפולי.',
      requiresSignature: true,
      accentColor: '#b91c1c',
      active: true
    })
  }
];

const emptyTemplate = (): Omit<Template, 'id' | 'createdAt'> => ({
  name: '',
  title: '',
  introText: '',
  sections: [{ heading: '', body: '' }],
  requiredFields: [],
  footerText: '',
  requiresSignature: true,
  accentColor: 'var(--primary)',
  active: true
});

export default function FormsManager() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type?: 'success' | 'error' } | null>(null);
  const [editing, setEditing] = useState<Partial<Template> | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [deleteModal, setDeleteModal] = useState<Template | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [clinicName, setClinicName] = useState('WiseCare');
  const [presetsOpen, setPresetsOpen] = useState(false);

  // Client Assignment & WhatsApp Automation State
  const [clients, setClients] = useState<any[]>([]);
  const [sendModal, setSendModal] = useState<Template | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [clientSearch, setClientSearch] = useState('');
  const [sendWhatsApp, setSendWhatsApp] = useState(true);
  const [customMessage, setCustomMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ portalUrl: string; notificationStatus: string; clientName: string } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4500);
  };

  const getDefaultMessage = (client: any, template: Template) => {
    return `שלום ${client?.firstName || ''} יקר/ה,

לפני הפגישה הראשונה שלנו, נדרשת חתימתך על המסמך הבא:
📄 *${template.title || template.name}*

החתימה מתבצעת בקלות מהנייד, דרך המרחב האישי המאובטח שלך:
{{portalUrl}}

תודה וברכה,
${clinicName}`;
  };

  const openSendModal = (t: Template) => {
    setSendModal(t);
    setSendResult(null);
    setCopiedLink(false);
    setSendWhatsApp(true);
    setClientSearch('');
    const initialClient = clients[0] || null;
    setSelectedClientId(initialClient ? initialClient.id : '');
    if (initialClient) {
      setCustomMessage(getDefaultMessage(initialClient, t));
    } else {
      setCustomMessage('');
    }
  };

  const handleCopyLink = (url: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 3000);
      });
    }
  };

  const handleSendToClient = async () => {
    if (!sendModal || !selectedClientId) {
      showToast('נא לבחור לקוח לשיוך הטופס', 'error');
      return;
    }
    const client = clients.find(c => c.id === selectedClientId);
    if (!client) {
      showToast('הלקוח שנבחר לא נמצא', 'error');
      return;
    }
    if (sendWhatsApp && !client.phone) {
      showToast('ללקוח הנבחר אין מספר טלפון להודעת וואטסאפ', 'error');
      return;
    }

    setIsSending(true);
    try {
      const res = await api.sendFormToClient(
        sendModal.id,
        selectedClientId,
        customMessage.trim() || undefined,
        sendWhatsApp
      );

      setSendResult({
        portalUrl: res.portalUrl,
        notificationStatus: res.notificationStatus,
        clientName: `${client.firstName} ${client.lastName}`.trim()
      });

      if (res.notificationStatus === 'sent') {
        showToast(`הטופס נשלח בהצלחה בוואטסאפ ל-${client.firstName}! 📱`, 'success');
      } else if (res.notificationStatus === 'failed') {
        showToast('הטופס שויך ללקוח, אך שליחת הוואטסאפ נכשלה — ניתן להעתיק את הקישור ידנית', 'error');
      } else {
        showToast(`הטופס שויך בהצלחה למרחב של ${client.firstName}!`, 'success');
      }

      await loadTemplates();
    } catch (err: any) {
      showToast(err.message || 'שגיאה בשליחת הטופס', 'error');
    } finally {
      setIsSending(false);
    }
  };

  useEffect(() => {
    const user = typeof window !== 'undefined' ? localStorage.getItem('wisecare_user') : null;
    if (user) {
      try {
        const parsed = JSON.parse(user);
        if (parsed?.role !== 'therapist' && parsed?.role !== 'superadmin') {
          window.location.href = '/login';
          return;
        }
      } catch {
        window.location.href = '/login';
        return;
      }
    } else if (typeof window !== 'undefined') {
      window.location.href = '/login';
      return;
    }

    fetch('/api/settings').then(r => r.json()).then((s: any) => {
      if (s?.clinicName) setClinicName(s.clinicName);
    }).catch(() => { });
    loadTemplates();
    api.getClients().then((cls: any) => {
      if (Array.isArray(cls)) setClients(cls.filter((c: any) => !c.archived));
    }).catch(() => { });
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const data = await api.getFormTemplates();
      setTemplates(Array.isArray(data) ? data : []);
    } catch (err: any) {
      showToast(err.message || 'שגיאה בטעינת הטפסים', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!editing) return;
    if (!String(editing.name || '').trim()) return showToast('נא להזין שם לטופס', 'error');
    if (!String(editing.title || '').trim()) return showToast('נא להזין כותרת שתוצג ללקוח', 'error');
    const hasContent = String(editing.introText || '').trim() ||
      (editing.sections || []).some(s => String(s.heading || '').trim() || String(s.body || '').trim());
    if (!hasContent) return showToast('הטופס ריק — הוסף טקסט פתיחה או סעיפים', 'error');

    setIsSaving(true);
    try {
      const payload = {
        name: editing.name,
        title: editing.title,
        introText: editing.introText,
        sections: (editing.sections || []).filter(s => String(s.heading || '').trim() || String(s.body || '').trim()),
        requiredFields: editing.requiredFields || [],
        footerText: editing.footerText,
        requiresSignature: editing.requiresSignature !== false,
        accentColor: editing.accentColor || 'var(--primary)',
        active: editing.active !== false
      };
      if (isNew) {
        await api.createFormTemplate(payload);
        showToast('הטופס נוצר בהצלחה! ניתן לשלוח אותו למטופלים מכרטיס הלקוח. ✍️');
      } else {
        await api.updateFormTemplate(editing.id!, payload);
        showToast('הטופס עודכן בהצלחה');
      }
      setEditing(null);
      setShowPreview(false);
      await loadTemplates();
    } catch (err: any) {
      showToast(err.message || 'שגיאה בשמירת הטופס', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteModal) return;
    try {
      const res = await api.deleteFormTemplate(deleteModal.id);
      showToast(res.message || 'הטופס נמחק');
      await loadTemplates();
    } catch (err: any) {
      showToast(err.message || 'שגיאה במחיקה', 'error');
    } finally {
      setDeleteModal(null);
    }
  };

  const handleDuplicate = async (t: Template) => {
    try {
      await api.createFormTemplate({
        name: `${t.name} (עותק)`,
        title: t.title,
        introText: t.introText,
        sections: t.sections,
        requiredFields: t.requiredFields,
        footerText: t.footerText,
        requiresSignature: t.requiresSignature,
        accentColor: t.accentColor,
        active: t.active
      });
      showToast('הטופס שוכפל — ערוך והתאם לפי הצורך');
      await loadTemplates();
    } catch (err: any) {
      showToast(err.message || 'שגיאה בשכפול', 'error');
    }
  };

  const updateEditing = (patch: Partial<Template>) => {
    setEditing(prev => prev ? { ...prev, ...patch } : prev);
  };

  const updateSection = (index: number, patch: Partial<Section>) => {
    setEditing(prev => {
      if (!prev) return prev;
      const sections = [...(prev.sections || [])];
      sections[index] = { ...sections[index], ...patch };
      return { ...prev, sections };
    });
  };

  const updateField = (index: number, patch: Partial<RequiredField>) => {
    setEditing(prev => {
      if (!prev) return prev;
      const requiredFields = [...(prev.requiredFields || [])];
      requiredFields[index] = { ...requiredFields[index], ...patch };
      return { ...prev, requiredFields };
    });
  };

  const filteredClients = clients.filter((c: any) => {
    if (!clientSearch.trim()) return true;
    const q = clientSearch.trim().toLowerCase();
    const fullName = `${c.firstName || ''} ${c.lastName || ''}`.toLowerCase();
    const phone = (c.phone || '').replace(/\D/g, '');
    return fullName.includes(q) || phone.includes(q);
  });

  const selectedClient = clients.find((c: any) => c.id === selectedClientId);

  const renderFormDocument = (t: Partial<Template>, forPrint = false) => (
    <div style={{
      background: '#ffffff',
      border: '1px solid #e2e8f0',
      borderRadius: forPrint ? 0 : '14px',
      padding: forPrint ? '0' : '28px 26px',
      textAlign: 'right',
      lineHeight: 1.8,
      fontFamily: 'inherit',
      color: '#1e293b',
      minHeight: forPrint ? 'auto' : '420px',
      overflowY: forPrint ? 'visible' : 'auto',
      maxHeight: forPrint ? 'none' : '70vh'
    } as React.CSSProperties}>
      <div style={{ textAlign: 'center', borderBottom: `3px double ${t.accentColor || 'var(--primary)'}`, paddingBottom: '14px', marginBottom: '18px' }}>
        <div style={{ fontWeight: 800, fontSize: '1.25rem', color: t.accentColor || 'var(--primary)' }}>
          {t.title || 'כותרת המסמך'}
        </div>
        <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px' }}>{clinicName}</div>
      </div>

      {String(t.introText || '').trim() && (
        <p style={{ whiteSpace: 'pre-wrap', margin: '0 0 18px', fontSize: '0.95rem' }}>{t.introText}</p>
      )}

      {(t.sections || []).filter(s => String(s.heading || '').trim() || String(s.body || '').trim()).map((s, i) => (
        <div key={i} style={{ marginBottom: '16px' }}>
          {String(s.heading || '').trim() && (
            <div style={{ fontWeight: 800, fontSize: '1rem', color: t.accentColor || 'var(--primary)', marginBottom: '4px' }}>
              {i + 1}. {s.heading}
            </div>
          )}
          {String(s.body || '').trim() && (
            <p style={{ whiteSpace: 'pre-wrap', margin: 0, fontSize: '0.9rem', color: '#334155' }}>{s.body}</p>
          )}
        </div>
      ))}

      {(t.requiredFields || []).length > 0 && (
        <div style={{ margin: '20px 0', padding: '14px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '10px' }}>אישורים נדרשים:</div>
          {(t.requiredFields || []).map((f, i) => (
            <label key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '8px', fontSize: '0.88rem', cursor: 'default' }}>
              <span style={{
                width: '17px', height: '17px', flexShrink: 0, marginTop: '3px',
                border: `2px solid ${t.accentColor || 'var(--primary)'}`, borderRadius: '4px', background: '#fff'
              }} />
              <span>{f.label} {f.type !== 'checkbox' && <em style={{ color: '#94a3b8', fontSize: '0.8rem' }}>(שדה מילוי: {f.type === 'text' ? 'טקסט' : 'תאריך'})</em>}</span>
            </label>
          ))}
        </div>
      )}

      {t.requiresSignature !== false && (
        <div style={{ marginTop: '24px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '16px', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: '4px' }}>שם מלא (אימות):</div>
              <div style={{ width: '200px', borderBottom: '1px solid #94a3b8', height: '24px' }} />
            </div>
            <div>
              <div style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: '4px' }}>חתימה:</div>
              <div style={{
                width: '220px', height: '90px', border: `2px dashed ${t.accentColor || 'var(--primary)'}`,
                borderRadius: '10px', background: '#fafafa', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#94a3b8', fontSize: '0.8rem'
              }}>
                אזור חתימה במסך המטופל
              </div>
            </div>
          </div>
        </div>
      )}

      {String(t.footerText || '').trim() && (
        <p style={{ whiteSpace: 'pre-wrap', marginTop: '16px', fontSize: '0.8rem', color: '#64748b', borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
          {t.footerText}
        </p>
      )}
    </div>
  );

  /* ============================ EDITOR VIEW ============================ */
  if (editing) {
    return (
      <div className="page-content" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div className="page-header" style={{ flexWrap: 'wrap', gap: '12px' }}>
          <div className="page-title-group">
            <span className="eyebrow"><FileSignature size={15} /> עריכת טופס דיגיטלי</span>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              {isNew ? 'יצירת טופס חדש' : `עריכה: ${editing.name}`}
            </h2>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setShowPreview(p => !p)}>
              <Eye size={16} />
              <span>{showPreview ? 'הסתר תצוגה מקדימה' : 'תצוגה מקדימה'}</span>
            </button>
            <button type="button" className="btn btn-primary" onClick={handleSave} disabled={isSaving}>
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
              <span>שמור טופס</span>
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => { setEditing(null); setShowPreview(false); }}>
              <X size={16} />
              <span>ביטול</span>
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: showPreview ? '1fr 1fr' : '1fr', gap: '16px', alignItems: 'start' }}>
          {/* Editor column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="card" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <label style={{ display: 'block' }}>
                <span style={{ fontWeight: 700, fontSize: '0.85rem', display: 'block', marginBottom: '5px' }}>שם פנימי לטופס *</span>
                <input
                  className="form-control" type="text" value={editing.name || ''}
                  onChange={e => updateEditing({ name: e.target.value })}
                  placeholder="למשל: הסכמה מדעת 2026"
                />
              </label>
              <label style={{ display: 'block' }}>
                <span style={{ fontWeight: 700, fontSize: '0.85rem', display: 'block', marginBottom: '5px' }}>כותרת שתוצג למטופל *</span>
                <input
                  className="form-control" type="text" value={editing.title || ''}
                  onChange={e => updateEditing({ title: e.target.value })}
                  placeholder="למשל: טופס הסכמה מדעת לטיפול"
                />
              </label>
              <label style={{ display: 'block' }}>
                <span style={{ fontWeight: 700, fontSize: '0.85rem', display: 'block', marginBottom: '5px' }}>טקסט פתיחה</span>
                <textarea
                  className="form-control" rows={4} value={editing.introText || ''}
                  onChange={e => updateEditing({ introText: e.target.value })}
                  placeholder="פנייה אישית למטופל לפני גוף המסמך..."
                />
              </label>

              <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, fontSize: '0.88rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox" checked={editing.active !== false}
                    onChange={e => updateEditing({ active: e.target.checked })}
                  />
                  טופס פעיל (ניתן לשליחה)
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, fontSize: '0.88rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox" checked={editing.requiresSignature !== false}
                    onChange={e => updateEditing({ requiresSignature: e.target.checked })}
                  />
                  נדרשת חתימה
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>צבע:</span>
                  {ACCENT_CHOICES.map(c => (
                    <button
                      key={c} type="button" aria-label={`צבע ${c}`}
                      onClick={() => updateEditing({ accentColor: c })}
                      style={{
                        width: '24px', height: '24px', borderRadius: '50%', background: c, cursor: 'pointer',
                        border: (editing.accentColor || 'var(--primary)') === c ? '3px solid #0f172a' : '2px solid #e2e8f0'
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Sections editor */}
            <div className="card" style={{ padding: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ fontWeight: 800, fontSize: '1rem' }}>סעיפי המסמך ({(editing.sections || []).length})</div>
                <button
                  type="button" className="btn btn-secondary" style={{ padding: '5px 12px', fontSize: '0.82rem' }}
                  onClick={() => updateEditing({ sections: [...(editing.sections || []), { heading: '', body: '' }] })}
                >
                  <Plus size={14} />
                  <span>הוסף סעיף</span>
                </button>
              </div>
              {(editing.sections || []).map((s, i) => (
                <div key={i} style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px', marginBottom: '10px', display: 'flex', flexDirection: 'column', gap: '8px', background: '#f8fafc' }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{ fontWeight: 800, color: '#64748b', fontSize: '0.85rem', minWidth: '22px' }}>{i + 1}.</span>
                    <input
                      className="form-control" type="text" value={s.heading}
                      onChange={e => updateSection(i, { heading: e.target.value })}
                      placeholder="כותרת הסעיף"
                    />
                    <button
                      type="button" className="btn btn-secondary" style={{ padding: '6px', color: '#ef4444' }}
                      title="מחק סעיף"
                      onClick={() => updateEditing({ sections: (editing.sections || []).filter((_, j) => j !== i) })}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <textarea
                    className="form-control" rows={3} value={s.body}
                    onChange={e => updateSection(i, { body: e.target.value })}
                    placeholder="תוכן הסעיף..."
                  />
                </div>
              ))}
            </div>

            {/* Required fields editor */}
            <div className="card" style={{ padding: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ fontWeight: 800, fontSize: '1rem' }}>אישורים ושדות חובה ({(editing.requiredFields || []).length})</div>
                <button
                  type="button" className="btn btn-secondary" style={{ padding: '5px 12px', fontSize: '0.82rem' }}
                  onClick={() => updateEditing({ requiredFields: [...(editing.requiredFields || []), { label: '', type: 'checkbox' }] })}
                >
                  <Plus size={14} />
                  <span>הוסף שדה</span>
                </button>
              </div>
              {(editing.requiredFields || []).length === 0 && (
                <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: 0 }}>
                  לא נוספו אישורים. מומלץ להוסיף לפחות אישור אחד (למשל: "קראתי והבנתי את תנאי הטיפול").
                </p>
              )}
              {(editing.requiredFields || []).map((f, i) => (
                <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                  <select
                    className="form-control" style={{ width: '130px' }} value={f.type}
                    onChange={e => updateField(i, { type: e.target.value as RequiredField['type'] })}
                  >
                    <option value="checkbox">תיבת אישור</option>
                    <option value="text">שדה טקסט</option>
                    <option value="date">תאריך</option>
                  </select>
                  <input
                    className="form-control" type="text" value={f.label} style={{ flex: 1 }}
                    onChange={e => updateField(i, { label: e.target.value })}
                    placeholder="נוסח האישור / השדה"
                  />
                  <button
                    type="button" className="btn btn-secondary" style={{ padding: '6px', color: '#ef4444' }}
                    title="הסר שדה"
                    onClick={() => updateEditing({ requiredFields: (editing.requiredFields || []).filter((_, j) => j !== i) })}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              <label style={{ display: 'block', marginTop: '10px' }}>
                <span style={{ fontWeight: 700, fontSize: '0.85rem', display: 'block', marginBottom: '5px' }}>טקסט סיום (הערות תחתונות)</span>
                <textarea
                  className="form-control" rows={2} value={editing.footerText || ''}
                  onChange={e => updateEditing({ footerText: e.target.value })}
                  placeholder="הערה אחרונה בתחתית המסמך..."
                />
              </label>
            </div>
          </div>

          {/* Preview column */}
          {showPreview && (
            <div className="card" style={{ padding: '18px', position: 'sticky', top: '90px' }}>
              <div style={{ fontWeight: 800, fontSize: '1rem', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Eye size={16} /> כך המטופל/ה יראה את הטופס
              </div>
              {renderFormDocument(editing)}
            </div>
          )}
        </div>

        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </div>
    );
  }

  /* ============================ LIST VIEW ============================ */
  return (
    <div className="page-content">
      <div className="page-header" style={{ flexWrap: 'wrap', gap: '12px' }}>
        <div className="page-title-group">
          <span className="eyebrow"><FileSignature size={15} /> הטפסים הדיגיטליים שלי</span>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>טפסים דיגיטליים וחתימות</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
            בנה טפסי הסכמה, חוזים והצהרות בעיצוב שלך ושלח אותם לחתימה דיגיטלית מהנייד — לפני הפגישה הראשונה.
          </p>
        </div>
        <div style={{ position: 'relative', display: 'flex', gap: '8px' }}>
          <button type="button" className="btn btn-secondary" onClick={() => setPresetsOpen(o => !o)}>
            <FileText size={16} />
            <span>תבניות מוכנות</span>
            {presetsOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          <button
            type="button" className="btn btn-primary"
            onClick={() => { setEditing(emptyTemplate()); setIsNew(true); setPresetsOpen(false); }}
          >
            <Plus size={17} />
            <span>טופס חדש</span>
          </button>

          {presetsOpen && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 8px)', left: 0, zIndex: 30, width: 'min(430px, 90vw)',
              background: '#fff', borderRadius: '14px', border: '1px solid #e2e8f0',
              boxShadow: '0 18px 50px rgba(15, 23, 42, 0.16)', padding: '10px', display: 'flex', flexDirection: 'column', gap: '6px'
            }}>
              {FORM_PRESETS.map(p => (
                <button
                  key={p.key} type="button"
                  onClick={() => {
                    setEditing({ ...p.build(clinicName) });
                    setIsNew(true);
                    setPresetsOpen(false);
                    showToast(`תבנית "${p.label}" נטענה — ערוך והתאם לפי הצורך`);
                  }}
                  style={{ textAlign: 'right', border: '1px solid #f1f5f9', borderRadius: '10px', padding: '10px 12px', cursor: 'pointer', background: '#fff', transition: 'border-color .15s' }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--primary)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = '#f1f5f9')}
                >
                  <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0f172a' }}>{p.label}</div>
                  <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>{p.description}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="card-table">
        {loading ? (
          <div className="content-empty"><Loader2 className="spin" /><h2>טוען את הטפסים...</h2></div>
        ) : templates.length === 0 ? (
          <div className="content-empty">
            <div className="content-empty-icon"><FileSignature size={30} /></div>
            <h2>אין לך עדיין טפסים דיגיטליים</h2>
            <p>התחל/י מתבנית מוכנה — הסכמה מדעת, חוזה טיפולי, הצהרת בריאות או הצהרת מגע פיזי — או צור טופס חדש מאפס.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '14px' }}>
            {templates.map(t => {
              const isExpanded = expandedId === t.id;
              return (
                <div key={t.id} style={{
                  border: `1px solid ${t.active ? '#e2e8f0' : '#fecaca'}`, borderRadius: '14px',
                  background: t.active ? '#ffffff' : '#fff7f7', overflow: 'hidden'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 16px', flexWrap: 'wrap' }}>
                    <div style={{
                      width: '44px', height: '44px', borderRadius: '12px', flexShrink: 0,
                      background: `${t.accentColor}18`, color: t.accentColor,
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      <FileSignature size={22} />
                    </div>
                    <div style={{ flex: 1, minWidth: '200px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 800, fontSize: '1rem', color: '#0f172a' }}>{t.name}</span>
                        {!t.active && (
                          <span style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', borderRadius: '8px', padding: '2px 8px', fontSize: '0.72rem', fontWeight: 700 }}>
                            בארכיון / לא פעיל
                          </span>
                        )}
                        {t.requiresSignature !== false && (
                          <span style={{ background: 'var(--primary-faint)', color: 'var(--primary-hover)', border: '1px solid var(--primary-light)', borderRadius: '8px', padding: '2px 8px', fontSize: '0.72rem', fontWeight: 700 }}>
                            נדרשת חתימה
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '2px' }}>
                        {t.title} · {(t.sections || []).length} סעיפים · נשלח {t.sentCount || 0} פעמים · חתום {t.signedCount || 0}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                      <button
                        type="button"
                        className="btn btn-primary"
                        style={{
                          padding: '6px 14px',
                          gap: '6px',
                          background: 'var(--primary)',
                          borderColor: 'var(--primary)',
                          fontSize: '0.85rem'
                        }}
                        title="שייך ללקוח ושלח לחתימה בוואטסאפ"
                        onClick={() => openSendModal(t)}
                      >
                        <WhatsAppIcon size={16} />
                        <span>שייך ללקוח בוואטסאפ</span>
                      </button>
                      <button type="button" className="btn btn-secondary" style={{ padding: '6px 10px' }} title="תצוגה מקדימה" onClick={() => setExpandedId(isExpanded ? null : t.id)}>
                        <Eye size={15} />
                      </button>
                      <button type="button" className="btn btn-secondary" style={{ padding: '6px 10px' }} title="שכפול" onClick={() => handleDuplicate(t)}>
                        <Copy size={15} />
                      </button>
                      <button type="button" className="btn btn-secondary" style={{ padding: '6px 10px' }} title="עריכה" onClick={() => { setEditing(t); setIsNew(false); }}>
                        <Pencil size={15} />
                      </button>
                      <button type="button" className="btn btn-secondary" style={{ padding: '6px 10px', color: '#ef4444' }} title="מחיקה" onClick={() => setDeleteModal(t)}>
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div style={{ padding: '0 16px 16px' }}>
                      <div style={{
                        marginBottom: '14px', padding: '12px 16px', background: 'var(--primary-faint)',
                        border: '1px solid var(--primary-light)', borderRadius: '12px',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        flexWrap: 'wrap', gap: '10px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.88rem', color: 'var(--primary-hover)' }}>
                          <WhatsAppIcon size={20} />
                          <span>טופס זה פעיל ומוכן לשליחה מהירה לכל לקוח במערכת דרך חיבור הוואטסאפ של המערכת.</span>
                        </div>
                        <button
                          type="button"
                          className="btn btn-primary"
                          style={{ background: 'var(--primary)', borderColor: 'var(--primary)', padding: '6px 14px', gap: '6px', fontSize: '0.85rem' }}
                          onClick={() => openSendModal(t)}
                        >
                          <WhatsAppIcon size={16} />
                          <span>שייך ללקוח עכשיו</span>
                        </button>
                      </div>
                      {renderFormDocument(t)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div style={{
        marginTop: '16px', display: 'flex', alignItems: 'flex-start', gap: '10px',
        background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '12px', padding: '12px 16px'
      }}>
        <Users size={18} color="#1d4ed8" style={{ flexShrink: 0, marginTop: '2px' }} />
        <div style={{ fontSize: '0.85rem', color: '#1e40af' }}>
          <strong>איך שולחים טופס לחתימה?</strong> מתוך תיק הלקוחות — פתח/י לקוח, עבור/י לטאב "טפסים" ולחצ/י "שלח לחתימה".
          הלקוח יקבל וואטסאפ עם קישור לחתימה מהנייד, והטופס החתום יופיע אצלך בכרטיס עם אפשרות הורדה כ-PDF.
        </div>
      </div>

      {sendModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
        }}>
          <div style={{
            background: '#ffffff', borderRadius: '18px', width: '100%', maxWidth: '620px',
            maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', border: '1px solid #e2e8f0',
            textAlign: 'right'
          }}>
            {/* Modal Header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '18px 22px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc',
              borderTopLeftRadius: '18px', borderTopRightRadius: '18px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '42px', height: '42px', borderRadius: '12px',
                  background: 'var(--primary-light)', color: 'var(--primary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <WhatsAppIcon size={24} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                    שיוך טופס ושליחה בוואטסאפ
                  </h3>
                  <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '2px' }}>
                    טופס: <strong style={{ color: sendModal.accentColor || 'var(--primary)' }}>{sendModal.title || sendModal.name}</strong>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { setSendModal(null); setSendResult(null); }}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b', padding: '4px' }}
                aria-label="סגור חלון"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {sendResult ? (
                /* Success state */
                <div style={{
                  background: 'var(--primary-faint)', border: '1px solid var(--primary-light)', borderRadius: '14px',
                  padding: '20px', textAlign: 'center', display: 'flex', flexDirection: 'column',
                  alignItems: 'center', gap: '12px'
                }}>
                  <div style={{
                    width: '56px', height: '56px', borderRadius: '50%', background: 'var(--primary)',
                    color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <CheckCircle2 size={32} />
                  </div>
                  <h4 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--primary-hover)' }}>
                    הטופס שויך בהצלחה!
                  </h4>
                  <p style={{ margin: 0, color: 'var(--primary-hover)', fontSize: '0.92rem', lineHeight: '1.6' }}>
                    {sendResult.notificationStatus === 'sent'
                      ? `הודעת WhatsApp עם קישור ישיר לחתימה נשלחה כעת ל-${sendResult.clientName} דרך חשבון הוואטסאפ של המערכת.`
                      : `הטופס שויך למרחב האישי של ${sendResult.clientName}. ניתן גם להעתיק את הקישור הישיר:`}
                  </p>

                  <div style={{
                    width: '100%', background: '#fff', border: '1px solid var(--primary-light)', borderRadius: '10px',
                    padding: '10px 12px', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px'
                  }}>
                    <input
                      type="text"
                      readOnly
                      value={sendResult.portalUrl}
                      style={{
                        flex: 1, border: 'none', background: 'transparent', fontSize: '0.85rem',
                        color: '#334155', direction: 'ltr', outline: 'none'
                      }}
                    />
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ padding: '6px 12px', fontSize: '0.82rem', flexShrink: 0 }}
                      onClick={() => handleCopyLink(sendResult.portalUrl)}
                    >
                      {copiedLink ? <Check size={14} color="var(--primary)" /> : <Copy size={14} />}
                      <span>{copiedLink ? 'הועתק!' : 'העתק קישור'}</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ marginTop: '10px', width: '100%', justifyContent: 'center' }}
                    onClick={() => { setSendModal(null); setSendResult(null); }}
                  >
                    סגור חלון
                  </button>
                </div>
              ) : (
                /* Form selection & send state */
                <>
                  {/* System WhatsApp status indicator */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    background: 'var(--primary-faint)', border: '1px solid var(--primary-light)', borderRadius: '10px',
                    padding: '10px 14px', fontSize: '0.84rem', color: 'var(--primary-hover)'
                  }}>
                    <WhatsAppIcon size={18} />
                    <span>
                      <strong>אוטומציית WhatsApp פעילה:</strong> ההודעה נשלחת ישירות מחשבון הוואטסאפ של המערכת (Green API המוגדר בסופר-אדמין).
                    </span>
                  </div>

                  {/* Client selection */}
                  <div>
                    <label style={{ display: 'block', fontWeight: 700, fontSize: '0.88rem', marginBottom: '6px', color: '#0f172a' }}>
                      בחר/י לקוח לשיוך הטופס * (חיפוש לפי שם או טלפון)
                    </label>

                    {clients.length === 0 ? (
                      <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '10px', textAlign: 'center', color: '#64748b', fontSize: '0.88rem' }}>
                        לא נמצאו לקוחות במערכת. יש להוסיף לקוח בכרטיס הלקוחות תחילה.
                      </div>
                    ) : (
                      <SearchableClientSelect
                        clients={clients}
                        value={selectedClientId}
                        onChange={(id, selected) => {
                          setSelectedClientId(id);
                          if (selected && sendModal) {
                            setCustomMessage(getDefaultMessage(selected, sendModal));
                          }
                        }}
                        placeholder="חיפוש לפי שם לקוח או טלפון..."
                        required
                      />
                    )}
                  </div>

                  {/* Selected client card preview */}
                  {selectedClient && (
                    <div style={{
                      background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px',
                      padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      flexWrap: 'wrap', gap: '8px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '38px', height: '38px', borderRadius: '50%', background: '#e2e8f0',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 700, fontSize: '0.9rem', color: '#334155'
                        }}>
                          {(selectedClient.firstName?.[0] || 'ל')}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#0f172a' }}>
                            {selectedClient.firstName} {selectedClient.lastName}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                            נייד: {selectedClient.phone || 'חסר מספר טלפון'} · פורטל: {selectedClient.portalCode}
                          </div>
                        </div>
                      </div>

                      {!selectedClient.phone && (
                        <span style={{ color: '#b91c1c', fontSize: '0.78rem', background: '#fef2f2', padding: '3px 8px', borderRadius: '6px', border: '1px solid #fecaca' }}>
                          חסר טלפון לשליחת וואטסאפ
                        </span>
                      )}
                    </div>
                  )}

                  {/* Send WhatsApp checkbox */}
                  <div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem' }}>
                      <input
                        type="checkbox"
                        checked={sendWhatsApp}
                        onChange={e => setSendWhatsApp(e.target.checked)}
                      />
                      <span>שלח הודעת WhatsApp אוטומטית ללקוח עם הקישור לחתימה</span>
                    </label>
                  </div>

                  {/* WhatsApp Message Preview */}
                  {sendWhatsApp && (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <label style={{ fontWeight: 700, fontSize: '0.85rem', color: '#334155' }}>
                          תוכן ההודעה שתישלח בוואטסאפ:
                        </label>
                        <button
                          type="button"
                          style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.78rem', cursor: 'pointer', textDecoration: 'underline' }}
                          onClick={() => {
                            if (selectedClient && sendModal) {
                              setCustomMessage(getDefaultMessage(selectedClient, sendModal));
                            }
                          }}
                        >
                          איפוס לנוסח ברירת המחדל
                        </button>
                      </div>
                      <textarea
                        className="form-control"
                        rows={6}
                        style={{ fontSize: '0.86rem', lineHeight: '1.5', fontFamily: 'inherit' }}
                        value={customMessage}
                        onChange={e => setCustomMessage(e.target.value)}
                        placeholder="הזן נוסח הודעה אישי..."
                      />
                      <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '4px' }}>
                        המשתנה {'{{portalUrl}}'} יוחלף אוטומטית בקישור החתימה המאובטח הישיר של הלקוח.
                      </div>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setSendModal(null)}
                      disabled={isSending}
                    >
                      ביטול
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      style={{
                        background: 'var(--primary)',
                        borderColor: 'var(--primary)',
                        padding: '9px 20px',
                        gap: '8px'
                      }}
                      disabled={isSending || !selectedClientId || (sendWhatsApp && selectedClient && !selectedClient.phone)}
                      onClick={handleSendToClient}
                    >
                      {isSending ? <Loader2 size={16} className="animate-spin" /> : <WhatsAppIcon size={18} />}
                      <span>{isSending ? 'שולח ומשייך...' : 'שלח בוואטסאפ ושייך ללקוח'}</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {deleteModal && (
        <ConfirmModal
          isOpen={Boolean(deleteModal)}
          onClose={() => setDeleteModal(null)}
          title="מחיקת טופס דיגיטלי"
          message={
            deleteModal.sentCount
              ? `לטופס "${deleteModal.name}" נשלחו כבר ${deleteModal.sentCount} עותקים. אם קיימות חתימות — הטופס יועבר לארכיון כדי לשמר את הרישום המשפטי. להמשיך?`
              : `האם למחוק את הטופס "${deleteModal.name}" לצמיתות?`
          }
          confirmText="כן, מחק טופס"
          onConfirm={handleDelete}
          onCancel={() => setDeleteModal(null)}
        />
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
