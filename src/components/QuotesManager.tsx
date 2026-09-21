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
  Search,
  Sparkles,
  X,
  ArrowRight
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
  // A quote carries exactly ONE pricing structure — picked from a template in
  // the picker widget (or filled manually via the free-form card).
  options: [
    { id: `opt-${Date.now()}-1`, label: 'מפגש בודד', pricingModel: 'single', sessionPrice: '', sessionsCount: '1' }
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

function initialsOf(name: string): string {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase();
}

/** "₪450" or "₪450–1,200" across the quote's options */
function quotePriceRange(options: QuoteRow['options'] | undefined): string {
  const totals = (options || [])
    .map(o => Number(o.totalPrice ?? (Number(o.sessionPrice) || 0) * (Number(o.sessionsCount) || 1)))
    .filter(n => n > 0);
  if (!totals.length) return '—';
  const fmt = (n: number) => `₪${n.toLocaleString('he-IL')}`;
  const min = Math.min(...totals);
  const max = Math.max(...totals);
  return min === max ? fmt(min) : `${fmt(min)}–${fmt(max)}`;
}

export default function QuotesManager() {
  const [quotes, setQuotes] = useState<QuoteRow[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type?: 'success' | 'error' } | null>(null);

  // Standalone post-save prompt: "send it to the client now?" — decoupled from
  // the table on purpose; it fires right after a quote is created.
  const [pendingSend, setPendingSend] = useState<QuoteRow | null>(null);

  // Save-as-template (editor)
  const [saveTemplateName, setSaveTemplateName] = useState('');
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [deleteTemplateModal, setDeleteTemplateModal] = useState<TemplateRow | null>(null);

  // Template picker widget — the single entry point for creating a quote.
  // Two steps inside one window: 'templates' (pick) → 'editor' (fill & save),
  // with a back button — no navigation away from the list.
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
  const [pickerStep, setPickerStep] = useState<'templates' | 'editor'>('templates');
  const [editingTemplatePrice, setEditingTemplatePrice] = useState<TemplateRow | null>(null);
  const [templatePriceInput, setTemplatePriceInput] = useState('');
  const [savingTemplatePrice, setSavingTemplatePrice] = useState(false);

  const closePicker = () => {
    setTemplatePickerOpen(false);
    setPickerStep('templates');
    setEditingTemplatePrice(null);
  };

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

  // Start a NEW quote from a template — a single pricing structure is copied
  // from the template (with its default price); the therapist fills client,
  // and may override the price for this specific quote.
  const startFromTemplate = (template: TemplateRow) => {
    const t = (template.options || [])[0] || {
      label: template.name,
      pricingModel: 'single' as const,
      sessionsCount: 1,
      sessionPrice: 0
    };
    setDraft({
      clientId: '',
      newClient: null,
      leadName: '',
      leadPhone: '',
      title: template.name,
      description: '',
      options: [{
        id: `opt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        label: t.label,
        pricingModel: t.pricingModel,
        sessionPrice: t.sessionPrice ? String(t.sessionPrice) : '',
        sessionsCount: String(t.sessionsCount || 1)
      }]
    });
    setShowNewClientForm(false);
    setSaveTemplateName('');
    setEditingId(null);
    setIsNew(true);
    // Stay INSIDE the widget — step 2 is the editor, with a back button
    setTemplatePickerOpen(true);
    setPickerStep('editor');
  };

  // Save the therapist's default price on a template (picker inline edit)
  const saveTemplatePrice = async () => {
    if (!editingTemplatePrice) return;
    const price = Number(templatePriceInput.replace(/[^\d.]/g, ''));
    if (!price || price <= 0) {
      showToast('נא להזין מחיר תקין למפגש', 'error');
      return;
    }
    setSavingTemplatePrice(true);
    try {
      await api.updateQuoteTemplate(editingTemplatePrice.id, { sessionPrice: price });
      await loadTemplates();
      showToast('מחיר ברירת המחדל נשמר — יוזן אוטומטית בכל הצעה מהתבנית ✨');
      setEditingTemplatePrice(null);
      setTemplatePriceInput('');
    } catch (err: any) {
      showToast(err.message || 'שגיאה בשמירת המחיר', 'error');
    } finally {
      setSavingTemplatePrice(false);
    }
  };

  // Save the current editor structure (+ prices as defaults) as a reusable template
  const saveDraftAsTemplate = async () => {
    if (!saveTemplateName.trim()) {
      showToast('נא להזין שם לתבנית', 'error');
      return;
    }
    if (draft.options.length === 0 || !draft.options[0].label.trim()) {
      showToast('נא להזין שם למבנה ההצעה לפני השמירה כתבנית', 'error');
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
    setTemplatePickerOpen(true);
    setPickerStep('editor');
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

  const handleSave = async () => {
    if (draft.newClient) {
      if (!draft.newClient.firstName.trim()) { showToast('נא להזין שם פרטי ללקוח החדש', 'error'); return; }
      if (draft.newClient.phone.replace(/\D/g, '').length < 9) { showToast('נא להזין מספר טלפון תקין ללקוח החדש', 'error'); return; }
    } else if (!draft.clientId) {
      if (!draft.leadName.trim()) { showToast('נא להזין את שם הלקוח הפוטנציאלי', 'error'); return; }
      if (draft.leadPhone.replace(/\D/g, '').length < 9) { showToast('נא להזין מספר טלפון תקין', 'error'); return; }
    }
    // New quotes carry a single pricing structure; legacy multi-option quotes
    // keep their options untouched (rendered read-only in the editor).
    if (draft.options.length <= 1 && !(Number(draft.options[0]?.sessionPrice) > 0)) {
      showToast('נא להזין מחיר למפגש', 'error');
      return;
    }

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
        const created = await api.createQuote(payload) as QuoteRow;
        showToast('ההצעה נוצרה בהצלחה ✨');
        // Offer the WhatsApp send immediately — the therapist just finished
        // building the quote; sending shouldn't require hunting the row in the table.
        if (created && created.id) setPendingSend(created);
      } else {
        await api.updateQuote(editingId!, payload);
        showToast('ההצעה עודכנה בהצלחה ✨');
      }
      setIsNew(false);
      setEditingId(null);
      setTemplatePickerOpen(false);
      setPickerStep('templates');
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

  // ---------- Shared quote form (picker-widget step 2 + edit-existing view) ----------
  const editorFormBody = (
    <>
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

          {/* ---- Pricing: a single structure from the template ---- */}
          {draft.options.length > 1 ? (
            <div style={{ background: '#f8fafc', border: '1px dashed #e2e8f0', borderRadius: '14px', padding: '14px 16px', marginTop: '8px', marginBottom: '8px' }}>
              <strong style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                <Package size={16} /> אפשרויות המחיר בהצעה זו
              </strong>
              <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'block', marginBottom: '8px' }}>
                הצעה שנבנתה במנגנון האפשרויות הקודם — האפשרויות נשמרות כפי שהן (אינן ניתנות לעריכה).
              </span>
              {draft.options.map(o => (
                <div key={o.id} style={{ fontSize: '0.86rem', color: '#334155', lineHeight: 1.9 }}>
                  • {o.label} — {o.pricingModel === 'package' ? `${o.sessionsCount} מפגשים · ` : ''}{formatILS(Number(o.sessionPrice) || 0)} למפגש
                </div>
              ))}
            </div>
          ) : (() => {
            const option = draft.options[0] || { id: 'opt-0', label: '', pricingModel: 'single' as const, sessionPrice: '', sessionsCount: '1' };
            const price = Number(option.sessionPrice) || 0;
            const count = Math.max(1, Number(option.sessionsCount) || 1);
            return (
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '14px', padding: '16px', marginTop: '8px', marginBottom: '8px', background: '#ffffff' }}>
                <strong style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Package size={16} /> מחיר ההצעה
                </strong>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  המבנה ומחיר ברירת המחדל הגיעו מהתבנית — אפשר לשנות את המחיר להצעה זו בלבד.
                </span>
                <div className="form-row" style={{ marginTop: '12px' }}>
                  <div className="form-group" style={{ flex: 2 }}>
                    <label>שם המבנה *</label>
                    <input
                      className="form-control"
                      value={option.label}
                      onChange={e => updateOption(option.id, { label: e.target.value })}
                      placeholder='למשל: "תהליך קצר — 5 מפגשים"'
                    />
                  </div>
                  <div className="form-group">
                    <label>מספר מפגשים *</label>
                    <input
                      className="form-control"
                      dir="ltr"
                      inputMode="numeric"
                      value={option.sessionsCount}
                      onChange={e => {
                        const v = e.target.value.replace(/\D/g, '');
                        updateOption(option.id, {
                          sessionsCount: v,
                          pricingModel: Number(v) >= 2 ? 'package' : 'single'
                        });
                      }}
                      placeholder="1"
                    />
                  </div>
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
                  <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end' }}>
                    <div style={{
                      padding: '10px 16px', borderRadius: '12px', background: 'var(--primary-faint)', border: '1px solid var(--primary-light)',
                      color: 'var(--primary-hover)', fontWeight: 800, whiteSpace: 'nowrap'
                    }}>
                      {(() => `סה"כ: ${formatILS(price * count)}`)()}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

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
    </>
  );

  // ---------- Edit-existing view (creating new quotes happens inside the picker widget) ----------
  if (editingId) {
    return (
      <div className="page-content">
        <div className="page-header">
          <div className="page-title-group">
            <span className="eyebrow">הצעות מחיר ללקוחות פוטנציאליים</span>
            <h2>עריכת הצעת מחיר</h2>
          </div>
          <button type="button" className="btn btn-secondary" onClick={() => { setIsNew(false); setEditingId(null); }}>
            ← חזרה לרשימת ההצעות
          </button>
        </div>

        <div className="card" style={{ padding: '24px', maxWidth: '760px' }}>
          {editorFormBody}

          <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
            <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 size={18} className="spin" /> : <CheckCircle2 size={18} />}
              שמירת השינויים
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => { setIsNew(false); setEditingId(null); }}>
              ביטול
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
        <button type="button" className="btn btn-primary" onClick={() => setTemplatePickerOpen(true)}>
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

      {/* Template picker widget is the entry point for new quotes — see the
          modal at the bottom of this view (templatePickerOpen). */}

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
            <button type="button" className="btn btn-primary" onClick={() => setTemplatePickerOpen(true)}>
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
          <div className="quotes-table-card">
            <div className="quotes-table-scroll">
              <table className="quotes-table">
                <thead>
                  <tr>
                    <th>לקוח</th>
                    <th>הצעה</th>
                    <th>היקף</th>
                    <th>סטטוס</th>
                    <th>נשלח / נענה</th>
                    <th></th>
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
                          <div className="qt-client">
                            <div className="qt-avatar" aria-hidden="true">{initialsOf(quote.leadName)}</div>
                            <div className="qt-client-copy">
                              <span className="qt-name">
                                {quote.leadName}
                                {quote.clientId && (
                                  <span className="qt-linked" title="מקושר לתיק לקוח">
                                    <Link2 size={10} /> תיק
                                  </span>
                                )}
                              </span>
                              <span className="qt-sub" dir="ltr">{quote.leadPhone}</span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="qt-quote-copy">
                            <span className="qt-title">{quote.title || 'הצעת מחיר'}</span>
                            <span className="qt-sub">{quoteOptionsSummary(quote.options)}</span>
                          </div>
                        </td>
                        <td>
                          <span className="qt-amount">{quotePriceRange(quote.options)}</span>
                        </td>
                        <td>
                          <span className="qt-chip" style={{ background: status.bg, color: status.color, border: `1px solid ${status.border}` }}>
                            <span className="qt-dot" aria-hidden="true" />
                            {status.text}
                          </span>
                          {decided && quoteChosenOptionLabel(quote) && (
                            <div className="qt-chosen">נבחר: {quoteChosenOptionLabel(quote)}</div>
                          )}
                        </td>
                        <td>
                          <div className="qt-date">
                            <span>{formatDate(quote.sentAt)}</span>
                            {decided && (
                              <span className="qt-sub">החלטה: {formatDate(quote.decidedAt)}</span>
                            )}
                          </div>
                        </td>
                        <td>
                          <div className="qt-actions">
                            {canSend && (
                              <button
                                type="button"
                                className="qt-send"
                                onClick={() => handleSend(quote)}
                                disabled={sendingId === quote.id}
                                title="שליחה בוואטסאפ ללקוח"
                              >
                                {sendingId === quote.id ? <Loader2 size={15} className="spin" /> : <WhatsAppIcon size={15} />}
                                שליחה
                              </button>
                            )}
                            {canEdit && (
                              <button type="button" className="qt-icon-btn" onClick={() => openEdit(quote)} aria-label="עריכה" title="עריכה">
                                <Pencil size={16} />
                              </button>
                            )}
                            <button type="button" className="qt-icon-btn" onClick={() => duplicateQuote(quote)} aria-label="שכפול" title="שכפול להצעה חדשה">
                              <CopyPlus size={16} />
                            </button>
                            <button type="button" className="qt-icon-btn" onClick={() => saveQuoteAsTemplate(quote)} aria-label="שמור כתבנית" title="שמירה כתבנית">
                              <BookmarkPlus size={16} />
                            </button>
                            <button type="button" className="qt-icon-btn qt-danger" onClick={() => setDeleteModal(quote)} aria-label="מחיקה" title="מחיקה">
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

      {/* Post-save prompt — standalone, fires right after a quote is created */}
      {pendingSend && (
        <div className="modal-overlay" onClick={() => setPendingSend(null)}>
          <div className="modal-card qt-send-prompt" onClick={e => e.stopPropagation()}>
            <div className="qt-send-prompt-icon" aria-hidden="true">
              <WhatsAppIcon size={30} />
            </div>
            <h2 className="qt-send-prompt-title">ההצעה נשמרה! 🎉</h2>
            <p className="qt-send-prompt-text">
              לשלוח עכשיו ל<span className="qt-send-prompt-name">{pendingSend.leadName}</span> הצעת מחיר
              {quotePriceRange(pendingSend.options) !== '—' ? ` בהיקף ${quotePriceRange(pendingSend.options)}` : ''} בוואטסאפ?
            </p>
            <p className="qt-send-prompt-hint">הלקוח יקבל קישור אישי ויוכל לאשר בלחיצה אחת</p>
            <div className="qt-send-prompt-actions">
              <button
                type="button"
                className="qt-send"
                style={{ padding: '11px 22px', fontSize: '0.92rem' }}
                onClick={() => { const q = pendingSend; setPendingSend(null); handleSend(q); }}
              >
                <WhatsAppIcon size={17} /> כן, שליחה עכשיו
              </button>
              <button type="button" className="qt-later" onClick={() => setPendingSend(null)}>
                לא עכשיו
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* ---- Quote widget — one unified window: pick a template → fill & save ---- */}
      {templatePickerOpen && (
        <div className="modal-overlay" onClick={closePicker}>
          <div className="modal-card qw-window" onClick={e => e.stopPropagation()}>
            <div className="qw-header">
              {pickerStep === 'editor' ? (
                <button type="button" className="qw-back" onClick={() => setPickerStep('templates')}>
                  <ArrowRight size={15} /> חזרה לתבניות
                </button>
              ) : (
                <div className="qw-header-icon"><Layers size={22} /></div>
              )}
              <div className="qw-header-text">
                <h3>{pickerStep === 'editor' ? (draft.title || 'הגדרה ידנית') : 'הצעת מחיר חדשה'}</h3>
                <span>
                  {pickerStep === 'editor'
                    ? 'מילוי פרטי הלקוח והמחיר — הכול נשאר בתוך החלון'
                    : 'בחירת תבנית — המבנה ומחיר ברירת המחדל יוזנו אוטומטית'}
                </span>
              </div>
              <button type="button" className="close-btn" onClick={closePicker} aria-label="סגירה" title="סגירה">
                <X size={18} />
              </button>
            </div>

            <div className="modal-body qw-body">
              {pickerStep === 'templates' ? (
                <div className="qw-grid">
                  {templates.map(template => {
                    const option = (template.options || [])[0];
                    const sessions = option?.pricingModel === 'package' ? option.sessionsCount : 1;
                    const price = option?.sessionPrice || 0;
                    const isEditing = editingTemplatePrice?.id === template.id;
                    return (
                      <div key={template.id} className="qw-tile">
                        <div className="qw-tile-top">
                          <span className="qw-tile-title">{template.name}</span>
                          <div className="qw-tile-actions">
                            <button
                              type="button"
                              className="btn-icon text-slate-400"
                              onClick={() => {
                                setEditingTemplatePrice(isEditing ? null : template);
                                setTemplatePriceInput(price ? String(price) : '');
                              }}
                              aria-label={`עריכת מחיר ברירת מחדל — ${template.name}`}
                              title="עריכת מחיר ברירת מחדל"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              type="button"
                              className="btn-icon text-slate-400"
                              onClick={() => setDeleteTemplateModal(template)}
                              aria-label={`מחיקת תבנית ${template.name}`}
                              title="מחיקת תבנית"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                        <span className="qw-tile-meta">
                          {sessions > 1 ? `תהליך של ${sessions} מפגשים` : 'מפגש בודד'}
                        </span>

                        {isEditing ? (
                          <div className="qw-price-edit">
                            <input
                              className="form-control"
                              dir="ltr"
                              inputMode="decimal"
                              value={templatePriceInput}
                              onChange={e => setTemplatePriceInput(e.target.value.replace(/[^\d.]/g, ''))}
                              placeholder="מחיר למפגש"
                              autoFocus
                              onKeyDown={e => { if (e.key === 'Enter') saveTemplatePrice(); }}
                            />
                            <button
                              type="button"
                              className="btn btn-primary"
                              onClick={saveTemplatePrice}
                              disabled={savingTemplatePrice}
                              aria-label="שמירת מחיר"
                              title="שמירת מחיר"
                            >
                              {savingTemplatePrice ? <Loader2 size={14} className="spin" /> : <CheckCircle2 size={15} />}
                            </button>
                          </div>
                        ) : (
                          <span className="qw-tile-price">
                            {price > 0 ? (
                              <span className="set">{formatILS(price)} למפגש · סה"כ {formatILS(price * sessions)}</span>
                            ) : (
                              <button type="button" className="unset" onClick={() => { setEditingTemplatePrice(template); setTemplatePriceInput(''); }}>
                                טרם הוגדר מחיר — לחץ/י להגדרה ✎
                              </button>
                            )}
                          </span>
                        )}

                        {!isEditing && (
                          <button
                            type="button"
                            className="qw-create"
                            onClick={() => startFromTemplate(template)}
                            title={`הצעה חדשה — ${templateSummary(template.options)}`}
                          >
                            יצירת הצעה <ArrowRight size={14} style={{ transform: 'scaleX(-1)' }} />
                          </button>
                        )}
                      </div>
                    );
                  })}

                  {/* Free-form tile — manual structure, no template */}
                  <div className="qw-tile qw-tile-free">
                    <div className="qw-tile-top">
                      <span className="qw-tile-title" style={{ color: 'var(--primary-hover)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <Sparkles size={15} /> הצעה חופשית
                      </span>
                    </div>
                    <span className="qw-tile-meta">בלי תבנית — מגדירים ידנית מספר מפגשים ומחיר בעורך.</span>
                    <button type="button" className="qw-create qw-create-ghost" onClick={openNew}>
                      התחלה ידנית <ArrowRight size={14} style={{ transform: 'scaleX(-1)' }} />
                    </button>
                  </div>
                </div>
              ) : (
                editorFormBody
              )}
            </div>

            {pickerStep === 'templates' ? (
              <div className="modal-footer qw-footer-tip">
                טיפ: המחיר שיישמר בתבנית יוזן אוטומטית בכל הצעה חדשה ממנה — ותמיד אפשר לשנות אותו בהצעה עצמה.
              </div>
            ) : (
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setPickerStep('templates')}>
                  <ArrowRight size={16} /> חזרה לתבניות
                </button>
                <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}>
                  {saving ? <Loader2 size={18} className="spin" /> : <CheckCircle2 size={18} />}
                  יצירת ההצעה
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <Toast message={toast?.message} type={toast?.type} onClose={() => setToast(null)} />
    </div>
  );
}
