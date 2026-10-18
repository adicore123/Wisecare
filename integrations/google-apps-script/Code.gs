/**
 * WiseCare Space — paste this entire file into Code.gs (Apps Script V8).
 * Script Properties: WEBHOOK_SECRET (same as server ENV), ADMIN_EMAIL,
 * SITE_URL (canonical HTTPS website origin, no trailing slash).
 * Run setup() once, then deploy as a Web app: Execute as Me / Anyone.
 * No spreadsheet, Gmail inbox access, third-party library or trigger is required.
 */

function setup() {
  var properties = PropertiesService.getScriptProperties();
  properties.setProperty('ADMIN_EMAIL', 'adithelevy@gmail.com');
  properties.setProperty('SITE_URL', 'https://wisecare-rlgv.vercel.app');
  var config = config_();
  console.log('Ready. Admin recipient: ' + config.adminEmail + '. Remaining recipient quota: ' + MailApp.getRemainingDailyQuota());
}

function configureWiseCare() {
  setup();
}

function doGet() {
  // Public health check: never expose configuration, email addresses or receipts.
  return json_({ service: 'WiseCare Space mail', version: 3, userPasswordEmail: true });
}

function doPost(e) {
  var requestId = '';
  var lock;
  try {
    var config = config_();
    var raw = e && e.postData && e.postData.contents;
    if (!raw || raw.length > 16000) return failure_('', 'INVALID_REQUEST', false);
    var envelope = JSON.parse(raw);
    if (typeof envelope.timestamp !== 'string' || !/^\d{13}$/.test(envelope.timestamp) ||
        Math.abs(Date.now() - Number(envelope.timestamp)) > 5 * 60 * 1000 ||
        typeof envelope.payload !== 'string' || envelope.payload.length > 10000 ||
        typeof envelope.signature !== 'string' || !/^[a-f0-9]{64}$/.test(envelope.signature)) {
      return failure_('', 'UNAUTHORIZED', false);
    }
    var expected = hex_(Utilities.computeHmacSha256Signature(
      envelope.timestamp + '.' + envelope.payload, config.secret, Utilities.Charset.UTF_8
    ));
    if (!equal_(expected, envelope.signature)) return failure_('', 'UNAUTHORIZED', false);

    var lead = validateLead_(JSON.parse(envelope.payload), config);
    requestId = lead.id;
    var fingerprint = hex_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, envelope.payload, Utilities.Charset.UTF_8));
    lock = LockService.getScriptLock();
    if (!lock.tryLock(1500)) return failure_(requestId, 'BUSY', true);

    var properties = PropertiesService.getScriptProperties();
    cleanupReceipts_(properties);
    var key = 'receipt_' + requestId;
    var previous = properties.getProperty(key);
    var receipt = previous ? JSON.parse(previous) : {
      fingerprint: fingerprint, userSent: false, adminSent: false, updatedAt: Date.now()
    };
    if (receipt.fingerprint !== fingerprint) return failure_(requestId, 'REQUEST_ID_CONFLICT', false);

    var user = userMessage_(lead, config);
    // Administrator renderer receives only non-secret registration fields.
    var admin = adminMessage_({
      id: lead.id,
      fullName: lead.fullName,
      phone: lead.phone,
      email: lead.email,
      username: lead.username,
      goal: lead.goal,
      createdAt: lead.createdAt
    }, config);
    var error = '';
    var retryable = false;
    // Persist each recipient separately. A partial failure does not resend the other email.
    [
      { flag: 'userSent', message: user },
      { flag: 'adminSent', message: admin }
    ].forEach(function (delivery) {
      if (receipt[delivery.flag]) return;
      try {
        if (MailApp.getRemainingDailyQuota() < 1) {
          error = 'DAILY_QUOTA';
          return;
        }
        MailApp.sendEmail(delivery.message);
        receipt[delivery.flag] = true;
        receipt.updatedAt = Date.now();
        properties.setProperty(key, JSON.stringify(receipt));
      } catch (ignored) {
        error = 'MAIL_SEND_FAILED';
        retryable = true;
        console.warn('WiseCare mail failure: ' + delivery.flag + ', request ' + requestId);
      }
    });
    return json_({
      ok: receipt.userSent && receipt.adminSent,
      requestId: requestId,
      userSent: receipt.userSent,
      adminSent: receipt.adminSent,
      retryable: retryable,
      error: error || null
    });
  } catch (ignored) {
    console.warn('WiseCare webhook rejected or configuration unavailable.');
    return failure_(requestId, 'INVALID_REQUEST_OR_CONFIGURATION', false);
  } finally {
    if (lock && lock.hasLock()) lock.releaseLock();
  }
}

