// Central API client

const API_BASE = '/api';

/** Read the stored JWT token safely in SSR / client */
const getToken = () => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('wisecare_token');
};

/** Build Authorization header with Bearer token */
const authHeaders = (extra: Record<string, string> = {}) => {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra
  };
};

export const api = {
  // Auth
  login: async (username, password, extra?: { adminPortal?: boolean }) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, ...extra })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'שגיאה בהתחברות');
    }
    return res.json();
  },

  logout: async () => {
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        headers: authHeaders()
      });
    } catch {
      // ignore network errors on logout
    } finally {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('wisecare_token');
        localStorage.removeItem('wisecare_user');
        localStorage.removeItem('wisecare_admin_token');
        localStorage.removeItem('wisecare_client_token');
      }
    }
  },

  getMe: async () => {
    const res = await fetch(`${API_BASE}/auth/me`, { headers: authHeaders() });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'לא מחובר');
    }
    return res.json();
  },

  impersonate: async (targetTherapistId) => {
    const res = await fetch(`${API_BASE}/auth/impersonate`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ targetTherapistId })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'שגיאה בכניסה לסביבת המטפל');
    }
    return res.json();
  },

  exitImpersonation: async () => {
    const adminToken = typeof window !== 'undefined' ? localStorage.getItem('wisecare_admin_token') : null;
    const res = await fetch(`${API_BASE}/auth/impersonate/exit`, {
      method: 'POST',
      headers: authHeaders(adminToken ? { Authorization: `Bearer ${adminToken}` } : {})
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'שגיאה בחזרה ל-SuperAdmin');
    }
    return res.json();
  },

  getTherapistLoginInfo: async (loginCode) => {
    const res = await fetch(`${API_BASE}/auth/therapist-login/${loginCode}`);
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'קישור כניסה לא תקין או פג תוקף');
    }
    return res.json();
  },

  loginWithCode: async (loginCode, username, password) => {
    const res = await fetch(`${API_BASE}/auth/therapist-login/${loginCode}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'שם משתמש או סיסמה שגויים');
    }
    return res.json();
  },

  // Clients
  getClients: async (therapistId?: string) => {
    const url = therapistId ? `${API_BASE}/clients?therapistId=${therapistId}` : `${API_BASE}/clients`;
    const res = await fetch(url, { headers: authHeaders() });
    if (!res.ok) throw new Error('שגיאה בטעינת לקוחות');
    return res.json();
  },

  // Digital forms & signatures
  getFormTemplates: async () => {
    const res = await fetch(`${API_BASE}/forms`, { headers: authHeaders() });
    if (!res.ok) throw new Error('שגיאה בטעינת הטפסים');
    return res.json();
  },

  createFormTemplate: async (data) => {
    const res = await fetch(`${API_BASE}/forms`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'שגיאה ביצירת הטופס');
    }
    return res.json();
  },

  updateFormTemplate: async (id, data) => {
    const res = await fetch(`${API_BASE}/forms/${id}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'שגיאה בעדכון הטופס');
    }
    return res.json();
  },

  deleteFormTemplate: async (id) => {
    const res = await fetch(`${API_BASE}/forms/${id}`, {
      method: 'DELETE',
      headers: authHeaders()
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'שגיאה במחיקת הטופס');
    }
    return res.json();
  },

  sendFormToClient: async (formId: string, clientId: string, customMessage?: string, sendWhatsApp = true) => {
    const res = await fetch(`${API_BASE}/forms/${formId}/send`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ clientId, customMessage, sendWhatsApp })
    });
    if (!res.ok && res.status !== 201) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'שגיאה בשליחת הטופס');
    }
    return res.json();
  },

  getClientForms: async (clientId) => {
    const res = await fetch(`${API_BASE}/clients/${clientId}/forms`, { headers: authHeaders() });
    if (!res.ok) throw new Error('שגיאה בטעינת טפסי הלקוח');
    return res.json();
  },

  getFormSignature: async (signatureId) => {
    const res = await fetch(`${API_BASE}/forms/signatures/${signatureId}`, { headers: authHeaders() });
    if (!res.ok) throw new Error('שגיאה בטעינת הטופס החתום');
    return res.json();
  },

  getClient: async (id) => {
    const res = await fetch(`${API_BASE}/clients/${id}`, { headers: authHeaders() });
    if (!res.ok) throw new Error('שגיאה בטעינת פרטי לקוח');
    return res.json();
  },

  createClient: async (data) => {
    const res = await fetch(`${API_BASE}/clients`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'שגיאה ביצירת לקוח חדש');
    }
    return res.json();
  },

  updateClient: async (id, data) => {
    const res = await fetch(`${API_BASE}/clients/${id}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('שגיאה בעדכון לקוח');
    return res.json();
  },

  deleteClient: async (id) => {
    const res = await fetch(`${API_BASE}/clients/${id}`, {
      method: 'DELETE',
      headers: authHeaders()
    });
    if (!res.ok) throw new Error('שגיאה במחיקת לקוח');
    return res.json();
  },

  sendWhatsApp: async (clientId: string, customMessage?: string) => {
    const res = await fetch(`${API_BASE}/clients/${clientId}/send-whatsapp`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ customMessage })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'שגיאה בשליחת וואטסאפ');
    }
    return res.json();
  },

  sendClientWhatsApp: async (clientId: string, customMessage?: string) => {
    return api.sendWhatsApp(clientId, customMessage);
  },

  // Tasks (Therapist)
  createTask: async (taskData) => {
    const res = await fetch(`${API_BASE}/tasks`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(taskData)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'שגיאה בהקצאת משימה');
    }
    return res.json();
  },

  deleteTask: async (taskId) => {
    const res = await fetch(`${API_BASE}/tasks/${taskId}`, {
      method: 'DELETE',
      headers: authHeaders()
    });
    if (!res.ok) throw new Error('שגיאה במחיקת משימה');
    return res.json();
  },

  getContentItems: async (arg) => {
    const therapistId = typeof arg === 'string' ? arg : (arg?.therapistId || '');
    const query = new URLSearchParams(therapistId ? { therapistId } : {});
    const res = await fetch(`${API_BASE}/content?${query.toString()}`, {
      headers: {
        ...authHeaders(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      },
      cache: 'no-store'
    });
    if (!res.ok) throw new Error('שגיאה בטעינת ספריית התוכן');
    return res.json();
  },

  createContentItem: async (data) => {
    const res = await fetch(`${API_BASE}/content`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'שגיאה בשמירת פריט התוכן');
    }
    return res.json();
  },

  previewContentUrl: async (url) => {
    const res = await fetch(`${API_BASE}/content/preview-url`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ url })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'שגיאה בשליפת פרטי הקישור');
    }
    return res.json();
  },

  assignContentItem: async (contentId, clientIds, sendWhatsApp) => {
    const res = await fetch(`${API_BASE}/content/${contentId}/assign`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ clientIds, sendWhatsApp })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'שגיאה בשיוך התוכן');
    }
    return res.json();
  },

  removeContentAssignment: async (contentId, clientId) => {
    const res = await fetch(`${API_BASE}/content/${contentId}/assignments/${clientId}`, {
      method: 'DELETE',
      headers: authHeaders()
    });
    if (!res.ok) throw new Error('שגיאה בהסרת התוכן מהמטופל');
    return res.json();
  },

  retryContentNotification: async (contentId, clientId) => {
    const res = await fetch(`${API_BASE}/content/${contentId}/notify/${clientId}`, {
      method: 'POST',
      headers: authHeaders()
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'שגיאה בשליחת התראת WhatsApp');
    }
    return res.json();
  },

  deleteContentItem: async (contentId) => {
    const res = await fetch(`${API_BASE}/content/${contentId}`, { method: 'DELETE', headers: authHeaders() });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'שגיאה במחיקת פריט התוכן');
    }
    return res.json();
  },

  // Client Portal (Patient)
  getPortalData: async (portalCode) => {
    const res = await fetch(`${API_BASE}/portal/${portalCode}`, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      },
      cache: 'no-store'
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'מרחב אישי לא נמצא');
    }
    return res.json();
  },

  updatePortalTaskStatus: async (portalCode, taskId, completed, clientNotes) => {
    const res = await fetch(`${API_BASE}/portal/${portalCode}/task-status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId, completed, clientNotes })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'שגיאה בעדכון משימה');
    }
    return res.json();
  },

  // Client Insights Journal (יומן תובנות ומחשבות)
  getPortalInsights: async (portalCode) => {
    const res = await fetch(`${API_BASE}/portal/${portalCode}/insights`);
    if (!res.ok) throw new Error('שגיאה בטעינת יומן התובנות');
    return res.json();
  },

  addPortalInsight: async (portalCode, data) => {
    const res = await fetch(`${API_BASE}/portal/${portalCode}/insights`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'שגיאה בשמירת התובנה');
    }
    return res.json();
  },

  deletePortalInsight: async (portalCode, id) => {
    const res = await fetch(`${API_BASE}/portal/${portalCode}/insights/${id}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('שגיאה במחיקת תובנה');
    return res.json();
  },

  updatePortalInsight: async (portalCode, id, data) => {
    const res = await fetch(`${API_BASE}/portal/${portalCode}/insights/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'שגיאה בעדכון התובנה');
    }
    return res.json();
  },

  // SuperAdmin
  getSuperadminStats: async (_adminId?: any) => {
    const res = await fetch(`${API_BASE}/superadmin/stats`, {
      headers: authHeaders()
    });
    if (!res.ok) throw new Error('שגיאה בטעינת נתוני SuperAdmin');
    return res.json();
  },

  getTherapists: async (_adminId?: any) => {
    const res = await fetch(`${API_BASE}/superadmin/therapists`, {
      headers: authHeaders()
    });
    if (!res.ok) throw new Error('שגיאה בטעינת רשימת המטפלים');
    return res.json();
  },

  createTherapist: async (arg1: any, arg2?: any) => {
    const data = arg2 !== undefined ? arg2 : arg1;
    const res = await fetch(`${API_BASE}/superadmin/therapists`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'שגיאה ביצירת מטפל');
    }
    return res.json();
  },

  updateTherapist: async (arg1: any, arg2?: any, arg3?: any) => {
    const id = arg3 !== undefined ? arg2 : arg1;
    const data = arg3 !== undefined ? arg3 : arg2;
    const res = await fetch(`${API_BASE}/superadmin/therapists/${id}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('שגיאה בעדכון מטפל');
    return res.json();
  },

  deleteTherapist: async (arg1: any, arg2?: any) => {
    const id = arg2 !== undefined ? arg2 : arg1;
    const res = await fetch(`${API_BASE}/superadmin/therapists/${id}`, {
      method: 'DELETE',
      headers: authHeaders()
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'שגיאה במחיקת סביבת המטפל');
    }
    return res.json();
  },

  sendTherapistInviteWhatsApp: async (arg1: any, arg2?: any) => {
    const therapistId = arg2 !== undefined ? arg2 : arg1;
    const res = await fetch(`${API_BASE}/superadmin/therapists/${therapistId}/send-invite-whatsapp`, {
      method: 'POST',
      headers: authHeaders()
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'שגיאה בשליחת פרטי התחברות בוואטסאפ');
    }
    return res.json();
  },

  resetTherapistCredentials: async (arg1: any, arg2?: any, arg3?: any) => {
    const therapistId = arg3 !== undefined ? arg2 : arg1;
    const data = arg3 !== undefined ? arg3 : arg2;
    const res = await fetch(`${API_BASE}/superadmin/therapists/${therapistId}/credentials`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'שגיאה באיפוס פרטי גישה');
    }
    return res.json();
  },

  getSuperadminSettings: async (_adminId?: any) => {
    const res = await fetch(`${API_BASE}/superadmin/settings`, {
      headers: authHeaders()
    });
    if (!res.ok) throw new Error('שגיאה בטעינת הגדרות SuperAdmin');
    return res.json();
  },

  updateSuperadminSettings: async (arg1: any, arg2?: any) => {
    const settings = arg2 !== undefined ? arg2 : arg1;
    const res = await fetch(`${API_BASE}/superadmin/settings`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(settings)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'שגיאה בעדכון הגדרות SuperAdmin');
    }
    return res.json();
  },

  getSuperadminClients: async (includeArchived: boolean = false) => {
    const res = await fetch(`${API_BASE}/superadmin/clients${includeArchived ? '?includeArchived=1' : ''}`, {
      headers: authHeaders()
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'שגיאה בטעינת רשימת הלקוחות');
    }
    return res.json();
  },

  impersonateClient: async (clientId: string) => {
    const res = await fetch(`${API_BASE}/superadmin/impersonate-client/${clientId}`, {
      method: 'POST',
      headers: authHeaders()
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'שגיאה בהנפקת גישת SuperAdmin למרחב הלקוח');
    }
    return res.json();
  },

  // Settings
  getSettings: async () => {
    const res = await fetch(`${API_BASE}/settings`, { headers: authHeaders() });
    if (!res.ok) throw new Error('שגיאה בטעינת הגדרות');
    return res.json();
  },

  checkGreenApiStatus: async () => {
    const res = await fetch(`${API_BASE}/settings/status`, { headers: authHeaders() });
    if (!res.ok) throw new Error('שגיאה בבדיקת סטטוס Green API');
    return res.json();
  },

  getGreenApiQr: async () => {
    const res = await fetch(`${API_BASE}/settings/qr`, { headers: authHeaders() });
    if (!res.ok) throw new Error('שגיאה בטעינת קוד QR');
    return res.json();
  },

  updateSettings: async (settings: any) => {
    const res = await fetch(`${API_BASE}/settings`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(settings)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'שגיאה בשמירת הגדרות');
    }
    return res.json();
  },

  testWhatsApp: async (phone: string, testMessage?: string) => {
    const res = await fetch(`${API_BASE}/settings/test-whatsapp`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ phone, testMessage })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'שגיאה בשליחת בדיקה');
    }
    return res.json();
  },

  // Appointments & Calendar (יומן ותורים)
  getAppointments: async (params: any = {}) => {
    const query = new URLSearchParams();
    if (params.therapistId) query.append('therapistId', params.therapistId);
    if (params.clientId) query.append('clientId', params.clientId);
    if (params.status) query.append('status', params.status);
    if (params.date) query.append('date', params.date);

    const queryString = query.toString() ? `?${query.toString()}` : '';
    const res = await fetch(`${API_BASE}/appointments${queryString}`, { headers: authHeaders() });
    if (!res.ok) throw new Error('שגיאה בטעינת תורים');
    return res.json();
  },

  createAppointment: async (data) => {
    const res = await fetch(`${API_BASE}/appointments`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'שגיאה ביצירת תור חדש');
    }
    return res.json();
  },

  updateAppointment: async (id, data) => {
    const res = await fetch(`${API_BASE}/appointments/${id}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'שגיאה בעדכון פרטי התור');
    }
    return res.json();
  },

  deleteAppointment: async (id) => {
    const res = await fetch(`${API_BASE}/appointments/${id}`, {
      method: 'DELETE',
      headers: authHeaders()
    });
    if (!res.ok) throw new Error('שגיאה במחיקת תור');
    return res.json();
  },

  sendAppointmentReminder: async (id) => {
    const res = await fetch(`${API_BASE}/appointments/${id}/send-reminder`, {
      method: 'POST',
      headers: authHeaders()
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'שגיאה בשליחת תזכורת WhatsApp');
    }
    return res.json();
  },

  sendAppointmentConfirmation: async (id) => {
    const res = await fetch(`${API_BASE}/appointments/${id}/send-confirmation`, {
      method: 'POST',
      headers: authHeaders()
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'שגיאה בשליחת אישור פגישה בוואטסאפ');
    }
    return res.json();
  },

  // Portal Appointments
  getPortalAppointments: async (portalCode) => {
    const res = await fetch(`${API_BASE}/portal/${portalCode}/appointments`);
    if (!res.ok) throw new Error('שגיאה בטעינת תורים לפורטל');
    return res.json();
  },

  requestPortalAppointment: async (portalCode, data) => {
    const res = await fetch(`${API_BASE}/portal/${portalCode}/appointments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'שגיאה בהגשת בקשת תור');
    }
    return res.json();
  },

  deletePortalAppointment: async (portalCode, id) => {
    const res = await fetch(`${API_BASE}/portal/${portalCode}/appointments/${id}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('שגיאה במחיקת פגישה');
    return res.json();
  },

  // Self-Care Portal & Registration
  joinSelfCare: async (data) => {
    const res = await fetch(`${API_BASE}/portal/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'שגיאה בהרשמה למרחב האישי');
    }
    return res.json();
  },

  createPortalSelfTask: async (portalCode, taskData) => {
    const res = await fetch(`${API_BASE}/portal/${portalCode}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(taskData)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'שגיאה בהוספת משימה');
    }
    return res.json();
  },

  deletePortalSelfTask: async (portalCode, taskId) => {
    const res = await fetch(`${API_BASE}/portal/${portalCode}/tasks/${taskId}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('שגיאה במחיקת משימה');
    return res.json();
  },

  addPortalSelfContent: async (portalCode, contentData) => {
    const res = await fetch(`${API_BASE}/portal/${portalCode}/content`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(contentData)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'שגיאה בהוספת תוכן למרחב האישי');
    }
    return res.json();
  },

  removePortalSelfContent: async (portalCode, contentId) => {
    const res = await fetch(`${API_BASE}/portal/${portalCode}/content/${contentId}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('שגיאה בהסרת תוכן מהמרחב');
    return res.json();
  },

  updatePortalSelfContent: async (portalCode, contentId, contentData) => {
    const res = await fetch(`${API_BASE}/portal/${portalCode}/content/${contentId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(contentData)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'שגיאה בעדכון התוכן');
    }
    return res.json();
  },

  loginSelfCare: async (data) => {
    const res = await fetch(`${API_BASE}/portal/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'שגיאה בהתחברות למרחב');
    }
    return res.json();
  },

  requestSelfCarePasswordReset: async (data) => {
    const res = await fetch(`${API_BASE}/portal/forgot-password/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'שגיאה בבקשת איפוס סיסמה');
    }
    return res.json();
  },

  resetSelfCarePassword: async (data) => {
    const res = await fetch(`${API_BASE}/portal/forgot-password/reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'שגיאה באיפוס הסיסמה');
    }
    return res.json();
  },

  // Portal Forms & Signatures
  getPortalForms: async (portalCode: string) => {
    const portalToken = typeof window !== 'undefined' ? localStorage.getItem('wisecare_portal_token') : null;
    const headers: Record<string, string> = {};
    if (portalToken) headers['Authorization'] = `Bearer ${portalToken}`;
    const res = await fetch(`${API_BASE}/portal/${encodeURIComponent(portalCode)}/forms`, {
      headers
    });
    if (!res.ok) {
      if (res.status === 403 || res.status === 404) return [];
      throw new Error('שגיאה בטעינת טפסי המרחב');
    }
    return res.json();
  },

  submitPortalFormSignature: async (
    portalCode: string,
    assignmentId: string,
    payload: { signatureData: string; signedName: string; answers?: Record<string, any> }
  ) => {
    const portalToken = typeof window !== 'undefined' ? localStorage.getItem('wisecare_portal_token') : null;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (portalToken) headers['Authorization'] = `Bearer ${portalToken}`;
    const res = await fetch(`${API_BASE}/portal/${encodeURIComponent(portalCode)}/forms/${encodeURIComponent(assignmentId)}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'שגיאה בשמירת החתימה');
    }
    return res.json();
  },

  setPortalCredentials: async (
    portalCode: string,
    payload: { username?: string; password?: string; otp?: string; requestOtp?: boolean }
  ) => {
    const res = await fetch(`${API_BASE}/portal/${encodeURIComponent(portalCode)}/set-credentials`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'שגיאה בהגדרת פרטי ההתחברות');
    }
    return res.json();
  },

  resetClientPasswordWhatsApp: async (clientId: string, payload?: { newPassword?: string }) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('wisecare_token') : null;
    const res = await fetch(`${API_BASE}/clients/${encodeURIComponent(clientId)}/reset-password-whatsapp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify(payload || {})
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'שגיאה באיפוס ושליחת הסיסמה בוואטסאפ');
    }
    return res.json();
  }
};

