'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Receipt,
  Plus,
  Send,
  Pencil,
  Trash2,
  Copy,
  CopyPlus,
  Loader2,
  CheckCircle2,
  XCircle,
  Package,
  User,
  UserPlus,
  Link2,
  BookmarkPlus,
  Layers,
  Search
} from 'lucide-react';
import { api } from '@/lib/api';
import {
  formatILS,
  quoteStatusMeta,
  quoteOptionsSummary,
  quoteChosenOptionLabel,
  templateSummary
} from '@/lib/quoteHelpers';
import ConfirmModal from './ConfirmModal';
import Toast from './Toast';
import WhatsAppIcon from './WhatsAppIcon';

interface QuoteOptionDraft {
  id: string;
  label: string;
  pricingModel: 'single' | 'package';
  sessionPrice: string;
  sessionsCount: string;
}

interface QuoteDraft {
  clientId: string;
  newClient: { firstName: string; lastName: string; phone: string } | null;
  leadName: string;
  leadPhone: string;
  title: string;
  description: string;
  options: QuoteOptionDraft[];
}

interface QuoteRow {
  id: string;
  clientId: string | null;
  leadName: string;
  leadPhone: string;
  title: string;
  description: string;
  options: Array<{
    id: string;
    label: string;
    pricingModel: 'single' | 'package';
    sessionPrice: number;
    sessionsCount: number;
    totalPrice: number;
  }>;
  status: 'draft' | 'sent' | 'confirmed' | 'declined';
  selectedOptionId: string | null;
  sentAt: string | null;
  decidedAt: string | null;
  notificationStatus: string;
  createdAt: string;
}

interface ClientOption {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
}

interface TemplateRow {
  id: string;
  name: string;
  options: Array<{
    id: string;
    label: string;
    pricingModel: 'single' | 'package';
    sessionsCount: number;
    sessionPrice: number;
  }>;
}

type StatusFilter = 'all' | 'sent' | 'confirmed' | 'declined';

const STATUS_FILTERS: Array<{ key: StatusFilter; label: string; color: string; bg: string; border: string }> = [
  { key: 'all', label: 'הכל', color: '#334155', bg: '#f8fafc', border: '#e2e8f0' },
  { key: 'sent', label: 'נשלח', color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe' },
  { key: 'confirmed', label: 'אושר', color: 'var(--primary-hover)', bg: 'var(--primary-faint)', border: 'var(--primary-light)' },
  { key: 'declined', label: 'לא אושר', color: '#b91c1c', bg: '#fef2f2', border: '#fecaca' }
];

const EMPTY_DRAFT = (): QuoteDraft => ({
  clientId: '',
  newClient: null,
  leadName: '',
  leadPhone: '',
  title: '',
  description: '',
  options: [
    { id: `opt-${Date.now()}-1`, label: 'מפגש בודד', pricingModel: 'single', sessionPrice: '', sessionsCount: '1' },
    { id: `opt-${Date.now()}-2`, label: 'תהליך טיפולי', pricingModel: 'package', sessionPrice: '', sessionsCount: '12' }
  ]
});

function formatDate(value: string | null): string {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: '2-digit' });
  } catch {
    return '—';
  }
}

