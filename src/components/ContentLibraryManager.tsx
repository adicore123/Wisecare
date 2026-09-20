"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  BookOpen,
  Check,
  Download,
  Edit3,
  ExternalLink,
  FileText,
  Image,
  Library,
  Link2,
  Loader2,
  MessageCircle,
  Paperclip,
  Plus,
  Search,
  Send,
  Share2,
  Smartphone,
  Sparkles,
  Trash2,
  Upload,
  Users,
  Video,
  X
} from 'lucide-react';
import { api } from '@/lib/api';
import ConfirmModal from './ConfirmModal';
import Toast from './Toast';
import WhatsAppIcon from './WhatsAppIcon';

const TYPE_CONFIG = {
  video: { label: 'סרטון', Icon: Video },
  article: { label: 'מאמר', Icon: FileText },
  post: { label: 'פוסט', Icon: MessageCircle },
  image: { label: 'תמונה', Icon: Image },
  link: { label: 'קישור', Icon: Link2 }
};

const EMPTY_FORM = {
  title: '',
  description: '',
  type: 'video',
  url: '',
  category: 'כללי',
  sourceName: '',
  imageData: ''
};

function detectUrlDetails(urlStr) {
  if (!urlStr) return { type: 'link', sourceName: '' };
  const raw = String(urlStr || '').trim();
  try {
    const parsed = new URL(raw);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
    const path = parsed.pathname.toLowerCase();

    // YouTube
    if (host.includes('youtube.com') || host.includes('youtu.be')) {
      return { type: 'video', sourceName: path.includes('/shorts/') ? 'YouTube Shorts' : 'YouTube' };
    }
    // Vimeo
    if (host.includes('vimeo.com')) {
      return { type: 'video', sourceName: 'Vimeo' };
    }
    // TikTok
    if (host.includes('tiktok.com')) {
      return { type: 'video', sourceName: 'TikTok' };
    }
    // Instagram (reel vs post)
    if (host.includes('instagram.com')) {
      if (path.includes('/reel') || path.includes('/tv/') || path.includes('/share/r')) {
        return { type: 'video', sourceName: 'Instagram Reels' };
      }
      return { type: 'post', sourceName: 'Instagram' };
    }
    // Facebook (watch/reel/video vs post)
    if (host.includes('facebook.com') || host.includes('fb.watch') || host.includes('fb.com')) {
      if (
        path.includes('/share/v') ||
        path.includes('/share/r') ||
        path.includes('/watch') ||
        path.includes('/reel') ||
        path.includes('/videos/') ||
        path.includes('/video.php') ||
        host.includes('fb.watch') ||
        parsed.searchParams.has('v')
      ) {
        return {
          type: 'video',
          sourceName: (path.includes('/reel') || path.includes('/share/r')) ? 'Facebook Reel' : 'Facebook Video'
        };
      }
      return { type: 'post', sourceName: 'Facebook' };
    }
    // LinkedIn
    if (host.includes('linkedin.com')) {
      return { type: path.includes('/video/') ? 'video' : 'post', sourceName: 'LinkedIn' };
    }
    // Twitter / X
    if (host.includes('twitter.com') || host.includes('x.com')) {
      return { type: 'post', sourceName: 'X (Twitter)' };
    }
    // Threads
    if (host.includes('threads.net')) {
      return { type: 'post', sourceName: 'Threads' };
    }
    // Direct video files
    if (/\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(path)) {
      return { type: 'video', sourceName: host };
    }

    return { type: 'link', sourceName: host };
  } catch {
    return { type: 'link', sourceName: '' };
  }
}

function formatSavedDate(value: any) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('he-IL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(new Date(value));
}

function sourceFromUrl(urlStr?: string) {
  if (!urlStr) return '';
  return detectUrlDetails(urlStr).sourceName;
}

function getSharedDraft() {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const isSharePath = window.location.pathname === '/crm-share';
  const hasShareParams = params.has('url') || params.has('text') || params.has('share') || params.has('share_url');
  if (!isSharePath && !hasShareParams) return null;
  const text = params.get('text') || '';
  const detectedUrl = params.get('url') || params.get('share_url') || text.match(/https?:\/\/[^\s]+/)?.[0] || '';
  const sharedTitle = params.get('title') || params.get('share_title') || '';
  if (!detectedUrl && !sharedTitle && !text) return null;
  const detected = detectUrlDetails(detectedUrl);
  return {
    ...EMPTY_FORM,
    title: sharedTitle,
    description: detectedUrl ? text.replace(detectedUrl, '').trim() : text,
    type: detected.type,
    url: detectedUrl,
    sourceName: detected.sourceName
  };
}

