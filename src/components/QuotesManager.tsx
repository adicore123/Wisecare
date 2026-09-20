'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Receipt,
  Plus,
  Send,
  Pencil,
  Trash2,
  Link2,
  Copy,
  Loader2,
  CheckCircle2,
  XCircle,
  Package,
  User
} from 'lucide-react';
import { api } from '@/lib/api';
import { formatILS } from '@/lib/quoteHelpers';
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

interface QuoteRow {
  id: string;
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

const STATUS_LABELS: Record<QuoteRow['status'], { text: string; bg: string; color: string; border: string }> = {
  draft: { text: 'טיוטה', bg: '#f1f5f9', color: '#475569', border: '#e2e8f0' },
  sent: { text: 'נשלחה — ממתינה לתשובה', bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
  confirmed: { text: 'אושרה ✅', bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
  declined: { text: 'נדחתה', bg: '#fef2f2', color: '#b91c1c', border: '#fecaca' }
};

const EMPTY_DRAFT = (): { leadName: string; leadPhone: string; title: string; description: string; options: QuoteOptionDraft[] } => ({
  leadName: '',
  leadPhone: '',
  title: '',
  description: '',
  options: [
    { id: `opt-${Date.now()}-1`, label: 'מפגש בודד', pricingModel: 'single', sessionPrice: '', sessionsCount: '1' },
    { id: `opt-${Date.now()}-2`, label: 'תהליך טיפולי', pricingModel: 'package', sessionPrice: '', sessionsCount: '12' }
  ]
});

export default function QuotesManager() {
  const [quotes, setQuotes] = useState<QuoteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type?: 'success' | 'error' } | null>(null);

  // Editor state (null = list view)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState(EMPTY_DRAFT());
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);

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

  useEffect(() => {
    loadQuotes();
  }, [loadQuotes]);

  const openNew = () => {
    setDraft(EMPTY_DRAFT());
    setEditingId(null);
    setIsNew(true);
  };

  const openEdit = (quote: QuoteRow) => {
    setDraft({
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
    setEditingId(quote.id);
    setIsNew(false);
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
    if (!draft.leadName.trim()) { showToast('נא להזין את שם הלקוח הפוטנציאלי', 'error'); return; }
    if (draft.leadPhone.replace(/\D/g, '').length < 9) { showToast('נא להזין מספר טלפון תקין', 'error'); return; }
    if (draft.options.length === 0) { showToast('יש להוסיף לפחות אפשרות מחיר אחת', 'error'); return; }

    const payload = {
      leadName: draft.leadName.trim(),
      leadPhone: draft.leadPhone.trim(),
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
          <div className="form-group">
            <label>שם הלקוח הפוטנציאלי *</label>
            <input
              className="form-control"
              value={draft.leadName}
              onChange={e => setDraft(d => ({ ...d, leadName: e.target.value }))}
              placeholder="למשל: דניאל כהן"
            />
          </div>

          <div className="form-row">
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
            <div className="form-group">
              <label>כותרת ההצעה</label>
              <input
                className="form-control"
                value={draft.title}
                onChange={e => setDraft(d => ({ ...d, title: e.target.value }))}
                placeholder="למשל: טיפול CBT — מפגשי היכרות"
              />
            </div>
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
                    padding: '10px 16px', borderRadius: '12px', background: '#ecfdf5', border: '1px solid #a7f3d0',
                    color: '#047857', fontWeight: 800, whiteSpace: 'nowrap'
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
          <div className="stat-info"><strong>{stats.sent}</strong><span>ממתינות לתשובה</span></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><CheckCircle2 size={20} /></div>
          <div className="stat-info"><strong>{stats.confirmed}</strong><span>אושרו</span></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><XCircle size={20} /></div>
          <div className="stat-info"><strong>{stats.declined}</strong><span>נדחו</span></div>
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
        ) : (
          <div className="content-table-shell">
            <div className="table-responsive">
              <table>
                <thead>
                  <tr>
                    <th>לקוח פוטנציאלי</th>
                    <th>הצעה</th>
                    <th>סטטוס</th>
                    <th>נשלחה</th>
                    <th>פעולות</th>
                  </tr>
                </thead>
                <tbody>
                  {quotes.map(quote => {
                    const status = STATUS_LABELS[quote.status] || STATUS_LABELS.draft;
                    const canSend = quote.status === 'draft' || quote.status === 'sent';
                    const canEdit = quote.status === 'draft' || quote.status === 'sent';
                    return (
                      <tr key={quote.id}>
                        <td>
                          <div className="content-table-primary">
                            <div className="content-table-copy">
                              <strong style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <User size={14} /> {quote.leadName}
                              </strong>
                              <span dir="ltr" style={{ color: '#64748b' }}>{quote.leadPhone}</span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="content-table-copy">
                            <strong>{quote.title || 'הצעת מחיר'}</strong>
                            <span>
                              {(quote.options || []).map(o =>
                                o.pricingModel === 'package'
                                  ? `${o.label} (${o.sessionsCount}×${formatILS(o.sessionPrice)})`
                                  : `${o.label} (${formatILS(o.totalPrice)})`
                              ).join(' · ')}
                            </span>
                          </div>
                        </td>
                        <td>
                          <span style={{
                            background: status.bg, color: status.color, border: `1px solid ${status.border}`,
                            borderRadius: '8px', padding: '2px 8px', fontSize: '0.72rem', fontWeight: 700,
                            whiteSpace: 'nowrap'
                          }}>
                            {status.text}
                          </span>
                        </td>
                        <td>
                          <span className="content-table-date">
                            {quote.sentAt
                              ? new Date(quote.sentAt).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' })
                              : '—'}
                          </span>
                        </td>
                        <td>
                          <div className="content-table-actions" style={{ gap: '6px' }}>
                            {canSend && (
                              <button
                                type="button"
                                className="btn btn-primary"
                                style={{ background: '#16a34a', padding: '7px 12px', fontSize: '0.8rem' }}
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

      <Toast message={toast?.message} type={toast?.type} onClose={() => setToast(null)} />
    </div>
  );
}
