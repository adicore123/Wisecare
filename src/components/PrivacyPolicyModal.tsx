"use client";

import React from 'react';
import { 
  ShieldCheck, 
  Lock, 
  FileText, 
  EyeOff, 
  Trash2, 
  HeartHandshake, 
  HelpCircle, 
  X,
  Sparkles
} from 'lucide-react';

export default function PrivacyPolicyModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
      <div 
        className="modal-card" 
        onClick={e => e.stopPropagation()} 
        style={{ 
          maxWidth: '680px', 
          maxHeight: '85vh', 
          display: 'flex', 
          flexDirection: 'column' 
        }}
      >
        {/* Header */}
        <div className="modal-header" style={{ padding: '18px 24px', background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, var(--primary-faint) 0%, var(--primary-light) 100%)',
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px color-mix(in srgb, var(--primary) 15%, transparent)'
            }}>
              <ShieldCheck size={24} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
                מדיניות פרטיות ואבטחת מידע רפואי
              </h3>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
                מחויבות WiseCare להגנה קפדנית על פרטיותך וסודיות המידע הרגשי והטיפולי
              </p>
            </div>
          </div>
          <button 
            type="button" 
            className="close-btn" 
            onClick={onClose}
            aria-label="סגור מדיניות פרטיות"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div className="modal-body" style={{ padding: '24px', overflowY: 'auto', lineHeight: '1.65', color: '#334155', fontSize: '0.9rem' }}>
          
          {/* Important Highlight Box: Self-Care Independent Users */}
          <div style={{
            background: 'linear-gradient(135deg, var(--primary-faint) 0%, var(--primary-light) 100%)',
            border: '1px solid color-mix(in srgb, var(--primary) 40%, white)',
            borderRadius: '14px',
            padding: '16px 18px',
            marginBottom: '20px',
            boxShadow: '0 2px 8px color-mix(in srgb, var(--primary) 8%, transparent)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: 'var(--primary-hover)' }}>
              <Sparkles size={18} />
              <strong style={{ fontSize: '0.98rem' }}>הגנה מוחלטת על לקוחות עצמאיים (Self-Care – ללא מטפל)</strong>
            </div>
            <p style={{ margin: 0, fontSize: '0.86rem', color: 'var(--primary-hover)' }}>
              אם נרשמת למערכת באופן עצמאי לצורך תרגול, יומן אישי ונשימות – <strong>המרחב שלך מוגן, אישי וסודי ב-100%</strong>.
              היומן האישי, התובנות, מעקב מצב הרוח והמשימות שלך <strong>אינם גלויים, אינם משותפים ואינם נגישים לאף מטפל חיצוני במערכת</strong>.
            </p>
          </div>

          {/* Section 1: Introduction */}
          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.02rem', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
              <HeartHandshake size={18} color="#4f46e5" />
              <span>1. מבוא והתחייבות לחיסיון מלא</span>
            </h4>
            <p style={{ margin: 0 }}>
              פלטפורמת <strong>WiseCare</strong> פותחה מתוך כבוד עמוק ורגישות מירבית לפרטיותם של מטופלים, מתרגלים ומטפלים.
              אנו פועלים בהתאם להוראות <strong>חוק הגנת הפרטיות, התשמ"א-1981</strong>, תקנות הגנת הפרטיות (אבטחת מידע), התשע"ז-2017, וכללי האתיקה והחיסיון הרפואי-פסיכולוגי המחמירים ביותר.
            </p>
          </div>

          {/* Section 2: Types of Data Collected */}
          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.02rem', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
              <FileText size={18} color="#0284c7" />
              <span>2. המידע הנאסף והשימוש בו</span>
            </h4>
            <p style={{ margin: '0 0 8px 0' }}>
              אנו אוספים אך ורק מידע הנחוץ באופן ישיר לתפעול המרחב האישי והקליניקה שלך:
            </p>
            <ul style={{ paddingRight: '20px', margin: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <li><strong>פרטי זיהוי והתקשרות:</strong> שם, מספר טלפון נייד וכתובת אימייל לצורך התחברות ושחזור סיסמה מאובטח.</li>
              <li><strong>נתוני תרגול ויומן אישי:</strong> תובנות, רפלקציות, משימות יומיומיות, מעקב מצב רוח ותרגילי נשימה.</li>
              <li><strong>פגישות ותיאום תורים:</strong> מועדי פגישות ובקשות לתורים בין מטופל למטפלו האישי.</li>
            </ul>
          </div>

          {/* Section 3: Data Security & Cryptography */}
          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.02rem', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
              <Lock size={18} color="#e11d48" />
              <span>3. אבטחת מידע והצפנה קריפטוגרפית</span>
            </h4>
            <p style={{ margin: '0 0 8px 0' }}>
              המערכת מיישמת שכבות אבטחה מתקדמות להגנה מפני חדירה או גישה בלתי מורשית:
            </p>
            <ul style={{ paddingRight: '20px', margin: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <li><strong>הצפנת סיסמאות חזקה:</strong> כל הסיסמאות מגובבות באמצעות אלגוריתם <code>scrypt</code> עם Salt ייחודי. אף גורם (כולל מנהלי המערכת) אינו רואה את סיסמתך הגלויה.</li>
              <li><strong>אימות זהות מבוסס טוקנים חתומים:</strong> אימות מאובטח ב-JSON Web Tokens (JWT) עם פקיעת תוקף אוטומטית.</li>
              <li><strong>הגנת תקשורת והגבלת גישה:</strong> שימוש בפרוטוקול תקשורת מוצפן (HTTPS/TLS), מדיניות CSP קפדנית והגבלת קצב בקשות (Rate Limiting) למניעת התקפות.</li>
            </ul>
          </div>

          {/* Section 4: Non-Disclosure */}
          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.02rem', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
              <EyeOff size={18} color="#d97706" />
              <span>4. אי-העברת מידע לצדדים שלישיים</span>
            </h4>
            <p style={{ margin: 0 }}>
              <strong>לעולם איננו מוכרים, משכירים או מוסרים מידע אישי או רפואי לצדדים שלישיים, מפרסמים או גופי שיווק.</strong>
              המידע משמש אך ורק את המשתמש ומטפלו האישי (במידה ומשויך לקליניקה) במסגרת מתן השירות בלבד.
            </p>
          </div>

          {/* Section 5: User Rights and Deletion */}
          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.02rem', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
              <Trash2 size={18} color="var(--primary)" />
              <span>5. זכויותיך על המידע והזכות להישכח</span>
            </h4>
            <p style={{ margin: 0 }}>
              בהתאם לחוק, שמורה לך הזכות לעיין במידע שנצבר אודותיך, לבקש לתקנו, או לבקש <strong>מחיקה מלאה ולצמיתות של החשבון וכל המידע המקושר אליו</strong> בכל עת.
            </p>
          </div>

          {/* Section 6: Contact */}
          <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '14px 16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>
              <HelpCircle size={16} color="#6366f1" />
              <span>יצירת קשר עם ממונה הגנת הפרטיות</span>
            </div>
            <p style={{ margin: 0, fontSize: '0.84rem', color: '#64748b' }}>
              בכל שאלה, בקשת הבהרה, מימוש זכויות עיון או מחיקה, ניתן לפנות ישירות לצוות האבטחה בכתובת: <code>privacy@wisecare.health</code>
            </p>
          </div>

        </div>

        {/* Footer */}
        <div className="modal-footer" style={{ padding: '14px 24px', background: '#f8fafc' }}>
          <button 
            type="button" 
            className="btn btn-primary" 
            onClick={onClose}
            style={{ minWidth: '110px' }}
          >
            הבנתי ואישרתי
          </button>
        </div>
      </div>
    </div>
  );
}