export default function ContentLibraryPage({ currentTherapist: initialTherapist, clients: initialClients = [] }: any) {
  const router = useRouter();
  const [currentTherapist, setCurrentTherapist] = useState<any>(initialTherapist);
  const [clients, setClients] = useState<any[]>(initialClients);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (!currentTherapist) {
        const u = localStorage.getItem('wisecare_user');
        if (u) {
          try { setCurrentTherapist(JSON.parse(u)); } catch { }
        }
      }
      if (clients.length === 0) {
        api.getClients().then((data: any) => {
          if (Array.isArray(data)) setClients(data);
        }).catch(() => { });
      }
    }
  }, [currentTherapist, clients.length]);

  const therapistId = currentTherapist?.id;
  const therapistLoginCode = currentTherapist?.loginCode;
  const sharedDraft = useMemo(() => getSharedDraft(), []);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [isEditorOpen, setIsEditorOpen] = useState(Boolean(sharedDraft));
  const [creationMode, setCreationMode] = useState(sharedDraft?.type === 'article' ? 'article' : 'link');
  const [form, setForm] = useState<any>(sharedDraft || EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const previewTimerRef = useRef<any>(null);
  const [assigningItem, setAssigningItem] = useState<any>(null);
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
  const [sendWhatsApp, setSendWhatsApp] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [confirmState, setConfirmState] = useState<any>(null);
  const [toast, setToast] = useState<any>(null);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsStandalone(
        window.matchMedia('(display-mode: standalone)').matches || Boolean((window.navigator as any)?.standalone)
      );
    }
  }, []);

  const showToast = useCallback((message: string, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  // Auto-preview shared video or URL when opened via share target
  useEffect(() => {
    if (sharedDraft?.url && /^https?:\/\/.+/i.test(sharedDraft.url.trim())) {
      setPreviewLoading(true);
      api.previewContentUrl(sharedDraft.url.trim())
        .then((preview: any) => {
          if (preview) {
            setForm((current: any) => ({
              ...current,
              type: preview.type || current.type,
              sourceName: preview.sourceName || current.sourceName,
              title: (current.title && current.title !== 'Facebook') ? current.title : (preview.title || current.title),
              description: current.description ? current.description : (preview.description || current.description),
              imageData: current.imageData ? current.imageData : (preview.image || current.imageData)
            }));
            if (preview.title) {
              showToast('פרטי הסרטון זוהו ונמשכו אוטומטית! ✨', 'success');
            }
          }
        })
        .catch(() => { })
        .finally(() => {
          setPreviewLoading(false);
        });
    }
  }, [sharedDraft, showToast]);

  const loadItems = useCallback(async () => {
    if (!therapistId) return;
    try {
      const data = await api.getContentItems(therapistId);
      setItems(data || []);
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast, therapistId]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  useEffect(() => {
    if (!sharedDraft) return;
    const code = therapistLoginCode || 'dr-sarah-8821';
    window.history.replaceState({}, '', `/crm/${code}/content`);
  }, [sharedDraft, therapistLoginCode]);

  useEffect(() => {
    const handleInstallAvailable = (event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };
    const handleInstalled = () => {
      setInstallPrompt(null);
      setIsStandalone(true);
    };
    window.addEventListener('beforeinstallprompt', handleInstallAvailable);
    window.addEventListener('appinstalled', handleInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleInstallAvailable);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  const filteredItems = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return items.filter(item => {
      const matchesType = typeFilter === 'all' || item.type === typeFilter;
      const searchable = `${item.title} ${item.description} ${item.category} ${item.sourceName}`.toLowerCase();
      return matchesType && (!query || searchable.includes(query));
    });
  }, [items, searchTerm, typeFilter]);

  const totalAssignments = items.reduce((sum, item) => sum + (item.assignments?.length || 0), 0);
  const sentNotifications = items.reduce(
    (sum, item) => sum + (item.assignments || []).reduce(
      (assignmentSum, assignment) => assignmentSum + (
        assignment.notificationCount || (assignment.notificationStatus === 'sent' ? 1 : 0)
      ),
      0
    ),
    0
  );

  const updateItem = (updatedItem) => {
    setItems(current => current.map(item => item.id === updatedItem.id ? updatedItem : item));
    setAssigningItem(updatedItem);
  };

  const handleUrlChange = (url) => {
    const detected = detectUrlDetails(url);
    setForm(current => ({
      ...current,
      url,
      sourceName: current.sourceName && !['YouTube', 'Instagram', 'Facebook', 'Vimeo', 'טיקטוק', 'LinkedIn', 'X (Twitter)', 'Threads'].includes(current.sourceName)
        ? current.sourceName
        : (detected.sourceName || current.sourceName),
      type: detected.type
    }));

    if (url && /^https?:\/\/.+/i.test(url.trim())) {
      if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
      previewTimerRef.current = setTimeout(async () => {
        try {
          setPreviewLoading(true);
          const preview = await api.previewContentUrl(url.trim());
          if (preview) {
            setForm(current => ({
              ...current,
              type: preview.type || current.type,
              sourceName: preview.sourceName || current.sourceName,
              title: current.title ? current.title : (preview.title || current.title),
              description: current.description ? current.description : (preview.description || current.description),
              imageData: current.imageData ? current.imageData : (preview.image || current.imageData)
            }));
            if (preview.title) {
              showToast('פרטי הסרטון/הפוסט זוהו ונמשכו אוטומטית! ✨', 'success');
            }
          }
        } catch {
          // Fallback gracefully
        } finally {
          setPreviewLoading(false);
        }
      }, 400);
    }
  };

  const handlePasteLink = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const detectedUrl = text.match(/https?:\/\/[^\s]+/)?.[0] || text;
      handleUrlChange(detectedUrl.trim());
      showToast('הקישור הודבק בהצלחה! 📋');
    } catch {
      showToast('לא ניתן לקרוא מהלוח באופן אוטומטי. אנא הדבק את הקישור ישירות בשדה.', 'error');
    }
  };

  const handleInstall = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === 'accepted') setInstallPrompt(null);
  };

  const handleImage = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      showToast('ניתן להעלות תמונת JPG, PNG או WebP בלבד.', 'error');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      showToast('התמונה גדולה מדי. הגודל המרבי הוא 2MB.', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setForm(current => ({ ...current, imageData: String(reader.result || '') }));
    reader.readAsDataURL(file);
  };

  const closeEditor = () => {
    setIsEditorOpen(false);
    setForm(EMPTY_FORM);
    setCreationMode('link');
    setPreviewLoading(false);
    if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const fallbackTitle = form.title.trim() || (
        form.type === 'video' ? `סרטון (${form.sourceName || 'מהרשת'})` :
          form.type === 'post' ? `פוסט (${form.sourceName || 'מרשת חברתית'})` :
            form.type === 'article' ? (form.description.trim().split('\n')[0].replace(/^[#*-\s]+/, '').slice(0, 50) || 'מאמר טיפולי') :
              `תוכן (${form.sourceName || 'כללי'})`
      );
      const item = await api.createContentItem({
        ...form,
        title: fallbackTitle,
        therapistId
      });
      setItems(current => [item, ...current]);
      closeEditor();
      showToast('התוכן נשמר ונוסף ישירות לטבלה.');
      try { router.refresh(); } catch {}
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const openAssignment = (item) => {
    setAssigningItem(item);
    setSelectedClientIds([]);
    setSendWhatsApp(true);
  };

  const toggleClient = (clientId) => {
    setSelectedClientIds(current => current.includes(clientId)
      ? current.filter(id => id !== clientId)
      : [...current, clientId]);
  };

  const handleAssign = async (event) => {
    event.preventDefault();
    if (!assigningItem || selectedClientIds.length === 0) return;
    setAssigning(true);
    try {
      const assignedClientIds = new Set((assigningItem.assignments || []).map(assignment => assignment.clientId));
      const newlyAssignedCount = selectedClientIds.filter(clientId => !assignedClientIds.has(clientId)).length;
      const resentCount = selectedClientIds.length - newlyAssignedCount;
      const result = await api.assignContentItem(assigningItem.id, selectedClientIds, sendWhatsApp);
      updateItem(result.item);
      setAssigningItem(null);
      const failures = result.results.filter(entry => entry.status === 'failed').length;
      const successMessage = sendWhatsApp
        ? `התוכן זמין ל-${selectedClientIds.length} מטופלים ונשלחו התראות${resentCount > 0 ? `, כולל ${resentCount} שליחות חוזרות` : ''}.`
        : `התוכן שויך ל-${newlyAssignedCount} מטופלים חדשים.`;
      showToast(
        failures > 0
          ? `התוכן נשמר ושויך, אך ${failures} התראות WhatsApp נכשלו וניתן לשלוח אותן שוב.`
          : successMessage,
        failures > 0 ? 'error' : 'success'
      );
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setAssigning(false);
    }
  };

  const requestRemoveAssignment = (item, assignment) => {
    setConfirmState({
      title: `הסרת התוכן מ-${assignment.clientName}`,
      message: 'הפריט ייעלם מהפורטל של המטופל שנבחר בלבד ויישאר בספרייה ובפורטלים של מטופלים אחרים.',
      confirmText: 'הסר מהמטופל',
      onConfirm: async () => {
        try {
          await api.removeContentAssignment(item.id, assignment.clientId);
          setItems(current => current.map(entry => entry.id === item.id
            ? { ...entry, assignments: entry.assignments.filter(a => a.clientId !== assignment.clientId) }
            : entry));
          setAssigningItem(current => current?.id === item.id
            ? { ...current, assignments: current.assignments.filter(a => a.clientId !== assignment.clientId) }
            : current);
          setConfirmState(null);
          showToast('התוכן הוסר מהמטופל שנבחר.');
        } catch (error) {
          showToast(error.message, 'error');
        }
      }
    });
  };

  const requestDeleteItem = (item) => {
    const assignmentCount = item.assignments?.length || 0;
    setConfirmState({
      title: 'מחיקת תוכן מהספרייה',
      message: assignmentCount > 0
        ? `הפריט “${item.title}” יימחק לצמיתות ויוסר גם מהפורטלים של ${assignmentCount} מטופלים.`
        : `הפריט “${item.title}” יימחק לצמיתות מהספרייה.`,
      confirmText: 'מחק תוכן',
      onConfirm: async () => {
        try {
          await api.deleteContentItem(item.id);
          setItems(current => current.filter(entry => entry.id !== item.id));
          setConfirmState(null);
          showToast('התוכן נמחק מהספרייה.');
          try { router.refresh(); } catch {}
        } catch (error) {
          showToast(error.message, 'error');
        }
      }
    });
  };

  const assignedClientIds = new Set(
    (assigningItem?.assignments || []).map(assignment => assignment.clientId)
  );
  const selectedNewClientCount = selectedClientIds.filter(clientId => !assignedClientIds.has(clientId)).length;
  const canSubmitAssignment = selectedClientIds.length > 0 && (sendWhatsApp || selectedNewClientCount > 0);

  return (
    <div className="content-library-page">
      <div className="page-header content-library-header">
        <div className="page-title-group">
          <span className="eyebrow"><Library size={15} /> הספרייה הטיפולית שלי</span>
          <h1>תוכן נכון, למטופל הנכון</h1>
          <p>שמור תוכן בטבלה מסודרת, ולאחר מכן שייך אותו למטופל אחד או לכמה מטופלים לפי הצורך.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setIsEditorOpen(true)}>
          <Plus size={18} aria-hidden="true" />
          <span>הוספת תוכן</span>
        </button>
      </div>

      <div className="content-stats-grid" aria-label="נתוני ספריית התוכן">
        <div className="content-stat"><Library /><div><strong>{items.length}</strong><span>פריטים בספרייה</span></div></div>
        <div className="content-stat"><Users /><div><strong>{totalAssignments}</strong><span>שיוכים למטופלים</span></div></div>
        <div className="content-stat"><WhatsAppIcon /><div><strong>{sentNotifications}</strong><span>התראות שנשלחו</span></div></div>
      </div>

      <div className="share-readiness-banner">
        <span className="share-readiness-icon"><Smartphone size={22} /></span>
        <div>
          <strong>{isStandalone ? 'WiseCare מוכנה לקבל שיתופים מהטלפון' : 'שמירת תוכן ישר מהטלפון'}</strong>
          <span>{isStandalone ? 'באנדרואיד אפשר לבחור WiseCare מתפריט השיתוף. באייפון ניתן להדביק קישור ולהוסיף צילום מסך.' : 'התקנה כאפליקציה מאפשרת שיתוף מהיר באנדרואיד; באייפון משתמשים בהדבקת קישור.'}</span>
        </div>
        {installPrompt && <button type="button" className="btn btn-secondary" onClick={handleInstall}><Download size={16} /> התקן כאפליקציה</button>}
      </div>

      <div className="content-toolbar">
        <div className="search-input-wrapper">
          <Search size={18} aria-hidden="true" />
          <label className="sr-only" htmlFor="content-search">חיפוש בספריית התוכן</label>
          <input id="content-search" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="חיפוש לפי שם, נושא או מקור..." />
        </div>
        <div className="content-filter-row" role="group" aria-label="סינון לפי סוג תוכן">
          <button type="button" className={typeFilter === 'all' ? 'active' : ''} onClick={() => setTypeFilter('all')}>הכול</button>
          {Object.entries(TYPE_CONFIG).map(([key, config]) => (
            <button key={key} type="button" className={typeFilter === key ? 'active' : ''} onClick={() => setTypeFilter(key)}>{config.label}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="content-empty"><Library className="spin" /><h2>טוען את הספרייה...</h2></div>
      ) : filteredItems.length === 0 ? (
        <div className="content-empty">
          <div className="content-empty-icon"><BookOpen /></div>
          <h2>{items.length === 0 ? 'הספרייה שלך מוכנה לתוכן הראשון' : 'לא נמצאו פריטים מתאימים'}</h2>
          <p>{items.length === 0 ? 'הדבק קישור או העלה צילום מסך, ואחר כך בחר למי לשלוח.' : 'נסה לשנות את החיפוש או את סוג התוכן.'}</p>
          {items.length === 0 && <button type="button" className="btn btn-primary" onClick={() => setIsEditorOpen(true)}><Plus size={18} /> הוסף תוכן ראשון</button>}
        </div>
      ) : (
        <div className="content-table-shell" role="region" aria-label="טבלת הספרייה הטיפולית" tabIndex={0}>
          <table className="content-library-table">
            <thead>
              <tr>
                <th scope="col">תוכן</th>
                <th scope="col">סוג ומקור</th>
                <th scope="col">קטגוריה</th>
                <th scope="col">מטופלים משויכים</th>
                <th scope="col">תאריך שמירה</th>
                <th scope="col">פעולות</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map(item => {
                const config = TYPE_CONFIG[item.type] || TYPE_CONFIG.link;
                const TypeIcon = config.Icon;
                const assignments = item.assignments || [];
                const visibleNames = assignments.slice(0, 2).map(assignment => assignment.clientName).join(', ');
                return (
                  <tr key={item.id}>
                    <td>
                      <div className="content-table-primary">
                        <div className="content-table-thumbnail">
                          {(item.imageUrl || item.imageData)
                            ? <img src={item.imageUrl || item.imageData} alt="" loading="lazy" />
                            : <TypeIcon size={22} aria-hidden="true" />}
                        </div>
                        <div className="content-table-copy">
                          <strong>{item.title}</strong>
                          <span>{item.description || 'ללא תיאור נוסף'}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="content-table-type"><TypeIcon size={14} aria-hidden="true" />{config.label}</span>
                      <span className="content-table-secondary">{item.sourceName || sourceFromUrl(item.url) || 'תוכן מקורי'}</span>
                    </td>
                    <td><span className="content-category">{item.category || 'כללי'}</span></td>
                    <td>
                      <div className="content-table-assignments">
                        <strong>{assignments.length > 0 ? `${assignments.length} מטופלים` : 'טרם שויך'}</strong>
                        {assignments.length > 0 && (
                          <span>{visibleNames}{assignments.length > 2 ? ` ועוד ${assignments.length - 2}` : ''}</span>
                        )}
                      </div>
                    </td>
                    <td><time className="content-table-date" dateTime={item.createdAt}>{formatSavedDate(item.createdAt)}</time></td>
                    <td>
                      <div className="content-table-actions">
                        <button type="button" className="btn btn-primary" onClick={() => openAssignment(item)}>
                          <Send size={15} aria-hidden="true" />
                          <span>שיוך ושליחה</span>
                        </button>
                        {item.url && (
                          <a className="btn-icon" href={item.url} target="_blank" rel="noreferrer" aria-label={`פתח את ${item.title}`}>
                            <ExternalLink size={17} aria-hidden="true" />
                          </a>
                        )}
                        <button type="button" className="btn-icon content-delete" onClick={() => requestDeleteItem(item)} aria-label={`מחק את ${item.title}`}>
                          <Trash2 size={17} aria-hidden="true" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {isEditorOpen && (
        <div className="modal-overlay" onClick={closeEditor}>
          <div className="modal-card content-editor-modal" role="dialog" aria-modal="true" aria-labelledby="content-editor-title" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span className="eyebrow">
                  {creationMode === 'article' ? <Edit3 size={14} /> : <Share2 size={14} />}
                  {creationMode === 'article' ? ' תוכן מקורי מהקליניקה' : ' שיתוף תוכן ומדיה'}
                </span>
                <h2 id="content-editor-title">
                  {creationMode === 'article' ? 'כתיבת מאמר או הדרכה טיפולית' : 'הוספת סרטון או פוסט לספרייה'}
                </h2>
              </div>
              <button type="button" className="close-btn" onClick={closeEditor} aria-label="סגור"><X size={20} /></button>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="content-editor-tabs" role="tablist" aria-label="סוג התוכן החדש">
              <button
                type="button"
                onClick={() => {
                  setCreationMode('link');
                  if (form.type === 'article') {
                    const detected = detectUrlDetails(form.url);
                    setForm(current => ({ ...current, type: detected.type }));
                  }
                }}
                className={`content-editor-tab ${creationMode === 'link' ? 'active' : ''}`}
                role="tab"
                aria-selected={creationMode === 'link'}
              >
                <Link2 size={17} />
                <span>קישור לסרטון / פוסט (זיהוי אוטומטי)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setCreationMode('article');
                  setForm(current => ({ ...current, type: 'article' }));
                }}
                className={`content-editor-tab ${creationMode === 'article' ? 'active' : ''}`}
                role="tab"
                aria-selected={creationMode === 'article'}
              >
                <FileText size={17} />
                <span>כתיבת מאמר / הדרכה טיפולית</span>
              </button>
            </div>

            <form onSubmit={handleSave}>
              <div className="modal-body">
                {creationMode === 'link' ? (
                  <>
                    <div className="form-group">
                      <div className="content-field-heading">
                        <label htmlFor="content-url">קישור לסרטון, פוסט או תוכן ברשת *</label>
                        {previewLoading && (
                          <span className="content-preview-status">
                            <Loader2 size={13} className="spin" />
                            <span>שולף פרטים וכותרת אוטומטית...</span>
                          </span>
                        )}
                      </div>

                      <div className="content-url-row">
                        <input
                          id="content-url"
                          className="form-control"
                          type="url"
                          dir="ltr"
                          value={form.url}
                          onChange={e => handleUrlChange(e.target.value)}
                          placeholder="הדבק קישור (יוטיוב, אינסטגרם, פייסבוק, טיקטוק, כתבה...)"
                          required={creationMode === 'link'}
                        />
                        <button type="button" className="btn btn-secondary" onClick={handlePasteLink} title="הדבק קישור מלוח ההעתקה">
                          <Paperclip size={16} />
                          <span>הדבק</span>
                        </button>
                      </div>

                      {/* Smart Detection Live Badge */}
                      {form.url && (
                        <div className={`content-detection content-detection-${form.type}`}>
                          <div className="content-detection-result">
                            {form.type === 'video' ? <Video size={17} /> : form.type === 'post' ? <MessageCircle size={17} /> : <Link2 size={17} />}
                            <span>
                              {form.type === 'video' ? 'זוהה אוטומטית כסרטון' : form.type === 'post' ? 'זוהה אוטומטית כפוסט' : 'זוהה כקישור לתוכן'}
                              {form.sourceName ? ` • ${form.sourceName}` : ''}
                            </span>
                          </div>

                          {/* Quick manual override chip */}
                          <div className="content-detection-options" role="group" aria-label="שינוי סוג התוכן">
                            {['video', 'post', 'link'].map(typeKey => (
                              <button
                                key={typeKey}
                                type="button"
                                onClick={() => setForm(c => ({ ...c, type: typeKey }))}
                                className={form.type === typeKey ? 'active' : ''}
                                aria-pressed={form.type === typeKey}
                              >
                                {TYPE_CONFIG[typeKey]?.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      <small className="content-field-help">
                        המערכת תזהה מעצמה אם מדובר בסרטון או פוסט, ותשלים את המקור והכותרת.
                      </small>
                    </div>

                    <div className="form-group">
                      <label htmlFor="content-title">
                        כותרת הפריט <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: '0.84rem' }}>(אופציונלי — נוצרת או נשלפת אוטומטית)</span>
                      </label>
                      <input
                        id="content-title"
                        className="form-control"
                        value={form.title}
                        onChange={e => setForm(current => ({ ...current, title: e.target.value }))}
                        placeholder={previewLoading ? 'שולף כותרת...' : (form.url ? 'נוצרת אוטומטית מהקישור או הזן כותרת משלך' : 'הזן כותרת או השאר ריק ליצירה אוטומטית')}
                        maxLength={160}
                      />
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label htmlFor="content-category">קטגוריה טיפולית</label>
                        <input
                          id="content-category"
                          className="form-control"
                          value={form.category}
                          onChange={e => setForm(current => ({ ...current, category: e.target.value }))}
                          placeholder="למשל: חרדה, שינה, נשימות, CBT"
                        />
                      </div>
                      <div className="form-group">
                        <label htmlFor="content-source">מקור</label>
                        <input
                          id="content-source"
                          className="form-control"
                          value={form.sourceName}
                          onChange={e => setForm(current => ({ ...current, sourceName: e.target.value }))}
                          placeholder="מזוהה אוטומטית"
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label htmlFor="content-description">הסבר או דגשים אישיים למטופל (אופציונלי)</label>
                      <textarea
                        id="content-description"
                        className="form-control"
                        rows={3}
                        value={form.description}
                        onChange={e => setForm(current => ({ ...current, description: e.target.value }))}
                        placeholder="תוכל לכתוב כאן דגשים לצפייה או מה המטופל צריך לתרגל..."
                      />
                    </div>

                    <div className="image-upload-field">
                      <input id="content-image" type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImage} />
                      <label htmlFor="content-image">
                        <Upload size={18} />
                        <span>
                          <strong>{form.imageData ? 'החלף תמונת פתיח / שער' : 'הוסף תמונת פתיח (נמשכת אוטומטית ביוטיוב)'}</strong>
                          <small>JPG, PNG או WebP עד 2MB</small>
                        </span>
                      </label>
                      {form.imageData && (
                        <div className="image-preview">
                          <img src={form.imageData} alt="תצוגה מקדימה" />
                          <button type="button" onClick={() => setForm(current => ({ ...current, imageData: '' }))} aria-label="הסר תמונה">
                            <X size={16} />
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  /* Dedicated Clinical Article Mode */
                  <>
                    <div className="content-article-note">
                      <Sparkles size={18} />
                      <span><strong>מרחב מאמרים והדרכות:</strong> תוכן זה יוצג למטופל כדף קריאה פנימי, מרגיע ומעוצב בתוך הפורטל האישי שלו.</span>
                    </div>

                    <div className="form-group">
                      <label htmlFor="content-title">
                        כותרת המאמר או ההדרכה <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: '0.84rem' }}>(אופציונלי — נגזרת אוטומטית מהמשפט הראשון)</span>
                      </label>
                      <input
                        id="content-title"
                        className="form-control"
                        value={form.title}
                        onChange={e => setForm(current => ({ ...current, title: e.target.value }))}
                        placeholder="אם לא תוזן כותרת, ניקח אוטומטית את המשפט הראשון של המאמר"
                        maxLength={160}
                      />
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label htmlFor="content-category">תחום טיפולי / קטגוריה</label>
                        <input
                          id="content-category"
                          className="form-control"
                          value={form.category}
                          onChange={e => setForm(current => ({ ...current, category: e.target.value }))}
                          placeholder="למשל: CBT, חרדה, מיינדפולנס, הורות"
                        />
                      </div>
                      <div className="form-group">
                        <label htmlFor="content-source">מקור או מחבר</label>
                        <input
                          id="content-source"
                          className="form-control"
                          value={form.sourceName}
                          onChange={e => setForm(current => ({ ...current, sourceName: e.target.value }))}
                          placeholder="למשל: הקליניקה / שם המטפל/ת"
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label htmlFor="content-description">גוף המאמר והנחיות התרגול למטופל *</label>
                      <textarea
                        id="content-description"
                        className="form-control"
                        rows={8}
                        value={form.description}
                        onChange={e => setForm(current => ({ ...current, description: e.target.value }))}
                        placeholder="כתוב כאן את תוכן המאמר, הסברים פסיכו-חינוכיים, שלבי תרגול, דגשים חשובים או תובנות..."
                        required={creationMode === 'article'}
                        style={{ lineHeight: 1.6, fontSize: '0.92rem' }}
                      />
                    </div>

                    <div className="image-upload-field">
                      <input id="content-image" type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImage} />
                      <label htmlFor="content-image">
                        <Upload size={18} />
                        <span>
                          <strong>{form.imageData ? 'החלף תמונה / דף עבודה' : 'צרף תמונה או צילום דף עבודה למאמר'}</strong>
                          <small>JPG, PNG או WebP עד 2MB</small>
                        </span>
                      </label>
                      {form.imageData && (
                        <div className="image-preview">
                          <img src={form.imageData} alt="תצוגה מקדימה" />
                          <button type="button" onClick={() => setForm(current => ({ ...current, imageData: '' }))} aria-label="הסר תמונה">
                            <X size={16} />
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="form-group" style={{ marginTop: '12px' }}>
                      <label htmlFor="content-url" style={{ fontSize: '0.82rem', color: '#64748b' }}>קישור מקור חיצוני לקריאה נוספת (אופציונלי)</label>
                      <input
                        id="content-url"
                        className="form-control"
                        type="url"
                        dir="ltr"
                        value={form.url}
                        onChange={e => setForm(current => ({ ...current, url: e.target.value }))}
                        placeholder="https://..."
                        style={{ fontSize: '0.86rem' }}
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeEditor}>ביטול</button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving || (creationMode === 'link' ? (!form.url && !form.imageData && !form.description.trim()) : !form.description.trim())}
                >
                  {saving ? 'שומר...' : creationMode === 'article' ? 'שמור מאמר בספרייה' : 'שמור בספרייה'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {assigningItem && (
        <div className="modal-overlay" onClick={() => setAssigningItem(null)}>
          <div className="modal-card assignment-modal" role="dialog" aria-modal="true" aria-labelledby="assignment-title" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><div><span className="eyebrow"><Users size={14} /> בחירת נמענים</span><h2 id="assignment-title">למי לשייך או לשלוח שוב את “{assigningItem.title}”?</h2></div><button type="button" className="close-btn" onClick={() => setAssigningItem(null)} aria-label="סגור"><X size={20} /></button></div>
            <form onSubmit={handleAssign}>
              <div className="modal-body">
                <div className="client-select-list">
                  {clients.map(client => {
                    const currentAssignment = assigningItem.assignments?.find(a => a.clientId === client.id);
                    const alreadyAssigned = Boolean(currentAssignment);
                    const checked = selectedClientIds.includes(client.id);
                    return (
                      <div key={client.id} className={`client-select-card ${checked ? 'selected' : ''}`}>
                        <label className="client-select-main">
                          <input type="checkbox" checked={checked} onChange={() => toggleClient(client.id)} />
                          <span className="client-select-avatar">{client.firstName?.charAt(0)}</span>
                          <span><strong>{client.firstName} {client.lastName}</strong><small>{alreadyAssigned ? 'כבר משויך — ניתן לבחור ולשלוח שוב' : client.phone}</small></span>
                        </label>
                        <span className="client-select-status">
                          {alreadyAssigned && <span className="already-assigned-badge">כבר שויך</span>}
                          {checked && <Check size={18} aria-hidden="true" />}
                          {alreadyAssigned && (
                            <button type="button" className="remove-assignment-btn" onClick={() => requestRemoveAssignment(assigningItem, currentAssignment)}>הסר שיוך</button>
                          )}
                        </span>
                      </div>
                    );
                  })}
                </div>
                {clients.length === 0 && <div className="content-inline-empty">אין עדיין מטופלים שניתן לבחור.</div>}
                <p className="assignment-help">בחירה במטופל שכבר קיבל את התוכן לא תיצור כפילות. אם התראת WhatsApp מסומנת, תישלח אליו הודעה חדשה עם אותו קישור ישיר.</p>
                <label className="notification-choice">
                  <input type="checkbox" checked={sendWhatsApp} onChange={e => setSendWhatsApp(e.target.checked)} />
                  <span className="notification-choice-icon"><WhatsAppIcon size={20} /></span>
                  <span><strong>שלח התראת WhatsApp עכשיו</strong><small>ההודעה תהיה כללית ולא תחשוף את נושא התוכן.</small></span>
                </label>
              </div>
              <div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setAssigningItem(null)}>סיום</button><button type="submit" className="btn btn-primary" disabled={assigning || !canSubmitAssignment}>{assigning ? (sendWhatsApp ? 'משייך ושולח...' : 'משייך...') : (sendWhatsApp ? `שייך ושלח ל-${selectedClientIds.length || 0} מטופלים` : `שייך ל-${selectedNewClientCount} מטופלים חדשים`)}</button></div>
            </form>
          </div>
        </div>
      )}

      {confirmState && <ConfirmModal isOpen title={confirmState.title} message={confirmState.message} confirmText={confirmState.confirmText} onConfirm={confirmState.onConfirm} onClose={() => setConfirmState(null)} />}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
