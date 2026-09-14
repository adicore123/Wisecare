import axios from 'axios';
import { db } from '../db/db.js';

/**
 * Format Israeli or international phone number to Green API chatId format:
 * e.g., 052-1234567 -> 972521234567@c.us
 */
export function formatPhoneNumberToChatId(phone) {
  if (!phone) return null;
  let cleaned = phone.replace(/\D/g, ''); // strip non-digits

  if (cleaned.startsWith('0')) {
    cleaned = '972' + cleaned.substring(1);
  } else if (!cleaned.startsWith('972') && cleaned.length === 9) {
    cleaned = '972' + cleaned;
  }

  return `${cleaned}@c.us`;
}

/**
 * Resolve correct Green API base URL based on settings, env or instance prefix (e.g. 7107)
 */
export function getApiBaseUrl(settings, instanceId) {
  if (settings?.greenApiUrl && settings.greenApiUrl.trim()) {
    return settings.greenApiUrl.trim().replace(/\/+$/, '');
  }
  if (process.env.GREEN_API_URL && process.env.GREEN_API_URL.trim()) {
    return process.env.GREEN_API_URL.trim().replace(/\/+$/, '');
  }
  if (instanceId && String(instanceId).length >= 8) {
    const hostPrefix = String(instanceId).substring(0, 4);
    return `https://${hostPrefix}.api.greenapi.com`;
  }
  return 'https://api.green-api.com';
}

/**
 * Check Green API Instance status (authorized, blocked, sleepMode, notAuthorized)
 */
export async function checkInstanceStatus() {
  const settings = db.getSettings();
  const token = settings.greenApiToken || process.env.GREEN_API_TOKEN;
  const instanceId = settings.greenApiInstanceId || process.env.GREEN_API_INSTANCE_ID;
  const baseUrl = getApiBaseUrl(settings, instanceId);

  if (!instanceId || instanceId.trim() === '') {
    return {
      configured: false,
      status: 'missing_instance_id',
      message: 'חסר idInstance. יש להזין את מזהה המופע מלוח הבקרה של Green API.'
    };
  }

  try {
    const url = `${baseUrl}/waInstance${instanceId}/getStateInstance/${token}`;
    const response = await axios.get(url, { timeout: 8000 });
    const state = response.data?.stateInstance;
    const isConnected = state === 'authorized' || state === 'suspended';

    return {
      configured: true,
      instanceId,
      status: isConnected ? 'authorized' : state,
      stateInstance: state,
      raw: response.data
    };
  } catch (err) {
    let msg = err.response?.data?.message || err.message;
    if (err.response?.status === 401) {
      msg = 'שגיאת אימות 401: ה-Instance ID והטוקן אינם שייכים לאותו מופע, או שהמופע נמחק/הוחלף.';
    }
    return {
      configured: true,
      instanceId,
      status: 'error',
      message: msg
    };
  }
}

export async function sendWhatsAppMessage({ phone, message }) {
  const settings = db.getSettings();
  const token = settings.greenApiToken || process.env.GREEN_API_TOKEN;
  const instanceId = settings.greenApiInstanceId || process.env.GREEN_API_INSTANCE_ID;
  const baseUrl = getApiBaseUrl(settings, instanceId);
  const chatId = formatPhoneNumberToChatId(phone);

  if (!chatId) {
    throw new Error('מספר טלפון לא תקין לשליחת הודעה');
  }

  // If instanceId is missing, raise a clear explicit error so user knows what to fill in
  if (!instanceId || instanceId.trim() === '') {
    throw new Error(
      'שליחת ה-WhatsApp נכשלה: חסר idInstance (מזהה מופע Green API). אנא היכנס להגדרות המערכת והזן את ה-idInstance מחשבון ה-Green API שלך לצד הטוקן.'
    );
  }

  try {
    const url = `${baseUrl}/waInstance${instanceId}/sendMessage/${token}`;
    const response = await axios.post(url, {
      chatId,
      message
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 12000
    });

    console.log(`[WhatsApp] Message successfully sent via Green API to ${chatId}:`, response.data);
    return {
      success: true,
      simulated: false,
      chatId,
      idMessage: response.data.idMessage
    };
  } catch (err) {
    console.error(`[WhatsApp] Failed to send via Green API:`, err.response?.data || err.message);
    if (err.response?.status === 401) {
      throw new Error(
        'שגיאת אימות 401 מול Green API: ה-Instance ID וה-Token אינם תואמים או שהמופע נמחק/נוצר מחדש. אנא העתק מלוח הבקרה של Green API את ה-idInstance המדויק ששייך לטוקן החדש.'
      );
    }
    const errorDetails = err.response?.data?.message || err.message;
    throw new Error(
      `שגיאה בשליחת הודעת WhatsApp מול Green API: ${errorDetails}. ודא שה-idInstance והטוקן תואמים ושהמכשיר מחובר וסרוק.`
    );
  }
}

/**
 * Fetch base64 QR code from Green API for pairing WhatsApp
 */
export async function getQrCode() {
  const settings = db.getSettings();
  const token = settings.greenApiToken || process.env.GREEN_API_TOKEN;
  const instanceId = settings.greenApiInstanceId || process.env.GREEN_API_INSTANCE_ID;
  const baseUrl = getApiBaseUrl(settings, instanceId);

  if (!instanceId || !token) {
    return { type: 'error', message: 'חסר מזהה מופע או טוקן' };
  }

  try {
    const url = `${baseUrl}/waInstance${instanceId}/qr/${token}`;
    const response = await axios.get(url, { timeout: 10000 });
    return response.data; // { type: 'qrCode', message: '...' } or { type: 'alreadyLogged' }
  } catch (err) {
    return {
      type: 'error',
      message: err.response?.data?.message || err.message
    };
  }
}

