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
  AlertCircle
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
      await onSendWhatsApp(client.id);
      showToast('הודעת וואטסאפ עם קישור וקוד גישה נשלחה בהצלחה! 📲');
      setWaNotice('הודעת וואטסאפ נשלחה בהצלחה למכשיר המטופל!');
      setTimeout(() => setWaNotice(''), 4000);
    } catch (err) {
      showToast('שגיאה בשליחת וואטסאפ: ' + err.message, 'error');
    } finally {
      setIsSendingWa(false);
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

  useEffect(() => {
    if (isOpen && client?.id) {
      loadClientAppointments();
    }
  }, [isOpen, client?.id, loadClientAppointments]);

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
    <div className="modal-overlay" onClick={onClose}>
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
          {/* Client Personal Portal Banner */}
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

            {/* Portal Link & PIN Info */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              background: 'white',
              border: '1px solid #ccfbf1',
              borderRadius: '10px',
              padding: '8px 14px',
              gap: '12px',
              flexWrap: 'wrap'
            }}>
              <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 600 }}>קישור ישיר:</span>
              <code style={{ direction: 'ltr', color: '#0d9488', fontWeight: 600, fontSize: '0.88rem', flex: 1 }}>
                {portalUrl}
              </code>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="badge badge-info" style={{ fontSize: '0.78rem' }}>
                  <KeyRound size={12} /> קוד PIN: {client.pin}
                </span>
                <button 
                  onClick={handleCopyLink} 
                  className="btn btn-secondary"
                  style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                >
                  {copied ? <Check size={14} color="#059669" /> : <Copy size={14} />}
                  {copied ? 'הועתק!' : 'העתק'}
                </button>
              </div>
            </div>
          </div>

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

      {/* Custom UI Toast */}
      <Toast 
        message={modalToast?.message} 
        type={modalToast?.type} 
        onClose={() => setModalToast(null)} 
      />
    </div>
  );
}
