// קטלוג טכניקות נשימה — נבנה על בסיס מיפוי מחקרי (גרסה 2, אוקטובר 2026).
// עקרונות מפתח שנשמרו כאן:
//  * התבוננות (מיינדפולנס) אינה מקבלת טיימר שלבים — רק טיימר סשן (mode: 'open').
//  * counts ≠ seconds — טכניקות שהוגדרו במקורן בספירות מסומנות countsBased,
//    וההמרה לשניות היא התאמת מוצר (protocolNote), לא חלק מהפרוטוקול.
//  * מדרג בטיחות: general / safeguards / reference_only. רק general עם
//    deploymentEnabled זמין לתרגול; safeguards מוסתרות עד אישור מקצועי;
//    reference_only מוצגות כמידע והפניה בלבד.

export type BreathingFamily = 'observation' | 'slow' | 'pranayama' | 'intense' | 'clinical';

export type TechniqueTier = 'general' | 'safeguards' | 'reference_only';

export type SessionMode = 'phases' | 'open' | 'counter';

export type PhaseKey = 'inhale' | 'inhale2' | 'hold' | 'exhale' | 'holdEmpty';

export interface BreathingPhase {
  key: PhaseKey;
  label: string;
  /** ספירות הפרוטוקול המקורי, כשקיים (countsBased) */
  counts?: number;
  /** שניות בקצב 1.0 — עבור countsBased זו התאמת מוצר */
  seconds: number;
  /** קוטר העיגול בשלב זה (0.78 ריק עד 1.25 מלא) */
  scale: number;
}

export interface TechniqueEvidence {
  note: string;
  source: string;
}

export interface TechniqueSafety {
  warnings?: string[];
  contraindications?: string[];
  environments?: string[];
}

export type SessionGoal =
  | { type: 'cycles'; default: number; options: number[]; unit: 'מחזורים' | 'חזרות' }
  | { type: 'minutes'; default: number; options: number[] };

export interface BreathingTechnique {
  id: string;
  nameHe: string;
  nameEn: string;
  family: BreathingFamily;
  tier: TechniqueTier;
  deploymentEnabled: boolean;
  mode: SessionMode;
  icon: string;
  tagline: string;
  useWhen: string[];
  description: string;
  instructions: string[];
  phases?: BreathingPhase[];
  countsBased?: boolean;
  /** שניות לספירה — אפשרויות קצב אישי לטכניקות מבוססות-ספירה */
  paceOptions?: number[];
  sessionGoal: SessionGoal;
  evidence: TechniqueEvidence[];
  safety?: TechniqueSafety;
  protocolNote?: string;
  referenceNote?: string;
}

export const FAMILY_LABELS: Record<BreathingFamily, string> = {
  observation: 'התבוננות ומיינדפולנס',
  slow: 'נשימה איטית ומבוקרת',
  pranayama: 'פראנאיאמה (יוגה)',
  intense: 'ברית׳וורק אינטנסיבי',
  clinical: 'קליני ושיקומי',
};

export const FAMILY_DESCRIPTIONS: Record<BreathingFamily, string> = {
  observation: 'צפייה בנשימה הטבעית בלי לשנות אותה — הנשימה משמשת כעוגן קשבי. טיימר סשן בלבד, בלי הנחיית שלבים.',
  slow: 'המשפחה עם הבסיס הראייתי החזק ביותר: האטה מכוונת של הקצב משפרת מדדים קרדיווסקולריים ופסיכולוגיים ומפחיתה חרדה.',
  pranayama: 'טכניקות נשימה מסורתיות מהיוגה. ראיות חיוביות על חרדה ודיכאון עם ליקויים מתודולוגיים בחלק מהמחקרים.',
  intense: 'היפר-ונטילציה מכוונת והחזקות — מעוררות ולא מרגיעות. מושבתות במערכת עד בדיקת בטיחות מקצועית.',
  clinical: 'הכשרה מחדש של תבנית הנשימה — שיטות הנלמדות בהדרכה מקצועית.',
};

const COUNTS_NOTE =
  'הפרוטוקול המקורי מוגדר בספירות בקצב אישי נוח — ההמרה לשניות באפליקציה היא התאמת מוצר, וניתן לכוונן את הקצב.';