function config_() {
  var properties = PropertiesService.getScriptProperties();
  var secret = (properties.getProperty('WEBHOOK_SECRET') || '').trim();
  var adminEmail = (properties.getProperty('ADMIN_EMAIL') || '').trim();
  var siteUrl = (properties.getProperty('SITE_URL') || '').trim().replace(/\/+$/, '');
  if (secret.length < 16) {
    throw new Error('Set Script Property WEBHOOK_SECRET to the existing server SPACE_LEADS_WEBHOOK_SECRET value (at least 16 characters).');
  }
  if (!validEmail_(adminEmail) || !/^https:\/\/[a-z0-9.-]+(?::\d+)?$/i.test(siteUrl)) {
    throw new Error('Set WEBHOOK_SECRET, ADMIN_EMAIL and SITE_URL in Script Properties.');
  }
  return { secret: secret, adminEmail: adminEmail, siteUrl: siteUrl };
}

function validateLead_(input, config) {
  if (!input || typeof input !== 'object' || input.source !== 'space') throw new Error('Invalid source');
  var lead = {
    id: text_(input.id, 100),
    fullName: text_(input.fullName, 251),
    phone: text_(input.phone, 40),
    email: text_(input.email, 254),
    username: text_(input.username, 100),
    password: password_(input.password),
    goal: text_(input.goal || '', 120),
    portalUrl: text_(input.portalUrl, 500),
    createdAt: text_(input.createdAt, 40)
  };
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(lead.id) || !lead.fullName || !lead.username ||
      !validEmail_(lead.email) || !/^[+\d\s().-]{9,40}$/.test(lead.phone) ||
      lead.phone.replace(/\D/g, '').length < 9 ||
      !/^\d{4}-\d\d-\d\dT/.test(lead.createdAt) || !isFinite(Date.parse(lead.createdAt))) {
    throw new Error('Invalid lead');
  }
  var prefix = config.siteUrl + '/portal/';
  if (lead.portalUrl.indexOf(prefix) !== 0 || !/^[a-zA-Z0-9_-]+$/.test(lead.portalUrl.slice(prefix.length))) {
    throw new Error('Invalid portal URL');
  }
  return lead;
}

