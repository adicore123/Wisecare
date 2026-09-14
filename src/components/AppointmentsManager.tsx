"use client";

import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  Plus, 
  Search, 
  Filter, 
  CheckCircle2, 
  AlertCircle, 
  XCircle, 
  Video, 
  MapPin, 
  Phone, 
  Send, 
  RefreshCw, 
  User, 
  Sparkles, 
  CalendarCheck, 
  CalendarClock, 
  Check, 
  X, 
  Edit3, 
  Trash2, 
  ExternalLink, 
  MessageCircle, 
  ChevronRight, 
  ChevronLeft 
} from 'lucide-react';
import { api } from '@/lib/api';
import WhatsAppIcon from './WhatsAppIcon';
import Toast from './Toast';
import ConfirmModal from './ConfirmModal';

const HEBREW_DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

function getHebrewDateDisplay(dateStr: string) {
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

export default function AppointmentsPage({ clients: initialClients = [], currentUser: initialUser, clinicSettings }: any) {
  const [clients, setClients] = useState<any[]>(initialClients);
  const [currentUser, setCurrentUser] = useState<any>(initialUser);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [toast, setToast] = useState<any>(null);
  const [confirmDelete, setConfirmDelete] = useState<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (!currentUser) {
        const u = localStorage.getItem('wisecare_user');
        if (u) {
          try { setCurrentUser(JSON.parse(u)); } catch {}
        }
      }
      if (clients.length === 0) {
        api.getClients().then((data: any) => {
          if (Array.isArray(data)) setClients(data);
        }).catch(() => {});
      }
    }
  }, [currentUser, clients.length]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState(null);
  const [formData, setFormData] = useState({
    clientId: '',
    date: new Date().toISOString().split('T')[0],
    time: '10:00',
    durationMinutes: 50,
    type: 'in_person',
    location: clinicSettings?.clinicName || 'רחוב רוטשילד 45, תל אביב',
    notes: '',
    status: 'confirmed',
    sendWhatsApp: true
  });

  const [submitting, setSubmitting] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4500);
  };

  const loadAppointments = async () => {
    setLoading(true);
    try {
      const data = await api.getAppointments({
        therapistId: currentUser?.id || 'therapist-1'
      });
      setAppointments(data || []);
    } catch (err) {
      console.error('Failed to load appointments:', err);
      showToast('שגיאה בטעינת יומן התורים', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAppointments();
  }, [currentUser]);

  const handleOpenNewModal = (clientDefaultId = null) => {
    setEditingAppointment(null);
    setFormData({
      clientId: clientDefaultId || (clients[0]?.id || ''),
      date: new Date().toISOString().split('T')[0],
      time: '10:00',
      durationMinutes: 50,
      type: 'in_person',
      location: clinicSettings?.clinicName || 'רחוב רוטשילד 45, תל אביב',
      notes: '',
      status: 'confirmed',
      sendWhatsApp: true
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (apt) => {
    setEditingAppointment(apt);
    setFormData({
      clientId: apt.clientId,
      date: apt.date,
      time: apt.time,
      durationMinutes: apt.durationMinutes || 50,
      type: apt.type || 'in_person',
      location: apt.location || '',
      notes: apt.notes || '',
      status: apt.status || 'confirmed',
      sendWhatsApp: false
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.clientId) {
      showToast('נא לבחור לקוח לפגישה', 'error');
      return;
    }
    if (!formData.date || !formData.time) {
      showToast('נא לבחור תאריך ושעה לפגישה', 'error');
      return;
    }

    setSubmitting(true);
    try {
      if (editingAppointment) {
        await api.updateAppointment(editingAppointment.id, {
          ...formData,
          sendWhatsAppNotification: formData.sendWhatsApp
        });
        showToast('פרטי הפגישה עודכנו בהצלחה');
      } else {
        const res = await api.createAppointment({
          ...formData,
          therapistId: currentUser?.id || 'therapist-1'
        });
        if (res.whatsAppSent) {
          showToast('התור נקבע בהצלחה ונשלחה הודעת אישור בוואטסאפ ללקוח! 🌿');
        } else if (res.whatsAppError) {
          showToast(`התור נקבע, אך חלה שגיאה בשליחת הוואטסאפ: ${res.whatsAppError}`, 'warning');
        } else {
          showToast('התור נקבע בהצלחה ביומן');
        }
      }
      setIsModalOpen(false);
      loadAppointments();
    } catch (err) {
      showToast(err.message || 'שגיאה בשמירת התור', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Quick Approve Client Request
  const handleApproveRequest = async (apt) => {
    setActionLoadingId(apt.id);
    try {
      const res = await api.updateAppointment(apt.id, {
        status: 'confirmed',
        sendWhatsAppNotification: true
      });
      if (res.whatsAppSent) {
        showToast(`התור של ${apt.clientName} אושר ונשלח אליו אישור רשמי בוואטסאפ! ✨`);
      } else {
        showToast(`התור של ${apt.clientName} אושר ביומן!`);
      }
      loadAppointments();
    } catch (err) {
      showToast(err.message || 'שגיאה באישור התור', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Quick Cancel
  const handleCancelAppointment = async (apt) => {
    setActionLoadingId(apt.id);
    try {
      await api.updateAppointment(apt.id, { status: 'cancelled' });
      showToast('התור בוטל');
      loadAppointments();
    } catch (err) {
      showToast(err.message || 'שגיאה בביטול התור', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Send WhatsApp Reminder
  const handleSendReminder = async (apt) => {
    setActionLoadingId(apt.id);
    try {
      await api.sendAppointmentReminder(apt.id);
      showToast(`תזכורת WhatsApp נשלחה בהצלחה ל-${apt.clientName}! 🌿`);
      loadAppointments();
    } catch (err) {
      showToast(err.message || 'שגיאה בשליחת תזכורת', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Delete
  const handleDeleteAppointment = async () => {
    if (!confirmDelete) return;
    try {
      await api.deleteAppointment(confirmDelete.id);
      showToast('התור נמחק לצמיתות מהמערכת');
      setConfirmDelete(null);
      loadAppointments();
    } catch (err) {
      showToast(err.message || 'שגיאה במחיקת התור', 'error');
    }
  };

  // Filtered appointments
  const filteredAppointments = appointments.filter(a => {
    const matchesSearch = 
      (a.clientName && a.clientName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (a.notes && a.notes.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (a.location && a.location.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || a.status === statusFilter;
    const matchesDate = !dateFilter || a.date === dateFilter;

    return matchesSearch && matchesStatus && matchesDate;
  });

  // Calculate stats
  const todayStr = new Date().toISOString().split('T')[0];
  const todayCount = appointments.filter(a => a.date === todayStr && a.status !== 'cancelled').length;
  const pendingRequests = appointments.filter(a => a.status === 'pending');
  const upcomingCount = appointments.filter(a => a.date >= todayStr && a.status === 'confirmed').length;
  const remindersSentCount = appointments.filter(a => a.reminderSent).length;

  return (
    <div className="content-body" style={{ padding: '24px 32px' }}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className="page-header" style={{ marginBottom: '24px' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <CalendarCheck size={28} color="var(--primary, #0d9488)" />
            <span>יומן וזימון תורים</span>
          </h1>
          <p style={{ color: 'var(--text-muted, #64748b)', margin: '4px 0 0 0', fontSize: '0.94rem' }}>
            ניהול לוח הפגישות, אישור בקשות תור מהמטופלים ותזכורות WhatsApp אוטומטיות.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button 
            type="button" 
            className="btn btn-secondary" 
            onClick={loadAppointments}
            disabled={loading}
            title="רענן יומן"
          >
            <RefreshCw size={16} className={loading ? 'spin' : ''} />
            <span>רענן</span>
          </button>

          <button 
            type="button" 
            className="btn btn-primary" 
            onClick={() => handleOpenNewModal()}
          >
            <Plus size={18} />
            <span>קביעת תור חדש</span>
          </button>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="stats-grid" style={{ marginBottom: '24px' }}>
        <div className="stat-card" style={{ borderTop: '4px solid var(--primary, #0d9488)' }}>
          <div className="stat-val" style={{ color: 'var(--primary, #0d9488)' }}>{todayCount}</div>
          <div className="stat-lbl">פגישות שנקבעו להיום</div>
        </div>

        <div className="stat-card" style={{ borderTop: `4px solid ${pendingRequests.length > 0 ? '#f59e0b' : '#94a3b8'}` }}>
          <div className="stat-val" style={{ color: pendingRequests.length > 0 ? '#f59e0b' : 'inherit' }}>
            {pendingRequests.length}
          </div>
          <div className="stat-lbl">
            בקשות תור ממתינות לאישורך
          </div>
        </div>

        <div className="stat-card" style={{ borderTop: '4px solid #3b82f6' }}>
          <div className="stat-val" style={{ color: '#3b82f6' }}>{upcomingCount}</div>
          <div className="stat-lbl">פגישות עתידיות מאושרות</div>
        </div>

        <div className="stat-card" style={{ borderTop: '4px solid #10b981' }}>
          <div className="stat-val" style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <WhatsAppIcon size={20} /> {remindersSentCount}
          </div>
          <div className="stat-lbl">תזכורות WhatsApp שנמסרו</div>
        </div>
      </div>

      {/* Highlight: Pending Client Requests Box */}
      {pendingRequests.length > 0 && (
        <div style={{
          background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
          border: '1px solid #fde68a',
          borderRadius: 'var(--radius-lg)',
          padding: '18px 22px',
          marginBottom: '24px',
          boxShadow: '0 4px 12px rgba(245, 158, 11, 0.08)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: '#f59e0b',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <AlertCircle size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#92400e', fontWeight: 800 }}>
                ישנן {pendingRequests.length} בקשות תור חדשות שהוגשו על ידי המטופלים!
              </h3>
              <p style={{ margin: 0, fontSize: '0.84rem', color: '#b45309' }}>
                באפשרותך לאשר את התור בלחיצה אחת (המטופל יקבל אישור WhatsApp מיידי) או לתאם מועד חלופי.
              </p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '14px' }}>
            {pendingRequests.map(req => (
              <div 
                key={req.id} 
                style={{
                  background: '#ffffff',
                  borderRadius: 'var(--radius-md)',
                  padding: '14px 16px',
                  border: '1px solid #fcd34d',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '1rem', color: '#1e293b' }}>
                      {req.clientName}
                    </div>
                    <div style={{ fontSize: '0.82rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Phone size={12} /> {req.clientPhone}
                    </div>
                  </div>
                  <span className="badge badge-warning" style={{ fontSize: '0.74rem' }}>
                    ממתין לאישור
                  </span>
                </div>

                <div style={{ fontSize: '0.88rem', color: '#334155', background: '#f8fafc', padding: '8px 12px', borderRadius: '6px' }}>
                  <div><strong>מועד מבוקש:</strong> {getHebrewDateDisplay(req.date)} בשעה {req.time}</div>
                  <div><strong>סוג:</strong> {req.typeName || (req.type === 'zoom' ? 'וידאו (Zoom)' : 'בקליניקה')}</div>
                  {req.notes && <div style={{ marginTop: '4px', fontSize: '0.82rem', color: '#64748b' }}>"{req.notes}"</div>}
                </div>

                <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ flex: 1, padding: '8px 10px', fontSize: '0.82rem', justifyContent: 'center' }}
                    onClick={() => handleApproveRequest(req)}
                    disabled={actionLoadingId === req.id}
                  >
                    <Check size={14} />
                    <span>אשר תור ושלח אישור</span>
                  </button>

                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ padding: '8px 10px', fontSize: '0.82rem' }}
                    onClick={() => handleOpenEditModal(req)}
                    title="ערוך מועד"
                  >
                    <Edit3 size={14} />
                  </button>

                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ padding: '8px 10px', fontSize: '0.82rem', color: '#ef4444' }}
                    onClick={() => handleCancelAppointment(req)}
                    title="דחה בקשה"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Card: Appointments List & Toolbar */}
      <div className="card">
        <div className="card-toolbar" style={{ flexWrap: 'wrap', gap: '14px', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Search */}
          <div className="search-input-wrapper" style={{ minWidth: '240px', flex: 1 }}>
            <Search size={16} />
            <input
              type="text"
              placeholder="חיפוש לפי שם לקוח, הערות או מיקום..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button 
                type="button" 
                onClick={() => setSearchQuery('')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Date Picker Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={16} color="#64748b" />
            <input 
              type="date"
              className="form-control"
              style={{ padding: '6px 10px', fontSize: '0.86rem', width: 'auto' }}
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              title="סינון לפי תאריך מסוים"
            />
            {dateFilter && (
              <button 
                type="button"
                className="btn btn-secondary"
                style={{ padding: '4px 8px', fontSize: '0.78rem' }}
                onClick={() => setDateFilter('')}
              >
                הצג הכל
              </button>
            )}
          </div>

          {/* Status Filter Tabs */}
          <div style={{ display: 'flex', gap: '6px', background: '#f1f5f9', padding: '4px', borderRadius: '8px', overflowX: 'auto' }}>
            {[
              { id: 'all', label: 'כל התורים' },
              { id: 'confirmed', label: 'מאושרים' },
              { id: 'pending', label: `ממתינים (${pendingRequests.length})` },
              { id: 'completed', label: 'הושלמו' },
              { id: 'cancelled', label: 'בוטלו' }
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '0.82rem',
                  fontWeight: statusFilter === tab.id ? 700 : 500,
                  background: statusFilter === tab.id ? '#ffffff' : 'transparent',
                  color: statusFilter === tab.id ? 'var(--primary, #0d9488)' : '#64748b',
                  boxShadow: statusFilter === tab.id ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table / List View */}
        <div className="table-responsive">
          <table className="custom-table">
            <thead>
              <tr>
                <th>מועד ושעה</th>
                <th>שם המטופל/ת</th>
                <th>סוג פגישה ומיקום</th>
                <th>סטטוס</th>
                <th>תזכורת WhatsApp</th>
                <th>הערות</th>
                <th style={{ textAlign: 'center' }}>פעולות</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '48px', color: '#64748b' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                      <RefreshCw size={24} className="spin" color="var(--primary)" />
                      <span>טוען פגישות ויומן...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredAppointments.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '48px', color: '#64748b' }}>
                    <CalendarClock size={40} color="#cbd5e1" style={{ margin: '0 auto 12px auto' }} />
                    <div style={{ fontSize: '1rem', fontWeight: 600, color: '#334155' }}>
                      לא נמצאו תורים התואמים את הסינון
                    </div>
                    <div style={{ fontSize: '0.84rem', marginTop: '4px' }}>
                      ניתן לקבוע תור חדש בלחיצה על "קביעת תור חדש".
                    </div>
                  </td>
                </tr>
              ) : (
                filteredAppointments.map(apt => {
                  const isToday = apt.date === todayStr;
                  return (
                    <tr 
                      key={apt.id}
                      style={{
                        background: isToday ? 'rgba(13, 148, 136, 0.03)' : 'transparent'
                      }}
                    >
                      {/* Date & Time */}
                      <td>
                        <div style={{ fontWeight: 700, color: '#1e293b' }}>
                          {getHebrewDateDisplay(apt.date)}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.84rem', color: 'var(--primary-hover, #0f766e)' }}>
                          <Clock size={13} />
                          <strong>{apt.time}</strong>
                          <span style={{ color: '#94a3b8' }}>({apt.durationMinutes || 50} דק')</span>
                          {isToday && (
                            <span style={{ 
                              background: 'var(--primary, #0d9488)', 
                              color: '#fff', 
                              padding: '1px 6px', 
                              borderRadius: '4px', 
                              fontSize: '0.7rem',
                              fontWeight: 700
                            }}>
                              היום!
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Client */}
                      <td>
                        <div style={{ fontWeight: 700, color: '#1e293b' }}>
                          {apt.clientName}
                        </div>
                        <div style={{ fontSize: '0.82rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>{apt.clientPhone}</span>
                          {apt.clientPhone && (
                            <a
                              href={`https://wa.me/${apt.clientPhone.replace(/^0/, '972').replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noreferrer"
                              title="פתח שיחה בוואטסאפ"
                              style={{ display: 'inline-flex', alignItems: 'center', color: '#25D366' }}
                            >
                              <WhatsAppIcon size={14} />
                            </a>
                          )}
                        </div>
                      </td>

                      {/* Type & Location */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.88rem' }}>
                          {apt.type === 'zoom' ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#2563eb', fontWeight: 600 }}>
                              <Video size={14} /> וידאו (Zoom)
                            </span>
                          ) : apt.type === 'phone' ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#0891b2', fontWeight: 600 }}>
                              <Phone size={14} /> שיחת טלפון
                            </span>
                          ) : (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#0d9488', fontWeight: 600 }}>
                              <MapPin size={14} /> קליניקה
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {apt.location}
                        </div>
                      </td>

                      {/* Status */}
                      <td>
                        {apt.status === 'confirmed' ? (
                          <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <CheckCircle2 size={12} /> מאושר
                          </span>
                        ) : apt.status === 'pending' ? (
                          <span className="badge badge-warning" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <AlertCircle size={12} /> ממתין לאישור
                          </span>
                        ) : apt.status === 'completed' ? (
                          <span className="badge" style={{ background: '#f1f5f9', color: '#475569', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Check size={12} /> הושלם
                          </span>
                        ) : (
                          <span className="badge badge-danger" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <XCircle size={12} /> בוטל
                          </span>
                        )}
                      </td>

                      {/* WhatsApp Reminder status */}
                      <td>
                        {apt.reminderSent ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#16a34a', fontSize: '0.82rem', fontWeight: 600 }}>
                            <WhatsAppIcon size={14} />
                            <span>נשלחה תזכורת</span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ padding: '4px 8px', fontSize: '0.76rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            onClick={() => handleSendReminder(apt)}
                            disabled={actionLoadingId === apt.id || apt.status !== 'confirmed'}
                            title="שלח תזכורת WhatsApp אישית ללקוח עכשיו"
                          >
                            <WhatsAppIcon size={13} />
                            <span>{actionLoadingId === apt.id ? 'שולח...' : 'שלח תזכורת'}</span>
                          </button>
                        )}
                      </td>

                      {/* Notes */}
                      <td style={{ fontSize: '0.84rem', color: '#64748b', maxWidth: '180px' }}>
                        {apt.notes || '-'}
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '6px' }}>
                          {apt.status === 'pending' && (
                            <button
                              type="button"
                              className="btn btn-primary"
                              style={{ padding: '4px 8px', fontSize: '0.78rem' }}
                              onClick={() => handleApproveRequest(apt)}
                              title="אשר תור"
                            >
                              <Check size={14} />
                            </button>
                          )}

                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ padding: '4px 8px' }}
                            onClick={() => handleOpenEditModal(apt)}
                            title="ערוך תור"
                          >
                            <Edit3 size={14} />
                          </button>

                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ padding: '4px 8px', color: '#ef4444' }}
                            onClick={() => setConfirmDelete(apt)}
                            title="מחק תור"
                          >
                            <Trash2 size={14} />
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
      </div>

      {/* ========================================================================= */}
      {/* MODAL: קביעת / עריכת תור                                                  */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-card" style={{ maxWidth: '540px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingAppointment ? 'עריכת פרטי פגישה' : 'קביעת תור חדש ביומן'}</h2>
              <button type="button" className="close-btn" onClick={() => setIsModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Select Client */}
                <div className="form-group">
                  <label>בחר מטופל/ת *</label>
                  <select
                    className="form-control"
                    value={formData.clientId}
                    onChange={e => setFormData({ ...formData, clientId: e.target.value })}
                    required
                    disabled={!!editingAppointment}
                  >
                    <option value="">-- בחר מטופל מהרשימה --</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.firstName} {c.lastName} ({c.phone})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date and Time Row */}
                <div className="form-row">
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>תאריך הפגישה *</label>
                    <input
                      type="date"
                      className="form-control"
                      value={formData.date}
                      onChange={e => setFormData({ ...formData, date: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group" style={{ flex: 1 }}>
                    <label>שעת התחלה *</label>
                    <input
                      type="time"
                      className="form-control"
                      value={formData.time}
                      onChange={e => setFormData({ ...formData, time: e.target.value })}
                      required
                    />
                  </div>
                </div>

                {/* Duration and Type Row */}
                <div className="form-row">
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>משך הפגישה</label>
                    <select
                      className="form-control"
                      value={formData.durationMinutes}
                      onChange={e => setFormData({ ...formData, durationMinutes: Number(e.target.value) })}
                    >
                      <option value={30}>30 דקות</option>
                      <option value={45}>45 דקות</option>
                      <option value={50}>50 דקות (סטנדרט טיפולי)</option>
                      <option value={60}>60 דקות (שעה)</option>
                      <option value={90}>90 דקות (פגישה מורחבת)</option>
                    </select>
                  </div>

                  <div className="form-group" style={{ flex: 1 }}>
                    <label>סוג פגישה</label>
                    <select
                      className="form-control"
                      value={formData.type}
                      onChange={e => {
                        const t = e.target.value;
                        const defaultLoc = t === 'zoom' 
                          ? 'קישור Zoom יישלח סמוך למועד' 
                          : t === 'phone' 
                            ? 'שיחה טלפונית' 
                            : (clinicSettings?.clinicName || 'רחוב רוטשילד 45, תל אביב');
                        setFormData({ ...formData, type: t, location: defaultLoc });
                      }}
                    >
                      <option value="in_person">פגישה פרונטלית בקליניקה</option>
                      <option value="zoom">פגישת וידאו (Zoom)</option>
                      <option value="phone">שיחה טלפונית</option>
                    </select>
                  </div>
                </div>

                {/* Location / Details */}
                <div className="form-group">
                  <label>מיקום או פרטי התקשרות</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="כתובת קליניקה / קישור ל-Zoom / חדר טיפול"
                    value={formData.location}
                    onChange={e => setFormData({ ...formData, location: e.target.value })}
                  />
                </div>

                {/* Status */}
                <div className="form-group">
                  <label>סטטוס פגישה</label>
                  <select
                    className="form-control"
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="confirmed">מאושרת ביומן</option>
                    <option value="pending">ממתינה לאישור</option>
                    <option value="completed">הושלמה</option>
                    <option value="cancelled">מבוטלת</option>
                  </select>
                </div>

                {/* Notes */}
                <div className="form-group">
                  <label>הערות פנימיות / נושא הפגישה</label>
                  <textarea
                    className="form-control"
                    rows={2}
                    placeholder="לדוגמה: פגישת מעקב, התמקדות בטכניקות הרפיה, סיכום תהליך..."
                    value={formData.notes}
                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  />
                </div>

                {/* WhatsApp Notification Checkbox */}
                <div style={{
                  background: 'rgba(37, 211, 102, 0.08)',
                  border: '1px solid rgba(37, 211, 102, 0.3)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <input
                    type="checkbox"
                    id="sendWhatsAppCheck"
                    checked={formData.sendWhatsApp}
                    onChange={e => setFormData({ ...formData, sendWhatsApp: e.target.checked })}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <label 
                    htmlFor="sendWhatsAppCheck" 
                    style={{ margin: 0, cursor: 'pointer', fontSize: '0.88rem', fontWeight: 600, color: '#14532d', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <WhatsAppIcon size={16} />
                    <span>שלח הודעת אישור ופרטי מועד בוואטסאפ ללקוח מיד עם השמירה</span>
                  </label>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  ביטול
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'שומר...' : editingAppointment ? 'שמור שינויים' : 'קבע תור ביומן'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Delete Modal */}
      {confirmDelete && (
        <ConfirmModal
          isOpen={true}
          title="מחיקת תור מהיומן"
          message={`האם אתה בטוח שברצונך למחוק את התור של ${confirmDelete.clientName} ב-${confirmDelete.date}? פעולה זו אינה ניתנת לביטול.`}
          confirmLabel="מחק תור לצמיתות"
          cancelLabel="בטל"
          isDanger={true}
          onConfirm={handleDeleteAppointment}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}
