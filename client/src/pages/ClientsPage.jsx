import React, { useState } from 'react';
import { 
  UserPlus, 
  Search, 
  ExternalLink, 
  Eye, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  Users, 
  Sparkles,
  Phone
} from 'lucide-react';
import ClientModal from '../components/ClientModal';
import ClientDetailsModal from '../components/ClientDetailsModal';
import ConfirmModal from '../components/ConfirmModal';
import WhatsAppIcon from '../components/WhatsAppIcon';

export default function ClientsPage({ 
  clients = [], 
  onRefresh, 
  onCreateClient, 
  onDeleteClient, 
  onSendWhatsApp, 
  onAddTask, 
  onDeleteTask, 
  currentTherapist,
  onNavigateToPortal
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [genderFilter, setGenderFilter] = useState('all');
  const [isNewClientOpen, setIsNewClientOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [clientTasks, setClientTasks] = useState([]);
  const [clientInsights, setClientInsights] = useState([]);
  const [, setLoadingDetails] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [confirmState, setConfirmState] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  // Filter clients
  const filteredClients = clients.filter(c => {
    const fullName = `${c.firstName} ${c.lastName}`.toLowerCase();
    const matchesSearch = fullName.includes(searchTerm.toLowerCase()) || 
                          (c.phone && c.phone.includes(searchTerm));
    const matchesGender = genderFilter === 'all' || c.gender === genderFilter;
    return matchesSearch && matchesGender;
  });

  // Calculate statistics
  const totalClients = clients.length;
  const totalTasks = clients.reduce((acc, c) => acc + (c.tasksTotal || 0), 0);
  const completedTasks = clients.reduce((acc, c) => acc + (c.tasksCompleted || 0), 0);
  const whatsappSentCount = clients.filter(c => c.whatsappStatus === 'sent').length;

  const handleOpenClientDetails = async (client) => {
    setSelectedClient(client);
    setLoadingDetails(true);
    try {
      const res = await fetch(`/api/clients/${client.id}`);
      const data = await res.json();
      setClientTasks(data.tasks || []);
      setClientInsights(data.insights || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleAddTaskToClient = async (taskData) => {
    const newTask = await onAddTask(taskData);
    setClientTasks(prev => [...prev, newTask]);
    onRefresh();
    showToast('המשימה נוספה בהצלחה למרחב הלקוח');
  };

  const handleDeleteTask = (taskId) => {
    setConfirmState({
      title: 'מחיקת משימה ממרחב הלקוח',
      message: 'האם אתה בטוח שברצונך למחוק משימה זו ממרחב הלקוח?',
      confirmText: 'כן, מחק משימה',
      onConfirm: async () => {
        await onDeleteTask(taskId);
        setClientTasks(prev => prev.filter(t => t.id !== taskId));
        onRefresh();
        showToast('המשימה נמחקה בהצלחה');
        setConfirmState(null);
      }
    });
  };

  const handleQuickWhatsApp = async (clientId, e) => {
    e.stopPropagation();
    try {
      await onSendWhatsApp(clientId);
      showToast('הודעת וואטסאפ נשלחה בהצלחה דרך Green API!');
      onRefresh();
    } catch (err) {
      showToast('שגיאה בשליחת וואטסאפ: ' + err.message);
    }
  };

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
          <div className="stat-icon" style={{ background: '#ecfdf5', color: '#16a34a' }}>
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
              {filteredClients.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                    לא נמצאו לקוחות מתאימים. לחץ על "לקוח חדש" לפתיחת סביבה ראשונה!
                  </td>
                </tr>
              ) : (
                filteredClients.map(client => (
                  <tr key={client.id}>
                    <td>
                      <button type="button" className="client-name-button" onClick={() => handleOpenClientDetails(client)}>
                        <div className={`client-avatar ${client.gender === 'נקבה' ? 'is-female' : ''}`} aria-hidden="true">
                          {client.firstName.charAt(0)}
                        </div>
                        <div>
                          <div className="client-name" style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            <span>{client.firstName} {client.lastName}</span>
                            {client.isSelfCare && (
                              <span style={{ fontSize: '0.72rem', background: '#ecfdf5', color: '#059669', padding: '1px 7px', borderRadius: '999px', fontWeight: 700, border: '1px solid #a7f3d0' }}>
                                🌱 עצמאי (/join)
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
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          onNavigateToPortal(client.portalCode);
                        }}
                        className="btn btn-secondary"
                        style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                        title="צפה במרחב הלקוח כפי שהוא רואה אותו מהבית"
                      >
                        <ExternalLink size={13} />
                        <span>צפה בפורטל</span>
                      </button>
                    </td>

                    <td>
                      {client.whatsappStatus === 'sent' ? (
                        <span className="badge badge-success">
                          <CheckCircle2 size={12} /> נשלח בהצלחה
                        </span>
                      ) : client.whatsappStatus === 'failed' ? (
                        <span className="badge badge-warning">נכשל</span>
                      ) : (
                        <span className="badge badge-neutral">טרם נשלח</span>
                      )}
                    </td>

                    <td style={{ textAlign: 'left' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-start' }} onClick={e => e.stopPropagation()}>
                        <button 
                          className="btn-icon" 
                          title="שלח קישור וסיסמה ב-WhatsApp"
                          aria-label={`שלח קישור וסיסמה ל-${client.firstName} ב-WhatsApp`}
                          onClick={(e) => handleQuickWhatsApp(client.id, e)}
                          style={{ padding: '6px' }}
                        >
                          <WhatsAppIcon size={18} />
                        </button>

                        <button 
                          className="btn-icon" 
                          title="צפה בתיק המטופל ונהל משימות"
                          aria-label={`פתח את התיק של ${client.firstName} ${client.lastName}`}
                          onClick={() => handleOpenClientDetails(client)}
                          style={{ color: '#0d9488' }}
                        >
                          <Eye size={17} />
                        </button>

                        <button 
                          className="btn-icon" 
                          title="מחק לקוח"
                          aria-label={`מחק את הלקוח ${client.firstName} ${client.lastName}`}
                          onClick={() => {
                            setConfirmState({
                              title: `מחיקת הלקוח ${client.firstName} ${client.lastName}`,
                              message: `האם אתה בטוח שברצונך למחוק את תיק הלקוח של ${client.firstName} ${client.lastName} ואת כל משימותיו ותובנותיו מהמערכת? לא ניתן יהיה לשחזר נתונים אלו.`,
                              confirmText: 'כן, מחק לקוח לצמיתות',
                              onConfirm: async () => {
                                await onDeleteClient(client.id);
                                showToast('הלקוח נמחק בהצלחה');
                                setConfirmState(null);
                              }
                            });
                          }}
                          style={{ color: '#ef4444' }}
                        >
                          <Trash2 size={17} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Client Modal */}
      <ClientModal 
        isOpen={isNewClientOpen}
        onClose={() => setIsNewClientOpen(false)}
        therapistName={currentTherapist?.name}
        onSave={async (formData) => {
          const res = await onCreateClient(formData);
          if (res.whatsappResult?.success) {
            showToast('הלקוח נוצר והודעת וואטסאפ נשלחה עם הקישור למרחב האישי!');
          } else {
            showToast('הלקוח נוצר בהצלחה עם סביבה וקישור אישי!');
          }
        }}
      />

      {/* Client Details Modal with Tasks & Insights */}
      <ClientDetailsModal 
        isOpen={Boolean(selectedClient)}
        onClose={() => setSelectedClient(null)}
        client={selectedClient}
        tasks={clientTasks}
        insights={clientInsights}
        onAddTask={handleAddTaskToClient}
        onDeleteTask={handleDeleteTask}
        onSendWhatsApp={async (id) => {
          await onSendWhatsApp(id);
          onRefresh();
        }}
        onOpenPortal={(portalCode) => onNavigateToPortal(portalCode)}
      />

      {/* Confirm Action Modal */}
      <ConfirmModal 
        isOpen={Boolean(confirmState)}
        onClose={() => setConfirmState(null)}
        onConfirm={confirmState?.onConfirm}
        title={confirmState?.title}
        message={confirmState?.message}
        confirmText={confirmState?.confirmText}
        isDanger={true}
      />

      {/* Toast */}
      {toastMessage && (
        <div className="toast-notice">
          <Sparkles size={18} color="#2dd4bf" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
