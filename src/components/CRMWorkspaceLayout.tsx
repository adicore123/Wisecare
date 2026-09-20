"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname, useParams } from 'next/navigation';
import { 
  HeartHandshake, 
  ShieldCheck, 
  ArrowLeftRight, 
  Menu, 
  Copy, 
  LogOut 
} from 'lucide-react';
import Sidebar from './Sidebar';
import Toast from './Toast';
import { api } from '@/lib/api';

interface CRMWorkspaceLayoutProps {
  children: React.ReactNode;
}

export default function CRMWorkspaceLayout({ children }: CRMWorkspaceLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const loginCode = (params?.code as string) || '';

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [clientsCount, setClientsCount] = useState(0);
  const [pendingAppointmentsCount, setPendingAppointmentsCount] = useState(0);
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [toast, setToast] = useState<{ message: string; type?: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Load stored user
    const storedUserStr = localStorage.getItem('wisecare_user');
    const token = localStorage.getItem('wisecare_token');
    const impersonating = localStorage.getItem('wisecare_is_impersonating') === 'true' || !!localStorage.getItem('wisecare_admin_token');
    setIsImpersonating(impersonating);

    // The HttpOnly cookie is the source of truth. localStorage is only a UI
    // cache and may be cleared by mobile browsers or a PWA restart.
    if (storedUserStr) {
      try {
        setCurrentUser(JSON.parse(storedUserStr));
      } catch {}
    }

    api.getMe()
        .then((res: any) => {
          if (res?.user) {
            setCurrentUser(res.user);
            localStorage.setItem('wisecare_user', JSON.stringify(res.user));
            if (res.token) localStorage.setItem('wisecare_token', res.token);
          }
        })
        .catch(() => {
          // Token expired or invalid
          localStorage.removeItem('wisecare_token');
          localStorage.removeItem('wisecare_user');
          router.push('/login');
        });
  }, [router]);

  useEffect(() => {
    if (!currentUser) return;
    // Load clients count
    api.getClients(currentUser.id)
      .then((cls: any[]) => {
        if (Array.isArray(cls)) setClientsCount(cls.length);
      })
      .catch(() => {});

    // Load appointments count
    api.getAppointments({ therapistId: currentUser.id })
      .then((apts: any[]) => {
        if (Array.isArray(apts)) {
          const pending = apts.filter((a: any) => a.status === 'pending').length;
          setPendingAppointmentsCount(pending);
        }
      })
      .catch(() => {});
  }, [currentUser]);

  // Determine current tab from URL
  const getCurrentTab = () => {
    if (pathname.includes('/clients')) return 'clients';
    if (pathname.includes('/content')) return 'content';
    if (pathname.includes('/forms')) return 'forms';
    if (pathname.includes('/quotes')) return 'quotes';
    if (pathname.includes('/meetings')) return 'meetings';
    if (pathname.includes('/appointments')) return 'appointments';
    if (pathname.includes('/settings')) return 'settings';
    return 'clients';
  };

  const handleTabChange = (tab: string) => {
    const code = loginCode || currentUser?.loginCode || 'dr-sarah-8821';
    router.push(`/crm/${code}/${tab}`);
  };

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch {
      // Ignore
    }
    router.push('/login');
  };

  const handleExitImpersonation = async () => {
    try {
      const res = await api.exitImpersonation();
      if (res.token) {
        localStorage.setItem('wisecare_token', res.token);
      }
      if (res.user) {
        localStorage.setItem('wisecare_user', JSON.stringify(res.user));
      }
    } catch {
      const adminToken = localStorage.getItem('wisecare_admin_token');
      if (adminToken) {
        localStorage.setItem('wisecare_token', adminToken);
      }
    } finally {
      localStorage.removeItem('wisecare_admin_token');
      localStorage.removeItem('wisecare_is_impersonating');
      router.push('/superadmin');
    }
  };

  if (!currentUser) {
    return (
      <div className="grid min-h-dvh place-items-center bg-canvas px-6" role="status">
        <div className="flex items-center gap-3 rounded-surface border border-brand-100 bg-white px-5 py-4 text-sm font-bold text-brand-800 shadow-surface">
          <span className="size-2 animate-pulse rounded-full bg-brand-600 motion-reduce:animate-none" />
          טוען את המרחב הטיפולי...
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <a className="skip-link" href="#main-content">דלג לתוכן הראשי</a>

      {/* Sidebar */}
      <Sidebar 
        currentTab={getCurrentTab()}
        setCurrentTab={handleTabChange}
        currentUser={currentUser}
        clientsCount={clientsCount}
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
              type="button"
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
                    if (typeof window !== 'undefined') {
                      const fullUrl = `${window.location.origin}/crm/${currentUser.loginCode}`;
                      navigator.clipboard.writeText(fullUrl);
                      showToast('קישור המרחב הייחודי הועתק ללוח.');
                    }
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
            <button 
              onClick={handleLogout}
              className="btn btn-secondary"
              style={{ 
                fontSize: '0.82rem', 
                padding: '6px 14px',
                background: '#f8fafc',
                color: '#64748b',
                border: '1px solid #e2e8f0',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
              title="התנתקות מהמערכת"
            >
              <LogOut size={14} color="#ef4444" />
              <span>התנתקות</span>
            </button>

            <div className="navbar-user">
              <div className={`navbar-avatar ${currentUser.role === 'superadmin' ? 'is-admin' : ''}`} aria-hidden="true">
                {currentUser.name?.charAt(0) || 'U'}
              </div>
              <span className="navbar-user-name">{currentUser.name}</span>
            </div>
          </div>
        </header>

        {/* Content Body */}
        <main className="content-body" id="main-content" tabIndex={-1}>
          {children}
        </main>
      </div>

      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type || 'success'} 
          onClose={() => setToast(null)} 
        />
      )}
    </div>
  );
}