function text_(value, limit) {
  if (typeof value !== 'string' || value.length > limit || /[\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/.test(value)) {
    throw new Error('Invalid text');
  }
  return value.trim();
}

function password_(value) {
  // Do not trim or normalize: the emailed password must match the chosen password.
  if (typeof value !== 'string' || value.length < 8 || value.length > 1024 || /[\r\n\u0000]/.test(value)) {
    throw new Error('Invalid registration password');
  }
  return value;
}

function validEmail_(value) {
  return typeof value === 'string' && value.length <= 254 && /^[^\s@<>,;:]+@[^\s@<>,;:]+\.[^\s@<>,;:]{2,}$/.test(value);
}

function goalLabel_(goal) {
  var labels = {
    calm: 'להרגיש רגוע/ה יותר', mood: 'לשפר את מצב הרוח',
    habits: 'לבנות הרגלים בריאים', growth: 'התפתחות אישית'
  };
  return labels[goal] || goal || 'לא צוין';
}

function escape_(value) {
  return String(value).replace(/[&<>"']/g, function (character) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character];
  });
}

/** One field per row also works at 320px: Hebrew labels stay RTL, values are isolated. */
function field_(label, value, ltr) {
  return '<tr><td dir="rtl" align="right" style="padding:13px 18px;border-bottom:1px solid #e5edee;text-align:right;direction:rtl;">' +
    '<p style="margin:0 0 5px;color:#596b7c;font-size:12px;line-height:18px;">' + escape_(label) + '</p>' +
    '<p dir="' + (ltr ? 'ltr' : 'rtl') + '" style="margin:0;color:#102b3b;font-size:16px;font-weight:600;line-height:24px;text-align:right;direction:' +
    (ltr ? 'ltr' : 'rtl') + ';word-break:break-word;overflow-wrap:anywhere;unicode-bidi:isolate;white-space:pre-wrap;">' + escape_(value) + '</p></td></tr>';
}

function fields_(lead, admin) {
  var rows = field_('שם מלא', lead.fullName, false) + field_('כתובת אימייל', lead.email, true) +
    field_('מספר וואטספ', lead.phone, true) + field_('שם משתמש', lead.username, true) +
    field_('היעד שנבחר', goalLabel_(lead.goal), false);
  if (admin) rows += field_('מועד הרשמה · שעון ישראל', Utilities.formatDate(new Date(lead.createdAt), 'Asia/Jerusalem', 'dd.MM.yyyy · HH:mm'), true);
  return '<table role="presentation" dir="rtl" width="100%" cellpadding="0" cellspacing="0" style="width:100%;table-layout:fixed;border:1px solid #e5edee;border-radius:16px;background-color:#f7faf9;">' + rows + '</table>';
}

function button_(label, url) {
  // Solid bgcolor is the fallback for Outlook clients without gradient support.
  return '<table role="presentation" dir="rtl" cellpadding="0" cellspacing="0" style="margin:0;"><tr>' +
    '<td align="center" bgcolor="#087b7d" style="border-radius:12px;background-color:#087b7d;">' +
    '<a dir="rtl" href="' + escape_(url) + '" style="display:inline-block;padding:16px 28px;border:1px solid #087b7d;border-radius:12px;color:#ffffff;font-size:16px;font-weight:700;line-height:22px;text-decoration:none;text-align:center;direction:rtl;">' + escape_(label) + '</a></td></tr></table>';
}

function layout_(options) {
  return '<!DOCTYPE html><html lang="he" dir="rtl" xmlns="http://www.w3.org/1999/xhtml"><head>' +
    '<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>' + escape_(options.title) + '</title></head>' +
    '<body dir="rtl" style="margin:0;padding:0;width:100%;background-color:#edf3f2;color:#102b3b;font-family:Arial,Helvetica,sans-serif;direction:rtl;text-align:right;-webkit-text-size-adjust:100%;">' +
    '<div dir="rtl" style="display:none;max-height:0;overflow:hidden;mso-hide:all;opacity:0;color:transparent;">' + escape_(options.preheader) + '</div>' +
    '<table role="presentation" dir="rtl" width="100%" cellpadding="0" cellspacing="0" bgcolor="#edf3f2" style="width:100%;background-color:#edf3f2;direction:rtl;"><tr><td align="center" style="padding:28px 12px;">' +
    '<!--[if mso]><table role="presentation" dir="rtl" width="600" cellpadding="0" cellspacing="0"><tr><td><![endif]-->' +
    '<table role="presentation" dir="rtl" width="100%" cellpadding="0" cellspacing="0" bgcolor="#ffffff" style="width:100%;max-width:600px;table-layout:fixed;background-color:#ffffff;border:1px solid #dce7e5;border-radius:24px;overflow:hidden;direction:rtl;text-align:right;">' +
    '<tr><td bgcolor="#0b2836" style="padding:28px 24px;background-color:#0b2836;background-image:linear-gradient(120deg,#0b2836,#10515a);text-align:right;">' +
    '<p dir="ltr" style="margin:0;color:#ffffff;font-size:25px;font-weight:700;line-height:32px;text-align:right;direction:ltr;">Wise<span style="color:#81d9cf;">Care</span><span style="color:#b8d4d6;font-size:12px;font-weight:400;"> &nbsp; SPACE</span></p>' +
    '<p dir="rtl" style="margin:9px 0 0;font-size:13px;line-height:22px;color:#cfebea;direction:rtl;">מרחב קטן לעצמך. שינוי שמרגישים.</p></td></tr>' +
    '<tr><td style="padding:30px 24px 24px;text-align:right;direction:rtl;">' +
    '<p style="margin:0 0 16px;color:#087b7d;font-size:12px;line-height:20px;font-weight:700;">' + escape_(options.eyebrow) + '</p>' +
    '<h1 dir="rtl" style="margin:0 0 16px;color:#102b3b;font-size:30px;line-height:40px;font-weight:700;text-align:right;direction:rtl;">' + escape_(options.title) + '</h1>' +
    '<p dir="rtl" style="margin:0 0 24px;color:#4a6070;font-size:16px;line-height:28px;text-align:right;direction:rtl;">' + escape_(options.intro) + '</p>' +
    options.content +
    '<p dir="rtl" style="margin:22px 0 0;padding:16px;background-color:#eff8f5;border-radius:12px;color:#345f5b;font-size:13px;line-height:23px;direction:rtl;text-align:right;">' + escape_(options.note) + '</p></td></tr>' +
    '<tr><td dir="rtl" bgcolor="#f7faf9" style="padding:20px 24px;border-top:1px solid #e5edee;color:#627782;font-size:12px;line-height:21px;text-align:right;direction:rtl;">' +
    escape_(options.footer) + '<br><span dir="ltr" style="direction:ltr;unicode-bidi:isolate;">© ' + new Date().getFullYear() + ' WiseCare</span></td></tr></table>' +
    '<!--[if mso]></td></tr></table><![endif]--></td></tr></table></body></html>';
}

function userMessage_(lead, config) {
  var passwordDetails = '<table role="presentation" dir="rtl" width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;width:100%;table-layout:fixed;border:1px solid #c9e4df;border-radius:12px;background-color:#eff8f5;">' +
    field_('הסיסמה שבחרת', lead.password, true) + '</table>';
  var content = fields_(lead, false) + passwordDetails + '<table role="presentation" dir="rtl" width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding-top:24px;">' +
    button_('כניסה למרחב שלי', lead.portalUrl) + '</td></tr></table>' +
    '<p dir="rtl" style="margin:18px 0 5px;color:#627782;font-size:12px;line-height:20px;direction:rtl;text-align:right;">אם הכפתור אינו נפתח, אפשר להעתיק את הקישור:</p>' +
    '<p dir="ltr" style="margin:0;font-size:12px;line-height:20px;direction:ltr;text-align:left;word-break:break-all;"><a href="' + escape_(lead.portalUrl) + '" style="color:#087b7d;">' + escape_(lead.portalUrl) + '</a></p>';
  return {
    to: lead.email, replyTo: config.adminEmail, name: 'WiseCare | המרחב האישי',
    subject: 'המרחב שלך ב-WiseCare מוכן',
    body: 'שלום ' + lead.fullName + ',\nהמרחב שלך מוכן.\n\nשם מלא: ' + lead.fullName + '\nאימייל: ' + lead.email + '\nוואטספ: ' + lead.phone + '\nשם משתמש: ' + lead.username + '\nסיסמה: ' + lead.password + '\nהיעד שנבחר: ' + goalLabel_(lead.goal) + '\n\nכניסה למרחב: ' + lead.portalUrl + '\nפרטי הכניסה אישיים. מומלץ לשמור את ההודעה בתיבה פרטית ולא להעביר אותה לאחרים.\nאפשר להשיב למייל זה לקבלת עזרה.',
    htmlBody: layout_({
      preheader: 'ההרשמה הושלמה. הקישור למרחב האישי ופרטי ההרשמה מחכים בפנים.',
      eyebrow: 'ברוכים הבאים למרחב שלך', title: 'הצעד הראשון כבר מאחוריך.',
      intro: 'שלום ' + lead.fullName + ', שמחים שהצטרפת. המרחב האישי שלך מוכן — לנשימה עמוקה, לשיר שעושה טוב ולרגע קטן לעצמך.',
      content: content,
      note: 'המייל כולל את שם המשתמש והסיסמה שבחרת. פרטי הכניסה אישיים — כדאי לשמור את ההודעה בתיבה פרטית ולא להעביר אותה לאחרים.',
      footer: 'זהו אישור הרשמה ל-WiseCare. לקבלת עזרה אפשר להשיב למייל זה. אם לא נרשמת, אין צורך ללחוץ על הקישור — אפשר להשיב ולעדכן אותנו.'
    })
  };
}

function adminMessage_(lead, config) {
  return {
    to: config.adminEmail, replyTo: lead.email, name: 'WiseCare | הרשמה חדשה',
    subject: 'הרשמה חדשה למרחב האישי | ' + lead.fullName.slice(0, 180),
    body: 'הרשמה חדשה מדף /space\n\nשם מלא: ' + lead.fullName + '\nוואטספ: ' + lead.phone + '\nאימייל: ' + lead.email + '\nשם משתמש: ' + lead.username + '\nהיעד שנבחר: ' + goalLabel_(lead.goal) + '\nמועד: ' + lead.createdAt + '\nמזהה: ' + lead.id + '\n\nלהשיב לנרשם: ' + lead.email,
    htmlBody: layout_({
      preheader: 'הרשמה חדשה התקבלה מדף המרחב האישי. כל הפרטים מסודרים בהודעה.',
      eyebrow: 'הרשמה חדשה · דף המרחב האישי', title: 'עוד מישהו בחר ברגע לעצמו.',
      intro: 'התקבלה הרשמה חדשה דרך דף הנחיתה. פרטי הנרשם/ת מופיעים כאן, ואפשר להשיב ישירות למייל כדי ליצור קשר.',
      content: fields_(lead, true) + '<p style="margin:20px 0 0;color:#627782;font-size:12px;line-height:20px;">מקור: דף המרחב האישי · <span dir="ltr" style="direction:ltr;unicode-bidi:isolate;">/space</span></p>',
      note: 'כפתור ״השב״ יפנה לכתובת המייל של הנרשם/ת. פרטי ההתחברות הסודיים אינם כלולים בהתראה.',
      footer: 'התראה פנימית של WiseCare. ההודעה כוללת פרטים אישיים — יש לשמור אותה בתיבה המיועדת לכך.'
    })
  };
}

function cleanupReceipts_(properties) {
  var now = Date.now();
  if (now - Number(properties.getProperty('receiptsCleanedAt') || 0) < 3600000) return;
  var all = properties.getProperties();
  Object.keys(all).forEach(function (key) {
    if (key.indexOf('receipt_') !== 0) return;
    var receipt = JSON.parse(all[key]);
    if (now - receipt.updatedAt > 24 * 3600000) properties.deleteProperty(key);
  });
  properties.setProperty('receiptsCleanedAt', String(now));
}

function hex_(bytes) {
  return bytes.map(function (byte) { return ('0' + (byte & 255).toString(16)).slice(-2); }).join('');
}

function equal_(a, b) {
  if (a.length !== b.length) return false;
  var difference = 0;
  for (var i = 0; i < a.length; i++) difference |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return difference === 0;
}

function failure_(requestId, error, retryable) {
  return json_({ ok: false, requestId: requestId, userSent: false, adminSent: false, error: error, retryable: retryable });
}

function json_(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}