export default function QuotesManager() {
  const [quotes, setQuotes] = useState<QuoteRow[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type?: 'success' | 'error' } | null>(null);

  // Save-as-template (editor)
  const [saveTemplateName, setSaveTemplateName] = useState('');
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [deleteTemplateModal, setDeleteTemplateModal] = useState<TemplateRow | null>(null);

  // Editor state (null = list view)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<QuoteDraft>(EMPTY_DRAFT());
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showNewClientForm, setShowNewClientForm] = useState(false);

  // List filters — status chips (נשלח / אושר / לא אושר) + free search
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Send / delete state
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [sendResult, setSendResult] = useState<{ quote: QuoteRow; sent: boolean; quoteUrl?: string; error?: string } | null>(null);
  const [deleteModal, setDeleteModal] = useState<QuoteRow | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4500);
  };

  const loadQuotes = useCallback(async () => {
    try {
      const data = await api.getQuotes();
      setQuotes(Array.isArray(data) ? data : []);
    } catch (err: any) {
      showToast(err.message || 'שגיאה בטעינת ההצעות', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadClients = useCallback(async () => {
    try {
      const data = await api.getClients();
      setClients(Array.isArray(data) ? data : []);
    } catch {
      // Non-blocking — manual lead entry still works without the picker
    }
  }, []);

  const loadTemplates = useCallback(async () => {
    try {
      const data = await api.getQuoteTemplates();
      setTemplates(Array.isArray(data) ? data : []);
    } catch {
      // Non-blocking — quotes still work without templates
    }
  }, []);

  useEffect(() => {
    loadQuotes();
    loadClients();
    loadTemplates();
  }, [loadQuotes, loadClients, loadTemplates]);

  // Start a NEW quote from a template — the therapist only fills client + amount
  const startFromTemplate = (template: TemplateRow) => {
    setDraft({
      clientId: '',
      newClient: null,
      leadName: '',
      leadPhone: '',
      title: template.name,
      description: '',
      options: (template.options || []).map(o => ({
        id: `opt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        label: o.label,
        pricingModel: o.pricingModel,
        sessionPrice: o.sessionPrice ? String(o.sessionPrice) : '',
        sessionsCount: String(o.sessionsCount || '')
      }))
    });
    setShowNewClientForm(false);
    setSaveTemplateName('');
    setEditingId(null);
    setIsNew(true);
  };

  // Save the current editor structure (+ prices as defaults) as a reusable template
  const saveDraftAsTemplate = async () => {
    if (!saveTemplateName.trim()) {
      showToast('נא להזין שם לתבנית', 'error');
      return;
    }
    if (draft.options.length === 0) {
      showToast('יש להוסיף לפחות אפשרות מחיר אחת לפני השמירה כתבנית', 'error');
      return;
    }
    setSavingTemplate(true);
    try {
      await api.createQuoteTemplate({
        name: saveTemplateName.trim(),
        options: draft.options.map(o => ({
          label: o.label.trim(),
          pricingModel: o.pricingModel,
          sessionsCount: Number(o.sessionsCount) || (o.pricingModel === 'single' ? 1 : 2),
          sessionPrice: Number(o.sessionPrice) || 0
        }))
      });
      setSaveTemplateName('');
      await loadTemplates();
      showToast('התבנית נשמרה ותופיע ברשימת התבניות המהירות ✨');
    } catch (err: any) {
      showToast(err.message || 'שגיאה בשמירת התבנית', 'error');
    } finally {
      setSavingTemplate(false);
    }
  };

  // Turn an existing quote into a reusable template (prices become the defaults)
  const saveQuoteAsTemplate = async (quote: QuoteRow) => {
    try {
      await api.createQuoteTemplate({
        name: quote.title || `תבנית — ${quote.leadName}`,
        options: (quote.options || []).map(o => ({
          label: o.label,
          pricingModel: o.pricingModel,
          sessionsCount: o.sessionsCount,
          sessionPrice: o.sessionPrice
        }))
      });
      await loadTemplates();
      showToast('ההצעה נשמרה כתבנית לשימוש חוזר ✨');
    } catch (err: any) {
      showToast(err.message || 'שגיאה בשמירת התבנית', 'error');
    }
  };

  const handleDeleteTemplate = async () => {
    if (!deleteTemplateModal) return;
    try {
      await api.deleteQuoteTemplate(deleteTemplateModal.id);
      setTemplates(current => current.filter(t => t.id !== deleteTemplateModal.id));
      showToast('התבנית נמחקה בהצלחה');
    } catch (err: any) {
      showToast(err.message || 'שגיאה במחיקת התבנית', 'error');
    } finally {
      setDeleteTemplateModal(null);
    }
  };

  const openNew = () => {
    setDraft(EMPTY_DRAFT());
    setEditingId(null);
    setShowNewClientForm(false);
    setIsNew(true);
  };

  const applyQuoteToDraft = (quote: QuoteRow) => {
    setDraft({
      clientId: quote.clientId || '',
      newClient: null,
      leadName: quote.leadName || '',
      leadPhone: quote.leadPhone || '',
      title: quote.title || '',
      description: quote.description || '',
      options: (quote.options || []).map(o => ({
        id: o.id,
        label: o.label,
        pricingModel: o.pricingModel,
        sessionPrice: String(o.sessionPrice || ''),
        sessionsCount: String(o.sessionsCount || '')
      }))
    });
    setShowNewClientForm(false);
    setSaveTemplateName('');
  };

  const openEdit = (quote: QuoteRow) => {
    applyQuoteToDraft(quote);
    setEditingId(quote.id);
    setIsNew(false);
  };

  // Duplicate: open a pre-filled editor for a NEW quote (similar offers in one click)
  const duplicateQuote = (quote: QuoteRow) => {
    applyQuoteToDraft(quote);
    setEditingId(null);
    setIsNew(true);
    showToast('ההצעה שוכפלה — בדוק/י את הפרטים ושמור/י');
  };

  const pickClient = (clientId: string) => {
    setShowNewClientForm(false);
    if (!clientId) {
      setDraft(d => ({ ...d, clientId: '', newClient: null }));
      return;
    }
    const client = clients.find(c => c.id === clientId);
    setDraft(d => ({
      ...d,
      clientId,
      newClient: null,
      leadName: client ? `${client.firstName} ${client.lastName || ''}`.trim() : d.leadName,
      leadPhone: client ? client.phone : d.leadPhone
    }));
  };

  const updateNewClientForm = (patch: Partial<NonNullable<QuoteDraft['newClient']>>) => {
    setDraft(d => ({
      ...d,
      newClient: { ...(d.newClient || { firstName: '', lastName: '', phone: '' }), ...patch }
    }));
  };

  const updateOption = (optionId: string, patch: Partial<QuoteOptionDraft>) => {
    setDraft(current => ({
      ...current,
      options: current.options.map(o => (o.id === optionId ? { ...o, ...patch } : o))
    }));
  };

  const addOption = () => {
    setDraft(current => ({
      ...current,
      options: [
        ...current.options,
        { id: `opt-${Date.now()}-${current.options.length + 1}`, label: '', pricingModel: 'single', sessionPrice: '', sessionsCount: '1' }
      ]
    }));
  };

  const removeOption = (optionId: string) => {
    setDraft(current => ({
      ...current,
      options: current.options.filter(o => o.id !== optionId)
    }));
  };

  const handleSave = async () => {
    if (draft.newClient) {
      if (!draft.newClient.firstName.trim()) { showToast('נא להזין שם פרטי ללקוח החדש', 'error'); return; }
      if (draft.newClient.phone.replace(/\D/g, '').length < 9) { showToast('נא להזין מספר טלפון תקין ללקוח החדש', 'error'); return; }
    } else if (!draft.clientId) {
      if (!draft.leadName.trim()) { showToast('נא להזין את שם הלקוח הפוטנציאלי', 'error'); return; }
      if (draft.leadPhone.replace(/\D/g, '').length < 9) { showToast('נא להזין מספר טלפון תקין', 'error'); return; }
    }
    if (draft.options.length === 0) { showToast('יש להוסיף לפחות אפשרות מחיר אחת', 'error'); return; }

    const payload: Record<string, unknown> = {
      title: draft.title.trim(),
      description: draft.description.trim(),
      options: draft.options.map(o => ({
        id: o.id,
        label: o.label.trim(),
        pricingModel: o.pricingModel,
        sessionPrice: Number(o.sessionPrice),
        sessionsCount: Number(o.sessionsCount)
      }))
    };
    if (draft.clientId) {
      payload.clientId = draft.clientId;
    } else if (draft.newClient) {
      payload.newClient = {
        firstName: draft.newClient.firstName.trim(),
        lastName: draft.newClient.lastName.trim(),
        phone: draft.newClient.phone.trim()
      };
    } else {
      payload.leadName = draft.leadName.trim();
      payload.leadPhone = draft.leadPhone.trim();
    }

    setSaving(true);
    try {
      if (isNew) {
        await api.createQuote(payload);
        showToast('ההצעה נוצרה בהצלחה וממתינה לשליחה ✨');
      } else {
        await api.updateQuote(editingId!, payload);
        showToast('ההצעה עודכנה בהצלחה ✨');
      }
      setIsNew(false);
      setEditingId(null);
      await loadQuotes();
      await loadClients(); // a new client may have just been created
    } catch (err: any) {
      showToast(err.message || 'שגיאה בשמירת ההצעה', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSend = async (quote: QuoteRow) => {
    setSendingId(quote.id);
    try {
      const result = await api.sendQuote(quote.id);
      setSendResult({ quote, sent: Boolean(result?.whatsappSent), quoteUrl: result?.quoteUrl, error: result?.whatsappError });
      await loadQuotes();
    } catch (err: any) {
      showToast(err.message || 'שגיאה בשליחת ההצעה', 'error');
    } finally {
      setSendingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteModal) return;
    try {
      await api.deleteQuote(deleteModal.id);
      setQuotes(current => current.filter(q => q.id !== deleteModal.id));
      showToast('ההצעה נמחקה בהצלחה');
    } catch (err: any) {
      showToast(err.message || 'שגיאה במחיקת ההצעה', 'error');
    } finally {
      setDeleteModal(null);
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast(`${label} הועתק בהצלחה 📋`);
    } catch {
      showToast('העתקה נכשלה — ניתן לסמן ולהעתיק ידנית', 'error');
    }
  };

  const stats = {
    total: quotes.length,
    sent: quotes.filter(q => q.status === 'sent').length,
    confirmed: quotes.filter(q => q.status === 'confirmed').length,
    declined: quotes.filter(q => q.status === 'declined').length
  };

  const filteredQuotes = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return quotes.filter(q => {
      const matchesStatus = statusFilter === 'all' || q.status === statusFilter;
      if (!matchesStatus) return false;
      if (!term) return true;
      return `${q.leadName} ${q.leadPhone} ${q.title} ${quoteOptionsSummary(q.options)}`.toLowerCase().includes(term);
    });
  }, [quotes, statusFilter, searchTerm]);

  const clientLinked = Boolean(draft.clientId) || Boolean(draft.newClient);

  // ---------- Editor view ----------
  if (isNew || editingId) {
    return (
      <div className="page-content">
        <div className="page-header">
          <div className="page-title-group">
            <span className="eyebrow">הצעות מחיר ללקוחות פוטנציאליים</span>
            <h2>{isNew ? 'הצעת מחיר חדשה' : 'עריכת הצעת מחיר'}</h2>
          </div>
          <button type="button" className="btn btn-secondary" onClick={() => { setIsNew(false); setEditingId(null); }}>
            ← חזרה לרשימת ההצעות
          </button>
        </div>

        <div className="card" style={{ padding: '24px', maxWidth: '760px' }}>
          {/* ---- Client association ---- */}
          <div style={{ marginBottom: '8px' }}>
            <strong style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <User size={16} /> לקוח ההצעה
            </strong>
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
              שיוך לתיק לקוח קיים, יצירת לקוח חדש, או הזנת פרטים ידנית ללקוח שאינו במערכת.
            </span>
          </div>

          <div className="form-row">
            <div className="form-group" style={{ flex: 2 }}>
              <label>שיוך לתיק לקוח קיים</label>
              <select
                className="form-control"
                value={draft.clientId}
                onChange={e => pickClient(e.target.value)}
                disabled={Boolean(draft.newClient)}
              >
                <option value="">— לקוח חדש / הזנה ידנית —</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>
                    {`${c.firstName} ${c.lastName || ''}`.trim()}{c.phone ? ` · ${c.phone}` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setShowNewClientForm(v => !v);
                  if (!showNewClientForm) {
                    setDraft(d => ({ ...d, clientId: '', newClient: d.newClient || { firstName: d.leadName, lastName: '', phone: d.leadPhone } }));
                  }
                }}
                disabled={Boolean(draft.clientId)}
              >
                <UserPlus size={16} /> יצירת לקוח חדש במערכת
              </button>
            </div>
          </div>

          {showNewClientForm && draft.newClient && (
            <div style={{ border: '1px dashed var(--primary-light)', borderRadius: '14px', padding: '14px 16px', marginBottom: '14px', background: 'var(--primary-faint)' }}>
              <strong style={{ fontSize: '0.88rem', color: 'var(--primary-hover)' }}>לקוח חדש — יירשם במערכת בשמירת ההצעה</strong>
              <div className="form-row" style={{ marginTop: '8px' }}>
                <div className="form-group">
                  <label>שם פרטי *</label>
                  <input
                    className="form-control"
                    value={draft.newClient.firstName}
                    onChange={e => updateNewClientForm({ firstName: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>שם משפחה</label>
                  <input
                    className="form-control"
                    value={draft.newClient.lastName}
                    onChange={e => updateNewClientForm({ lastName: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>טלפון (וואטסאפ) *</label>
                  <input
                    className="form-control"
                    dir="ltr"
                    value={draft.newClient.phone}
                    onChange={e => updateNewClientForm({ phone: e.target.value })}
                    placeholder="050-1234567"
                  />
                </div>
                <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <button
                    type="button"
                    className="btn-icon text-slate-400"
                    onClick={() => setDraft(d => ({ ...d, newClient: null }))}
                    aria-label="ביטול יצירת לקוח"
                    title="ביטול"
                  >
                    <XCircle size={18} />
                  </button>
                </div>
              </div>
              <span style={{ fontSize: '0.78rem', color: 'var(--primary-hover)' }}>
                נוצר תיק לקוח עם מרחב אישי מוכן — בלי שליחת פרטי כניסה (הלקוח עדיין פוטנציאלי).
              </span>
            </div>
          )}

          {!clientLinked && (
            <div className="form-row">
              <div className="form-group">
                <label>שם הלקוח הפוטנציאלי *</label>
                <input
                  className="form-control"
                  value={draft.leadName}
                  onChange={e => setDraft(d => ({ ...d, leadName: e.target.value }))}
                  placeholder="למשל: דניאל כהן"
                />
              </div>
              <div className="form-group">
                <label>טלפון (וואטסאפ) *</label>
                <input
                  className="form-control"
                  dir="ltr"
                  value={draft.leadPhone}
                  onChange={e => setDraft(d => ({ ...d, leadPhone: e.target.value }))}
                  placeholder="050-1234567"
                />
              </div>
            </div>
          )}

          {clientLinked && (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '14px', padding: '10px 14px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '12px', color: '#1d4ed8', fontSize: '0.85rem' }}>
              <Link2 size={15} />
              <span>
                מקושר לתיק לקוח: <strong>{draft.leadName}</strong> · <span dir="ltr">{draft.leadPhone}</span>
              </span>
            </div>
          )}

          <div className="form-group">
            <label>כותרת ההצעה</label>
            <input
              className="form-control"
              value={draft.title}
              onChange={e => setDraft(d => ({ ...d, title: e.target.value }))}
              placeholder="למשל: טיפול CBT — מפגשי היכרות"
            />
          </div>

          <div className="form-group">
            <label>תיאור / הערות להצעה (מוצג ללקוח)</label>
            <textarea
              className="form-control"
              rows={4}
              value={draft.description}
              onChange={e => setDraft(d => ({ ...d, description: e.target.value }))}
              placeholder="פירוט קצר על אופי הטיפול, משך מפגש, תנאי ביטול וכו'"
            />
          </div>

          <div style={{ marginTop: '8px', marginBottom: '8px' }}>
            <strong style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Package size={16} /> אפשרויות המחיר בהצעה
            </strong>
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
              אפשרות אחת = אישור פשוט. כמה אפשרויות = הלקוח בוחר אפשרות אחת ומאשר.
            </span>
          </div>

          {draft.options.map((option, index) => (
            <div key={option.id} style={{ border: '1px solid #e2e8f0', borderRadius: '14px', padding: '14px 16px', marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <strong style={{ fontSize: '0.9rem', color: '#334155' }}>אפשרות {index + 1}</strong>
                {draft.options.length > 1 && (
                  <button type="button" className="btn-icon text-slate-400" onClick={() => removeOption(option.id)} aria-label="הסר אפשרות">
                    <Trash2 size={16} />
                  </button>
                )}
              </div>

              <div className="form-row">
                <div className="form-group" style={{ flex: 2 }}>
                  <label>שם האפשרות *</label>
                  <input
                    className="form-control"
                    value={option.label}
                    onChange={e => updateOption(option.id, { label: e.target.value })}
                    placeholder='למשל: "מפגש בודד" או "תהליך טיפולי מלא"'
                  />
                </div>
                <div className="form-group">
                  <label>סוג התמחור</label>
                  <select
                    className="form-control"
                    value={option.pricingModel}
                    onChange={e => updateOption(option.id, { pricingModel: e.target.value as 'single' | 'package' })}
                  >
                    <option value="single">מפגש בודד</option>
                    <option value="package">חבילת מפגשים</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>מחיר למפגש (₪) *</label>
                  <input
                    className="form-control"
                    dir="ltr"
                    inputMode="decimal"
                    value={option.sessionPrice}
                    onChange={e => updateOption(option.id, { sessionPrice: e.target.value.replace(/[^\d.]/g, '') })}
                    placeholder="350"
                  />
                </div>
                {option.pricingModel === 'package' && (
                  <div className="form-group">
                    <label>מספר מפגשים בחבילה *</label>
                    <input
                      className="form-control"
                      dir="ltr"
                      inputMode="numeric"
                      value={option.sessionsCount}
                      onChange={e => updateOption(option.id, { sessionsCount: e.target.value.replace(/\D/g, '') })}
                      placeholder="12"
                    />
                  </div>
                )}
                <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <div style={{
                    padding: '10px 16px', borderRadius: '12px', background: 'var(--primary-faint)', border: '1px solid var(--primary-light)',
                    color: 'var(--primary-hover)', fontWeight: 800, whiteSpace: 'nowrap'
                  }}>
                    {(() => {
                      const price = Number(option.sessionPrice) || 0;
                      const count = option.pricingModel === 'package' ? (Number(option.sessionsCount) || 0) : 1;
                      return `סה"כ: ${formatILS(price * count)}`;
                    })()}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {draft.options.length < 4 && (
            <button type="button" className="btn btn-secondary" onClick={addOption} style={{ marginBottom: '16px' }}>
              <Plus size={16} /> הוספת אפשרות מחיר
            </button>
          )}

          <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
            <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 size={18} className="spin" /> : <CheckCircle2 size={18} />}
              {isNew ? 'יצירת ההצעה' : 'שמירת השינויים'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => { setIsNew(false); setEditingId(null); }}>
              ביטול
            </button>
          </div>

          {/* Save as a reusable template */}
          <div style={{
            marginTop: '18px', paddingTop: '14px', borderTop: '1px dashed #e2e8f0',
            display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap'
          }}>
            <BookmarkPlus size={16} style={{ color: '#64748b' }} />
            <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 600 }}>
              שמירת המבנה כתבנית לשימוש חוזר:
            </span>
            <input
              className="form-control"
              style={{ maxWidth: '180px', padding: '7px 12px', fontSize: '0.85rem' }}
              value={saveTemplateName}
              onChange={e => setSaveTemplateName(e.target.value)}
              placeholder="שם התבנית"
            />
            <button
              type="button"
              className="btn btn-secondary"
              onClick={saveDraftAsTemplate}
              disabled={savingTemplate}
              style={{ padding: '7px 14px', fontSize: '0.85rem' }}
            >
              {savingTemplate ? <Loader2 size={14} className="spin" /> : <BookmarkPlus size={14} />}
              שמירה כתבנית
            </button>
          </div>
        </div>

        <Toast message={toast?.message} type={toast?.type} onClose={() => setToast(null)} />
      </div>
    );
  }

  // ---------- List view ----------
  return (
    <div className="page-content">
      <div className="page-header">
        <div className="page-title-group">
          <span className="eyebrow">הצעות מחיר ללקוחות פוטנציאליים</span>
          <h2>ניהול הצעות מחיר</h2>
        </div>
        <button type="button" className="btn btn-primary" onClick={openNew}>
          <Plus size={18} /> הצעת מחיר חדשה
        </button>
      </div>

      <div className="stats-grid" style={{ marginBottom: '20px' }}>
        <div className="stat-card">
          <div className="stat-icon"><Receipt size={20} /></div>
          <div className="stat-info"><strong>{stats.total}</strong><span>סה"כ הצעות</span></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><Send size={20} /></div>
          <div className="stat-info"><strong>{stats.sent}</strong><span>נשלח</span></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><CheckCircle2 size={20} /></div>
          <div className="stat-info"><strong>{stats.confirmed}</strong><span>אושר</span></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><XCircle size={20} /></div>
          <div className="stat-info"><strong>{stats.declined}</strong><span>לא אושר</span></div>
        </div>
      </div>

      {/* Quick-start templates — click to open a pre-filled editor */}
      {templates.length > 0 && (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '14px' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.82rem', fontWeight: 700, color: '#475569' }}>
            <Layers size={15} /> תבניות מהירות:
          </span>
          {templates.map(template => (
            <span
              key={template.id}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                border: '1px solid #e2e8f0', background: '#ffffff',
                borderRadius: '999px', overflow: 'hidden'
              }}
            >
              <button
                type="button"
                onClick={() => startFromTemplate(template)}
                title={`הצעה חדשה מהתבנית — ${templateSummary(template.options)}`}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  padding: '7px 12px 7px 14px', cursor: 'pointer', border: 'none',
                  background: 'transparent', fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary-hover)'
                }}
              >
                {template.name}
                <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#94a3b8' }}>
                  {templateSummary(template.options)}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setDeleteTemplateModal(template)}
                aria-label={`מחיקת תבנית ${template.name}`}
                title="מחיקת תבנית"
                style={{
                  border: 'none', background: 'transparent', cursor: 'pointer',
                  padding: '6px 10px 6px 6px', color: '#cbd5e1', display: 'inline-flex'
                }}
              >
                <Trash2 size={13} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Filters + search */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '14px' }}>
        {STATUS_FILTERS.map(filter => {
          const active = statusFilter === filter.key;
          const count = filter.key === 'all' ? stats.total : stats[filter.key];
          return (
            <button
              key={filter.key}
              type="button"
              onClick={() => setStatusFilter(filter.key)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                padding: '7px 14px', borderRadius: '999px', cursor: 'pointer',
                fontSize: '0.85rem', fontWeight: 700,
                border: `1px solid ${active ? filter.border : '#e2e8f0'}`,
                background: active ? filter.bg : '#ffffff',
                color: active ? filter.color : '#64748b'
              }}
            >
              {filter.label}
              <span style={{
                background: active ? '#ffffff' : '#f1f5f9', borderRadius: '10px',
                padding: '1px 7px', fontSize: '0.72rem', fontWeight: 700
              }}>
                {count}
              </span>
            </button>
          );
        })}
        <div style={{ marginRight: 'auto', position: 'relative', minWidth: '220px' }}>
          <Search size={16} style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', right: '12px', color: '#94a3b8', pointerEvents: 'none' }} />
          <input
            className="form-control"
            style={{ paddingRight: '36px' }}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="חיפוש לקוח, טלפון או הצעה..."
          />
        </div>
      </div>

      <div className="card-table">
        {loading ? (
          <div className="content-empty">
            <Loader2 size={28} className="spin" />
            <p>טוען הצעות מחיר...</p>
          </div>
        ) : quotes.length === 0 ? (
          <div className="content-empty">
            <div className="content-empty-icon"><Receipt size={32} /></div>
            <h3>עדיין אין הצעות מחיר</h3>
            <p>בנה/י הצעה ראשונה ושלח/י אותה ללקוח פוטנציאלי בוואטסאפ — הלקוח יאשר בקליק אחד מהקישור.</p>
            <button type="button" className="btn btn-primary" onClick={openNew}>
              <Plus size={16} /> הצעת מחיר חדשה
            </button>
          </div>
        ) : filteredQuotes.length === 0 ? (
          <div className="content-empty">
            <div className="content-empty-icon"><Search size={28} /></div>
            <h3>אין תוצאות</h3>
            <p>נסה/י סינון או חיפוש אחר.</p>
          </div>
        ) : (
          <div className="content-table-shell">
            <div className="table-responsive">
              <table>
                <thead>
                  <tr>
                    <th>לקוח</th>
                    <th>הצעה</th>
                    <th>סטטוס</th>
                    <th>נשלח / נענה</th>
                    <th>פעולות</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredQuotes.map(quote => {
                    const status = quoteStatusMeta(quote.status);
                    const canSend = quote.status === 'draft' || quote.status === 'sent';
                    const canEdit = quote.status === 'draft' || quote.status === 'sent';
                    const decided = quote.status === 'confirmed' || quote.status === 'declined';
                    return (
                      <tr key={quote.id}>
                        <td>
                          <div className="content-table-primary">
                            <div className="content-table-copy">
                              <strong style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <User size={14} /> {quote.leadName}
                                {quote.clientId && (
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', background: '#eef2ff', color: '#4338ca', border: '1px solid #e0e7ff', borderRadius: '8px', padding: '1px 7px', fontSize: '0.68rem', fontWeight: 700 }}>
                                    <Link2 size={10} /> מקושר לתיק
                                  </span>
                                )}
                              </strong>
                              <span dir="ltr" style={{ color: '#64748b' }}>{quote.leadPhone}</span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="content-table-copy">
                            <strong>{quote.title || 'הצעת מחיר'}</strong>
                            <span>{quoteOptionsSummary(quote.options)}</span>
                          </div>
                        </td>
                        <td>
                          <span style={{
                            background: status.bg, color: status.color, border: `1px solid ${status.border}`,
                            borderRadius: '8px', padding: '2px 8px', fontSize: '0.72rem', fontWeight: 700,
                            whiteSpace: 'nowrap', display: 'inline-block'
                          }}>
                            {status.text}
                          </span>
                          {decided && quoteChosenOptionLabel(quote) && (
                            <div style={{ marginTop: '6px', fontSize: '0.78rem', color: '#334155', fontWeight: 600 }}>
                              נבחר: {quoteChosenOptionLabel(quote)}
                            </div>
                          )}
                        </td>
                        <td>
                          <span className="content-table-date">{formatDate(quote.sentAt)}</span>
                          {decided && (
                            <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>
                              החלטה: {formatDate(quote.decidedAt)}
                            </div>
                          )}
                        </td>
                        <td>
                          <div className="content-table-actions" style={{ gap: '6px' }}>
                            {canSend && (
                              <button
                                type="button"
                                className="btn btn-primary"
                                style={{ background: 'var(--primary)', padding: '7px 12px', fontSize: '0.8rem' }}
                                onClick={() => handleSend(quote)}
                                disabled={sendingId === quote.id}
                                title="שליחה בוואטסאפ ללקוח"
                              >
                                {sendingId === quote.id ? <Loader2 size={15} className="spin" /> : <WhatsAppIcon size={15} />}
                                שליחה
                              </button>
                            )}
                            {canEdit && (
                              <button type="button" className="btn-icon" onClick={() => openEdit(quote)} aria-label="עריכה" title="עריכה">
                                <Pencil size={16} />
                              </button>
                            )}
                            <button type="button" className="btn-icon" onClick={() => duplicateQuote(quote)} aria-label="שכפול" title="שכפול להצעה חדשה">
                              <CopyPlus size={16} />
                            </button>
                            <button type="button" className="btn-icon" onClick={() => saveQuoteAsTemplate(quote)} aria-label="שמור כתבנית" title="שמירה כתבנית לשימוש חוזר">
                              <BookmarkPlus size={16} />
                            </button>
                            <button type="button" className="btn-icon" onClick={() => setDeleteModal(quote)} aria-label="מחיקה" title="מחיקה">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Send result modal */}
      {sendResult && (
        <div className="modal-overlay" onClick={() => setSendResult(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <div>
                <span className="eyebrow">שליחת הצעת מחיר</span>
                <h2 style={{ margin: '4px 0 0' }}>
                  {sendResult.sent ? 'נשלחה בהצלחה! 📲' : 'השליחה נכשלה — ניתן להעתיק את הקישור'}
                </h2>
              </div>
              <button type="button" className="close-btn" onClick={() => setSendResult(null)} aria-label="סגור">✕</button>
            </div>
            <div className="modal-body">
              <p style={{ color: '#475569', lineHeight: 1.6 }}>
                {sendResult.sent
                  ? `ההצעה עבור ${sendResult.quote.leadName} נשלחה בוואטסאפ. כשהלקוח יאשר — תקבל/י הודעה אישית.`
                  : (sendResult.error || 'שליחת הוואטסאפ נכשלה (ייתכן שהמספר אינו וואטסאפ פעיל). אפשר להעתיק את הקישור ולשלוח ידנית.')}
              </p>
              {sendResult.quoteUrl && (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    className="form-control"
                    dir="ltr"
                    readOnly
                    value={sendResult.quoteUrl}
                    onFocus={e => e.currentTarget.select()}
                  />
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => copyToClipboard(sendResult.quoteUrl!, 'הקישור')}
                  >
                    <Copy size={15} /> העתקה
                  </button>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-primary" onClick={() => setSendResult(null)}>סגירה</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={Boolean(deleteModal)}
        onClose={() => setDeleteModal(null)}
        onConfirm={handleDelete}
        title="מחיקת הצעת מחיר"
        message={deleteModal ? `ההצעה עבור ${deleteModal.leadName}${deleteModal.title ? ` — "${deleteModal.title}"` : ''} תימחק לצמיתות.` : ''}
        confirmText="מחק הצעה"
      />

      <ConfirmModal
        isOpen={Boolean(deleteTemplateModal)}
        onClose={() => setDeleteTemplateModal(null)}
        onConfirm={handleDeleteTemplate}
        title="מחיקת תבנית"
        message={deleteTemplateModal ? `התבנית "${deleteTemplateModal.name}" תימחק. הצעות שנוצרו ממנה אינן מושפעות.` : ''}
        confirmText="מחק תבנית"
      />

      <Toast message={toast?.message} type={toast?.type} onClose={() => setToast(null)} />
    </div>
  );
}
