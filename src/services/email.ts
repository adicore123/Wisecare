import nodemailer from 'nodemailer';
import { db } from '@/lib/db';

export interface EmailResult {
  sent: boolean;
  error?: string;
}

interface EmailConfig {
  fromAddress: string;
  fromName: string;
  appPassword: string;
}

/**
 * קונפיגורציית Gmail SMTP — קודם מההגדרות במסד (נערך בסופראדמין),
 * ואם ריק — נפילה למשתני סביבה. דפוס זהה ל-greenApi.ts.
 */
function resolveEmailConfig(): EmailConfig | null {
  const settings = db.getSettings();
  const fromAddress = (settings.emailFromAddress || process.env.GMAIL_USER || '').trim();
  const appPassword = (settings.emailAppPassword || process.env.GMAIL_APP_PASSWORD || '').trim();
  if (!fromAddress || !appPassword) {
    return null;
  }
  return {
    fromAddress,
    appPassword,
    fromName: (settings.emailFromName || 'WiseCare — המרחב האישי שלך').trim()
  };
}

/** האם המייל מוגדר (לתצוגת מצב בהגדרות ולהחלטות שליחה) */
export function isEmailConfigured(): boolean {
  return resolveEmailConfig() !== null;
}

export async function sendEmail(params: { to: string; subject: string; html: string }): Promise<EmailResult> {
  const config = resolveEmailConfig();
  if (!config) {
    return { sent: false, error: 'המייל אינו מוגדר — יש להשלים כתובת Gmail וסיסמת אפליקציה בהגדרות המערכת' };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: { user: config.fromAddress, pass: config.appPassword }
    });

    await transporter.sendMail({
      from: `"${config.fromName}" <${config.fromAddress}>`,
      to: params.to,
      subject: params.subject,
      html: params.html,
      // טקסט נקי כגיבוי ללקוחות מייל ללא HTML
      text: params.html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    });

    return { sent: true };
  } catch (err: any) {
    return { sent: false, error: err?.message || 'שגיאה בשליחת המייל' };
  }
}

/** בלוק פרטי כניסה במייל — מופיע כקוד על רקע כהה */
function detailBlock(label: string, value: string): string {
  return `
    <tr>
      <td style="padding:6px 14px 6px 0; font-size:14px; color:#5f6f84; font-weight:700; white-space:nowrap;">${label}</td>
      <td dir="ltr" style="padding:6px 12px; font-size:15px; color:#071426; background:#f6fafb; border:1px solid #dfe7ed; border-radius:8px; font-family:monospace; text-align:left;">${value}</td>
    </tr>
  `;
}

/**
 * מייל פרטי התחברות למרחב האישי — בעברית RTL, בעיצוב דף הנחיתה
 * (פלטת teal/navy של /space). inline CSS בלבד — תאימות לכל לקוחות המייל.
 */
export async function sendLoginDetailsEmail(params: {
  to: string;
  firstName?: string;
  username: string;
  password: string;
  portalUrl: string;
}): Promise<EmailResult> {
  const firstName = (params.firstName || '').trim();
  const greeting = firstName ? `שלום ${firstName} יקר/ה` : 'שלום';

  const html = `
<!DOCTYPE html>
<html lang="he" dir="rtl">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0; padding:0; background:#f6fafb; font-family:'Segoe UI', Arial, 'Helvetica Neue', sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6fafb; padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px; background:#ffffff; border-radius:18px; overflow:hidden; border:1px solid #dfe7ed;">

        <!-- פס עליון בצבע המותג -->
        <tr><td style="background:linear-gradient(135deg,#0d9488 0%,#0f766e 100%); padding:26px 28px; text-align:center;">
          <div style="font-size:21px; font-weight:900; color:#ffffff;">WiseCare</div>
          <div style="font-size:13px; color:#d3f3ee; margin-top:4px;">המרחב האישי שלך להתפתחות ולשיפור מצב הרוח</div>
        </td></tr>

        <tr><td style="padding:28px 28px 8px;">
          <h1 style="margin:0 0 10px; font-size:20px; color:#071426;">${greeting} — המרחב שלך מוכן! 🌿</h1>
          <p style="margin:0; font-size:15px; line-height:1.7; color:#40516a;">
            נשמרו לך כל פרטי הכניסה למרחב האישי. שמור/י מייל זה — הוא הדרך שלך חזרה אל המרחב בכל עת.
          </p>
        </td></tr>

        <!-- פרטי הכניסה -->
        <tr><td style="padding:14px 28px 4px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="6" style="border-collapse:separate;">
            ${detailBlock('🔗 הקישור למרחב', params.portalUrl)}
            ${detailBlock('👤 שם משתמש', params.username)}
            ${detailBlock('🔑 סיסמה', params.password)}
          </table>
        </td></tr>

        <!-- כפתור כניסה -->
        <tr><td style="padding:20px 28px 6px;" align="center">
          <a href="${params.portalUrl}"
             style="display:inline-block; background:linear-gradient(135deg,#0d9488 0%,#0f766e 100%); color:#ffffff; text-decoration:none; font-weight:800; font-size:16px; padding:14px 36px; border-radius:12px;">
            כניסה למרחב שלי
          </a>
        </td></tr>

        <tr><td style="padding:18px 28px 28px;">
          <p style="margin:0; font-size:12.5px; line-height:1.7; color:#7a899b; text-align:center; border-top:1px solid #f0f5f7; padding-top:14px;">
            המרחב מוצפן ופרטי — רק לך. אם לא נרשמת ל-WiseCare, ניתן להתעלם ממייל זה.
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return sendEmail({
    to: params.to,
    subject: 'המרחב האישי שלך מוכן — פרטי הכניסה 🌿',
    html
  });
}

/** מייל בדיקה מהגדרות הסופראדמין */
export async function sendTestEmail(to: string): Promise<EmailResult> {
  return sendEmail({
    to,
    subject: 'מייל ניסיון מ-WiseCare ✅',
    html: `
<!DOCTYPE html><html lang="he" dir="rtl"><head><meta charset="utf-8"></head>
<body style="margin:0; padding:24px; background:#f6fafb; font-family:'Segoe UI', Arial, sans-serif;">
  <table role="presentation" width="100%" style="max-width:480px; margin:0 auto; background:#fff; border-radius:16px; border:1px solid #dfe7ed; padding:26px;">
    <tr><td style="text-align:center;">
      <div style="font-size:34px;">✅</div>
      <h2 style="margin:10px 0 6px; color:#071426; font-size:18px;">החיבור ל-Gmail עובד!</h2>
      <p style="margin:0; color:#5f6f84; font-size:14px; line-height:1.6;">
        זהו מייל ניסיון מהגדרות האימייל של WiseCare.<br>
        מעכשיו פרטי ההתחברות של נרשמים חדשים יישלחו אליהם למייל באופן אוטומטי.
      </p>
    </td></tr>
  </table>
</body></html>`
  });
}
