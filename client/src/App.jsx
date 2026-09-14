import React, { lazy, Suspense, useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import SuperAdminLoginModal from './components/SuperAdminLoginModal';
import Toast from './components/Toast';
import PWAInstallBanner from './components/PWAInstallBanner';
import { api } from './api';
import { ShieldCheck, ArrowLeftRight, HeartHandshake, LogOut, ShieldAlert, Key, Menu, Copy } from 'lucide-react';
import { applyTheme, getStoredTheme } from './utils/theme';

const ClientsPage = lazy(() => import('./pages/ClientsPage'));
const ClientPortalPage = lazy(() => import('./pages/ClientPortalPage'));
const SuperAdminPage = lazy(() => import('./pages/SuperAdminPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const AppointmentsPage = lazy(() => import('./pages/AppointmentsPage'));
const TherapistLoginPage = lazy(() => import('./pages/TherapistLoginPage'));
const JoinPage = lazy(() => import('./pages/JoinPage'));
const ContentLibraryPage = lazy(() => import('./pages/ContentLibraryPage'));

function PageFallback() {
  return (
    <div className="grid min-h-dvh place-items-center bg-canvas px-6" role="status" aria-live="polite">
      <div className="flex items-center gap-3 rounded-surface border border-brand-100 bg-white px-5 py-4 text-sm font-bold text-brand-800 shadow-surface">
        <span className="size-2 animate-pulse rounded-full bg-brand-600 motion-reduce:animate-none" aria-hidden="true" />
        טוען את המרחב הטיפולי...
      </div>
    </div>
  );
}

function getStoredUser() {
  try {
    const u = localStorage.getItem('wisecare_user');
    return u ? JSON.parse(u) : null;
  } catch {
    return null;
  }
}

export default function App() {
  // Check URL pathname on mount
  const getInitialRoute = () => {
    const path = window.location.pathname;
    if (path === '/join' || path === '/start' || path === '/self-care') {
      return { view: 'join', portalCode: null, loginCode: null };
    }
    if (path === '/crm-share') {
      return { view: 'content', portalCode: null, loginCode: null };
    }
    if (path.startsWith('/portal/')) {
      return { view: 'portal', portalCode: path.replace('/portal/', ''), loginCode: null };
    }
    if (path.startsWith('/login/')) {
      return { view: 'therapist-login', loginCode: path.replace('/login/', ''), portalCode: null };
    }
    if (path.startsWith('/admin-login/')) {
      return { view: 'therapist-login', loginCode: path.replace('/admin-login/', ''), portalCode: null };
    }
    if (path.startsWith('/crm/') || path.startsWith('/workspace/')) {
      const clean = path.replace('/crm/', '').replace('/workspace/', '');
      const parts = clean.split('/');
      const loginCode = parts[0];
      const subView = parts[1] || 'clients';
      return { view: subView, loginCode, portalCode: null };
    }
    if (path === '/superadmin') {
      return { view: 'superadmin', portalCode: null, loginCode: null };
    }
    
    // For root path '/': check if user is already authenticated
    const storedUser = getStoredUser();
    const token = localStorage.getItem('wisecare_token');
    if (storedUser && token) {
      if (storedUser.role === 'superadmin') {
        return { view: 'superadmin', portalCode: null, loginCode: null };
      }
      return { view: 'clients', loginCode: storedUser.loginCode || null, portalCode: null };
    }

    // Default for unauthenticated root: staff & admin login page!
    return { view: 'therapist-login', loginCode: null, portalCode: null };
  };

  const [route, setRoute] = useState(getInitialRoute);

  // User state - initialize from storage or null if not logged in
  const [currentUser, setCurrentUser] = useState(getStoredUser);

  const [superadminUser, setSuperadminUser] = useState({
    id: 'superadmin-1',
    name: 'מנהל מערכת ראשי (SuperAdmin)',
    role: 'superadmin',
    username: 'adicore123'
  });

  const [isSuperAdminAuth, setIsSuperAdminAuth] = useState(() => {
    const u = getStoredUser();
    return u?.role === 'superadmin';
  });
  const [isSuperAdminLoginOpen, setIsSuperAdminLoginOpen] = useState(false);
  const [appToast, setAppToast] = useState(null);

  const showAppToast = (message, type = 'success') => {
    setAppToast({ message, type });
    setTimeout(() => setAppToast(null), 3500);
  };

  const [isImpersonating, setIsImpersonating] = useState(false);
  const [clients, setClients] = useState([]);
  const [, setLoading] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [pendingAppointmentsCount, setPendingAppointmentsCount] = useState(0);

  // Sync browser back/forward
  useEffect(() => {
    const handlePopState = () => {
      setRoute(getInitialRoute());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Validate session on mount
  useEffect(() => {
    const token = localStorage.getItem('wisecare_token');
    if (token) {
      api.getMe().then(res => {
        if (res && res.user) {
          setCurrentUser(res.user);
          localStorage.setItem('wisecare_user', JSON.stringify(res.user));
          if (res.user.role === 'superadmin') {
            setIsSuperAdminAuth(true);
            setSuperadminUser(res.user);
          }
        }
      }).catch(() => {
        localStorage.removeItem('wisecare_token');
        localStorage.removeItem('wisecare_user');
        setCurrentUser(null);
        setIsSuperAdminAuth(false);
        const path = window.location.pathname;
        if (!path.startsWith('/portal') && path !== '/join' && path !== '/start' && path !== '/self-care') {
          window.history.pushState({}, '', '/');
          setRoute({ view: 'therapist-login', loginCode: null, portalCode: null });
        }
      });
    }
  }, []);

  // Initialize and apply theme from storage and database
  useEffect(() => {
    const stored = getStoredTheme();
    if (stored) applyTheme(stored.id);

    api.getSettings().then(s => {
      if (s?.themeId) {
        applyTheme(s.themeId);
      }
    }).catch(() => {});
  }, []);

  const loadClients = useCallback(async () => {
    if (!currentUser) return;
    try {
      setLoading(true);
      const data = await api.getClients(currentUser.role === 'therapist' ? currentUser.id : null);
      setClients(data);

      // Also check pending appointments count
      try {
        const apts = await api.getAppointments({
          therapistId: currentUser.role === 'therapist' ? currentUser.id : null,
          status: 'pending'
        });
        setPendingAppointmentsCount(apts ? apts.length : 0);
      } catch (aptErr) {
        console.warn('Could not fetch pending appointments count:', aptErr);
      }
    } catch (err) {
      console.error('Failed to load clients:', err);
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id, currentUser?.role]);

  // Fetch clients for current therapist
  useEffect(() => {
    if (route.view !== 'portal' && route.view !== 'therapist-login' && route.view !== 'join') {
      // If loaded /crm/:loginCode directly and currentUser doesn't match
      if (route.loginCode && currentUser?.loginCode !== route.loginCode) {
        api.getTherapistLoginInfo(route.loginCode).then(therapistInfo => {
          if (therapistInfo && therapistInfo.id) {
            setCurrentUser(prev => ({
              ...prev,
              id: therapistInfo.id,
              name: therapistInfo.name,
              title: therapistInfo.title,
              username: therapistInfo.username,
              loginCode: route.loginCode,
              role: 'therapist'
            }));
          }
        }).catch(() => {});
      }
      loadClients();
    }
  }, [currentUser?.loginCode, loadClients, route.loginCode, route.view]);

  const handleNavigateToPortal = (portalCode) => {
    window.history.pushState({}, '', `/portal/${portalCode}`);
    setRoute({ view: 'portal', portalCode, loginCode: null });
  };

  const handleTabChange = (tab) => {
    if (tab === 'superadmin') {
      if (!isSuperAdminAuth) {
        setIsSuperAdminLoginOpen(true);
        return;
      }
      window.history.pushState({}, '', '/superadmin');
      setRoute({ view: tab, portalCode: null, loginCode: null });
    } else {
      const code = currentUser?.loginCode || route.loginCode;
      if (currentUser?.role === 'therapist' && code) {
        const url = tab === 'clients' ? `/crm/${code}` : `/crm/${code}/${tab}`;
        window.history.pushState({}, '', url);
        setRoute({ view: tab, loginCode: code, portalCode: null });
      } else {
        window.history.pushState({}, '', '/');
        setRoute({ view: tab, portalCode: null, loginCode: null });
      }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('wisecare_token');
    localStorage.removeItem('wisecare_user');
    setCurrentUser(null);
    setIsSuperAdminAuth(false);
    setIsImpersonating(false);
    window.history.pushState({}, '', '/');
    setRoute({ view: 'therapist-login', loginCode: null, portalCode: null });
    showAppToast('התנתקת בהצלחה מהמערכת.');
  };

  const handleSuperAdminLoginSuccess = (adminUser, token) => {
    if (token) localStorage.setItem('wisecare_token', token);
    localStorage.setItem('wisecare_user', JSON.stringify(adminUser));
    setIsSuperAdminAuth(true);
    setSuperadminUser(adminUser);
    setCurrentUser(adminUser);
    setIsImpersonating(false);
    window.history.pushState({}, '', '/superadmin');
    setRoute({ view: 'superadmin', portalCode: null, loginCode: null });
    showAppToast('אימות SuperAdmin הצליח. ברוך הבא לפאנל הניהול הראשי.');
  };

  const handleLockSuperAdmin = () => {
    handleLogout();
  };

  // SuperAdmin impersonation into a therapist environment
  const handleImpersonate = (therapist, token) => {
    if (token) localStorage.setItem('wisecare_token', token);
    setCurrentUser(therapist);
    setIsImpersonating(true);
    const code = therapist.loginCode || therapist.id;
    window.history.pushState({}, '', `/crm/${code}`);
    setRoute({ view: 'clients', loginCode: code, portalCode: null });
    showAppToast(`התחברת בהצלחה למרחב הטיפול של ${therapist.name} (כתובת: /crm/${code}).`);
  };

  const handleExitImpersonation = () => {
    setCurrentUser(superadminUser);
    setIsImpersonating(false);
    window.history.pushState({}, '', '/superadmin');
    setRoute({ view: 'superadmin', portalCode: null, loginCode: null });
  };

  // Switch role: therapist <-> locked SuperAdmin
  const handleToggleRole = () => {
    if (currentUser?.role === 'superadmin' || isSuperAdminAuth) {
      handleLockSuperAdmin();
    } else {
      setIsSuperAdminLoginOpen(true);
    }
  };

  // Client operations
  const handleCreateClient = async (formData) => {
    const res = await api.createClient({
      therapistId: currentUser.id,
      ...formData
    });
    await loadClients();
    return res;
  };

  const handleDeleteClient = async (clientId) => {
    await api.deleteClient(clientId);
    await loadClients();
  };

  const handleSendWhatsApp = async (clientId, customMessage) => {
    return await api.sendWhatsApp(clientId, customMessage);
  };

  const handleAddTask = async (taskData) => {
    const res = await api.createTask({
      therapistId: currentUser.id,
      ...taskData
    });
    return res;
  };

  const handleDeleteTask = async (taskId) => {
    return await api.deleteTask(taskId);
  };

  // If viewing self-care registration (/join)
  if (route.view === 'join') {
    return <Suspense fallback={<PageFallback />}><JoinPage /></Suspense>;
  }

  // If viewing patient portal (strictly locked to patient - no admin controls or escape routes)
  if (route.view === 'portal') {
    return (
      <Suspense fallback={<PageFallback />}>
        <ClientPortalPage portalCode={route.portalCode} />
      </Suspense>
    );
  }

  // If viewing SuperAdmin route (/superadmin)
  if (route.view === 'superadmin') {
    if (isSuperAdminAuth && currentUser?.role === 'superadmin') {
      return (
        <div className="app-container">
          <div className="main-wrapper w-full">
            {/* Top Navbar */}
            <header className="top-navbar bg-white">
              <div className="top-navbar-context">
                <div className="flex items-center gap-2.5">
                  <div className="grid size-9 place-items-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-950/15">
                    <ShieldCheck size={20} aria-hidden="true" />
                  </div>
                  <div>
                    <h1 className="m-0 text-[1.05rem] font-extrabold text-slate-950">
                      WiseCare SuperAdmin
                    </h1>
                    <span className="text-[0.78rem] text-slate-500">
                      ניהול מערכת ראשי • כל הקליניקות והלקוחות
                    </span>
                  </div>
                </div>
              </div>

              <div className="top-navbar-actions">
                <button 
                  onClick={handleLogout}
                  className="btn btn-secondary border-red-200 bg-red-50 text-[0.82rem] text-red-700 hover:bg-red-100"
                  title="התנתקות מפאנל SuperAdmin"
                >
                  <LogOut size={14} />
                  <span>התנתקות</span>
                </button>

                <div className="navbar-user">
                  <div className="navbar-avatar is-admin">
                    {currentUser.name ? currentUser.name.charAt(0) : 'S'}
                  </div>
                  <span className="navbar-user-name">{currentUser.name}</span>
                </div>
              </div>
            </header>

            <main className="main-content">
              <Suspense fallback={<PageFallback />}>
                <SuperAdminPage 
                  currentAdmin={currentUser}
                  onImpersonateTherapist={handleImpersonate}
                  onBackToTherapist={() => handleTabChange('clients')}
                />
              </Suspense>
            </main>
          </div>
          {appToast && (
            <Toast 
              message={appToast.message} 
              type={appToast.type} 
              onClose={() => setAppToast(null)} 
            />
          )}
        </div>
      );
    }

    // If NOT authenticated as superadmin: Dedicated, high-security SuperAdmin Login Page directly on /superadmin!
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-slate-950 p-6 text-right" dir="rtl">
        <div className="relative w-full max-w-[460px] overflow-hidden rounded-3xl border border-white/10 bg-white px-8 py-9 text-center shadow-2xl shadow-black/40">
          {/* Top accent line */}
          <div className="absolute inset-x-0 top-0 h-1.5 bg-indigo-600" />

          <div className="mx-auto mb-5 grid size-[72px] place-items-center rounded-full bg-indigo-600 text-white shadow-xl shadow-indigo-950/25">
            <ShieldCheck size={36} aria-hidden="true" />
          </div>

          <h2 className="mb-1.5 text-2xl font-extrabold text-slate-950">
            אימות SuperAdmin
          </h2>
          <p className="mb-6 text-sm leading-6 text-slate-500">
            מתחם ניהול ראשי מאובטח • הזן פרטי גישה ייעודיים למערכת
          </p>

          <form onSubmit={async (e) => {
            e.preventDefault();
            const form = e.target;
            const u = form.username.value.trim();
            const p = form.password.value.trim();
            if (!u || !p) return;
            try {
              const res = await api.login(u, p);
              if (res.user?.role !== 'superadmin') {
                throw new Error('חשבון זה אינו מוגדר כמנהל מערכת ראשי (SuperAdmin)');
              }
              handleSuperAdminLoginSuccess(res.user, res.token);
            } catch (err) {
              showAppToast(err.message || 'שם משתמש או סיסמה שגויים', 'error');
            }
          }} className="text-right">
            <div className="mb-4">
              <label htmlFor="superadmin-username" className="mb-1.5 block text-sm font-bold text-slate-700">
                שם משתמש מנהל ראשי *
              </label>
              <input 
                type="text"
                id="superadmin-username"
                name="username"
                required
                className="form-control"
                dir="ltr"
                placeholder="הזן שם משתמש"
              />
            </div>

            <div className="mb-[22px]">
              <label htmlFor="superadmin-password" className="mb-1.5 block text-sm font-bold text-slate-700">
                סיסמת גישה מאובטחת *
              </label>
              <input 
                type="password"
                id="superadmin-password"
                name="password"
                required
                className="form-control"
                dir="ltr"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              className="btn min-h-12 w-full cursor-pointer rounded-xl bg-indigo-600 text-base font-bold text-white shadow-lg shadow-indigo-950/20 hover:bg-indigo-700"
            >
              <Key size={18} />
              <span>כניסה לפאנל SuperAdmin</span>
            </button>
          </form>

          <div className="mt-5 border-t border-slate-100 pt-4">
            <a 
              href="/login" 
              className="text-[0.82rem] font-semibold text-indigo-600 no-underline hover:text-indigo-800"
            >
              ← מעבר לדף התחברות מטפלים
            </a>
          </div>
        </div>

        {appToast && (
          <Toast 
            message={appToast.message} 
            type={appToast.type} 
            onClose={() => setAppToast(null)} 
          />
        )}
      </div>
    );
  }

  // If viewing therapist/staff login screen or not authenticated on a protected route
  if (route.view === 'therapist-login' || (!currentUser && route.view !== 'content' && route.view !== 'superadmin')) {
    return (
      <>
        <Suspense fallback={<PageFallback />}>
          <TherapistLoginPage 
            loginCode={route.loginCode || null}
          onLoginSuccess={(loggedUser, token) => {
            if (token) localStorage.setItem('wisecare_token', token);
            localStorage.setItem('wisecare_user', JSON.stringify(loggedUser));
            setCurrentUser(loggedUser);
            if (loggedUser.role === 'superadmin') {
              setIsSuperAdminAuth(true);
              setSuperadminUser(loggedUser);
              setIsImpersonating(false);
              window.history.pushState({}, '', '/superadmin');
              setRoute({ view: 'superadmin', portalCode: null, loginCode: null });
              showAppToast('התחברת בהצלחה כמנהל מערכת ראשי.');
            } else {
              setIsSuperAdminAuth(false);
              setIsImpersonating(false);
              const code = loggedUser.loginCode || route.loginCode;
              window.history.pushState({}, '', code ? `/crm/${code}` : '/');
              setRoute({ view: 'clients', loginCode: code, portalCode: null });
              showAppToast(`ברוך/ה הבא/ה למרחב הטיפולי, ${loggedUser.name}.`);
            }
          }}
          />
        </Suspense>
        {appToast && (
          <Toast 
            message={appToast.message} 
            type={appToast.type} 
            onClose={() => setAppToast(null)} 
          />
        )}
      </>
    );
  }

  return (
    <div className="app-container">
      <a className="skip-link" href="#main-content">דלג לתוכן הראשי</a>
      {/* Sidebar */}
      <Sidebar 
        currentTab={route.view}
        setCurrentTab={(tab) => {
          handleTabChange(tab);
          setMobileMenuOpen(false);
        }}
        currentUser={currentUser}
        clientsCount={clients.length}
        pendingAppointmentsCount={pendingAppointmentsCount}
        isImpersonating={isImpersonating}
        onExitImpersonation={handleExitImpersonation}
        onLogout={handleLogout}
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />

      {/* Main Workspace */}
      <div className="main-wrapper">
        {/* Impersonation Banner */}
        {isImpersonating && (
          <div className="impersonation-banner">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <ShieldCheck size={18} />
              <span>
                מצב מנהל ראשי: אתה מחובר כעת בסביבת העבודה של <strong>{currentUser.name}</strong> ({currentUser.title})
              </span>
              <code style={{
                background: 'rgba(255, 255, 255, 0.25)',
                color: '#ffffff',
                padding: '2px 8px',
                borderRadius: '6px',
                fontSize: '0.78rem',
                fontFamily: 'monospace',
                direction: 'ltr',
                fontWeight: 700
              }}>
                /crm/{currentUser.loginCode || 'workspace'}
              </code>
            </div>
            <button 
              onClick={handleExitImpersonation}
              className="btn btn-secondary"
              style={{ padding: '4px 12px', fontSize: '0.8rem' }}
            >
              <ArrowLeftRight size={14} /> חזור לפאנל SuperAdmin
            </button>
          </div>
        )}

        {/* Top Navbar */}
        <header className="top-navbar">
          <div className="top-navbar-context">
            <button 
              type="button" 
              className="mobile-menu-btn" 
              onClick={() => setMobileMenuOpen(true)}
              aria-label="פתח תפריט ניווט"
            >
              <Menu size={22} />
            </button>
            <span className="top-navbar-label">
              קליניקה מחוברת:
            </span>
            <span className="clinic-pill">
              <HeartHandshake size={16} aria-hidden="true" />
              {currentUser.role === 'superadmin' ? 'פאנל ניהול גלובלי' : currentUser.name}
            </span>

            {currentUser.role === 'therapist' && currentUser.loginCode && (
              <div className="workspace-address">
                <span>כתובת המרחב:</span>
                <code>
                  /crm/{currentUser.loginCode}
                </code>
                <button
                  type="button"
                  onClick={() => {
                    const fullUrl = `${window.location.origin}/crm/${currentUser.loginCode}`;
                    navigator.clipboard.writeText(fullUrl);
                    showAppToast('קישור המרחב הייחודי הועתק ללוח.');
                  }}
                  className="workspace-copy-btn"
                  aria-label="העתק קישור מלא למרחב"
                >
                  <Copy size={13} />
                </button>
              </div>
            )}
          </div>

          <div className="top-navbar-actions">
            {/* SuperAdmin Access Lock/Unlock Button - only displayed when superadmin is authenticated */}
            {isSuperAdminAuth && (
              <button 
                onClick={handleToggleRole}
                className="btn btn-secondary"
                style={{ 
                  fontSize: '0.82rem', 
                  padding: '6px 14px',
                  background: '#f1f5f9',
                  color: '#475569',
                  border: '1px solid #cbd5e1'
                }}
                title="נעילת פאנל SuperAdmin והתנתקות"
              >
                <LogOut size={14} color="#ef4444" />
                <span>יציאה מ-SuperAdmin</span>
              </button>
            )}

            <div className="navbar-user">
              <div className={`navbar-avatar ${currentUser.role === 'superadmin' ? 'is-admin' : ''}`} aria-hidden="true">
                {currentUser.name.charAt(0)}
              </div>
              <span className="navbar-user-name">{currentUser.name}</span>
            </div>
          </div>
        </header>

        {/* Content Body */}
        <main className="content-body" id="main-content" tabIndex="-1">
          <Suspense fallback={<PageFallback />}>
          {route.view === 'clients' && (
            <ClientsPage 
              clients={clients}
              onRefresh={loadClients}
              onCreateClient={handleCreateClient}
              onDeleteClient={handleDeleteClient}
              onSendWhatsApp={handleSendWhatsApp}
              onAddTask={handleAddTask}
              onDeleteTask={handleDeleteTask}
              currentTherapist={currentUser}
              onNavigateToPortal={handleNavigateToPortal}
            />
          )}

          {route.view === 'superadmin' && (
            isSuperAdminAuth ? (
              <SuperAdminPage 
                currentAdmin={currentUser.role === 'superadmin' ? currentUser : superadminUser}
                onImpersonateTherapist={handleImpersonate}
                onBackToTherapist={() => handleTabChange('clients')}
              />
            ) : (
              <div style={{
                maxWidth: '520px',
                margin: '60px auto',
                background: 'white',
                padding: '40px 32px',
                borderRadius: '24px',
                boxShadow: '0 20px 40px rgba(15, 23, 42, 0.08)',
                border: '1px solid #e2e8f0',
                textAlign: 'center'
              }}>
                <div style={{
                  width: '72px',
                  height: '72px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
                  color: '#dc2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 20px auto',
                  boxShadow: '0 8px 16px rgba(220, 38, 38, 0.15)'
                }}>
                  <ShieldAlert size={36} />
                </div>

                <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
                  מתחם SuperAdmin מאובטח ונעול
                </h2>
                <p style={{ color: '#64748b', fontSize: '0.92rem', lineHeight: '1.6', marginBottom: '28px' }}>
                  אזור זה מוגן ומיועד אך ורק למנהל המערכת הראשי של WiseCare.
                  <br />
                  לצפייה בנתוני כלל הקליניקות וביצוע פעולות מערכתיות, נדרש אימות עם שם משתמש וסיסמה ייעודיים.
                </p>

                <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
                  <button 
                    onClick={() => handleTabChange('clients')}
                    className="btn btn-secondary"
                    style={{ padding: '10px 20px', fontSize: '0.9rem' }}
                  >
                    חזרה לקליניקה
                  </button>

                  <button 
                    onClick={() => setIsSuperAdminLoginOpen(true)}
                    className="btn btn-primary"
                    style={{ 
                      padding: '10px 24px', 
                      fontSize: '0.9rem',
                      background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
                      boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)'
                    }}
                  >
                    <Key size={16} />
                    <span>הזן סיסמת SuperAdmin</span>
                  </button>
                </div>
              </div>
            )
          )}

          {route.view === 'appointments' && (
            <AppointmentsPage 
              clients={clients}
              currentUser={currentUser}
              clinicSettings={null}
            />
          )}

          {route.view === 'content' && (
            <Suspense fallback={<div className="content-empty" role="status"><span>טוען את הספרייה הטיפולית...</span></div>}>
              <ContentLibraryPage
                currentTherapist={currentUser}
                clients={clients}
              />
            </Suspense>
          )}

          {route.view === 'settings' && (
            <SettingsPage />
          )}
          </Suspense>
        </main>
      </div>

      {/* SuperAdmin Secure Login Modal */}
      <SuperAdminLoginModal 
        isOpen={isSuperAdminLoginOpen}
        onClose={() => setIsSuperAdminLoginOpen(false)}
        onSuccess={handleSuperAdminLoginSuccess}
      />

      {/* App-wide Toast Notification */}
      {appToast && (
        <Toast 
          message={appToast.message} 
          type={appToast.type} 
          onClose={() => setAppToast(null)} 
        />
      )}
      {/* PWA Mobile Install Banner (RTL) */}
      <PWAInstallBanner />
    </div>
  );
}
