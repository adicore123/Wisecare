"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  UserPlus, 
  Search, 
  ExternalLink, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  Users, 
  Phone,
  Building2,
  Globe,
  User,
  AlertCircle
} from 'lucide-react';
import ClientModal from './ClientModal';
import ClientDetailsModal from './ClientDetailsModal';
import ConfirmModal from './ConfirmModal';
import WhatsAppIcon from './WhatsAppIcon';
import WazeIcon from './WazeIcon';
import Toast from './Toast';
import { api } from '@/lib/api';

export default function ClientsManager() {
  const router = useRouter();
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [genderFilter, setGenderFilter] = useState('all');
  const [portalFilter, setPortalFilter] = useState<'all' | 'portal' | 'clinic'>('all');
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'debt' | 'paid'>('all');
  const [isNewClientOpen, setIsNewClientOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [clientTasks, setClientTasks] = useState<any[]>([]);
  const [clientInsights, setClientInsights] = useState<any[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [confirmState, setConfirmState] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  const loadClients = useCallback(async (therapistId?: string) => {
    try {
      setLoading(true);
      const data = await api.getClients(therapistId);
      setClients(Array.isArray(data) ? data : []);
    } catch (err: any) {
      showToast('שגיאה בטעינת לקוחות: ' + (err.message || ''));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const u = localStorage.getItem('wisecare_user');
    if (u) {
      try {
        const user = JSON.parse(u);
        setCurrentUser(user);
        loadClients(user.id);
      } catch {
        loadClients();
      }
    } else {
      loadClients();
    }
  }, [loadClients]);

  const handleOpenClientDetails = async (client: any) => {
    setSelectedClient(client);
    setLoadingDetails(true);
    try {
      const data = await api.getClient(client.id);
      if (data?.client) {
        setSelectedClient(data.client);
        setClients(prev => prev.map(c => c.id === client.id ? { ...c, ...data.client } : c));
      }
      setClientTasks(data.tasks || []);
      setClientInsights(data.insights || []);
    } catch (err: any) {
      console.error(err);
      showToast('שגיאה בטעינת פרטי לקוח: ' + (err.message || ''));
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleCreateClient = async (clientData: any) => {
    try {
      const payload = {
        ...clientData,
        therapistId: clientData.therapistId || currentUser?.id
      };
      const res = await api.createClient(payload);
      showToast(`לקוח חדש נפתח בהצלחה: ${res.client.firstName} ${res.client.lastName}`);
      setIsNewClientOpen(false);
      loadClients(currentUser?.id);
    } catch (err: any) {
      showToast('שגיאה ביצירת לקוח: ' + (err.message || ''));
    }
  };

  const handleDeleteClient = (client: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmState({
      title: 'מחיקת לקוח לצמיתות',
      message: `האם אתה בטוח שברצונך למחוק את ${client.firstName} ${client.lastName}? כל המשימות והנתונים יימחקו.`,
      confirmText: 'כן, מחק לקוח',
      onConfirm: async () => {
        try {
          await api.deleteClient(client.id);
          showToast('הלקוח נמחק בהצלחה');
          setConfirmState(null);
          loadClients(currentUser?.id);
        } catch (err: any) {
          showToast('שגיאה במחיקת לקוח: ' + err.message);
        }
      }
    });
  };

  const handleAddTaskToClient = async (taskData: any) => {
    try {
      const newTask = await api.createTask({
        ...taskData,
        therapistId: currentUser?.id
      });
      setClientTasks(prev => [...prev, newTask]);
      loadClients(currentUser?.id);
      showToast('המשימה נוספה בהצלחה למרחב הלקוח');
    } catch (err: any) {
      showToast('שגיאה בהוספת משימה: ' + (err.message || ''));
    }
  };

  const handleDeleteTask = (taskId: string) => {
    setConfirmState({
      title: 'מחיקת משימה ממרחב הלקוח',
      message: 'האם אתה בטוח שברצונך למחוק משימה זו ממרחב הלקוח?',
      confirmText: 'כן, מחק משימה',
      onConfirm: async () => {
        try {
          await api.deleteTask(taskId);
          setClientTasks(prev => prev.filter(t => t.id !== taskId));
          loadClients(currentUser?.id);
          showToast('המשימה נמחקה בהצלחה');
          setConfirmState(null);
        } catch (err: any) {
          showToast('שגיאה במחיקת משימה: ' + (err.message || ''));
        }
      }
    });
  };

  const handleQuickWhatsApp = async (clientId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.sendClientWhatsApp(clientId);
      showToast('הודעת וואטסאפ נשלחה בהצלחה דרך Green API!');
      loadClients(currentUser?.id);
    } catch (err: any) {
      showToast('שגיאה בשליחת וואטסאפ: ' + (err.message || ''));
    }
  };

  // One-tap Waze navigation link to the clinic, sent to the client's WhatsApp
  // (address comes from the therapist's settings — server-side)
  const [sendingWazeId, setSendingWazeId] = useState<string | null>(null);
  const handleSendWaze = async (client: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setSendingWazeId(client.id);
    try {
      await api.sendClientWaze(client.id);
      showToast(`קישור ניווט וויז נשלח ל-${client.firstName} בוואטסאפ 🧭`);
    } catch (err: any) {
      showToast('שגיאה בשליחת ניווט הוויז: ' + (err.message || ''));
    } finally {
      setSendingWazeId(null);
    }
  };

  // Filter clients
  const filteredClients = clients.filter(c => {
    const fullName = `${c.firstName} ${c.lastName}`.toLowerCase();
    const matchesSearch = fullName.includes(searchTerm.toLowerCase()) || 
                          (c.phone && c.phone.includes(searchTerm));
    const matchesGender = genderFilter === 'all' || c.gender === genderFilter;
    const matchesPortal = portalFilter === 'all' 
      ? true 
      : portalFilter === 'portal' 
        ? c.portalEnabled !== false 
        : c.portalEnabled === false;

    const clientDebts = Array.isArray(c.debts) ? c.debts : [];
    const totalDebt = clientDebts.reduce((sum: number, d: any) => sum + (Number(d.amount) || 0), 0);
    const isOwing = Boolean(c.owesMoney || totalDebt > 0);
    const matchesPayment = paymentFilter === 'all'
      ? true
      : paymentFilter === 'debt'
        ? isOwing
        : !isOwing;

    return matchesSearch && matchesGender && matchesPortal && matchesPayment;
  });

  // KPI Statistics
  const totalClients = clients.length;
  const totalTasks = clients.reduce((acc, c) => acc + (c.tasksTotal || 0), 0);
  const completedTasks = clients.reduce((acc, c) => acc + (c.tasksCompleted || 0), 0);
  const whatsappSentCount = clients.filter(c => c.whatsappStatus === 'sent').length;

  return (
    <div>
      {/* Top Page Header */}
      <div className="page-header">
        <div className="page-title-group">
          <h1>ניהול מטופלים וסביבות אישיות</h1>
          <p>
            מערכת CRM חכמה לפסיכולוגים ומטפלים רגשיים • ליווי, תרגול ביתי וסנכרון WhatsApp
          </p>
        </div>

        <button 
          className="btn btn-primary"
          onClick={() => setIsNewClientOpen(true)}
        >
          <UserPlus size={18} />
          <span>לקוח חדש</span>
        </button>
      </div>

      {/* KPI Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon emerald">
            <Users size={26} />
          </div>
          <div className="stat-info">
            <div className="stat-val">{totalClients}</div>
            <div className="stat-lbl">סה"כ לקוחות פעילים</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon blue">
            <CheckCircle2 size={26} />
          </div>
          <div className="stat-info">
            <div className="stat-val">{completedTasks} / {totalTasks}</div>
            <div className="stat-lbl">משימות שהושלמו בבית</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon purple">
            <Clock size={26} />
          </div>
          <div className="stat-info">
            <div className="stat-val">
              {totalTasks > 0 ? `${Math.round((completedTasks / totalTasks) * 100)}%` : '0%'}
            </div>
            <div className="stat-lbl">שיעור היענות לתרגול</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--primary-faint)', color: 'var(--primary)' }}>
            <WhatsAppIcon size={26} />
          </div>
          <div className="stat-info">
            <div className="stat-val">{whatsappSentCount}</div>
            <div className="stat-lbl">הזמנות שנשלחו ב-WhatsApp</div>
          </div>
        </div>
      </div>

      {/* Table Card */}
      <div className="card-table">
        <div className="card-toolbar">
          <div className="search-input-wrapper">
            <Search size={18} aria-hidden="true" />
            <label className="sr-only" htmlFor="clients-search">חיפוש מטופלים לפי שם או טלפון</label>
            <input 
              id="clients-search"
              type="text" 
              placeholder="חיפוש לפי שם לקוח או טלפון..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="toolbar-filter">
            <label htmlFor="portal-filter">סוג סביבה:</label>
            <select 
              id="portal-filter"
              className="form-control"
              style={{ width: '145px', padding: '6px 10px', fontSize: '0.88rem' }}
              value={portalFilter}
              onChange={e => setPortalFilter(e.target.value as any)}
            >
              <option value="all">כל הלקוחות</option>
              <option value="portal">🌐 עם מרחב אישי</option>
              <option value="clinic">🏢 קליניקה בלבד</option>
            </select>
          </div>

          <div className="toolbar-filter">
            <label htmlFor="gender-filter">סינון לפי מין:</label>
            <select 
              id="gender-filter"
              className="form-control"
              style={{ width: '130px', padding: '6px 10px', fontSize: '0.88rem' }}
              value={genderFilter}
              onChange={e => setGenderFilter(e.target.value)}
            >
              <option value="all">הכל</option>
              <option value="זכר">זכר</option>
              <option value="נקבה">נקבה</option>
              <option value="אחר">אחר</option>
            </select>
          </div>

          <div className="toolbar-filter">
            <label htmlFor="payment-filter">סטטוס תשלום:</label>
            <select 
              id="payment-filter"
              className="form-control"
              style={{ width: '135px', padding: '6px 10px', fontSize: '0.88rem' }}
              value={paymentFilter}
              onChange={e => setPaymentFilter(e.target.value as any)}
            >
              <option value="all">כל הסטטוסים</option>
              <option value="debt">🔴 בעלי חוב</option>
              <option value="paid">🟢 הכל שולם</option>
            </select>
          </div>
        </div>

        <div className="table-responsive">
          <table className="custom-table">
            <thead>
              <tr>
                <th>שם המטופל/ת</th>
                <th>מספר טלפון</th>
                <th>גיל</th>
                <th>מין</th>
                <th>משימות בית</th>
                <th>סטטוס תשלום</th>
                <th>מרחב אישי (קישור ייחודי)</th>
                <th>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <WhatsAppIcon size={16} /> סטטוס WhatsApp
                  </span>
                </th>
                <th style={{ textAlign: 'left' }}>פעולות</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                    טוען לקוחות...
                  </td>
                </tr>
              ) : filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                    לא נמצאו לקוחות מתאימים. לחץ על "לקוח חדש" לפתיחת סביבה ראשונה!
                  </td>
                </tr>
              ) : (
                filteredClients.map(client => {
                  const clientDebts = Array.isArray(client.debts) ? client.debts : [];
                  const totalDebt = clientDebts.reduce((sum: number, d: any) => sum + (Number(d.amount) || 0), 0);
                  const isOwing = Boolean(client.owesMoney || totalDebt > 0);

                  return (
                    <tr key={client.id}>
                      <td>
                        <button 
                          type="button" 
                          className="client-name-button" 
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleOpenClientDetails(client);
                          }}
                        >
                          <div className={`client-avatar ${client.gender === 'נקבה' ? 'is-female' : ''}`} aria-hidden="true">
                            {client.firstName.charAt(0)}
                          </div>
                          <div>
                            <div className="client-name" style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                              <span>{client.firstName} {client.lastName}</span>
                              {isOwing && (
                                <span 
                                  title={`יתרת חוב פתוחה${totalDebt > 0 ? `: ${totalDebt} ₪` : ''}`}
                                  style={{ 
                                    fontSize: '0.72rem', 
                                    background: '#fee2e2', 
                                    color: '#b91c1c', 
                                    padding: '1px 7px', 
                                    borderRadius: '999px', 
                                    fontWeight: 700, 
                                    border: '1px solid #fca5a5',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px'
                                  }}
                                >
                                  <AlertCircle size={10} color="#dc2626" />
                                  <span>חוב {totalDebt > 0 ? `${totalDebt} ₪` : ''}</span>
                                </span>
                              )}
                              {client.isSelfCare && (
                                <span style={{ fontSize: '0.72rem', background: 'var(--primary-faint)', color: 'var(--primary)', padding: '1px 7px', borderRadius: '999px', fontWeight: 700, border: '1px solid var(--primary-light)' }}>
                                  🌱 עצמאי (/join)
                                </span>
                              )}
                              {client.portalEnabled === false && (
                                <span style={{ fontSize: '0.72rem', background: '#f1f5f9', color: '#475569', padding: '1px 7px', borderRadius: '999px', fontWeight: 600, border: '1px solid #cbd5e1' }}>
                                  🏢 קליניקה
                                </span>
                              )}
                            </div>
                            {client.notes && (
                              <div className="client-note-preview">
                                {client.notes}
                              </div>
                            )}
                          </div>
                        </button>
                      </td>

                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', direction: 'ltr', justifyContent: 'flex-end' }}>
                          <span>{client.phone}</span>
                          <Phone size={14} color="#94a3b8" />
                        </div>
                      </td>

                      <td>{client.age || '-'}</td>

                      <td>
                        <span className="badge badge-neutral">{client.gender}</span>
                      </td>

                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span className={`badge ${client.tasksCompleted > 0 ? 'badge-success' : 'badge-neutral'}`}>
                            {client.tasksCompleted || 0} / {client.tasksTotal || 0} הושלמו
                          </span>
                        </div>
                      </td>

                      <td>
                        {isOwing ? (
                          <div style={{ display: 'inline-flex', flexDirection: 'column', gap: '2px', alignItems: 'flex-start' }}>
                            <span 
                              style={{
                                background: '#fee2e2',
                                color: '#b91c1c',
                                border: '1px solid #fca5a5',
                                padding: '3px 8px',
                                borderRadius: '999px',
                                fontSize: '0.78rem',
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                              title={`המטופל ביתרת חוב${client.billingNotes ? ` | ${client.billingNotes}` : ''}`}
                            >
                              <AlertCircle size={12} color="#dc2626" />
                              <span>{totalDebt > 0 ? `חוב: ${totalDebt} ₪` : 'יתרת חוב'}</span>
                            </span>
                            {clientDebts.length > 0 && (
                              <span style={{ fontSize: '0.72rem', color: '#dc2626', paddingRight: '4px' }}>
                                {clientDebts.length === 1 ? 'מפגש 1' : `${clientDebts.length} מפגשים`}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span 
                            style={{
                              background: '#f0fdf4',
                              color: '#166534',
                              border: '1px solid #bbf7d0',
                              padding: '3px 8px',
                              borderRadius: '999px',
                              fontSize: '0.78rem',
                              fontWeight: 600,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <CheckCircle2 size={12} color="#16a34a" />
                            <span>הכל שולם</span>
                          </span>
                        )}
                      </td>

                    <td>
                      {client.portalEnabled !== false ? (
                        <button 
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            window.open(`/portal/${client.portalCode}`, '_blank');
                          }}
                          className="btn btn-secondary"
                          style={{ padding: '4px 10px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                          title="צפה במרחב הלקוח כפי שהוא רואה אותו מהבית (חלון חדש)"
                        >
                          <ExternalLink size={13} />
                          <span>צפה בפורטל</span>
                        </button>
                      ) : (
                        <span 
                          style={{
                            fontSize: '0.78rem',
                            color: '#64748b',
                            background: '#f8fafc',
                            padding: '4px 9px',
                            borderRadius: '6px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            border: '1px solid #e2e8f0',
                            fontWeight: 600
                          }}
                          title="לקוח קליניקה בלבד — ניתן להפעיל פורטל בכל עת מכרטיס הלקוח"
                        >
                          <Building2 size={13} color="#64748b" />
                          <span>קליניקה בלבד</span>
                        </span>
                      )}
                    </td>

                    <td>
                      {client.portalEnabled === false ? (
                        <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>—</span>
                      ) : client.whatsappStatus === 'sent' ? (
                        <span className="badge badge-success">
                          <CheckCircle2 size={12} /> נשלח בהצלחה
                        </span>
                      ) : client.whatsappStatus === 'failed' ? (
                        <span className="badge badge-warning">נכשל</span>
                      ) : (
                        <span className="badge badge-neutral">טרם נשלח</span>
                      )}
                    </td>

                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{
                            padding: '6px 12px',
                            fontSize: '0.8rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            color: '#334155',
                            background: '#f1f5f9',
                            borderColor: '#cbd5e1'
                          }}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleOpenClientDetails(client);
                          }}
                          title="פתיחת כרטיס מטופל (תיק אישי מלא)"
                        >
                          <User size={14} />
                          <span>תיק מטופל</span>
                        </button>

                        {client.portalEnabled !== false && (
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{
                              padding: '6px 12px',
                              fontSize: '0.8rem',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              color: 'var(--primary-hover)',
                              background: 'var(--primary-faint)',
                              borderColor: 'var(--primary-light)'
                            }}
                            onClick={(e) => handleQuickWhatsApp(client.id, e)}
                            title="שלח הזמנה או תזכורת למרחב הטיפולי ב-WhatsApp"
                          >
                            <WhatsAppIcon size={14} />
                            <span>שלח WhatsApp</span>
                          </button>
                        )}

                        {client.phone && (
                          <button
                            type="button"
                            style={{
                              width: '42px',
                              height: '42px',
                              borderRadius: '50%',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#ffffff',
                              background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                              border: 'none',
                              boxShadow: '0 4px 12px rgba(3, 105, 161, 0.3)',
                              cursor: sendingWazeId === client.id ? 'not-allowed' : 'pointer',
                              transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                              opacity: sendingWazeId === client.id ? 0.7 : 1,
                            }}
                            onMouseEnter={(e) => {
                              if (sendingWazeId !== client.id) {
                                e.currentTarget.style.transform = 'translateY(-2px) scale(1.05)';
                                e.currentTarget.style.boxShadow = '0 8px 16px rgba(3, 105, 161, 0.4)';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (sendingWazeId !== client.id) {
                                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(3, 105, 161, 0.3)';
                              }
                            }}
                            onMouseDown={(e) => {
                              if (sendingWazeId !== client.id) {
                                e.currentTarget.style.transform = 'translateY(1px) scale(0.95)';
                                e.currentTarget.style.boxShadow = '0 2px 6px rgba(3, 105, 161, 0.3)';
                              }
                            }}
                            onMouseUp={(e) => {
                              if (sendingWazeId !== client.id) {
                                e.currentTarget.style.transform = 'translateY(-2px) scale(1.05)';
                                e.currentTarget.style.boxShadow = '0 8px 16px rgba(3, 105, 161, 0.4)';
                              }
                            }}
                            onClick={(e) => handleSendWaze(client, e)}
                            disabled={sendingWazeId === client.id}
                            title="שליחת קישור ניווט בוויז"
                          >
                            {sendingWazeId === client.id
                              ? <span className="spin" style={{ width: 22, height: 22, border: '3px solid rgba(255,255,255,0.3)', borderTopColor: '#ffffff', borderRadius: '50%', display: 'inline-block' }} />
                              : <WazeIcon size={26} />}
                          </button>
                        )}

                        <button 
                          type="button"
                          className="icon-btn danger" 
                          onClick={(e) => handleDeleteClient(client, e)}
                          aria-label={`מחק את הלקוח ${client.firstName} ${client.lastName}`}
                          title="מחיקת לקוח לצמיתות"
                        >
                          <Trash2 size={16} />
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

      {/* New Client Modal */}
      <ClientModal 
        isOpen={isNewClientOpen}
        onClose={() => setIsNewClientOpen(false)}
        onSave={handleCreateClient}
        currentTherapist={currentUser}
      />

      {/* Client Details Modal */}
      {selectedClient && (
        <ClientDetailsModal 
          isOpen={Boolean(selectedClient)}
          onClose={() => {
            setSelectedClient(null);
            loadClients(currentUser?.id);
          }}
          client={selectedClient}
          onClientUpdated={(updated) => {
            setSelectedClient(prev => prev ? { ...prev, ...updated } : updated);
            setClients(prev => prev.map(c => c.id === updated.id ? { ...c, ...updated } : c));
          }}
          tasks={clientTasks}
          insights={clientInsights}
          onAddTask={handleAddTaskToClient}
          onDeleteTask={handleDeleteTask}
          onSendWhatsApp={(msg?: string) => api.sendClientWhatsApp(selectedClient.id, msg)}
          onOpenPortal={() => window.open(`/portal/${selectedClient.portalCode}`, '_blank')}
        />
      )}

      {/* Confirm Action Modal */}
      {confirmState && (
        <ConfirmModal 
          isOpen={Boolean(confirmState)}
          onClose={() => setConfirmState(null)}
          onConfirm={confirmState.onConfirm}
          title={confirmState.title}
          message={confirmState.message}
          confirmText={confirmState.confirmText}
        />
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <Toast message={toastMessage} onClose={() => setToastMessage('')} />
      )}
    </div>
  );
}
