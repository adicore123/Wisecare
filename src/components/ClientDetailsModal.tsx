"use client";

import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  ExternalLink,
  Copy,
  Check,
  MessageSquare,
  Plus,
  Calendar,
  CheckCircle2,
  Clock,
  Trash2,
  Send,
  User,
  FileText,
  KeyRound,
  Sparkles,
  CalendarCheck,
  MapPin,
  Video,
  Phone,
  AlertCircle,
  Lock,
  BookOpen,
  Library,
  Share2,
  RefreshCw,
  Loader2,
  Eye,
  EyeOff
} from 'lucide-react';
import { api } from '@/lib/api';
import ConfirmModal from './ConfirmModal';
import Toast from './Toast';
import WhatsAppIcon from './WhatsAppIcon';

export default function ClientDetailsModal({
  isOpen,
  onClose,
  client,
  tasks = [],
  insights = [],
  onAddTask,
  onDeleteTask,
  onSendWhatsApp,
  onOpenPortal
}) {
  const [currentClient, setCurrentClient] = useState(client);
  useEffect(() => {
    setCurrentClient(client);
  }, [client]);

  const [modalTab, setModalTab] = useState('tasks'); // 'tasks' | 'insights' | 'appointments'
  const [copied, setCopied] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    category: 'ויסות רגשי',
    dueDate: ''
  });
  const [isSubmittingTask, setIsSubmittingTask] = useState(false);
  const [isSendingWa, setIsSendingWa] = useState(false);
  const [waNotice, setWaNotice] = useState('');
  const [pendingDeleteTaskId, setPendingDeleteTaskId] = useState(null);
  const [modalToast, setModalToast] = useState(null);

  // Password & Credentials Management State
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [showManualEditModal, setShowManualEditModal] = useState(false);
  const [editUsername, setEditUsername] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [sendWaOnSave, setSendWaOnSave] = useState(true);
  const [isSavingManualCredentials, setIsSavingManualCredentials] = useState(false);

  // Appointments state
  const [clientAppointments, setClientAppointments] = useState([]);
  const [loadingAppointments, setLoadingAppointments] = useState(false);
  const [showAddAppointment, setShowAddAppointment] = useState(false);
  const [appointmentForm, setAppointmentForm] = useState({
    date: new Date().toISOString().split('T')[0],
    time: '10:00',
    durationMinutes: 50,
    type: 'in_person',
    location: 'רחוב רוטשילד 45, תל אביב',
    notes: '',
    sendWhatsApp: true
  });
  const [isSubmittingAppointment, setIsSubmittingAppointment] = useState(false);
  const [actionAptId, setActionAptId] = useState(null);

  // Content & Articles State
  const [clientContent, setClientContent] = useState<any[]>([]);
  const [allTherapistContent, setAllTherapistContent] = useState<any[]>([]);
  const [loadingContent, setLoadingContent] = useState(false);
  const [contentSubFilter, setContentSubFilter] = useState<'all' | 'articles' | 'media'>('all');
  const [showAssignContent, setShowAssignContent] = useState(false);
  const [assignForm, setAssignForm] = useState({
    selectedContentId: '',
    sendWhatsApp: true
  });
  const [isSubmittingAssign, setIsSubmittingAssign] = useState(false);
  const [actionContentId, setActionContentId] = useState<string | null>(null);
  const [showQuickCreateContent, setShowQuickCreateContent] = useState(false);
  const [quickContentForm, setQuickContentForm] = useState({
    type: 'article',
    title: '',
    description: '',
    url: '',
    category: 'חומרי העשרה',
    sendWhatsApp: true
  });
  const [isSubmittingQuickContent, setIsSubmittingQuickContent] = useState(false);

  // Digital forms state
  const [clientForms, setClientForms] = useState<any[]>([]);
  const [loadingForms, setLoadingForms] = useState(false);
  const [showSendForm, setShowSendForm] = useState(false);
  const [sendFormChoice, setSendFormChoice] = useState('');
  const [isSendingForm, setIsSendingForm] = useState<string | null>(null);
  const [viewingSignature, setViewingSignature] = useState<any | null>(null);
  const [isLoadingSignature, setIsLoadingSignature] = useState(false);
  const [formTemplates, setFormTemplates] = useState<any[]>([]);

  // Portal on/off per client (a client can be a regular client without a personal portal)
  const [portalOn, setPortalOn] = useState(client?.portalEnabled !== false);
  const [isTogglingPortal, setIsTogglingPortal] = useState(false);

  const showToast = (message, type = 'success') => {
    setModalToast({ message, type });
    setTimeout(() => setModalToast(null), 3500);
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!taskForm.title.trim()) return;

    setIsSubmittingTask(true);
    try {
      await onAddTask({
        clientId: client.id,
        therapistId: client.therapistId,
        ...taskForm
      });
      setTaskForm({
        title: '',
        description: '',
        category: 'ויסות רגשי',
        dueDate: ''
      });
      setShowAddTask(false);
      showToast('המשימה נוספה בהצלחה למרחב המטופל! ✨');
    } catch (err) {
      showToast('שגיאה ביצירת משימה: ' + err.message, 'error');
    } finally {
      setIsSubmittingTask(false);
    }
  };

  const handleSendWa = async () => {
    setIsSendingWa(true);
    setWaNotice('');
    try {
      await onSendWhatsApp(currentClient.id);
      showToast('הודעת וואטסאפ עם קישור וקוד גישה נשלחה בהצלחה! 📲');
      setWaNotice('הודעת וואטסאפ נשלחה בהצלחה למכשיר המטופל!');
      setTimeout(() => setWaNotice(''), 4000);
    } catch (err: any) {
      showToast('שגיאה בשליחת וואטסאפ: ' + err.message, 'error');
    } finally {
      setIsSendingWa(false);
    }
  };

  const handleResetPasswordWhatsApp = async () => {
    setIsResettingPassword(true);
    try {
      const res = await api.resetClientPasswordWhatsApp(currentClient.id);
      setCurrentClient(prev => ({
        ...prev,
        username: res.username || prev.username,
        initialPassword: res.newPassword,
        hasPassword: true
      }));
      showToast(res.message || 'סיסמה חדשה הוגדרה ונשלחה בוואטסאפ ללקוח! 📲');
    } catch (err: any) {
      showToast(err.message || 'שגיאה באיפוס הסיסמה', 'error');
    } finally {
      setIsResettingPassword(false);
    }
  };

  const handleOpenEditModal = () => {
    setEditUsername(currentClient.username || currentClient.phone || '');
    setEditPassword(currentClient.initialPassword || '');
    setShowManualEditModal(true);
  };

  const handleSaveManualCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUsername.trim()) {
      showToast('נא להזין שם משתמש', 'error');
      return;
    }
    if (!editPassword.trim() || editPassword.trim().length < 4) {
      showToast('סיסמה חייבת להכיל לפחות 4 תווים', 'error');
      return;
    }

    setIsSavingManualCredentials(true);
    try {
      await api.updateClient(currentClient.id, {
        username: editUsername.trim(),
        password: editPassword.trim()
      });

      setCurrentClient(prev => ({
        ...prev,
        username: editUsername.trim(),
        initialPassword: editPassword.trim(),
        hasPassword: true
      }));

      if (sendWaOnSave) {
        await api.resetClientPasswordWhatsApp(currentClient.id, {
          newPassword: editPassword.trim()
        });
        showToast('פרטי הגישה עודכנו ונשלחו בהצלחה ללקוח ב-WhatsApp! 📲');
      } else {
        showToast('פרטי הגישה עודכנו בהצלחה במערכת ✨');
      }

      setShowManualEditModal(false);
    } catch (err: any) {
      showToast(err.message || 'שגיאה בעדכון פרטי הגישה', 'error');
    } finally {
      setIsSavingManualCredentials(false);
    }
  };

  const loadClientAppointments = useCallback(async () => {
    if (!client?.id) return;
    setLoadingAppointments(true);
    try {
      const data = await api.getAppointments({ clientId: client.id });
      setClientAppointments(data || []);
    } catch (err) {
      console.error('Error fetching client appointments:', err);
    } finally {
      setLoadingAppointments(false);
    }
  }, [client]);

  const loadClientContent = useCallback(async () => {
    if (!client?.id) return;
    setLoadingContent(true);
    try {
      const therapistId = client.therapistId || 'therapist-1';
      const allItems = await api.getContentItems({ therapistId });
      setAllTherapistContent(allItems || []);
      const assigned = (allItems || [])
        .filter((item: any) => (item.assignments || []).some((a: any) => a.clientId === client.id))
        .map((item: any) => {
          const myAssignment = (item.assignments || []).find((a: any) => a.clientId === client.id);
          return {
            ...item,
            assignment: myAssignment
          };
        });
      setClientContent(assigned);
    } catch (err) {
      console.error('Error fetching client content:', err);
    } finally {
      setLoadingContent(false);
    }
  }, [client]);

  const handleAssignExistingContent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignForm.selectedContentId) {
      showToast('נא לבחור פריט תוכן מהרשימה', 'error');
      return;
    }
    setIsSubmittingAssign(true);
    try {
      await api.assignContentItem(assignForm.selectedContentId, [client.id], assignForm.sendWhatsApp);
      showToast(assignForm.sendWhatsApp ? 'התוכן שויך למטופל ונשלחה הודעת WhatsApp! ✨' : 'התוכן שויך בהצלחה למרחב המטופל');
      setShowAssignContent(false);
      setAssignForm({ selectedContentId: '', sendWhatsApp: true });
      loadClientContent();
    } catch (err: any) {
      showToast(err.message || 'שגיאה בשיוך תוכן', 'error');
    } finally {
      setIsSubmittingAssign(false);
    }
  };

  const handleQuickCreateAndAssignContent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickContentForm.title.trim()) {
      showToast('נא להזין כותרת', 'error');
      return;
    }
    setIsSubmittingQuickContent(true);
    try {
      const therapistId = client.therapistId || 'therapist-1';
      const createdItem = await api.createContentItem({
        therapistId,
        title: quickContentForm.title.trim(),
        description: quickContentForm.description.trim(),
        type: quickContentForm.type,
        url: quickContentForm.url.trim(),
        category: quickContentForm.category
      });
      await api.assignContentItem(createdItem.id, [client.id], quickContentForm.sendWhatsApp);
      showToast(
        quickContentForm.sendWhatsApp
          ? (quickContentForm.type === 'article' ? 'המאמר נוצר, שויך למטופל ונשלחה התראת WhatsApp! 📖' : 'התוכן נוצר, שויך למטופל ונשלחה התראת WhatsApp! 🎬')
          : 'הפריט נוצר ושויך בהצלחה'
      );
      setShowQuickCreateContent(false);
      setQuickContentForm({
        type: 'article',
        title: '',
        description: '',
        url: '',
        category: 'חומרי העשרה',
        sendWhatsApp: true
      });
      loadClientContent();
    } catch (err: any) {
      showToast(err.message || 'שגיאה ביצירה ושיוך', 'error');
    } finally {
      setIsSubmittingQuickContent(false);
    }
  };

  const handleRemoveContent = async (contentId: string) => {
    try {
      await api.removeContentAssignment(contentId, client.id);
      showToast('התוכן הוסר ממרחב המטופל');
      loadClientContent();
    } catch (err: any) {
      showToast(err.message || 'שגיאה בהסרת התוכן', 'error');
    }
  };

  const handleResendContentWhatsApp = async (contentId: string) => {
    setActionContentId(contentId);
    try {
      await api.retryContentNotification(contentId, client.id);
      showToast('הודעת WhatsApp נשלחה בהצלחה למטופל! 📲');
      loadClientContent();
    } catch (err: any) {
      showToast(err.message || 'שגיאה בשליחת התראה', 'error');
    } finally {
      setActionContentId(null);
    }
  };

  const loadClientForms = useCallback(async () => {
    if (!client?.id) return;
    setLoadingForms(true);
    try {
      const forms = await api.getClientForms(client.id);
      setClientForms(Array.isArray(forms) ? forms : []);
    } catch {
      setClientForms([]);
    } finally {
      setLoadingForms(false);
    }
  }, [client?.id]);

  const handleSendFormToClient = async (templateId?: string) => {
    const targetId = templateId || sendFormChoice;
    if (!targetId) {
      showToast('נא לבחור טופס לשליחה', 'error');
      return;
    }
    setIsSendingForm(targetId);
    try {
      const res = await api.sendFormToClient(targetId, client.id);
      showToast(res.message || 'הטופס נשלח לחתימה');
      setShowSendForm(false);
      setSendFormChoice('');
      loadClientForms();
    } catch (err: any) {
      showToast(err.message || 'שגיאה בשליחת הטופס', 'error');
    } finally {
      setIsSendingForm(null);
    }
  };

  const handleViewSignature = async (signatureId: string) => {
    setIsLoadingSignature(true);
    try {
      const data = await api.getFormSignature(signatureId);
      setViewingSignature(data);
    } catch (err: any) {
      showToast(err.message || 'שגיאה בטעינת הטופס החתום', 'error');
    } finally {
      setIsLoadingSignature(false);
    }
  };

  const handleOpenSendFormPicker = async () => {
    setShowSendForm(true);
    if (formTemplates.length === 0) {
      try {
        const templates = await api.getFormTemplates();
        setFormTemplates((Array.isArray(templates) ? templates : []).filter((t: any) => t.active !== false));
      } catch {
        // toast shown on send attempt if list stays empty
      }
    }
  };

  const handleTogglePortal = async () => {
    const next = !portalOn;
    setIsTogglingPortal(true);
    try {
      await api.updateClient(client.id, { portalEnabled: next });
      setPortalOn(next);
      showToast(next
        ? 'המרחב האישי (פורטל) הופעל עבור הלקוח'
        : 'המרחב האישי כובה — הלקוח כעת לקוח רגיל ללא פורטל');
    } catch (err: any) {
      showToast(err.message || 'שגיאה בעדכון הפורטל', 'error');
    } finally {
      setIsTogglingPortal(false);
    }
  };

  useEffect(() => {
    if (isOpen && client?.id) {
      setPortalOn(client.portalEnabled !== false);
      loadClientAppointments();
      loadClientContent();
      loadClientForms();
    }
  }, [isOpen, client?.id, loadClientAppointments, loadClientContent, loadClientForms]);

  if (!isOpen || !client) return null;

  const portalUrl = `${window.location.origin}/portal/${client.portalCode}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(portalUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleCreateAppointmentSubmit = async (e) => {
    e.preventDefault();
    if (!appointmentForm.date || !appointmentForm.time) {
      showToast('נא לבחור תאריך ושעה', 'error');
      return;
    }
    setIsSubmittingAppointment(true);
    try {
      const res = await api.createAppointment({
        clientId: client.id,
        therapistId: client.therapistId || 'therapist-1',
        ...appointmentForm
      });
      if (res.whatsAppSent) {
        showToast('התור נקבע בהצלחה ונשלחה הודעת אישור בוואטסאפ ללקוח! 📲');
      } else {
        showToast('התור נקבע בהצלחה ביומן');
      }
      setShowAddAppointment(false);
      loadClientAppointments();
    } catch (err) {
      showToast(err.message || 'שגיאה בקביעת תור', 'error');
    } finally {
      setIsSubmittingAppointment(false);
    }
  };

  const handleSendAptReminder = async (aptId) => {
    setActionAptId(aptId);
    try {
      await api.sendAppointmentReminder(aptId);
      showToast('תזכורת WhatsApp נשלחה בהצלחה למטופל! 🌿');
      loadClientAppointments();
    } catch (err) {
      showToast(err.message || 'שגיאה בשליחת תזכורת', 'error');
    } finally {
      setActionAptId(null);
    }
  };

  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="modal-card" style={{ maxWidth: '780px' }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '46px',
              height: '46px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #0d9488 0%, #059669 100%)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '1.2rem'
            }}>
              {client.firstName.charAt(0)}
            </div>
            <div>
              <h3>תיק מטופל: {client.firstName} {client.lastName}</h3>
              <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
                גיל: {client.age || 'לא צוין'} • מין: {client.gender} • טלפון: {client.phone}
              </p>
            </div>
          </div>
          <button className="btn-icon" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {/* Portal on/off toggle — the therapist decides who gets a personal portal */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap',
            background: portalOn ? '#f0fdfa' : '#f8fafc',
            border: portalOn ? '1px solid #99f6e4' : '1px solid #e2e8f0',
            borderRadius: '14px', padding: '12px 16px', marginBottom: '16px'
          }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontWeight: 700, fontSize: '0.95rem', color: portalOn ? '#0f766e' : '#64748b' }}>
              <input
                type="checkbox"
                checked={portalOn}
                onChange={handleTogglePortal}
                disabled={isTogglingPortal}
              />
              {portalOn
                ? 'ללקוח זה יש מרחב אישי (פורטל) פעיל'
                : 'לקוח רגיל — ללא מרחב אישי (הפורטל כבוי)'}
            </label>
            {isTogglingPortal && <Loader2 size={16} className="animate-spin" color="#0d9488" />}
          </div>

          {/* Client Personal Portal Banner */}
          {portalOn && (
          <div style={{
            background: 'linear-gradient(135deg, #f0fdfa 0%, #ecfdf5 100%)',
            border: '1px solid #99f6e4',
            borderRadius: '16px',
            padding: '20px',
            marginBottom: '24px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '12px' }}>
              <div>
                <h4 style={{ color: '#0f766e', fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  מרחב טיפולי אישי למטופל (פורטל ייחודי)
                </h4>
                <p style={{ fontSize: '0.85rem', color: '#115e59', marginTop: '2px' }}>
                  קישור פרטי דרכו הלקוח צופה במשימות ובתרגילים שהקצית לו, ומסמן התקדמות מהבית.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={handleSendWa}
                  disabled={isSendingWa}
                  className="btn btn-whatsapp"
                  style={{ fontSize: '0.85rem', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <WhatsAppIcon size={18} color="#ffffff" />
                  {isSendingWa ? 'שולח...' : 'שלח קישור ב-WhatsApp'}
                </button>

                <button
                  type="button"
                  onClick={() => onOpenPortal(client.portalCode)}
                  className="btn btn-primary"
                  style={{ fontSize: '0.85rem', padding: '8px 14px' }}
                >
                  <ExternalLink size={16} />
                  פתח כעת את הפורטל
                </button>
              </div>
            </div>

            {waNotice && (
              <div style={{
                background: '#dcfce7',
                color: '#15803d',
                padding: '8px 14px',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: 600,
                marginBottom: '10px'
              }}>
                {waNotice}
              </div>
            )}

            {/* Portal Link, Username & Password Info */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '12px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '240px' }}>
                  <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 600 }}>קישור ישיר:</span>
                  <code style={{ direction: 'ltr', color: '#0d9488', fontWeight: 600, fontSize: '0.88rem', wordBreak: 'break-all' }}>
                    {portalUrl}
                  </code>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    onClick={handleCopyLink}
                    className="btn btn-secondary"
                    style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                  >
                    {copied ? <Check size={14} color="#059669" /> : <Copy size={14} />}
                    {copied ? 'הועתק!' : 'העתק קישור'}
                  </button>
                  <a
                    href={portalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary"
                    style={{ padding: '4px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <ExternalLink size={13} /> צפה במרחב
                  </a>
                </div>
              </div>

              {/* Credentials Management & WhatsApp Action Panel */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
                paddingTop: '12px',
                borderTop: '1px solid #edf2f7'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.86rem', color: '#475569', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <User size={14} color="var(--primary, #0d9488)" /> <strong>שם משתמש:</strong>
                    <code style={{ color: '#0f172a', fontWeight: 700, padding: '2px 8px', background: '#e2e8f0', borderRadius: '6px' }}>
                      {currentClient.username || currentClient.phone}
                    </code>
                  </span>

                  <span style={{ fontSize: '0.86rem', color: '#475569', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Lock size={14} color="var(--primary, #0d9488)" /> <strong>סיסמה:</strong>
                    {currentClient.hasPassword === false ? (
                      <span style={{ color: '#b45309', background: '#fef3c7', padding: '2px 8px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 700 }}>
                        ממתין להגדרה ע״י הלקוח ⏳
                      </span>
                    ) : (
                      <code style={{ color: '#0f172a', fontWeight: 700, padding: '2px 8px', background: '#e2e8f0', borderRadius: '6px' }}>
                        {currentClient.initialPassword || 'מוגדרת ומאובטחת'}
                      </code>
                    )}
                  </span>
                </div>

                {/* Management Action Buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={handleResetPasswordWhatsApp}
                    disabled={isResettingPassword}
                    className="btn btn-whatsapp"
                    style={{ padding: '6px 12px', fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    title="חולל סיסמה חדשה ושלח אותה מיד ללקוח ב-WhatsApp"
                  >
                    <WhatsAppIcon size={14} color="#ffffff" />
                    <span>{isResettingPassword ? 'מאפס ושולח...' : 'אפס ושלח סיסמה ב-WhatsApp 📲'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleOpenEditModal}
                    className="btn btn-secondary"
                    style={{ padding: '6px 12px', fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                  >
                    <KeyRound size={14} />
                    <span>ניהול סיסמה ידנית</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
          )}

          {/* Clinical Notes */}
          {client.notes && (
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#475569', fontWeight: 600, fontSize: '0.88rem', marginBottom: '6px' }}>
                <FileText size={16} /> הערות טיפוליות (חסויות למטפל בלבד)
              </div>
              <p style={{ fontSize: '0.92rem', color: '#1e293b', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                {client.notes}
              </p>
            </div>
          )}

          {/* Tabs Switcher: Tasks vs Insights */}
          <div style={{ display: 'flex', gap: '10px', borderBottom: '2px solid #e2e8f0', marginBottom: '20px' }}>
            <button
              type="button"
              onClick={() => setModalTab('tasks')}
              style={{
                background: 'none',
                border: 'none',
                padding: '10px 16px',
                fontSize: '0.95rem',
                fontWeight: 700,
                cursor: 'pointer',
                color: modalTab === 'tasks' ? '#0d9488' : '#64748b',
                borderBottom: modalTab === 'tasks' ? '3px solid #0d9488' : '3px solid transparent',
                marginBottom: '-2px'
              }}
            >
              📋 משימות ותרגולים ({tasks.length})
            </button>

            <button
              type="button"
              onClick={() => setModalTab('insights')}
              style={{
                background: 'none',
                border: 'none',
                padding: '10px 16px',
                fontSize: '0.95rem',
                fontWeight: 700,
                cursor: 'pointer',
                color: modalTab === 'insights' ? '#0d9488' : '#64748b',
                borderBottom: modalTab === 'insights' ? '3px solid #0d9488' : '3px solid transparent',
                marginBottom: '-2px'
              }}
            >
              💡 יומן תובנות ומחשבות ({insights.length})
            </button>

            <button
              type="button"
              onClick={() => setModalTab('appointments')}
              style={{
                background: 'none',
                border: 'none',
                padding: '10px 16px',
                fontSize: '0.95rem',
                fontWeight: 700,
                cursor: 'pointer',
                color: modalTab === 'appointments' ? '#0d9488' : '#64748b',
                borderBottom: modalTab === 'appointments' ? '3px solid #0d9488' : '3px solid transparent',
                marginBottom: '-2px'
              }}
            >
              📅 יומן ותורים ({clientAppointments.length})
            </button>

            <button
              type="button"
              onClick={() => setModalTab('content')}
              style={{
                background: 'none',
                border: 'none',
                padding: '10px 16px',
                fontSize: '0.95rem',
                fontWeight: 700,
                cursor: 'pointer',
                color: modalTab === 'content' ? '#0d9488' : '#64748b',
                borderBottom: modalTab === 'content' ? '3px solid #0d9488' : '3px solid transparent',
                marginBottom: '-2px'
              }}
            >
              📚 מאמרים ותוכן ({clientContent.length})
            </button>

            <button
              type="button"
              onClick={() => setModalTab('forms')}
              style={{
                background: 'none',
                border: 'none',
                padding: '10px 16px',
                fontSize: '0.95rem',
                fontWeight: 700,
                cursor: 'pointer',
                color: modalTab === 'forms' ? '#0d9488' : '#64748b',
                borderBottom: modalTab === 'forms' ? '3px solid #0d9488' : '3px solid transparent',
                marginBottom: '-2px'
              }}
            >
              ✍️ טפסים וחתימות{clientForms.length > 0 ? ` (${clientForms.length})` : ''}
            </button>
          </div>

          {/* TAB 1: Tasks Section */}
          {modalTab === 'tasks' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div>
                  <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
                    משימות ותרגולים לבית ({tasks.length})
                  </h4>
                  <p style={{ fontSize: '0.82rem', color: '#64748b' }}>
                    משימות אלו מופיעות במרחב הלקוח. המטופל יכול לסמן ביצוע ולכתוב רפלקציה, אך אין לו הרשאה למחוק או לשנות משימות.
                  </p>
                </div>
                <button
                  onClick={() => setShowAddTask(!showAddTask)}
                  className="btn btn-primary"
                  style={{ fontSize: '0.85rem', padding: '7px 14px' }}
                >
                  <Plus size={16} /> הקצה משימה חדשה
                </button>
              </div>

              {/* Add Task Sub-form */}
              {showAddTask && (
                <form onSubmit={handleCreateTask} style={{
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: '12px',
                  padding: '18px',
                  marginBottom: '20px'
                }}>
                  <h5 style={{ fontWeight: 700, marginBottom: '12px', color: '#0f172a' }}>הוספת משימה ללקוח</h5>
                  <div className="form-group">
                    <label>כותרת המשימה / התרגיל *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="למשל: תרגול נשימות 4-7-8 פעמיים ביום"
                      required
                      value={taskForm.title}
                      onChange={e => setTaskForm({ ...taskForm, title: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>הנחיות והסבר מפורט למטופל</label>
                    <textarea
                      className="form-control"
                      placeholder="רשום כאן את הדגשים לתרגול, כיצד לבצע, ועל מה לשים לב..."
                      value={taskForm.description}
                      onChange={e => setTaskForm({ ...taskForm, description: e.target.value })}
                    />
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>קטגוריה</label>
                      <select
                        className="form-control"
                        value={taskForm.category}
                        onChange={e => setTaskForm({ ...taskForm, category: e.target.value })}
                      >
                        <option value="ויסות רגשי">ויסות רגשי</option>
                        <option value="יומן רגשות ומחשבות">יומן רגשות ומחשבות</option>
                        <option value="תרגול מיינדפולנס">תרגול מיינדפולנס</option>
                        <option value="חשיפה מבוקרת (CBT)">חשיפה מבוקרת (CBT)</option>
                        <option value="חיזוק דימוי עצמי">חיזוק דימוי עצמי</option>
                        <option value="פעילות גופנית ואיזון">פעילות גופנית ואיזון</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>תאריך יעד לביצוע</label>
                      <input
                        type="date"
                        className="form-control"
                        value={taskForm.dueDate}
                        onChange={e => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                    <button type="button" className="btn btn-secondary" onClick={() => setShowAddTask(false)}>
                      ביטול
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={isSubmittingTask}>
                      {isSubmittingTask ? 'שומר...' : 'שמור והעבר לפורטל הלקוח'}
                    </button>
                  </div>
                </form>
              )}

              {/* Tasks List */}
              {tasks.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '36px 20px',
                  background: '#f8fafc',
                  borderRadius: '12px',
                  border: '1px dashed #cbd5e1'
                }}>
                  <p style={{ color: '#64748b', fontSize: '0.95rem' }}>
                    עדיין לא הוקצו משימות ללקוח זה. לחץ על "הקצה משימה חדשה" כדי לשלוח תרגול למרחב האישי שלו.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {tasks.map(task => (
                    <div key={task.id} style={{
                      background: task.completed ? '#f0fdf4' : 'white',
                      border: `1px solid ${task.completed ? '#bbf7d0' : '#e2e8f0'}`,
                      borderRadius: '12px',
                      padding: '16px 20px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: '12px'
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                          <span className={`badge ${task.completed ? 'badge-success' : 'badge-warning'}`}>
                            {task.completed ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                            {task.completed ? 'הושלם ע"י הלקוח' : 'ממתין לביצוע'}
                          </span>
                          <span className="badge badge-neutral">{task.category}</span>
                          {task.dueDate && (
                            <span style={{ fontSize: '0.78rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Calendar size={12} /> יעד: {task.dueDate}
                            </span>
                          )}
                        </div>

                        <h5 style={{
                          fontSize: '1rem',
                          fontWeight: 700,
                          color: '#0f172a',
                          textDecoration: task.completed ? 'line-through' : 'none'
                        }}>
                          {task.title}
                        </h5>

                        {task.description && (
                          <p style={{ fontSize: '0.88rem', color: '#475569', marginTop: '6px', lineHeight: 1.5 }}>
                            {task.description}
                          </p>
                        )}

                        {/* Patient reflection sent from home */}
                        {task.clientNotes && (
                          <div style={{
                            marginTop: '10px',
                            background: 'rgba(255, 255, 255, 0.8)',
                            border: '1px solid #cbd5e1',
                            borderRadius: '8px',
                            padding: '8px 12px',
                            fontSize: '0.84rem'
                          }}>
                            <strong style={{ color: '#0f766e' }}>משוב מהמטופל מהבית: </strong>
                            <span>"{task.clientNotes}"</span>
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => setPendingDeleteTaskId(task.id)}
                        className="btn-icon"
                        title="מחק משימה"
                        style={{ color: '#ef4444' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Client Insights View for Therapist */}
          {modalTab === 'insights' && (
            <div>
              <div style={{ marginBottom: '16px' }}>
                <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
                  יומן תובנות ומחשבות שהמטופל תיעד בבית ({insights.length})
                </h4>
                <p style={{ fontSize: '0.82rem', color: '#64748b' }}>
                  רשומות אלו תועדו על ידי המטופל במרחב האישי שלו, מסודרות לפי תאריך ושעה כדי לעקוב אחר ההתקדמות לקראת המפגש.
                </p>
              </div>

              {insights.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '36px 20px',
                  background: '#f8fafc',
                  borderRadius: '12px',
                  border: '1px dashed #cbd5e1'
                }}>
                  <p style={{ color: '#64748b', fontSize: '0.92rem' }}>
                    המטופל טרם תיעד תובנות השבוע ביומן האישי שלו.
                  </p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="custom-table" style={{ background: 'white', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                    <thead>
                      <tr>
                        <th style={{ width: '140px' }}>תאריך ושעה</th>
                        <th style={{ width: '130px' }}>מצב רוח</th>
                        <th style={{ width: '180px' }}>כותרת</th>
                        <th>פירוט מה שעבר על המטופל</th>
                        <th style={{ width: '90px' }}>עוצמה</th>
                      </tr>
                    </thead>
                    <tbody>
                      {insights.map(item => (
                        <tr key={item.id}>
                          <td>
                            <div style={{ fontSize: '0.82rem' }}>
                              <strong style={{ display: 'block', color: '#0f172a' }}>
                                {item.recordedDate || new Date(item.createdAt).toLocaleDateString('he-IL')}
                              </strong>
                              <span style={{ color: '#64748b' }}>
                                {item.recordedTime || new Date(item.createdAt).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </td>
                          <td>
                            <span className="badge badge-info" style={{ fontSize: '0.78rem' }}>
                              {item.mood}
                            </span>
                          </td>
                          <td>
                            <strong style={{ fontSize: '0.9rem', color: '#0f172a' }}>{item.title}</strong>
                          </td>
                          <td>
                            <p style={{ fontSize: '0.88rem', color: '#334155', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                              {item.content}
                            </p>
                          </td>
                          <td>
                            <span style={{ fontWeight: 700, color: item.intensity > 7 ? '#ef4444' : '#0d9488', fontSize: '0.85rem' }}>
                              {item.intensity}/10
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Appointments Section */}
          {modalTab === 'appointments' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div>
                  <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
                    פגישות ותורים שנקבעו ({clientAppointments.length})
                  </h4>
                  <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                    מעקב אחר פגישות העבר והמועדים העתידיים של {client.firstName}
                  </span>
                </div>

                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setShowAddAppointment(!showAddAppointment)}
                >
                  <Plus size={16} />
                  <span>{showAddAppointment ? 'סגור טופס' : 'קבע תור חדש'}</span>
                </button>
              </div>

              {/* Quick Add Appointment Form */}
              {showAddAppointment && (
                <form
                  onSubmit={handleCreateAppointmentSubmit}
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '18px',
                    marginBottom: '20px'
                  }}
                >
                  <h5 style={{ margin: '0 0 14px 0', fontSize: '0.98rem', fontWeight: 700, color: 'var(--primary-hover, #0f766e)' }}>
                    קביעת תור חדש עבור {client.firstName} {client.lastName}
                  </h5>

                  <div className="form-row">
                    <div className="form-group" style={{ flex: 1 }}>
                      <label>תאריך פגישה *</label>
                      <input
                        type="date"
                        className="form-control"
                        value={appointmentForm.date}
                        onChange={e => setAppointmentForm({ ...appointmentForm, date: e.target.value })}
                        required
                      />
                    </div>
                    <div className="form-group" style={{ flex: 1 }}>
                      <label>שעת התחלה *</label>
                      <input
                        type="time"
                        className="form-control"
                        value={appointmentForm.time}
                        onChange={e => setAppointmentForm({ ...appointmentForm, time: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group" style={{ flex: 1 }}>
                      <label>משך פגישה</label>
                      <select
                        className="form-control"
                        value={appointmentForm.durationMinutes}
                        onChange={e => setAppointmentForm({ ...appointmentForm, durationMinutes: Number(e.target.value) })}
                      >
                        <option value={30}>30 דקות</option>
                        <option value={50}>50 דקות (סטנדרט)</option>
                        <option value={60}>60 דקות</option>
                      </select>
                    </div>
                    <div className="form-group" style={{ flex: 1 }}>
                      <label>סוג פגישה</label>
                      <select
                        className="form-control"
                        value={appointmentForm.type}
                        onChange={e => setAppointmentForm({ ...appointmentForm, type: e.target.value })}
                      >
                        <option value="in_person">פגישה פרונטלית בקליניקה</option>
                        <option value="zoom">פגישת וידאו (Zoom)</option>
                        <option value="phone">שיחה טלפונית</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>מיקום / קישור ל-Zoom</label>
                    <input
                      type="text"
                      className="form-control"
                      value={appointmentForm.location}
                      onChange={e => setAppointmentForm({ ...appointmentForm, location: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>הערות לפגישה</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="נושא הפגישה או הערות מקדימות..."
                      value={appointmentForm.notes}
                      onChange={e => setAppointmentForm({ ...appointmentForm, notes: e.target.value })}
                    />
                  </div>

                  <div style={{
                    background: 'rgba(37, 211, 102, 0.08)',
                    border: '1px solid rgba(37, 211, 102, 0.3)',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    marginBottom: '14px'
                  }}>
                    <input
                      type="checkbox"
                      id="modalSendWaCheck"
                      checked={appointmentForm.sendWhatsApp}
                      onChange={e => setAppointmentForm({ ...appointmentForm, sendWhatsApp: e.target.checked })}
                      style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                    />
                    <label
                      htmlFor="modalSendWaCheck"
                      style={{ margin: 0, cursor: 'pointer', fontSize: '0.84rem', fontWeight: 600, color: '#14532d', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <WhatsAppIcon size={14} />
                      <span>שלח הודעת אישור תור מותאמת אישית בוואטסאפ ללקוח מיד עם השמירה</span>
                    </label>
                  </div>

                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                    <button type="button" className="btn btn-secondary" onClick={() => setShowAddAppointment(false)}>
                      ביטול
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={isSubmittingAppointment}>
                      {isSubmittingAppointment ? 'שומר...' : 'שמור וקבע תור'}
                    </button>
                  </div>
                </form>
              )}

              {/* Appointments List */}
              {loadingAppointments ? (
                <div style={{ textAlign: 'center', padding: '36px', color: '#64748b' }}>
                  טוען פגישות...
                </div>
              ) : clientAppointments.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                  <CalendarCheck size={36} color="#94a3b8" style={{ margin: '0 auto 10px auto' }} />
                  <div style={{ fontWeight: 600, color: '#334155' }}>טרם נקבעו פגישות עבור {client.firstName}</div>
                  <div style={{ fontSize: '0.84rem', color: '#64748b', marginTop: '4px' }}>
                    לחץ על "קבע תור חדש" לקביעת פגישה ושליחת אישור WhatsApp.
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {clientAppointments.map(apt => (
                    <div
                      key={apt.id}
                      style={{
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '10px',
                        padding: '14px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                        flexWrap: 'wrap'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <strong style={{ fontSize: '0.98rem', color: '#0f172a' }}>
                            {apt.date} בשעה {apt.time}
                          </strong>
                          <span style={{ fontSize: '0.82rem', color: '#64748b' }}>({apt.durationMinutes || 50} דק')</span>
                          <span className={`badge badge-${apt.status === 'confirmed' ? 'success' : apt.status === 'pending' ? 'warning' : 'secondary'}`}>
                            {apt.status === 'confirmed' ? 'מאושר' : apt.status === 'pending' ? 'ממתין לאישור' : apt.status}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.84rem', color: '#475569', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span>{apt.typeName || (apt.type === 'zoom' ? 'Zoom' : 'קליניקה')}</span>
                          <span>•</span>
                          <span>{apt.location}</span>
                          {apt.notes && <span>• "{apt.notes}"</span>}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {apt.reminderSent ? (
                          <span style={{ fontSize: '0.78rem', color: '#16a34a', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                            <WhatsAppIcon size={13} /> תזכורת נמסרה
                          </span>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ padding: '6px 10px', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            onClick={() => handleSendAptReminder(apt.id)}
                            disabled={actionAptId === apt.id || apt.status !== 'confirmed'}
                            title="שלח תזכורת וואטסאפ ללקוח"
                          >
                            <WhatsAppIcon size={13} />
                            <span>{actionAptId === apt.id ? 'שולח...' : 'שלח תזכורת'}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: Content & Articles Section */}
          {modalTab === 'content' && (() => {
            const assignedArticles = clientContent.filter(item => item.type === 'article');
            const assignedMedia = clientContent.filter(item => item.type !== 'article');
            const filteredContent = contentSubFilter === 'articles'
              ? assignedArticles
              : contentSubFilter === 'media'
                ? assignedMedia
                : clientContent;

            const unassignedItems = allTherapistContent.filter(
              item => !(item.assignments || []).some((a: any) => a.clientId === client.id)
            );

            return (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
                  <div>
                    <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>מאמרים ותוכן טיפולי למטופל</span>
                      <span style={{ fontSize: '0.8rem', background: '#e2e8f0', color: '#475569', padding: '2px 8px', borderRadius: '12px', fontWeight: 700 }}>
                        {clientContent.length}
                      </span>
                    </h4>
                    <span style={{ fontSize: '0.84rem', color: '#64748b' }}>
                      תכנים ומאמרים המשויכים למרחב של {client.firstName}. מאמרים מופיעים בלשונית מאמרים ייעודית.
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                      onClick={() => {
                        setShowQuickCreateContent(!showQuickCreateContent);
                        setShowAssignContent(false);
                      }}
                    >
                      <Plus size={15} />
                      <span>{showQuickCreateContent ? 'סגור' : 'מאמר / תוכן חדש מהיר'}</span>
                    </button>

                    <button
                      type="button"
                      className="btn btn-primary"
                      style={{ fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                      onClick={() => {
                        setShowAssignContent(!showAssignContent);
                        setShowQuickCreateContent(false);
                      }}
                    >
                      <Library size={15} />
                      <span>{showAssignContent ? 'סגור' : 'שייך מהספרייה'}</span>
                    </button>
                  </div>
                </div>

                {/* Sub-tabs / Filter pills for assigned content */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                  <button
                    type="button"
                    onClick={() => setContentSubFilter('all')}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '8px',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      background: contentSubFilter === 'all' ? '#0d9488' : '#f1f5f9',
                      color: contentSubFilter === 'all' ? '#ffffff' : '#475569'
                    }}
                  >
                    הכל ({clientContent.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setContentSubFilter('articles')}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '8px',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      background: contentSubFilter === 'articles' ? '#0d9488' : '#f1f5f9',
                      color: contentSubFilter === 'articles' ? '#ffffff' : '#475569'
                    }}
                  >
                    📖 מאמרים ({assignedArticles.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setContentSubFilter('media')}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '8px',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      background: contentSubFilter === 'media' ? '#0d9488' : '#f1f5f9',
                      color: contentSubFilter === 'media' ? '#ffffff' : '#475569'
                    }}
                  >
                    🎬 מדיה וסרטונים ({assignedMedia.length})
                  </button>
                </div>

                {/* Subform: Assign existing item from therapist library */}
                {showAssignContent && (
                  <form onSubmit={handleAssignExistingContent} style={{
                    background: '#f8fafc',
                    border: '1px solid #cbd5e1',
                    borderRadius: '12px',
                    padding: '18px',
                    marginBottom: '20px'
                  }}>
                    <h5 style={{ margin: '0 0 12px 0', fontSize: '0.98rem', fontWeight: 700, color: '#0f172a' }}>
                      שיוך פריט קיים מספריית התוכן שלך אל {client.firstName}
                    </h5>

                    {unassignedItems.length === 0 ? (
                      <p style={{ fontSize: '0.88rem', color: '#64748b' }}>
                        כל פריטי התוכן והמאמרים מהספרייה שלך כבר משויכים למטופל זה! ניתן ליצור פריט חדש באמצעות הכפתור "מאמר / תוכן חדש מהיר".
                      </p>
                    ) : (
                      <>
                        <div className="form-group" style={{ marginBottom: '14px' }}>
                          <label>בחר/י מאמר או פריט תוכן מהספרייה *</label>
                          <select
                            className="form-control"
                            value={assignForm.selectedContentId}
                            onChange={e => setAssignForm({ ...assignForm, selectedContentId: e.target.value })}
                            required
                          >
                            <option value="">-- בחר פריט תוכן או מאמר --</option>
                            <optgroup label="📖 מאמרים וחומרי קריאה">
                              {unassignedItems.filter(i => i.type === 'article').map(i => (
                                <option key={i.id} value={i.id}>{i.title} ({i.category || 'כללי'})</option>
                              ))}
                            </optgroup>
                            <optgroup label="🎬 סרטונים ומדיה">
                              {unassignedItems.filter(i => i.type !== 'article').map(i => (
                                <option key={i.id} value={i.id}>{i.title} ({i.type === 'video' ? 'סרטון' : i.type === 'post' ? 'פוסט' : 'קישור'})</option>
                              ))}
                            </optgroup>
                          </select>
                        </div>

                        <div style={{ marginBottom: '16px' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.88rem', color: '#1e293b' }}>
                            <input
                              type="checkbox"
                              checked={assignForm.sendWhatsApp}
                              onChange={e => setAssignForm({ ...assignForm, sendWhatsApp: e.target.checked })}
                            />
                            <WhatsAppIcon size={16} />
                            <span>שלח הודעת WhatsApp מיידית למטופל עם קישור ישיר לפורטל (לפי תבנית SuperAdmin)</span>
                          </label>
                        </div>

                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button type="submit" disabled={isSubmittingAssign} className="btn btn-primary" style={{ fontSize: '0.85rem' }}>
                            {isSubmittingAssign ? 'משייך...' : 'שייך תוכן למטופל ✨'}
                          </button>
                          <button type="button" onClick={() => setShowAssignContent(false)} className="btn btn-secondary" style={{ fontSize: '0.85rem' }}>
                            ביטול
                          </button>
                        </div>
                      </>
                    )}
                  </form>
                )}

                {/* Subform: Quick create article or media */}
                {showQuickCreateContent && (
                  <form onSubmit={handleQuickCreateAndAssignContent} style={{
                    background: '#f0fdfa',
                    border: '1px solid #99f6e4',
                    borderRadius: '12px',
                    padding: '18px',
                    marginBottom: '20px'
                  }}>
                    <h5 style={{ margin: '0 0 12px 0', fontSize: '0.98rem', fontWeight: 700, color: '#0f766e' }}>
                      יצירה מהירה של מאמר או תוכן חדש ושיוך מיידי
                    </h5>

                    {/* Content Type Selector */}
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
                      <button
                        type="button"
                        onClick={() => setQuickContentForm({ ...quickContentForm, type: 'article' })}
                        style={{
                          flex: 1,
                          padding: '8px',
                          borderRadius: '8px',
                          border: quickContentForm.type === 'article' ? '2px solid #0d9488' : '1px solid #cbd5e1',
                          background: quickContentForm.type === 'article' ? '#ffffff' : '#f8fafc',
                          color: quickContentForm.type === 'article' ? '#0d9488' : '#64748b',
                          fontWeight: 700,
                          fontSize: '0.85rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px'
                        }}
                      >
                        <BookOpen size={16} />
                        <span>מאמר והדרכה 📖</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setQuickContentForm({ ...quickContentForm, type: 'video' })}
                        style={{
                          flex: 1,
                          padding: '8px',
                          borderRadius: '8px',
                          border: quickContentForm.type === 'video' ? '2px solid #7c3aed' : '1px solid #cbd5e1',
                          background: quickContentForm.type === 'video' ? '#ffffff' : '#f8fafc',
                          color: quickContentForm.type === 'video' ? '#7c3aed' : '#64748b',
                          fontWeight: 700,
                          fontSize: '0.85rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px'
                        }}
                      >
                        <Video size={16} />
                        <span>סרטון מהרשת 🎬</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setQuickContentForm({ ...quickContentForm, type: 'post' })}
                        style={{
                          flex: 1,
                          padding: '8px',
                          borderRadius: '8px',
                          border: quickContentForm.type === 'post' ? '2px solid #2563eb' : '1px solid #cbd5e1',
                          background: quickContentForm.type === 'post' ? '#ffffff' : '#f8fafc',
                          color: quickContentForm.type === 'post' ? '#2563eb' : '#64748b',
                          fontWeight: 700,
                          fontSize: '0.85rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px'
                        }}
                      >
                        <Share2 size={16} />
                        <span>פוסט / רשתות 📱</span>
                      </button>
                    </div>

                    <div className="form-group" style={{ marginBottom: '12px' }}>
                      <label>כותרת הפריט *</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder={quickContentForm.type === 'article' ? 'למשל: תרגול מיינדפולנס לוויסות חרדה' : 'למשל: סרטון הדרכה לנשימה עמוקה'}
                        value={quickContentForm.title}
                        onChange={e => setQuickContentForm({ ...quickContentForm, title: e.target.value })}
                        required
                      />
                    </div>

                    {quickContentForm.type !== 'article' && (
                      <div className="form-group" style={{ marginBottom: '12px' }}>
                        <label>כתובת קישור (URL) *</label>
                        <input
                          type="url"
                          className="form-control"
                          placeholder="https://... קישור ליוטיוב, פייסבוק, טיקטוק וכד'"
                          value={quickContentForm.url}
                          onChange={e => setQuickContentForm({ ...quickContentForm, url: e.target.value })}
                          required
                        />
                      </div>
                    )}

                    {quickContentForm.type === 'article' && (
                      <div className="form-group" style={{ marginBottom: '12px' }}>
                        <label>קישור למאמר מקורי באינטרנט (אופציונלי)</label>
                        <input
                          type="url"
                          className="form-control"
                          placeholder="https://... אם המאמר פורסם באתר חיצוני"
                          value={quickContentForm.url}
                          onChange={e => setQuickContentForm({ ...quickContentForm, url: e.target.value })}
                        />
                      </div>
                    )}

                    <div className="form-group" style={{ marginBottom: '12px' }}>
                      <label>
                        {quickContentForm.type === 'article' ? 'תוכן המאמר / דף הדרכה טיפולי לקריאה *' : 'תיאור או הנחיות לצפייה'}
                      </label>
                      <textarea
                        rows={quickContentForm.type === 'article' ? 6 : 3}
                        className="form-control"
                        placeholder={quickContentForm.type === 'article' ? 'כתוב/י כאן את גוף המאמר המלא. המטופל יוכל לקרוא אותו בנוחות במרחב האישי שלו...' : 'דגשים שחשוב שהמטופל ישים לב אליהם במהלך הצפייה...'}
                        value={quickContentForm.description}
                        onChange={e => setQuickContentForm({ ...quickContentForm, description: e.target.value })}
                        required={quickContentForm.type === 'article'}
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: '14px' }}>
                      <label>קטגוריה</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="חומרי העשרה / ויסות רגשי / CBT"
                        value={quickContentForm.category}
                        onChange={e => setQuickContentForm({ ...quickContentForm, category: e.target.value })}
                      />
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.88rem', color: '#1e293b' }}>
                        <input
                          type="checkbox"
                          checked={quickContentForm.sendWhatsApp}
                          onChange={e => setQuickContentForm({ ...quickContentForm, sendWhatsApp: e.target.checked })}
                        />
                        <WhatsAppIcon size={16} />
                        <span>שלח הודעת WhatsApp מיידית למטופל (עם קישור ישיר ללשונית {quickContentForm.type === 'article' ? 'המאמרים' : 'המדיה'})</span>
                      </label>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button type="submit" disabled={isSubmittingQuickContent} className="btn btn-primary" style={{ fontSize: '0.85rem' }}>
                        {isSubmittingQuickContent ? 'יוצר ומשייך...' : (quickContentForm.type === 'article' ? 'צור מאמר ושייך למטופל 📖' : 'צור תוכן ושייך למטופל 🎬')}
                      </button>
                      <button type="button" onClick={() => setShowQuickCreateContent(false)} className="btn btn-secondary" style={{ fontSize: '0.85rem' }}>
                        ביטול
                      </button>
                    </div>
                  </form>
                )}

                {/* Assigned Content List */}
                {loadingContent ? (
                  <div style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                    טוען מאמרים ותוכן...
                  </div>
                ) : filteredContent.length === 0 ? (
                  <div style={{
                    background: '#f8fafc',
                    border: '1px dashed #cbd5e1',
                    borderRadius: '12px',
                    padding: '30px 20px',
                    textAlign: 'center',
                    color: '#64748b'
                  }}>
                    <Library size={32} style={{ margin: '0 auto 10px', color: '#94a3b8' }} />
                    <h5 style={{ margin: '0 0 6px 0', fontSize: '1rem', color: '#1e293b', fontWeight: 700 }}>
                      {contentSubFilter === 'articles' ? 'לא שויכו מאמרים למטופל זה' :
                        contentSubFilter === 'media' ? 'לא שויכו סרטונים או פוסטים למטופל זה' :
                          'טרם שויכו מאמרים או תוכן למטופל זה'}
                    </h5>
                    <p style={{ margin: 0, fontSize: '0.85rem' }}>
                      באפשרותך לבחור פריט מהספרייה או ליצור מאמר חדש שיגיע ישירות למרחב של {client.firstName}.
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {filteredContent.map((item: any) => {
                      const isArticle = item.type === 'article';
                      const waStatus = item.assignment?.notificationStatus;

                      return (
                        <div
                          key={item.id}
                          style={{
                            background: '#ffffff',
                            border: isArticle ? '1px solid #99f6e4' : '1px solid #e2e8f0',
                            borderRight: isArticle ? '4px solid #0d9488' : '4px solid #7c3aed',
                            borderRadius: '10px',
                            padding: '14px 16px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: '12px',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                          }}
                        >
                          <div style={{ flex: 1, minWidth: '240px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                              <span style={{
                                background: isArticle ? '#ccfbf1' : '#ede9fe',
                                color: isArticle ? '#0f766e' : '#6d28d9',
                                fontSize: '0.74rem',
                                fontWeight: 700,
                                padding: '2px 8px',
                                borderRadius: '6px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}>
                                {isArticle ? <BookOpen size={12} /> : <Video size={12} />}
                                <span>{isArticle ? 'מאמר טיפולי' : item.type === 'video' ? 'סרטון' : item.type === 'post' ? 'פוסט' : 'מדיה'}</span>
                              </span>
                              <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                                {item.category || 'כללי'}
                              </span>
                              {item.assignment?.createdAt && (
                                <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                                  • הוקצה ב-{new Date(item.assignment.createdAt).toLocaleDateString('he-IL')}
                                </span>
                              )}
                            </div>

                            <h5 style={{ margin: '0 0 4px 0', fontSize: '0.96rem', fontWeight: 700, color: '#0f172a' }}>
                              {item.title}
                            </h5>

                            {item.description && (
                              <p style={{ margin: 0, fontSize: '0.84rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '480px' }}>
                                {item.description}
                              </p>
                            )}
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {/* WhatsApp Notification Badge */}
                            {waStatus === 'sent' ? (
                              <span style={{ fontSize: '0.76rem', color: '#16a34a', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600, background: '#f0fdf4', padding: '4px 8px', borderRadius: '6px' }}>
                                <WhatsAppIcon size={12} /> התראה נמסרה
                              </span>
                            ) : waStatus === 'pending' ? (
                              <span style={{ fontSize: '0.76rem', color: '#d97706', background: '#fef3c7', padding: '4px 8px', borderRadius: '6px', fontWeight: 600 }}>
                                בהמתנה
                              </span>
                            ) : (
                              <button
                                type="button"
                                className="btn btn-secondary"
                                style={{ padding: '5px 10px', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                onClick={() => handleResendContentWhatsApp(item.id)}
                                disabled={actionContentId === item.id}
                                title="שלח התראת WhatsApp למטופל עם קישור ישיר"
                              >
                                <WhatsAppIcon size={13} />
                                <span>{actionContentId === item.id ? 'שולח...' : 'שלח בוואטסאפ'}</span>
                              </button>
                            )}

                            {/* External URL if exists */}
                            {item.url && (
                              <a
                                href={item.url}
                                target="_blank"
                                rel="noreferrer"
                                className="btn btn-secondary"
                                style={{ padding: '5px 10px', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                title="פתח קישור חיצוני"
                              >
                                <ExternalLink size={13} />
                                <span>צפה</span>
                              </a>
                            )}

                            {/* Unassign Button */}
                            <button
                              type="button"
                              onClick={() => handleRemoveContent(item.id)}
                              className="btn-icon"
                              style={{ color: '#ef4444', padding: '6px' }}
                              title="הסר שיוך ממרחב המטופל"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}

          {/* TAB 5: Digital Forms & Signatures */}
          {modalTab === 'forms' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>טפסים וחתימות דיגיטליות</span>
                    {clientForms.length > 0 && (
                      <span style={{ fontSize: '0.8rem', background: '#e2e8f0', color: '#475569', padding: '2px 8px', borderRadius: '12px', fontWeight: 700 }}>
                        {clientForms.length}
                      </span>
                    )}
                  </h4>
                  <span style={{ fontSize: '0.84rem', color: '#64748b' }}>
                    שלח טופס הסכמה, חוזה או הצהרה לחתימה מהנייד של {client.firstName}. החתימה נשמרת אצלך וניתן להוריד אותה כ-PDF.
                  </span>
                </div>

                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  onClick={handleOpenSendFormPicker}
                >
                  <span>✍️</span>
                  <span>שלח טופס לחתימה</span>
                </button>
              </div>

              {/* Send form picker */}
              {showSendForm && (
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px', marginBottom: '16px' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '10px' }}>בחר טופס לשליחה ל{client.firstName}:</div>
                  {formTemplates.length === 0 ? (
                    <div style={{ fontSize: '0.85rem', color: '#64748b', padding: '8px 0' }}>
                      לא נמצאו טפסים פעילים. ניתן ליצור טפסים בתפריט הצד «טפסים דיגיטליים וחתימות».
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {formTemplates.map((t: any) => (
                        <div
                          key={t.id}
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px',
                            border: sendFormChoice === t.id ? '2px solid #0d9488' : '1px solid #e2e8f0',
                            background: sendFormChoice === t.id ? '#f0fdfa' : '#fff',
                            borderRadius: '10px', padding: '10px 12px', textAlign: 'right'
                          }}
                        >
                          <div style={{ flex: 1 }}>
                            <span style={{ display: 'block', fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>
                              {t.name}
                            </span>
                            <span style={{ fontSize: '0.78rem', color: '#64748b' }}>{t.title} · נשלח {t.sentCount || 0} · חתום {t.signedCount || 0}</span>
                          </div>
                          <button
                            type="button"
                            className="btn btn-primary"
                            disabled={Boolean(isSendingForm)}
                            onClick={() => handleSendFormToClient(t.id)}
                            style={{ fontSize: '0.8rem', padding: '6px 14px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                          >
                            {isSendingForm === t.id ? 'שולח...' : 'שלח בוואטסאפ 📲'}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <button type="button" className="btn btn-secondary" style={{ marginTop: '10px', fontSize: '0.82rem' }} onClick={() => setShowSendForm(false)}>
                    סגור
                  </button>
                </div>
              )}

              {/* Forms status list */}
              {loadingForms ? (
                <div style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>טוען טפסים...</div>
              ) : clientForms.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '34px 20px', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '8px' }}>✍️</div>
                  <div style={{ fontWeight: 700, color: '#0f172a' }}>לא נשלחו עדיין טפסים ל{client.firstName}</div>
                  <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '4px' }}>
                    שלח טופס הסכמה מדעת או חוזה טיפולי לפני הפגישה הראשונה — החתימה מהנייד נמשכת פחות מדקה.
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {clientForms.map((f: any) => {
                    const isSigned = f.status === 'signed';
                    return (
                      <div key={f.id} style={{
                        display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap',
                        border: `1px solid ${isSigned ? '#bbf7d0' : '#fde68a'}`,
                        background: isSigned ? '#f0fdf4' : '#fffbeb',
                        borderRadius: '12px', padding: '12px 14px'
                      }}>
                        <div style={{
                          width: '38px', height: '38px', borderRadius: '10px', flexShrink: 0,
                          background: isSigned ? '#dcfce7' : '#fef3c7', color: isSigned ? '#15803d' : '#b45309',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem'
                        }}>
                          {isSigned ? '✅' : '⏳'}
                        </div>
                        <div style={{ flex: 1, minWidth: '180px' }}>
                          <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a' }}>{f.formTitle || f.formName}</div>
                          <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>
                            {isSigned
                              ? `נחתם ע"י ${f.signedName || 'המטופל/ת'} · ${f.signedAt ? new Date(f.signedAt).toLocaleString('he-IL') : ''}`
                              : `נשלח ${f.sentAt ? new Date(f.sentAt).toLocaleString('he-IL') : ''}${f.notificationStatus === 'failed' ? ' · שליחת הוואטסאפ נכשלה — נסה שוב' : ''}`}
                          </div>
                        </div>
                        {isSigned ? (
                          <button
                            type="button" className="btn btn-secondary"
                            style={{ fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                            onClick={() => handleViewSignature(f.id)}
                          >
                            {isLoadingSignature ? 'טוען...' : 'צפה בטופס החתום'}
                          </button>
                        ) : (
                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            <button
                              type="button"
                              className="btn btn-secondary"
                              style={{ fontSize: '0.78rem', padding: '5px 9px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                              onClick={() => {
                                const directLink = f.portalUrl || `${window.location.origin}/portal/${client.portalCode}?tab=forms&form=${f.id}`;
                                navigator.clipboard.writeText(directLink);
                                showToast('הקישור הישיר לטופס הועתק ללוח 📋');
                              }}
                              title="העתק קישור ישיר לטופס"
                            >
                              <span>📋 קישור</span>
                            </button>
                            <button
                              type="button"
                              className="btn btn-primary"
                              disabled={Boolean(isSendingForm)}
                              style={{ fontSize: '0.78rem', padding: '5px 10px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                              onClick={() => handleSendFormToClient(f.formTemplateId)}
                            >
                              <span>{isSendingForm === f.formTemplateId ? 'שולח...' : 'שלח שוב 📲'}</span>
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            סגור
          </button>
        </div>
      </div>

      {/* Confirm Task Deletion Modal */}
      <ConfirmModal
        isOpen={Boolean(pendingDeleteTaskId)}
        onClose={() => setPendingDeleteTaskId(null)}
        onConfirm={() => {
          onDeleteTask(pendingDeleteTaskId);
          setPendingDeleteTaskId(null);
          showToast('המשימה נמחקה ממרחב המטופל');
        }}
        title="מחיקת משימה"
        message="האם אתה בטוח שברצונך למחוק משימה זו ממרחב המטופל? לא ניתן יהיה לשחזר אותה."
        confirmText="כן, מחק משימה"
        cancelText="ביטול"
        isDanger={true}
      />

      {/* Signed Form Viewer Modal */}
      {viewingSignature && (
        <div
          className="modal-overlay"
          onClick={e => { if (e.target === e.currentTarget) setViewingSignature(null); }}
        >
          <div className="modal-card" style={{ maxWidth: '680px', width: '94vw', maxHeight: '88vh', overflowY: 'auto', padding: '22px' }} role="dialog" aria-modal="true" aria-label="טופס חתום">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                📄 {viewingSignature.template?.title || viewingSignature.formName || 'טופס חתום'}
              </h3>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button" className="btn btn-primary"
                  style={{ fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                  onClick={() => window.open(`/forms/print/${viewingSignature.id}`, '_blank')}
                >
                  🖨️ הורדה כ-PDF / הדפסה
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setViewingSignature(null)}>סגור</button>
              </div>
            </div>

            <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '12px', display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
              <span>👤 {viewingSignature.clientName || `${viewingSignature.client?.firstName || ''} ${viewingSignature.client?.lastName || ''}`}</span>
              <span>✍️ נחתם: {viewingSignature.signedAt ? new Date(viewingSignature.signedAt).toLocaleString('he-IL') : '-'}</span>
              {viewingSignature.therapistName && <span>🎓 מטפל/ת: {viewingSignature.therapistName}</span>}
            </div>

            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '14px', fontSize: '0.92rem', lineHeight: 1.8, color: '#1e293b' }}>
              {String(viewingSignature.template?.introText || '').trim() && (
                <p style={{ whiteSpace: 'pre-wrap', margin: '0 0 12px' }}>{viewingSignature.template.introText}</p>
              )}
              {(viewingSignature.template?.sections || []).map((s: any, i: number) => (
                <div key={i} style={{ marginBottom: '10px' }}>
                  {s.heading && <div style={{ fontWeight: 800 }}>{i + 1}. {s.heading}</div>}
                  {s.body && <p style={{ whiteSpace: 'pre-wrap', margin: 0, fontSize: '0.88rem', color: '#334155' }}>{s.body}</p>}
                </div>
              ))}

              {Object.keys(viewingSignature.answers || {}).length > 0 && (
                <div style={{ margin: '12px 0', padding: '10px', background: '#f8fafc', borderRadius: '8px' }}>
                  {Object.entries(viewingSignature.answers).map(([label, value]: any) => (
                    <div key={label} style={{ display: 'flex', gap: '8px', fontSize: '0.85rem', marginBottom: '4px' }}>
                      <span>{value === true ? '☑' : '☐'}</span>
                      <span><strong>{label}</strong>{typeof value === 'string' && value ? `: ${value}` : ''}</span>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '14px', flexWrap: 'wrap', marginTop: '18px', borderTop: '1px solid #e2e8f0', paddingTop: '14px' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>שם מלא (אימות):</div>
                  <div style={{ fontWeight: 700, borderBottom: '1px solid #94a3b8', minWidth: '170px', paddingBottom: '2px' }}>
                    {viewingSignature.signedName}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '4px' }}>חתימה דיגיטלית:</div>
                  {viewingSignature.signatureData ? (
                    <img
                      src={viewingSignature.signatureData}
                      alt="חתימה דיגיטלית"
                      style={{ maxHeight: '110px', background: '#fafafa', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '4px 10px', direction: 'ltr' }}
                    />
                  ) : (
                    <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>לא נדרשה חתימה</span>
                  )}
                </div>
              </div>

              {String(viewingSignature.template?.footerText || '').trim() && (
                <p style={{ whiteSpace: 'pre-wrap', marginTop: '12px', fontSize: '0.78rem', color: '#64748b' }}>
                  {viewingSignature.template.footerText}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Manual Edit Credentials Modal */}
      {showManualEditModal && (
        <div className="modal-overlay" style={{ zIndex: 1100 }} onClick={() => setShowManualEditModal(false)}>
          <div className="modal-card" style={{ maxWidth: '440px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <KeyRound size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem' }}>ניהול פרטי גישה למרחב</h3>
                  <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                    {currentClient.firstName} {currentClient.lastName}
                  </p>
                </div>
              </div>
              <button className="btn-icon" type="button" onClick={() => setShowManualEditModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveManualCredentials}>
              <div className="modal-body" style={{ padding: '20px' }}>
                <div className="form-group" style={{ marginBottom: '14px' }}>
                  <label style={{ fontSize: '0.88rem', fontWeight: 700, color: '#334155', marginBottom: '6px', display: 'block' }}>
                    שם משתמש
                  </label>
                  <input
                    type="text"
                    dir="ltr"
                    required
                    className="form-control"
                    placeholder="שם משתמש"
                    style={{ textAlign: 'right' }}
                    value={editUsername}
                    onChange={e => setEditUsername(e.target.value)}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{ margin: 0, fontSize: '0.88rem', fontWeight: 700, color: '#334155' }}>סיסמה חדשה</label>
                    <button
                      type="button"
                      onClick={() => {
                        const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
                        let pass = '';
                        for (let i = 0; i < 8; i++) pass += chars.charAt(Math.floor(Math.random() * chars.length));
                        setEditPassword(pass);
                      }}
                      style={{ background: 'none', border: 'none', color: '#0d9488', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}
                    >
                      <Sparkles size={12} /> חולל סיסמה 🎲
                    </button>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showEditPassword ? 'text' : 'password'}
                      dir="ltr"
                      required
                      className="form-control"
                      placeholder="הזן סיסמה חדשה (לפחות 4 תווים)"
                      style={{ textAlign: 'right', paddingLeft: '40px' }}
                      value={editPassword}
                      onChange={e => setEditPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowEditPassword(!showEditPassword)}
                      style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                    >
                      {showEditPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.88rem', color: '#166534', background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '10px 12px', borderRadius: '10px' }}>
                  <input
                    type="checkbox"
                    checked={sendWaOnSave}
                    onChange={e => setSendWaOnSave(e.target.checked)}
                    style={{ width: '16px', height: '16px', accentColor: '#16a34a', cursor: 'pointer' }}
                  />
                  <WhatsAppIcon size={16} color="#16a34a" />
                  <span>שלח מיד את הסיסמה והפרטים ב-WhatsApp ללקוח 📲</span>
                </label>
              </div>

              <div className="modal-footer" style={{ padding: '12px 20px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowManualEditModal(false)} disabled={isSavingManualCredentials}>
                  ביטול
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSavingManualCredentials}>
                  {isSavingManualCredentials ? 'שומר ומעדכן...' : 'שמור ועדכן פרטי גישה ✨'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom UI Toast */}
      <Toast
        message={modalToast?.message}
        type={modalToast?.type}
        onClose={() => setModalToast(null)}
      />
    </div>
  );
}
