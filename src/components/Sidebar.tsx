"use client";

import React, { useState } from 'react';
import {
  Users,
  Settings,
  ShieldCheck,
  HeartHandshake,
  LogOut,
  Sparkles,
  ArrowLeftRight,
  CalendarCheck,
  Library,
  FileSignature,
  Video,
  Webcam,
  X
} from 'lucide-react';
import PrivacyPolicyModal from './PrivacyPolicyModal';

export default function Sidebar({ 
  currentTab, 
  setCurrentTab, 
  currentUser, 
  clientsCount, 
  pendingAppointmentsCount = 0,
  isImpersonating, 
  onExitImpersonation,
  onLogout,
  isOpen = false,
  onClose
}) {
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);

  const handleNavClick = (tab) => {
    setCurrentTab(tab);
    if (onClose) onClose();
  };

  return (
    <>
      {isOpen && (
        <button type="button" className="sidebar-overlay" onClick={onClose} aria-label="סגור תפריט ניווט" />
      )}
      <aside className={`sidebar ${isOpen ? 'mobile-open' : ''}`} aria-label="ניווט ראשי">
        {/* Brand Header */}
        <div className="sidebar-header">
          <div className="brand-icon" aria-hidden="true">
            <HeartHandshake size={24} />
          </div>
          <div className="brand-info">
            <h2>WiseCare <Sparkles size={16} color="var(--sidebar-active-color)" /></h2>
            <span>מרחב טיפולי חכם</span>
          </div>
          {onClose && (
            <button 
              type="button" 
              className="mobile-close-btn" 
              onClick={onClose}
              aria-label="סגור תפריט ניווט"
            >
              <X size={20} />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav" aria-label="תפריט טיפולי">
          <div className="nav-section-title">תפריט טיפולי</div>

          <button 
            type="button"
            className={`nav-item ${currentTab === 'clients' ? 'active' : ''}`}
            onClick={() => handleNavClick('clients')}
            aria-current={currentTab === 'clients' ? 'page' : undefined}
          >
            <Users size={20} />
            <span>תיק לקוחות ומטופלים</span>
            {clientsCount > 0 && <span className="nav-badge" aria-label={`${clientsCount} מטופלים`}>{clientsCount}</span>}
          </button>

          <button
            type="button"
            className={`nav-item ${currentTab === 'content' ? 'active' : ''}`}
            onClick={() => handleNavClick('content')}
            aria-current={currentTab === 'content' ? 'page' : undefined}
          >
            <Library size={20} />
            <span>הספרייה הטיפולית</span>
          </button>

          <button
            type="button"
            className={`nav-item ${currentTab === 'forms' ? 'active' : ''}`}
            onClick={() => handleNavClick('forms')}
            aria-current={currentTab === 'forms' ? 'page' : undefined}
          >
            <FileSignature size={20} />
            <span>טפסים דיגיטליים וחתימות</span>
          </button>

          {currentUser?.videoCallsEnabled !== false && (
            <button
              type="button"
              className={`nav-item ${currentTab === 'meetings' ? 'active' : ''}`}
              onClick={() => handleNavClick('meetings')}
              aria-current={currentTab === 'meetings' ? 'page' : undefined}
            >
              <Webcam size={20} />
              <span>פגישות וידאו</span>
            </button>
          )}

          <button 
            type="button"
            className={`nav-item ${currentTab === 'appointments' ? 'active' : ''}`}
            onClick={() => handleNavClick('appointments')}
            aria-current={currentTab === 'appointments' ? 'page' : undefined}
          >
            <CalendarCheck size={20} />
            <span>יומן ותורים</span>
            {pendingAppointmentsCount > 0 && (
              <span className="nav-badge nav-badge-warning" aria-label={`${pendingAppointmentsCount} תורים ממתינים`}>
                {pendingAppointmentsCount}
              </span>
            )}
          </button>

          <button 
            type="button"
            className={`nav-item ${currentTab === 'settings' ? 'active' : ''}`}
            onClick={() => handleNavClick('settings')}
            aria-current={currentTab === 'settings' ? 'page' : undefined}
          >
          <Settings size={20} />
          <span>הגדרות קליניקה ומיתוג</span>
        </button>

        {currentUser?.role === 'superadmin' && (
          <>
            <div className="nav-section-title mt-6">ניהול מערכת</div>

            <button 
              type="button"
              className={`nav-item nav-item-admin ${currentTab === 'superadmin' ? 'active' : ''}`}
              onClick={() => handleNavClick('superadmin')}
              aria-current={currentTab === 'superadmin' ? 'page' : undefined}
            >
              <ShieldCheck size={20} className="text-indigo-300" aria-hidden="true" />
              <span>פאנל SuperAdmin</span>
            </button>
          </>
        )}
      </nav>

      {/* Impersonation exit notification */}
      {isImpersonating && (
        <div className="border-y border-amber-400/30 bg-amber-400/15 px-4 py-3">
          <button 
            type="button"
            onClick={onExitImpersonation}
            className="btn btn-secondary w-full text-[0.82rem]"
          >
            <ArrowLeftRight size={14} /> חזור לחשבון מנהל ראשי
          </button>
        </div>
      )}

      {/* Footer / Profile */}
      <div className="sidebar-footer">
        <div className="user-profile-badge">
          <div className="user-avatar">
            {currentUser?.name ? currentUser.name.charAt(0) : 'מ'}
          </div>
          <div className="user-meta">
            <div className="user-name">{currentUser?.name || 'משתמש'}</div>
            <div className="user-role">
              {currentUser?.role === 'superadmin' ? 'מנהל מערכת ראשי' : (currentUser?.title || 'מטפל/ת')}
            </div>
          </div>
          <button 
            type="button"
            onClick={onLogout}
            aria-label="התנתק מהמערכת"
            className="btn-icon text-slate-400 hover:text-white"
          >
            <LogOut size={18} />
          </button>
        </div>

        {/* Privacy Policy Link in Sidebar */}
        <button
          type="button"
          onClick={() => setIsPrivacyOpen(true)}
          className="mt-2 flex min-h-11 w-full cursor-pointer items-center justify-center gap-1.5 border-0 bg-transparent px-0 pb-0.5 pt-2 text-xs text-slate-400 transition-colors hover:text-slate-200"
        >
          <ShieldCheck size={13} />
          <span>מדיניות פרטיות ואבטחה</span>
        </button>
      </div>
    </aside>

    {/* Privacy Policy Modal */}
    <PrivacyPolicyModal
      isOpen={isPrivacyOpen}
      onClose={() => setIsPrivacyOpen(false)}
    />
  </>
  );
}