export const BREATHING_TECHNIQUES: BreathingTechnique[] = [
  // ─────────────────────────────────────────────────────────────
  // משפחת ההתבוננות (מיינדפולנס) — טיימר סשן בלבד
  // ─────────────────────────────────────────────────────────────
  {
    id: 'mindful-breathing',
    nameHe: 'נשימה מודעת',
    nameEn: 'Mindful Breathing',
    family: 'observation',
    tier: 'general',
    deploymentEnabled: true,
    mode: 'open',
    icon: 'Flower2',
    tagline: 'נקודת הכניסה למתחילים',
    useWhen: ['תרגול בסיסי', 'התחלת היום', 'הפסקת רגע'],
    description:
      'מיקוד תשומת הלב בתחושת הנשימה כפי שהיא — בלי לשנות אותה. כשהקשב נודד, מחזירים אותו בעדינות ובלי שיפוט. זו אבן הפינה של תרגולי מיינדפולנס.',
    instructions: [
      'שב/י בנוח — כיסא מקובל לחלוטין, גב זקוף אך לא מתוח.',
      'עצמ/י את העיניים או השפיל/י מבט אל נקודה קבועה.',
      'הבחנ/י בנשימה דרך האף: הצל של השאיפה, החמימות של הנשיפה.',
      'כשמחשבות נודדות — זה טבעי. החזר/י את הקשב לנשימה בלי ביקורת.',
      'תרגל/י 5 דקות ביום לפחות שבוע — ההתמדה חשובה מהמשך.',
    ],
    sessionGoal: { type: 'minutes', default: 5, options: [3, 5, 10] },
    evidence: [
      {
        note: 'ב-RCT סטנפורד חרדה מצבית ואפקט שלילי ירדו במובהקות (p<0.0001); העלייה באפקט חיובי הייתה גבולית (p=0.06).',
        source: 'Balban et al. 2023 (Stanford, Cell Reports Medicine)',
      },
      { note: 'מומלצת כתרגול בסיסי במדריכי הרווחה של Mayo Clinic.', source: 'Mayo Clinic' },
      { note: 'פרוטוקול 5 דקות ביום לפחות שבוע.', source: 'Greater Good Science Center, UC Berkeley (GGIA)' },
    ],
    safety: {
      warnings: ['בתחילת הדרך נדידת הקשב תחזור שוב ושוב — זה חלק מהתרגול, לא כישלון.'],
    },
  },
  {
    id: 'breath-counting',
    nameHe: 'ספירת נשימות',
    nameEn: 'Breath Counting',
    family: 'observation',
    tier: 'general',
    deploymentEnabled: true,
    mode: 'counter',
    icon: 'Hash',
    tagline: 'אימון מטא-מודעות מהזן',
    useWhen: ['ריכוז', 'אימון קשב', 'תרגול יומי'],
    description:
      'ספירה שקטה של הנשיפות בסטים של 10. איבוד הספירה אינו כישלון אלא רגע של מטא-מודעות — חוזרים ל-1 וממשיכים. משמש במחקר גם כמדד לנדידות קשב.',
    instructions: [
      'שב/י בנוח והרפה/י את הכתפיים.',
      'בכל נשיפה הקש/י על כפתור הספירה — המערכת סופרת בשבילך.',
      'בסוף כל 10 נשימות מושלם סט — הספירה חוזרת ל-1.',
      'גילית שאיבדת את הספירה? לחצ/י "איבדתי ספירה" והתחל/י מ-1, בלי ביקורת עצמית.',
      'עם הזמן אפשר להתקדם מ-5–7 סטים ועד 21 ומעלה.',
    ],
    sessionGoal: { type: 'minutes', default: 5, options: [3, 5, 10] },
    evidence: [
      {
        note: 'תרגול מקובל בזן ובבודהיזם טיבטי; משמש כמדד מחקרי לנדידות קשב ולמטא-מודעות למעידות. המסורת ממליצה התקדמות הדרגתית מ-5–7 מחזורים עד 21 ומעלה.',
        source: 'PMC12053031 (מדד ספירת הנשימות)',
      },
      { note: 'שיטת הסטים של 10 נשימות.', source: 'Wildmind (מדריך זן)' },
    ],
    safety: {},
  },
  {
    id: 'anapanasati',
    nameHe: 'אנאפאנאסטי',
    nameEn: 'Anapanasati',
    family: 'observation',
    tier: 'general',
    deploymentEnabled: true,
    mode: 'open',
    icon: 'Anchor',
    tagline: 'הקשב בקצה האף',
    useWhen: ['תרגול עמוק', 'ריכוז מתקדם'],
    description:
      'וריאציה עמוקה של נשימה מודעת מהמסורת הבודהיסטית: הקשב בנקודת המגע של האוויר — קצה האף או השפה העליונה — ולא מעקב אחר מסלול הנשימה בגוף. צפייה בנשימה כמו שהיא.',
    instructions: [
      'שב/י זקוף/ה — כיסא מקובל. הרפה/י את הפנים והלסת.',
      'מקד/י את הקשב בנקודה אחת: קצה האף או השפה העליונה, שם האוויר נוגע.',
      'אל תעקב/י אחרי הנשימה לאורך הגוף — הישאר/י בנקודת המגע.',
      'אל תשנה/י את הנשימה. היא איטית? מהירה? עמוקה? שטוחה? רק התבונן.',
      'המקור המסורתי מזהיר ממאמץ ומתיחות — עדינות היא הדרך.',
    ],
    sessionGoal: { type: 'minutes', default: 10, options: [5, 10, 15] },
    evidence: [
      { note: 'מקור מסורתי — סאטיפטהנה: הקשב בקצה האף, ללא שינוי מכוון של הנשימה.', source: 'Access to Insight (תרגום הקנון הפאלי)' },
    ],
    safety: {
      warnings: ['אם מופיע מתח או כאב ראש — הרפה/י; התרגול נעשה ללא מאמץ.'],
    },
  },

  // ─────────────────────────────────────────────────────────────
  // משפחת הנשימה האיטית המבוקרת — הבסיס הראייתי החזק ביותר
  // ─────────────────────────────────────────────────────────────
  {
    id: 'cyclic-sighing',
    nameHe: 'נאנחות מחזוריות',
    nameEn: 'Cyclic Sighing',
    family: 'slow',
    tier: 'general',
    deploymentEnabled: true,
    mode: 'phases',
    icon: 'Waves',
    tagline: 'תרגיל הדגל — 5 דקות ביום',
    useWhen: ['הורדת מתח', 'שיפור מצב רוח', 'תרגול יומי'],
    description:
      'שאיפה איטית דרך האף, שאיפה משלימה קצרה שממלאת את הריאות עד הסוף, ונשיפה ארוכה ומלאה דרך הפה. במחקר סטנפורד — הטכניקה היחידה שניצחה מיינדפולנס באופן מובהק בשיפור אפקט חיובי.',
    instructions: [
      'שאיפה איטית ועמוקה דרך האף — עד שהריאות מרגישות מלאות כמעט.',
      'שאיפה משלימה קצרה נוספת — "לגימה" שנייה שפותחת את הריאות עד הסוף.',
      'נשיפה ארוכה, מלאה ואיטית דרך הפה — כמו אנחה מהלב.',
      'חזור/י על המחזור במשך 5 דקות. הקצב שלך יירגע מעצמו.',
      'אם מופיע סחרחורת קלה — האט/י את הקצב או עצור/י לרגע.',
    ],
    phases: [
      { key: 'inhale', label: 'שאיפה איטית דרך האף', seconds: 4, scale: 1.12 },
      { key: 'inhale2', label: 'לגימה שנייה — פתיחת הריאות', seconds: 1, scale: 1.25 },
      { key: 'exhale', label: 'נשיפה ארוכה דרך הפה', seconds: 7, scale: 0.78 },
    ],
    sessionGoal: { type: 'minutes', default: 5, options: [3, 5, 10] },
    evidence: [
      {
        note: 'ב-RCT של 114 משתתפים (5 דק׳ ביום, 28 יום): היחידה שנבדלה משמעותית ממיינדפולנס באפקט חיובי (p=0.025) והפחיתה את קצב הנשימה הכי הרבה (p<0.05). חרדה מצבית ואפקט שלילי ירדו בכל הקבוצות תוך-קבוצתית.',
        source: 'Balban et al. 2023 (Stanford, Cell Reports Medicine)',
      },
    ],
    safety: {
      warnings: ['סחרחורת קלה אפשרית בהתחלה — האט/י את הקצב אם מופיעה.'],
    },
  },
  {
    id: 'physiological-sigh',
    nameHe: 'אנחה פיזיולוגית',
    nameEn: 'Physiological Sigh',
    family: 'slow',
    tier: 'general',
    deploymentEnabled: true,
    mode: 'phases',
    icon: 'HeartPulse',
    tagline: 'עזרה ראשונה לרגעי מתח — 1 עד 3 חזרות',
    useWhen: ['הרגעה מיידית', 'לפני מבחן', 'רגע שיא של מתח'],
    description:
      'הכלי המהיר ביותר בקטלוג: שאיפה עמוקה, "לגימת אוויר" שנייה, ונשיפה ארוכה — פעם אחת עד שלוש. מפחיתה עוררות פיזיולוגית תוך שניות. לא דורשת סשן מלא.',
    instructions: [
      'שאיפה עמוקה דרך האף — גדולה ככל הנעים.',
      'מיד שאיפה משלימה קצרה — "לגימה" שנייה של אוויר.',
      'נשיפה ארוכה ואיטית דרך הפה — שחרור מלא.',
      'חזור/י 1–3 פעמים בלבד. זה כל מה שצריך.',
      'מצוין גם רגע לפני דבר מלחיץ: מבחן, שיחה קשה, פקק.',
    ],
    phases: [
      { key: 'inhale', label: 'שאיפה עמוקה', seconds: 4, scale: 1.15 },
      { key: 'inhale2', label: 'לגימה שנייה', seconds: 1, scale: 1.25 },
      { key: 'exhale', label: 'נשיפה ארוכה', seconds: 8, scale: 0.78 },
    ],
    sessionGoal: { type: 'cycles', default: 3, options: [1, 2, 3], unit: 'חזרות' },
    evidence: [
      {
        note: 'המלצת 1–3 חזרות להורדת עוררות מהירה מקורה בפרסומי מעבדת Huberman; ה-RCT בדק את הגרסה המחזורית בת 5 הדקות (נאנחות מחזוריות), לא את הפרוטוקול הקצר כפרוטוקול עצמאי.',
        source: 'Huberman Lab (Stanford) — Breathing protocols',
      },
    ],
    safety: {},
  },
  {
    id: 'coherent-breathing',
    nameHe: 'נשימה קוהרנטית',
    nameEn: 'Coherent Breathing',
    family: 'slow',
    tier: 'general',
    deploymentEnabled: true,
    mode: 'phases',
    icon: 'Activity',
    tagline: 'איזון יומיומי — 5.5 שניות לכיוון',
    useWhen: ['איזון', 'הורדת לחץ דם', 'תרגול קבוע'],
    description:
      'שאיפה ונשיפה שוות (~5.5 שניות כל אחת, כ-6 נשימות בדקה) דרך האף, בלי מילוי מלא של הריאות. הקצב הזה ממקסם את משרעת פעימות הלב (HRV) ואת פעילות מערכת העצבים המרגיעה.',
    instructions: [
      'נשום/י דרך האף בלבד, בעדינות — בלי למלא את הריאות עד הסוף.',
      'שאיפה כ-5.5 שניות, נשיפה כ-5.5 שניות. העיגול יוביל אותך.',
      'שמור/י על רצף חלק בין שאיפה לנשיפה, בלי עצירה.',
      'הקצב האישי האופטימלי נע בין 4.5 ל-6.5 נשימות בדקה — ההתאמה המדויקת דורשת מכשור HRV ואינה נחוצה לתרגול.',
      'מתאים מאוד לתרגול יומיומי קבוע.',
    ],
    phases: [
      { key: 'inhale', label: 'שאיפה עדינה', seconds: 5.5, scale: 1.2 },
      { key: 'exhale', label: 'נשיפה עדינה', seconds: 5.5, scale: 0.78 },
    ],
    sessionGoal: { type: 'minutes', default: 5, options: [3, 5, 10, 15] },
    evidence: [
      {
        note: 'נשימה בקצב ~6 לדקה ממקסמת משרעת HRV ורגישות בארורפלקס; הטווח האישי 4.5–6.5 לדקה.',
        source: 'Lehrer et al. (PMC7578229) — סקירת נשימה תהודתית',
      },
      { note: 'מחקר השוואתי 2025: קצב 6 נשימות לדקה ככל הנראה היעיל ביותר להעלאת HRV והורדת לחץ דם, לעומ תיבה ו-4-7-8.', source: 'Marchant et al. 2025' },
      { note: 'שיפורים בבריאות נפשית וברווחה בתרגול קוהרנטי.', source: 'Fincham et al. 2023 (Nature Scientific Reports)' },
    ],
    safety: {},
  },
  {
    id: 'extended-exhale',
    nameHe: 'הארכת נשיפה',
    nameEn: 'Extended Exhale',
    family: 'slow',
    tier: 'general',
    deploymentEnabled: true,
    mode: 'phases',
    icon: 'Wind',
    tagline: 'הרגעה עדינה — נשיפה ארוכה משאיפה',
    useWhen: ['הרגעה עדינה', 'לפני שינה', 'שחרור מתח'],
    description:
      'נשיפה ארוכה מהשאיפה מפעילה את מערכת העצבים הפרהסימפתטית — מנגנון ההרגעה המשותף כמעט לכל שיטות הנשימה. מתחילים ב-4:4 ומתקדמים בהדרגה ל-4:6.',
    instructions: [
      'מתחילים/ות: 4 שניות שאיפה, 4 שניות נשיפה — כמה מחזורים עד שנוח.',
      'בהדרגה מאריכים/ות את הנשיפה עד 4:6 — היעד של התרגול כאן.',
      'הנשיפה דרך האף, שקטה ורציפה.',
      'אם 4:6 מרגיש מאומץ — חזור/י זמנית ל-4:4 ונסה/י שוב מחר.',
      'מצוין כחלק משגרת ההשכבה.',
    ],
    phases: [
      { key: 'inhale', label: 'שאיפה', seconds: 4, scale: 1.18 },
      { key: 'exhale', label: 'נשיפה מוארכת', seconds: 6, scale: 0.78 },
    ],
    sessionGoal: { type: 'minutes', default: 5, options: [3, 5, 10] },
    evidence: [
      { note: 'פרוטוקול המחקר: התחלה ב-4:4 ומעבר הדרגתי ל-4:6.', source: 'Fincham et al. 2023 (Nature Scientific Reports)' },
      {
        note: 'מחקר 12 שבועות: שתי הגישות הפחיתו חרדה (PROMIS) במידה משמעותית; ההבדל בין הקבוצות לא היה מובהק (p=0.35, d=0.2) — אין הוכחה שהארכת הנשיפה עדיפה.',
        source: 'PMC10395759',
      },
    ],
    safety: {},
  },
  {
    id: 'box-breathing',
    nameHe: 'נשימת קופסה',
    nameEn: 'Box Breathing',
    family: 'slow',
    tier: 'general',
    deploymentEnabled: true,
    mode: 'phases',
    icon: 'Square',
    tagline: 'מיקוד וערנות — 4 צעדים שווים',
    useWhen: ['מיקוד', 'ערנות', 'תחת לחץ'],
    description:
      'ארבעה שלבים שווים — שאיפה, החזקה, נשיפה, החזקה עם ריאות ריקות. השיטה שנודעה בקרב צוללות ה-US Navy להתמודדות עם לחץ. מאזנת בין הרגעה לערנות.',
    instructions: [
      'שאיפה דרך האף בספירה אישית נוחה (באפליקציה: 4 יחידות זמן).',
      'החזקת האוויר בעדינות — בלי להתכווץ.',
      'נשיפה דרך האף באותה ספירה.',
      'החזקה עם ריאות ריקות — החלק המאתגר; נשום/י פנימה כשמרגיש לא נעים.',
      '3–4 סבבים בכל פעם. ההחזקות מתאמנות עם הזמן.',
    ],
    phases: [
      { key: 'inhale', label: 'שאיפה', counts: 4, seconds: 4, scale: 1.22 },
      { key: 'hold', label: 'החזקה', counts: 4, seconds: 4, scale: 1.22 },
      { key: 'exhale', label: 'נשיפה', counts: 4, seconds: 4, scale: 0.78 },
      { key: 'holdEmpty', label: 'החזקה — ריאות ריקות', counts: 4, seconds: 4, scale: 0.78 },
    ],
    countsBased: true,
    paceOptions: [0.8, 1, 1.25, 1.5],
    sessionGoal: { type: 'cycles', default: 4, options: [3, 4, 6, 8], unit: 'מחזורים' },
    evidence: [
      { note: 'ב-RCT סטנפורד חרדה מצבית ואפקט שלילי ירדו תוך-קבוצתית (p<0.0001); מול מיינדפולנס לא נמצא יתרון מובהק.', source: 'Balban et al. 2023 (Stanford)' },
      { note: 'מוכרת כמשפרת מיקוד והרגעה תחת לחץ.', source: 'Cleveland Clinic' },
    ],
    protocolNote: COUNTS_NOTE,
    safety: {
      warnings: ['ההחזקה עם ריאות ריקות מאתגרת מתחילים — קצר/י את הספירה במקום להתאמץ.'],
    },
  },
  {
    id: '4-7-8',
    nameHe: 'נשימת 4-7-8',
    nameEn: '4-7-8 Breathing',
    family: 'slow',
    tier: 'general',
    deploymentEnabled: true,
    mode: 'phases',
    icon: 'Moon',
    tagline: 'שינה והרגעה עמוקה',
    useWhen: ['הכנה לשינה', 'הרגעה עמוקה', 'לפני שכיבה'],
    description:
      'הטכניקה שפיתח ד״ר אנדרו וייל: שאיפה בספירה 4, החזקה ב-7, נשיפה ב-8 דרך השפתיים. הנשיפה הארוכה מעניקה אפקט הרגעה עמוק — מתאימה במיוחד לפני שינה.',
    instructions: [
      'הצמד/י את קצה הלשון לחך, מאחורי השיניים העליונות — לאורך כל התרגול.',
      'שאיפה דרך האף בספירה 4 (קצב אישי נוח).',
      'החזקת הנשימה בספירה 7 — ברוגע, בלי כיווץ.',
      'נשיפה דרך השפתיים, עם שריקה עדינה, בספירה 8.',
      '4 מחזורים בהתחלה; עם התמדה אפשר להגיע ל-8. סחרחורת בהתחלה נפוצה וחולפת.',
    ],
    phases: [
      { key: 'inhale', label: 'שאיפה דרך האף', counts: 4, seconds: 4, scale: 1.2 },
      { key: 'hold', label: 'החזקה רגועה', counts: 7, seconds: 7, scale: 1.2 },
      { key: 'exhale', label: 'נשיפה דרך השפתיים', counts: 8, seconds: 8, scale: 0.78 },
    ],
    countsBased: true,
    paceOptions: [0.8, 1, 1.25, 1.5],
    sessionGoal: { type: 'cycles', default: 4, options: [2, 4, 8], unit: 'מחזורים' },
    evidence: [
      {
        note: 'RCT בנשים אחרי ניתוח בריאטרי: הפחתה משמעותית בחרדה מצבית (p=0.007). מחקר קרוסאובר 2026: אצל נשים הפחיתה מתח נתפס; אצל גברים נדי-שודהאנה הייתה יעילה יותר — ההשפעות מותאמות-מין ובסיס הראיות מצומצם.',
        source: 'PMC10741869; מחקר קרוסאובר 2026 (Springer)',
      },
      { note: 'הפרוטוקול המקורי מוגדר בספירות בקצב אישי — לא בשניות מדויקות.', source: 'Cleveland Clinic' },
    ],
    protocolNote: COUNTS_NOTE,
    safety: {
      warnings: ['סחרחורת אפשרית בהתחלה — במיוחד אצל מתחילים. בצע/י ישוב/ה.'],
    },
  },
  {
    id: 'diaphragmatic-breathing',
    nameHe: 'נשימה סרעפתית (נשימת בטן)',
    nameEn: 'Diaphragmatic Breathing',
    family: 'slow',
    tier: 'general',
    deploymentEnabled: true,
    mode: 'phases',
    icon: 'Hand',
    tagline: 'יסודות הנשימה הנכונה',
    useWhen: ['למידת יסודות', 'תרגול יומי', 'הרגעה בסיסית'],
    description:
      'הטכניקה הבסיסית שמלמדת לנשום מהסרעפת ולא מהחזה: הבטן מתרחבת בשאיפה והיד המונחת עליה עולה. 5–10 דקות, 2–3 פעמים ביום. הבסיס החינוכי שעליו בנויות רוב השיטות.',
    instructions: [
      'שכב/י או שב/י בנוח. הנח/י יד אחת על החזה ויד שנייה מתחת לקשת הצלעות.',
      'שאיפה איטית דרך האף — הבטן מתרחבת והיד התחתונה עולה.',
      'היד על החזה נשארת כמעט נייחת — זה הסימן שנושמים מהסרעפת.',
      'נשיפה דרך שפתיים מקומטות, בעדינות.',
      '5–10 דקות, 2–3 פעמים ביום — גם בזמן קריאה או צפייה.',
    ],
    phases: [
      { key: 'inhale', label: 'שאיפה — הבטן מתמלאת', seconds: 4, scale: 1.18 },
      { key: 'exhale', label: 'נשיפה — הבטן מתרוקנת', seconds: 6, scale: 0.78 },
    ],
    sessionGoal: { type: 'minutes', default: 5, options: [3, 5, 10] },
    evidence: [
      {
        note: 'אחת הטכניקות הנפוצות במטא-אנליזה של 40 RCT-ים (3,047 משתתפים): הפחתה משמעותית בחרדה (Hedges׳ g = 0.678-) — אפקט משולב, לא פירוק לפי טכניקה.',
        source: 'PMC8302658 (מטא-אנליזה)',
      },
      { note: 'פרוטוקול 5–10 דקות, 2–3 פעמים ביום; ההמרה לטיימר אינה נדרשת במקור וההדרכה הכתובה מספקת.', source: 'Cleveland Clinic' },
    ],
    protocolNote: 'בפרוטוקול המקורי אין תזמון מספרי — הטיימר כאן הוא התאמת מוצר לצורך התרגול המונחה.',
    safety: {},
  },

  // ─────────────────────────────────────────────────────────────
  // משפחת הפראנאיאמה (יוגה)
  // ─────────────────────────────────────────────────────────────
  {
    id: 'nadi-shodhana',
    nameHe: 'נדי-שודהאנה (נחיריים לסירוגין)',
    nameEn: 'Nadi Shodhana',
    family: 'pranayama',
    tier: 'general',
    deploymentEnabled: true,
    mode: 'phases',
    icon: 'ArrowLeftRight',
    tagline: 'איזון בין שני צדדים',
    useWhen: ['איזון', 'הרגעה', 'מיינדפולנס בתנועה'],
    description:
      'נשימה לסירוגין בין הנחיריים בסגירה עדינה של האגודל והאצבע. ההחזקה במקור היא "פעימה או שתיים" בלבד — בלי יחס זמן מספרי. מאזנת ומרגיעה.',
    instructions: [
      'הנח/י את האגודל ליד הנחיר הימני ואת האצבע ליד השמאלי — סגירה עדינה, בלי ללחוץ.',
      'סגור/י את הנחיר הימני ושאף/י דרך השמאלי.',
      'החזק/י שתי הנחיריים סגורות — פעימה או שתיים בלבד.',
      'שחרר/י את הימני ונשוף/י דרכו; מיד שאף/י דרכו.',
      'שוב החזקה קצרה, ונשיפה דרך השמאלי. זהו סבב מלא — המשך/י ברצף עדין.',
    ],
    phases: [
      { key: 'inhale', label: 'שאיפה — נחיר שמאל', seconds: 4, scale: 1.18 },
      { key: 'hold', label: 'החזקה — פעימה', seconds: 1, scale: 1.18 },
      { key: 'exhale', label: 'נשיפה — נחיר ימין', seconds: 6, scale: 0.78 },
      { key: 'inhale', label: 'שאיפה — נחיר ימין', seconds: 4, scale: 1.18 },
      { key: 'hold', label: 'החזקה — פעימה', seconds: 1, scale: 1.18 },
      { key: 'exhale', label: 'נשיפה — נחיר שמאל', seconds: 6, scale: 0.78 },
    ],
    sessionGoal: { type: 'minutes', default: 5, options: [3, 5, 10] },
    evidence: [
      {
        note: 'מחקר קרוסאובר 2026 (34 סטודנטים): אצל גברים הפחיתה מתח נתפס יותר מ-4-7-8; אצל נשים ההיפך. ללא אפקטים מרכזיים במדדי HRV. בסיס הראיות העצמאי מצומצם.',
        source: 'Springer 2026',
      },
      { note: 'ההחזקה במקור: "פעימה או שתיים" בלבד, ללא יחס זמן מספרי.', source: 'Cleveland Clinic' },
    ],
    protocolNote: 'ההחזקה הקצרה מיוצגת כאן כשנייה אחת — התאמת מוצר לצורך הטיימר.',
    safety: {
      warnings: ['סגור/י את הנחיריים בעדינות — לחץ חזק עלול לגרום לגירוי.'],
    },
  },
  {
    id: 'ujjayi',
    nameHe: 'אוג׳איי (נשימת האוקיינוס)',
    nameEn: 'Ujjayi Breath',
    family: 'pranayama',
    tier: 'general',
    deploymentEnabled: true,
    mode: 'phases',
    icon: 'Ear',
    tagline: 'צליל גלים פנימי',
    useWhen: ['הרגעה', 'ריכוז', 'ליווי מדיטציה'],
    description:
      'היצרות עדין של פתח הגרון שיוצר צליל גלי-רחש עדין בשאיפה ובנשיפה — כמו גלי ים פנימיים. הצליל עצמו משמש כעוגן קשבי נוסף.',
    instructions: [
      'שאף/י דרך האף והוצא/י את האוויר דרך פה פתוח עם "האאה" שקט — כמו האדת על מראה.',
      'עצור/י את הפה וחזור/י על אותה הנשיפה עם פה סגור — הרחש נשאר בגרון.',
      'הרגש/י את הליחלוח העדין בגרון; הצליל נמוך ורך, לא נחירה.',
      'שאיפה ונשיפה שוות וארוכות, עם הצליל לאורך כולן.',
      'הקצב האיטי במיוחד (2–4 נשימות בדקה) שייך לפרוטוקול SKY — כאן ננשום קצב נוח.',
    ],
    phases: [
      { key: 'inhale', label: 'שאיפה — עם רחש גרון', seconds: 5, scale: 1.18 },
      { key: 'exhale', label: 'נשיפה — עם רחש גרון', seconds: 5, scale: 0.78 },
    ],
    sessionGoal: { type: 'minutes', default: 5, options: [3, 5, 10] },
    evidence: [
      {
        note: 'במחקר השוואתי תוך-נבדק (לא RCT) של 4 טכניקות יוגיות הראתה אפקט מרגיע והפחתת מתח.',
        source: 'Lidsen ICM',
      },
      { note: 'קצב 2–4 נשימות לדקה מתואר בהקשר פרוטוקול SKY — קצב ספציפי לפרוטוקול ההוא, לא דרישה.', source: 'PMC3573542' },
    ],
    safety: {
      warnings: ['אם הגרון מתייבש או מתאמץ — הפסק/י; ההיצרות צריכה להיות כמעט בלתי מורגשת.'],
    },
  },
  {
    id: 'bhramari',
    nameHe: 'בהרמארי (נשימת הדבורה)',
    nameEn: 'Bhramari',
    family: 'pranayama',
    tier: 'general',
    deploymentEnabled: true,
    mode: 'phases',
    icon: 'Music',
    tagline: 'זמזום מרגיע בנשיפה',
    useWhen: ['הרגעה', 'לפני שינה', 'הפחתת רעש פנימי'],
    description:
      'זמזום עמוק וממושך בזמן הנשיפה — הרטט והצליל מלטפים את מערכת העצבים. מחקרי EEG קטנים דיווחו על תחושת שלווה. לא לתרגל בנהיגה.',
    instructions: [
      'שב/י בנוח ועצמ/י עיניים. אפשר לכסות בעדינות את האוזניים עם האצבעות.',
      'שאיפה רגילה ונינוחה דרך האף.',
      'בנשיפה — השמע/י זמזום נמוך ואחיד כמו זמזום דבורה, עד תום האוויר.',
      'הרגש/י את הרטט בגולגולת, בלסת, בחזה.',
      'כמה דקות מספיקות. מצוין לפני שינה — לא בנהיגה!',
    ],
    phases: [
      { key: 'inhale', label: 'שאיפה שקטה', seconds: 4, scale: 1.15 },
      { key: 'exhale', label: 'נשיפה — זמזום', seconds: 8, scale: 0.78 },
    ],
    sessionGoal: { type: 'minutes', default: 3, options: [2, 3, 5] },
    evidence: [
      {
        note: 'מחקרי EEG קטנים דיווחו על תחושת שלווה ושיפור בעיכוב תגובה — ראיות ראשוניות.',
        source: 'PMC7735501',
      },
    ],
    safety: {
      environments: ['לא לתרגל בנהיגה או בפעילות הדורשת ערנות שמיעתית.'],
      warnings: ['אם מופיע סחרחורת — הפסק/י זמזום ונשום/י רגיל.'],
    },
  },
  {
    id: 'shitali',
    nameHe: 'שיטלי (נשימה מקררת)',
    nameEn: 'Shitali',
    family: 'pranayama',
    tier: 'general',
    deploymentEnabled: false,
    mode: 'open',
    icon: 'Snowflake',
    tagline: 'מסורתית — מושבתת עד אימות פרוטוקול',
    useWhen: [],
    description:
      'שאיפה דרך הלשון המקופלת (או דרך השיניים בגרסת שיטקארי) ונשיפה אפית. מוזכרת במחקרים אך אין ראיות עצמאיות לתועלת בריאותית — מוצגת כמסורת בלבד, ומושבתת לפריסה עד אימות פרטי הפרוטוקול מול מקור שנקרא.',
    instructions: [],
    sessionGoal: { type: 'minutes', default: 5, options: [5] },
    evidence: [
      { note: 'אין ראיות עצמאיות לתועלת בריאותית; הערך מסומן בלתי-מאומת בקטלוג המחקרי.', source: 'PMC12392162' },
    ],
    referenceNote: 'כללי (general) אך מושבת: פרטי הפרוטוקול לא אומתו מול מקור שנקרא.',
  },
  {
    id: 'kapalabhati',
    nameHe: 'קפאלבהאטי',
    nameEn: 'Kapalabhati',
    family: 'pranayama',
    tier: 'safeguards',
    deploymentEnabled: false,
    mode: 'phases',
    icon: 'Zap',
    tagline: 'נשיפות פעימתיות — מושבת לפריסה',
    useWhen: [],
    description:
      'נשיפות פעימתיות חדות מהבטן עם שאיפה פסיבית. מסומנת safeguards: הפעלתה כתרגול מונחה דורשת בדיקת התאמה מקצועית ומסך התוויות נגד.',
    instructions: [],
    sessionGoal: { type: 'minutes', default: 5, options: [5] },
    evidence: [],
    safety: {
      contraindications: [
        'היריון',
        'לחץ דם גבוה',
        'מחלת לב',
        'גלאוקומה',
        'אפילפסיה',
        'בקע',
        'ניתוח בטני חדש',
        'הפרעות פאניקה',
      ],
    },
    referenceNote: 'התוויות הנגד לפי מקור המסורת; הפעלה דורשת בדיקת התאמה מקצועית.',
  },
  {
    id: 'bhastrika',
    nameHe: 'בהסטריקה (מפח הנפח)',
    nameEn: 'Bhastrika',
    family: 'pranayama',
    tier: 'safeguards',
    deploymentEnabled: false,
    mode: 'phases',
    icon: 'Zap',
    tagline: 'שאיפה ונשיפה כוחניות — מושבת לפריסה',
    useWhen: [],
    description:
      'שאיפה ונשיפה כוחניות ושוות. מסומנת safeguards: הפעלתה כתרגול מונחה דורשת בדיקת התאמה מקצועית ומסך התוויות נגד.',
    instructions: [],
    sessionGoal: { type: 'minutes', default: 5, options: [5] },
    evidence: [],
    safety: {
      contraindications: [
        'היריון',
        'לחץ דם גבוה',
        'מחלת לב',
        'גלאוקומה',
        'אפילפסיה',
        'בקע',
        'ניתוח בטני חדש',
        'הפרעות פאניקה',
      ],
    },
    referenceNote: 'התוויות הנגד לפי מקור המסורת; הפעלה דורשת בדיקת התאמה מקצועית.',
  },
  {
    id: 'sudarshan-kriya',
    nameHe: 'סודרשן קריה (SKY)',
    nameEn: 'Sudarshan Kriya',
    family: 'pranayama',
    tier: 'safeguards',
    deploymentEnabled: false,
    mode: 'phases',
    icon: 'Sparkles',
    tagline: 'רצף מובנה — נלמד בסדנאות מוסמכות',
    useWhen: [],
    description:
      'רצף מובנה: אוג׳איי איטי, בהסטריקה, שירת אום ונשימה קצבית מחזורית. נלמדת בסדנאות מוסמכות — הפניה חינוכית בלבד.',
    instructions: [],
    sessionGoal: { type: 'minutes', default: 5, options: [5] },
    evidence: [
      { note: 'תיאור הרצף והמבנה בהקשר מחקרי.', source: 'PMC3573542' },
    ],
    referenceNote: 'נלמדת בסדנאות מוסמכות בלבד; deployment_enabled: false (הפניה חינוכית).',
  },

  // ─────────────────────────────────────────────────────────────
  // משפחת הברית׳וורק האינטנסיבי — מושבת עד בדיקת בטיחות
  // ─────────────────────────────────────────────────────────────
  {
    id: 'cyclic-hyperventilation',
    nameHe: 'היפר-ונטילציה מחזורית עם החזקה',
    nameEn: 'Cyclic Hyperventilation',
    family: 'intense',
    tier: 'safeguards',
    deploymentEnabled: false,
    mode: 'phases',
    icon: 'Flame',
    tagline: 'פרוטוקול מחקרי — מושבת לפריסה',
    useWhen: [],
    description:
      '3 סבבים; בכל סבב 30 שאיפות עמוקות עם נשיפה פסיבית, ואז נשיפה מלאה והחזקה של 15 שניות עם ריאות ריקות; כ-5 דקות. במחקר שיפרה אפקט חיובי, אך התרגול בעל אופי מעורר — לא כלי הרגעה. ה-30 נשימות הן בלוק חזרות מקונן בתוך סבב, לא שלב בודד.',
    instructions: [],
    sessionGoal: { type: 'minutes', default: 5, options: [5] },
    evidence: [
      {
        note: 'ב-RCT סטנפורד: אפקט חיובי עלה במובהקות (p=0.003); מול מיינדפולנס ללא מובהקות בהשוואה הבין-קבוצתית.',
        source: 'Balban et al. 2023 (Stanford)',
      },
    ],
    safety: {
      warnings: ['גורמת לעיקצוץ, סחרחורת ולעיתים התעלפות.'],
      environments: ['אסורה בנהיגה, במים, בעמידה ליד גבהים או ללא סביבה בטוחה.'],
    },
    referenceNote: 'deployment_enabled: false עד בדיקת בטיחות מקצועית; הפרוטוקול נשמר לתיעוד מחקרי.',
  },
  {
    id: 'wim-hof',
    nameHe: 'שיטת וים הוף',
    nameEn: 'Wim Hof Method',
    family: 'intense',
    tier: 'safeguards',
    deploymentEnabled: false,
    mode: 'phases',
    icon: 'Snowflake',
    tagline: 'פרוטוקול מחקרי — מושבת לפריסה',
    useWhen: [],
    description:
      '2–3 סבבים של 30–40 נשימות עמוקות (שאיפה לבטן וחזה, נשיפה פסיבית), החזקה ארוכה אחרי נשיפה, שאיפה עמוקה והחזקה של 10–15 שניות. ההליך המלא במחקר נמשך כ-15 דקות כולל מדיטציה וחשיפה מדורגת לקור — אין משך מאומת לחלק הנשימתי בלבד.',
    instructions: [],
    sessionGoal: { type: 'minutes', default: 15, options: [15] },
    evidence: [
      { note: 'PNAS 2014: השפעה וולונטרית על המערכת האוטונומית והדלקת.', source: 'Kox et al. 2014 (PNAS)' },
      {
        note: 'מחקר בפצועי חוט שדרה: תופעות קלות בלבד — עיקצוץ (8), כאבי ראש (5), סחרחורת (3), ללא אירועים חמורים.',
        source: 'PMC13428070',
      },
    ],
    safety: {
      warnings: ['לעולם לא במים או בנהיגה.'],
      environments: ['אסורה במים, בנהיגה או ללא השגחה.'],
    },
    referenceNote: 'deployment_enabled: false עד בדיקת בטיחות מקצועית.',
  },
  {
    id: 'holotropic',
    nameHe: 'ברית׳וורק הולוטרופי',
    nameEn: 'Holotropic Breathwork',
    family: 'intense',
    tier: 'reference_only',
    deploymentEnabled: false,
    mode: 'open',
    icon: 'BookOpen',
    tagline: 'מידע והפניה בלבד',
    useWhen: [],
    description:
      'נשימה מהירה מעגלית בהנחיה עם מוזיקה לחקר תודעה. דיווחים על תועלת רגשית ללא בסיס קליני חזק. מחייב התייעצות רפואית מוקדמת והנחיה מוסמכת.',
    instructions: [],
    sessionGoal: { type: 'minutes', default: 5, options: [5] },
    evidence: [],
    safety: {
      contraindications: ['היריון', 'מחלות לב', 'אפילפסיה', 'גלאוקומה', 'היסטוריה פסיכוטית'],
      warnings: ['התייעצות רפואית חובה לפני השתתפות.'],
    },
    referenceNote: 'ללא פרוטוקול הרצה במערכת — הפניה לסדנה מוסמכת בלבד.',
  },
  {
    id: 'connected-breathing',
    nameHe: 'נשימה מחוברת',
    nameEn: 'Conscious Connected Breathing',
    family: 'intense',
    tier: 'reference_only',
    deploymentEnabled: false,
    mode: 'open',
    icon: 'BookOpen',
    tagline: 'מידע והפניה בלבד',
    useWhen: [],
    description:
      'נשימה רציפה ללא הפסקות בהנחיה. מטא-אנליזה של 25 מחקרים מבוקרים מצאה הפחתות בחרדה, דיכאון ומתח נתפס — אך האפקטים החזקים ביותר נקשרו דווקא לנשימה סרעפתית איטית ומקוצבת, לא לנשימה המחוברת עצמה.',
    instructions: [],
    sessionGoal: { type: 'minutes', default: 5, options: [5] },
    evidence: [
      {
        note: 'סקירה ומטא-אנליזה של 25 מחקרים (N=1,278): הפחתות בינוניות-גדולות בחרדה, דיכאון ומתח נתפס; האפקטים החזקים ביותר יוחסו לנשימה הסרעפתית האיטית.',
        source: 'Taylor & Francis (סקירת ברית׳וורק בפסיכותרפיה)',
      },
    ],
    referenceNote: 'ללא פרוטוקול הרצה במערכת — הפניה למנחה מוסמך בלבד.',
  },

  // ─────────────────────────────────────────────────────────────
  // משפחה קלינית/שיקומית
  // ─────────────────────────────────────────────────────────────
  {
    id: 'buteyko',
    nameHe: 'שיטת בוטייקו',
    nameEn: 'Buteyko Method',
    family: 'clinical',
    tier: 'safeguards',
    deploymentEnabled: false,
    mode: 'open',
    icon: 'Activity',
    tagline: 'שיטה קלינית — נלמדת בהדרכה',
    useWhen: [],
    description:
      'הכשרה מחדש של תבנית הנשימה להפחתת נשימת-יתר. קוכריין 2020 (אסתמה): שיפור באיכות חיים עד 3 חודשים — אך ההוכחה מגיעה בעיקר ממחקרי יוגה. שיטה קלינית הנלמדת בהדרכה.',
    instructions: [],
    sessionGoal: { type: 'minutes', default: 5, options: [5] },
    evidence: [
      {
        note: '22 מחקרים, 2,880 מבוגרים עם אסתמה: שיפור AQLQ (MD 0.42) עד 3 חודשים מול טיפול רגיל; מחקר בוטייקו אחד נכלל.',
        source: 'Cochrane Library 2020',
      },
    ],
    referenceNote: 'safeguards: דורשת הדרכה מקצועית — deployment_enabled: false.',
  },
  {
    id: 'papworth',
    nameHe: 'שיטת פפוורת׳',
    nameEn: 'Papworth Method',
    family: 'clinical',
    tier: 'safeguards',
    deploymentEnabled: false,
    mode: 'open',
    icon: 'Activity',
    tagline: 'שיטה קלינית — נלמדת בהדרכה',
    useWhen: [],
    description:
      'גישה קלינית להרגלי נשימה והרפיה מהפיזיותרפיה הבריטית. נכללה בסקירת קוכריין (מחקר אחד) — נלמדת בהדרכה מקצועית.',
    instructions: [],
    sessionGoal: { type: 'minutes', default: 5, options: [5] },
    evidence: [
      { note: 'מחקר פפוורת׳ אחד נכלל בסקירת קוכריין לאסתמה.', source: 'Cochrane Library 2020' },
    ],
    referenceNote: 'safeguards: דורשת הדרכה מקצועית — deployment_enabled: false.',
  },
  {
    id: 'pursed-lip',
    nameHe: 'נשימת שפתיים מקומטות',
    nameEn: 'Pursed-Lip Breathing',
    family: 'clinical',
    tier: 'general',
    deploymentEnabled: true,
    mode: 'phases',
    icon: 'CircleDot',
    tagline: 'לקוצר נשימה — נשיפה כפולה משאיפה',
    useWhen: ['קוצר נשימה', 'מאמץ גופני', 'התאוששות'],
    description:
      'שאיפה אפית קצרה ונשיפה איטית דרך שפתיים מקומטות כאילו מנשמים דרך קשית — יחס 1:2 (2:4, ועם הזמן 4:8). מקלה על תחושת קוצר נשימה במאמץ.',
    instructions: [
      'שאיפה דרך האף — 2 ספירות.',
      'קמט/י את השפתיים כאילו את/ה עומד/ת לכבות נר או לנשום דרך קשית.',
      'נשיפה איטית ועדינה דרך השפתיים המקומטות — 4 ספירות (פי שניים מהשאיפה).',
      'עם התמדה אפשר לעבור ל-4:8 — היחס חשוב, לא המספרים המוחלטים.',
      'שימושי במיוחד בזמן מאמץ: עליית מדרגות, הליכה מהירה.',
    ],
    phases: [
      { key: 'inhale', label: 'שאיפה דרך האף', counts: 2, seconds: 2, scale: 1.15 },
      { key: 'exhale', label: 'נשיפה — שפתיים מקומטות', counts: 4, seconds: 4, scale: 0.78 },
    ],
    countsBased: true,
    paceOptions: [1, 1.5, 2],
    sessionGoal: { type: 'minutes', default: 3, options: [2, 3, 5] },
    evidence: [
      {
        note: 'קוכריין (16 מחקרים, 1,233 משתתפים, רובם COPD קשה): מחקר אחד דיווח שיפור של 50 מטר בהליכת 6 דקות; קוצר נשימה ואיכות חיים — תוצאות לא עקביות.',
        source: 'Cochrane Library',
      },
    ],
    protocolNote: 'היחס 1:2 הוא הפרוטוקול; המספרים המוחלטים (2:4 ועד 4:8) ניתנים לכוונון בקצב.',
    safety: {},
  },
];

/** הטכניקות הזמינות לתרגול בפועל */
export const ACTIVE_TECHNIQUES = BREATHING_TECHNIQUES.filter((t) => t.deploymentEnabled);

/** כרטיסי מידע והפניה בלבד */
export const REFERENCE_TECHNIQUES = BREATHING_TECHNIQUES.filter(
  (t) => t.tier === 'reference_only'
);

export const TECHNIQUE_BY_ID = new Map(BREATHING_TECHNIQUES.map((t) => [t.id, t]));

/** האנחה הפיזיולוגית — כלי "עזרה ראשונה" המוצג בבולטות */
export const FIRST_AID_TECHNIQUE_ID = 'physiological-sigh';

export const MODULE_DISCLAIMER =
  'התכנים מיועדים לרווחה כללית של מבוגרים ואינם תחליף לייעוץ רפואי או נפשי. הראיות מדברות על הפחתת תסמיני מתח ושיפור מצב רוח — לא על ריפוי קליני. חשת סחרחורת או אי-נוחות? עצור/י ונשום/י רגיל.';
