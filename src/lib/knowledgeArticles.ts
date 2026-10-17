// קטלוג מאמרי פסיכו-חינוך — "הבנת הנפש"
// כל מאמר מבוסס על מחקרים אמיתיים עם ציטוט מקורות מלא לשקיפות.

export type EvidenceTier = 'verified' | 'promising' | 'framework';

export interface KnowledgeFinding {
  highlight: string;
  citation: string;
  link?: string;
}

export interface KnowledgeTool {
  icon: 'breathing' | 'journal' | 'songs' | 'thought';
  text: string;
  linkTo?: 'breathing' | 'insights' | 'songs';
}

export interface KnowledgeArticle {
  id: string;
  categoryId: string;
  titleHe: string;
  readMinutes: number;
  evidenceTier: EvidenceTier;
  body: string;
  findings: KnowledgeFinding[];
  tools: KnowledgeTool[];
  sources: Array<{ ref: string; link?: string }>;
}

export interface KnowledgeCategory {
  id: string;
  nameHe: string;
  icon: string;
  description: string;
}

export const KNOWLEDGE_CATEGORIES: KnowledgeCategory[] = [
  { id: 'anxiety', nameHe: 'חרדה ופאניקה', icon: 'CloudRain', description: 'להבין מה קורה בגוף ובמוח — ומה עוזר באמת' },
  { id: 'depression', nameHe: 'דיכאון', icon: 'CloudDrizzle', description: 'זה לא עצלות — זה המוח שלך מתמודד' },
  { id: 'separation', nameHe: 'פרידה וגירושין', icon: 'HeartCrack', description: 'המסע הרגשי — גם שלך וגם של הילדים' },
  { id: 'grief', nameHe: 'אובדן ואבל', icon: 'Flame', description: 'גלים, לא שלבים — וזה בסדר לנשום' },
  { id: 'regulation', nameHe: 'ויסות רגשי', icon: 'Waves', description: 'למה אני מתפוצץ/ת — ומה עושים עם זה' },
  { id: 'self-esteem', nameHe: 'הערכה עצמית', icon: 'Sparkles', description: 'המבקר הפנימי — ואיך מתיידדים איתו' },
  { id: 'relationships', nameHe: 'מערכות יחסים', icon: 'Users', description: 'למה אני בוחר/ת את מה שאני בוחר/ת' },
  { id: 'calm-tools', nameHe: 'כלים להרגעה', icon: 'Wind', description: 'טכניקות מהירות לרגעים קשים' },
];

const DISCLAIMER_TEXT = 'התוכן מבוסס על מחקרים מדעיים ומצוטט לשקיפות. אינו תחליף לייעוץ מקצועי. במקרה מצוקה — פנה/י לעזרה מקצועית או לקו החירום.';

export const KNOWLEDGE_ARTICLES: KnowledgeArticle[] = [
  // ═════════════════════════════════════════════════════════════
  // 😰 חרדה ופאניקה
  // ═════════════════════════════════════════════════════════════
  {
    id: 'anxiety-why-body-reacts',
    categoryId: 'anxiety',
    titleHe: 'למה הגוף שלי מגיב ככה?',
    readMinutes: 4,
    evidenceTier: 'verified',
    body: `כשאתה חווה חרדה, האמיגדלה — "מרכז האזעקה" במוח — שולחת אות לכל הגוף לפני שהמוח החושב מספיק להעריך את המצב.

זה קורה בשתי מהירויות: מסלול מהיר (אדרנלין תוך שניות — לב מאיץ, נשימה מתקצרת) ומסלול איטי (קורטיזול תוך דקות — שומר על המתח).

זה לא תקלה. זו מערכת הגנה עתיקה שנבנתה להציל אותך מטורפים. הבעיה? היא לא יודעת שהבוס שלך לא נמר.

ולכן — לוגיקה לבדה לא עוצרת גל חרדה, כי המסלול המהיר עוקף את אזור החשיבה. אבל נשימה עובדת, כי היא מדברת את שפת הגוף.`,
    findings: [
      {
        highlight: 'נשימה איטית עם נשיפה ארוכה ניצחה מדיטציית מיינדפולנס בשיפור מצב-רוח והפחתת עוררות פיזיולוגית',
        citation: 'Balban MY et al. (2023), Cell Reports Medicine, Stanford University',
        link: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC9873947',
      },
      {
        highlight: 'התגובה רצה בשני מסלולים: SAM (אדרנלין, שניות) ו-HPA (קורטיזול, דקות) — בחרדה כרונית המערכת נתקעת ב"דולק"',
        citation: 'Chu B & Dagramaci I. (2024), StatPearls — Physiology, Stress Reaction',
      },
      {
        highlight: 'האמיגדלה מגיבה תוך ~6 שניות — לפני שהקורטקס הקדם-מצחי (החשיבה) מספיק להעריך',
        citation: 'Harvard Health Publishing (2024), Understanding the Stress Response',
      },
    ],
    tools: [
      { icon: 'breathing', text: 'תרגיל 4-7-8 — הכי יעיל לפי המחקר להרגעת מערכת העצבים', linkTo: 'breathing' },
      { icon: 'thought', text: 'נקודה למחשבה: "הגוף שלי מנסה להגן עליי. הוא לא מנסה לפגוע בי. אני יכול/ה להודות לו ולהרגיע אותו."' },
    ],
    sources: [
      { ref: 'Balban MY, Neri E, Kogon MM, et al. Brief structured respiration practices enhance mood and reduce physiological arousal. Cell Rep Med. 2023.', link: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC9873947' },
      { ref: 'Chu B, Dagramaci I. Physiology, Stress Reaction. StatPearls. 2024.', link: 'https://www.ncbi.nlm.nih.gov/books/NBK541120' },
      { ref: 'Harvard Health Publishing. Understanding the Stress Response. 2024.', link: 'https://www.health.harvard.edu/healthy-aging-and-longevity/understanding-the-stress-response' },
    ],
  },
  {
    id: 'anxiety-panic-what-to-do',
    categoryId: 'anxiety',
    titleHe: 'התקף חרדה — מה עושים ברגע?',
    readMinutes: 3,
    evidenceTier: 'verified',
    body: `התקף פאניקה הוא גל פתאומי של פחד עוצמתי שמגיע לשיא תוך ~10 דקות ובדרך כלל חולף תוך 20-30 דקות.

לב מיטפטף. נשימה קצרה. רעידות. כאב חזה. סחרחורת. מחשבות מפחידות ("אני מת / מאבד/ת שליטה").

הדבר החשוב ביותר לדעת: זה לא מסוכן. זה אדרנלין. זה תמיד חולף.

מה שמזין את המעגל זה "פחד מהפחד" — פחד מהתסמינים עצמם. וזה בדיוק מה שאפשר לשבור.`,
    findings: [
      {
        highlight: 'CBT להפרעת פאניקה: ~70% מהמטופלים מגיעים ל"חופשיים מפאניקה" אחרי טיפול',
        citation: 'Pompoli A et al. (2018), Journal of Affective Disorders — network meta-analysis',
      },
      {
        highlight: 'פורמט אינטנסיבי (4 ימים) השיג 90% הפוגה במעקר של 18 חודשים',
        citation: 'Eide P et al. (2025), Bergen 4-Day CBT study',
      },
    ],
    tools: [
      { icon: 'breathing', text: 'נשיפה ארוכה דרך הפה — אנחה פיזיולוגית: שאיפה + "לגימה" + נשיפה ארוכה. הדבר המהיר ביותר לפי המחקר', linkTo: 'breathing' },
      { icon: 'thought', text: 'זכור/י: "זה אדרנלין. זה מגיע לשיא ב-10 דקות וחולף. זה לא יכול לפגוע בי."' },
    ],
    sources: [
      { ref: 'Pompoli A, et al. Dismantling cognitive behaviour therapy for panic disorder: a network meta-analysis. J Affect Disord. 2018.', link: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC6137372' },
      { ref: 'Barlow DH. Behavioral treatment of panic disorder. Behavior Therapy. 1989 (foundational).' },
      { ref: 'Eide P, et al. Bergen 4-day concentrated CBT for panic disorder. 2025.' },
    ],
  },
  {
    id: 'anxiety-social',
    categoryId: 'anxiety',
    titleHe: 'חרדה חברתית — למה אני מפחד/ת מאנשים?',
    readMinutes: 4,
    evidenceTier: 'verified',
    body: `חרדה חברתית היא לא "ביישנות". זה מעגל שמזין את עצמו:

1. הקשב נפנה פנימה — "איך אני נראה עכשיו?"
2. אתה צופה ב"סרט" מעוות של איך שנדמה לך שאתה נראה
3. התנהגויות בטיחות (חזרות על משפטים, הימנעות מקשר עין) מונעות ממך לגלות את האמת
4. ולכן הדימוי המפחיד לעולם לא מופרך

הטיפול עובד — על ידי הפיכת כל חלק במעגל.`,
    findings: [
      {
        highlight: 'טיפול קוגניטיבי אישי (CT-SAD) עלה על תרופות (פלואוקסטין) + חשיפה עצמית בניסויים אקראיים',
        citation: 'Clark DM & Wells A. (1995) — cognitive model; Clark DM et al. (2022) — internet-delivered CT-SAD',
      },
      {
        highlight: 'גרסה דיגיטלית של הטיפול השיגה תוצאות זהות לפנים-אל-פנים — עם יותר מכפלי יעילות מטפל',
        citation: 'Clark DM et al. (2022), internet-delivered CT-SAD',
      },
    ],
    tools: [
      { icon: 'thought', text: 'נסה/י לזהות: מה התנהגות בטיחות אחת שאתה עושה? (למשל: לחזור על משפט בראש). מה היה קורה אם תפסיק/י?' },
      { icon: 'journal', text: 'כתוב/י ביומן: מה הכי גרוע שיכול לקרות חברתית? מה הסיכוי האמיתי?', linkTo: 'insights' },
    ],
    sources: [
      { ref: 'Clark DM, Wells A. A cognitive model of social phobia. In: Social Phobia: Diagnosis, Assessment, and Treatment. 1995.' },
      { ref: 'Clark DM, et al. Internet-delivered cognitive therapy for social anxiety disorder. 2022.', link: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC3695729' },
      { ref: 'Hofmann SG. Cognitive factors that maintain social anxiety disorder. Cogn Behav Pract. 2007.', link: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC2151931' },
    ],
  },

  // ═════════════════════════════════════════════════════════════
  // 🌧️ דיכאון
  // ═════════════════════════════════════════════════════════════
  {
    id: 'depression-not-laziness',
    categoryId: 'depression',
    titleHe: 'דיכאון זה לא עצלות',
    readMinutes: 4,
    evidenceTier: 'verified',
    body: `דיכאון מייצר שינויים מדידים במוח:

האמיגדלה (מרכז רגש) — פעילה יתר על המידה.
הקורטקס הקדם-מצחי (הבקרה) — נחלש.
מעגלי התגמול — מפסיקים להגיב ("כלום לא כיף").
ההיפוקמפוס (זיכרון וריכוז) — מאבד נפח.

זהו נזק מוחי זמני — לא כשל מוסרי. לא היית אומר/ת למישהו עם רגל שבורה "פשוט לך ללכת".

והכי חשוב: זה הפיך. טיפול מעלה BDNF (חלבון שמזין תאי עצב), משחזר נפח היפוקמפוס, ומחזיר גמישות סינפטית.`,
    findings: [
      {
        highlight: 'דיכאון מוריד BDNF ופוגע בנוירו-פלסטיות — טיפול (תרופתי/פסיכותרפיה/ספורט) מעלה BDNF ומשחזר',
        citation: 'Yang et al. (2020), Cell Communication and Signaling — The Role of BDNF on Neural Plasticity in Depression',
      },
      {
        highlight: 'קיימת ירידה בקישוריות אמיגדלה-קורטקס בדיכאון — "הבלם" נחלש',
        citation: 'Ramasubbu R et al. (2014), PMC3928548',
      },
    ],
    tools: [
      { icon: 'thought', text: 'זכור/י: המוח שלך פועל עם מערכת מוטיבציה פגועה — זמנית. זה לא את/ה, זה הדיכאון.' },
      { icon: 'songs', text: 'מוזיקה שעושה לך טוב — הכי מהיר להפעלת מעגלי תגמול', linkTo: 'songs' },
    ],
    sources: [
      { ref: 'Yang C, et al. The Role of BDNF on Neural Plasticity in Depression. Cell Commun Signal. 2020.', link: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC7174655' },
      { ref: 'Ramasubbu R, et al. Amygdala-ventrolateral prefrontal cortex connectivity in depression. 2014.', link: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC3928548' },
      { ref: 'Queensland Brain Institute. Depression and the Brain.', link: 'https://qbi.uq.edu.au/brain/brain-diseases/depression/depression-and-brain' },
    ],
  },
  {
    id: 'depression-cant-get-up',
    categoryId: 'depression',
    titleHe: 'למה קשה לצאת מהמיטה?',
    readMinutes: 3,
    evidenceTier: 'verified',
    body: `לקום מהמיטה נשמע פשוט. אבל זו בעצם משימה ניהולית מורכבת שדורשת: התחלת משימה, מעבר מצב (שינה→פעולה), ומוטיבציה עצמית — כולן פונקציות של הקורטקס הקדם-מצחי.

בדיכאון, הקורטקס הזה פועל לקוי. זה לא "את/ה עצלן/ית" — זו פגיעה נוירוקוגניטיבית מדידה.

מה עוזר? להקטין את המשימה עד שהמוח הפגוע מצליח:
"רק רגל אחת על הרצפה" במקום "לקום ולהתחיל יום".`,
    findings: [
      {
        highlight: 'פגיעה בתפקוד ניהולי (executive function) בדיכאון קשורה ספציפית לעייפות, אנהדוניה ושיבושי שינה — לא רק למצב רוח נמוך',
        citation: 'Kraft RA et al. (2023), ScienceDirect — reduced executive function in depression',
      },
      {
        highlight: 'הפרעת שינה חמורה בדיכאון מחמירה ספציפית את היכולת להחליף מצב — בדיוק המיומנות שנדרשת כדי לצאת מהמיטה',
        citation: 'Cui et al. (2021), PMC8054425',
      },
    ],
    tools: [
      { icon: 'thought', text: 'התחל/י קטן: "רגל אחת על הרצפה" — ואז עוד צעד. פעולה לפני מוטיבציה.' },
      { icon: 'breathing', text: 'נשימה אחת לפני שקמים — 4-7-8 פעם אחת. מעיר את הגוף בעדינות', linkTo: 'breathing' },
    ],
    sources: [
      { ref: 'Kraft RA, et al. Executive function in depression. ScienceDirect. 2023.' },
      { ref: 'Cui et al. Sleep disturbance and executive shifting in MDD. PMC. 2021.', link: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC8054425' },
      { ref: 'Jacobson NS, et al. Component analysis of behavioral activation. J Consult Clin Psychol. 1996.' },
    ],
  },
  {
    id: 'depression-loneliness',
    categoryId: 'depression',
    titleHe: 'בדידות — הסיגריות הרגשיות',
    readMinutes: 3,
    evidenceTier: 'verified',
    body: `בדידות חברתית נושאת סיכון תמותה של 26-29% — שקול לעישון 15 סיגריות ביום.

זו לא מטאפורה. זה נתון ממטא-אנליזה של 70 מחקרים, 3.4 מיליון משתתפים.

הבדידות היא אות ביולוגי — כמו רעב או צמא — שדוחף אותנו להתחבר. זו מערכת הישרדות, לא חולשה.

ולכן: חיבור חברתי הוא לא "נחמד להיות" — הוא רפואה.`,
    findings: [
      {
        highlight: 'קשרים חברתיים חלשים = סיכון תמותה מוגבר ב-50%; בדידות מגדילה סיכוי למוות מוקדם ב-26%',
        citation: 'Holt-Lunstad J et al. (2015), Perspectives on Psychological Science — meta-analysis of 70 studies',
      },
      {
        highlight: 'בדידות מנבאת דיכאון ותחלואה באופן עצמאי',
        citation: 'Park C et al. (2020), Journal of Affective Disorders',
      },
    ],
    tools: [
      { icon: 'thought', text: 'בדידות = רעב לחיבור. זה אות, לא כישלון. מיקרו-חיבורים סופרים: שיחה קצרה עם השכן, הודעה לחבר.' },
      { icon: 'songs', text: 'שיר שמרגיש כמו חיבוק — מפעיל מעגלי נחמה במוח', linkTo: 'songs' },
    ],
    sources: [
      { ref: 'Holt-Lunstad J, et al. Loneliness and social isolation as risk factors for mortality. Perspect Psychol Sci. 2015.', link: 'https://journals.sagepub.com/doi/10.1177/1745691614568352' },
      { ref: 'Park C, et al. Loneliness as a predictor of depression. J Affect Disord. 2020.' },
    ],
  },

  // ═════════════════════════════════════════════════════════════
  // 💔 פרידה וגירושין
  // ═════════════════════════════════════════════════════════════
  {
    id: 'separation-emotional-journey',
    categoryId: 'separation',
    titleHe: 'גירושין: המסע הרגשי',
    readMinutes: 5,
    evidenceTier: 'verified',
    body: `גירושין הם אובדן אמיתי — אובדן של חלום, של זהות, של עתיד מתוכנן. הרגשות מגיעים בגלים, לא בשלבים מסודרים.

הצד שלא יזם חווה בדרך כלל: הלם, אובדן שליטה וכעס — בעוצמה גבוהה יותר. הצד שיזם מתקדם בדרך כלל מהר יותר.

ומה המחקר אומר? 75-80% מהמבוגרים מתפקדים סביר תוך 2 שנים. רוב השיפור מתרחש בשנה-שנתיים הראשונות.

מה מזרז הסתגלות? תמיכה חברתית, הערכה עצמית והפחתת קונפליקט.`,
    findings: [
      {
        highlight: '75-80% מהמבוגרים מתפקדים סביר תוך ~2 שנים מהגירושין — רוב השיפור בשנה הראשונה',
        citation: 'Hetherington EM — longitudinal research on divorce adjustment',
      },
      {
        highlight: 'הסתגלות נמשכת תלויה ב: עומס הסטרסורים (כלכלי, קונפליקט) ובמשאבים (תמיכה, הערכה עצמית)',
        citation: 'Wang H & Amato P. (2000), 17-year longitudinal study of 208 divorced individuals',
      },
    ],
    tools: [
      { icon: 'thought', text: 'גלים זה תקין. יום טוב אחרי יום רע — זה לא "התגברתי מהר מדי", זה הגוף נושם.' },
      { icon: 'songs', text: 'פלייליסט "להרגיש ולעבור" — שירים שמלווים אותך בתהליך', linkTo: 'songs' },
    ],
    sources: [
      { ref: 'Hetherington EM. Longitudinal research on divorce adjustment.' },
      { ref: 'Wang H, Amato P. Predictors of divorce adjustment. J Marriage Fam. 2000.' },
      { ref: 'Pellón A, et al. High-conflict divorce and mental health. 2024.' },
    ],
  },
  {
    id: 'separation-children',
    categoryId: 'separation',
    titleHe: 'הילדים בגירושין — מה באמת מזיק?',
    readMinutes: 4,
    evidenceTier: 'verified',
    body: `התשובה המפתיעה מהמחקר: הגירושין עצמם לא מזיקים לילדים.

מה באמת מזיק:
• קונפליקט מתמשך בין ההורים
• שימוש בילד כשליח
• ירידה באיכות ההורות
• ירידה כלכלית חדה

75-80% מילדי הגירושין מראים חוסן — מצוקה ראשונית ואז הסתגלות מוצלחת. ההבדל הממוצע בין ילדי גירושין לילדי משפחות תקינות? קטן. ההתפלגויות חופפות ב-90%.`,
    findings: [
      {
        highlight: '~75-80% מילדי הגירושין מראים חוסן — מצוקה ראשונית ואז הסתגלות. ההבדל הממוצע ממשפחות תקינות קטן',
        citation: 'Amato PR. (2003), "Reconciling Divergent Perspectives" — meta-analysis',
      },
      {
        highlight: 'מה שמזיק: קונפליקט בין-הורי מתמשך, ירידה באיכות הורות, ירידה כלכלית — לא הגירושין עצמם',
        citation: 'Amato PR & Keith B. — meta-analyses on children of divorce',
      },
    ],
    tools: [
      { icon: 'thought', text: 'הילדים צריכים לשמוע שהגירושין לא באשמתם — שוב ושוב, בכל גיל.' },
      { icon: 'journal', text: 'כתוב/י: מה אני עושה שמגן על הילדים? מה אני יכול/ה לשפר?', linkTo: 'insights' },
    ],
    sources: [
      { ref: 'Amato PR. Reconciling divergent perspectives on the consequences of divorce. J Marriage Fam. 2003.' },
      { ref: 'Amato PR, Keith B. Parental divorce and the well-being of children: meta-analysis. Psychol Bull.' },
    ],
  },

  // ═════════════════════════════════════════════════════════════
  // 🕯️ אובדן ואבל
  // ═════════════════════════════════════════════════════════════
  {
    id: 'grief-waves-not-stages',
    categoryId: 'grief',
    titleHe: 'אבל: גלים, לא שלבים',
    readMinutes: 4,
    evidenceTier: 'verified',
    body: `שלבי קיבלר-רוס (הכחשה→כעס→מיקוח→דיכאון→קבלה) — הם מיתוס פופולרי שהמחקר הפריך.

במציאות: אבל בא בגלים. יום קשה, יומיים "בסדר", ואז שוב גל. וזה תקין לחלוטין.

ומה שהכי מפתיע: 66.3% מהאבלים מראים חוסן — הם מתמודדים עם האובדן בלי להישבר. חוסן הוא הדפוס הנפוץ ביותר, לא היוצא מן הכלל.

אם אתה "לא בוכה מספיק" או "מתפקד מדי" — זה לא אכזריות. זה חוסן.`,
    findings: [
      {
        highlight: '66.3% מהאבלים מראים דפוס חוסן — התוצאה השכיחה ביותר; לא "התמוטטות"',
        citation: 'Galatzer-Levy IR & Bonanno GA. (2012), PMC4712952 — four trajectories of grief',
      },
      {
        highlight: 'המודל הדואלי: אבל בריא מתנדנד בין "פנייה לאובדן" לבין "חיים והתחדשות" — הפסקות מהאבל תקינות והכרחיות',
        citation: 'Stroebe MS & Schut H. (1999), Death Studies — Dual Process Model',
      },
    ],
    tools: [
      { icon: 'thought', text: 'לצחוק, לעבוד, להתרכז בדברים אחרים — זה לא "בגידה במת". זה הגוף מתאושש.' },
      { icon: 'breathing', text: 'בזמן גל קשה: נשימה 4-7-8 × 3 — עוזר לגוף לעבור את הגל', linkTo: 'breathing' },
    ],
    sources: [
      { ref: 'Galatzer-Levy IR, Bonanno GA. Beyond normality in the study of bereavement. PMC. 2012.', link: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC4712952' },
      { ref: 'Stroebe MS, Schut H. The Dual Process Model of coping with bereavement. Death Stud. 1999.' },
      { ref: 'Bonanno GA. Loss, trauma, and human resilience. Am Psychol. 2004.' },
    ],
  },
  {
    id: 'grief-laughing-ok',
    categoryId: 'grief',
    titleHe: 'לצחוק בזמן אבל — זה בסדר',
    readMinutes: 3,
    evidenceTier: 'verified',
    body: `הרגשת אשמה כי צחקת? נהנית מסרט? התרכזת בעבודה?

זה לא רק "בסדר" — זה בדיוק מה שהמחקר מראה שאבל בריא נראה.

המודל הדואלי (Stroebe & Schut) מסביר: אנחנו מתנדנדים בין שני מצבים —
• "פנייה לאובדן": בכי, געגוע, עיבוד
• "התחדשות": עבודה, חברים, צחוק, חיים

התנדנדות בין השניים זה בריא. להיתקע באחד מהם — זה מה שמעיק.

אז תן/י לעצמך רשות לנשום.`,
    findings: [
      {
        highlight: 'הפסקות מהאבל (restoration-oriented) אינן הימנעות — הן הכרחיות לעיבוד בריא של האובדן',
        citation: 'Stroebe MS & Schut H. (1999), Death Studies — Dual Process Model (5,300+ citations)',
      },
    ],
    tools: [
      { icon: 'thought', text: 'אין "דרך נכונה" להתאבל. יש גלים — והם באים בזמן שלהם.' },
      { icon: 'songs', text: 'שיר שמחבר אותך לזיכרון — מוזיקה היא גשר בין העולמות', linkTo: 'songs' },
    ],
    sources: [
      { ref: 'Stroebe MS, Schut H. The Dual Process Model. Death Studies. 1999.' },
      { ref: 'Worden JW. Grief Counseling and Grief Therapy. 5th ed. 2018.' },
    ],
  },

  // ═════════════════════════════════════════════════════════════
  // 🧘 ויסות רגשי
  // ═════════════════════════════════════════════════════════════
  {
    id: 'regulation-why-i-explode',
    categoryId: 'regulation',
    titleHe: 'למה אני מתפוצץ/ת?',
    readMinutes: 4,
    evidenceTier: 'verified',
    body: `רגשות באים עם עוררות פיזיולוגית בכל הגוף. אי אפשר "לחשוב" את הדרך החוצה ממשבר רגשי — קודם משנים מצב פיזיולוגי, אז חושבים.

DBT (טיפול דיאלקטי-התנהגותי) מלמד שרגשות עצמם קצרים — דקות, לא שעות. אבל אנחנו מאריכים אותם כשאנחנו "מזינים" אותם במחשבות ורומינציה.

הכלים: TIPP (טמפרטורה קרה על הפנים, פעילות גופנית עזה, נשימה איטית, הרפיית שרירים), פעולה הפוכה, ובדיקת עובדות.`,
    findings: [
      {
        highlight: 'DBT מפחית התנהגויות אובדניות ואשפוזים; כישורים בלבד (בלי טיפול מלא) מועילים',
        citation: 'Linehan MM et al. (1991), Archives of General Psychiatry — first DBT RCT',
      },
      {
        highlight: 'שימוש בכישורים מתווך את התוצאות — כלומר, הכישורים עצמם הם מה שעובד',
        citation: 'Neacsiu AD et al. (2010) — skills use mediates outcomes',
      },
    ],
    tools: [
      { icon: 'breathing', text: 'TIPP — טמפרטורה: מים קרים על הפנים (רפלקס צלילה מאט לב). נשימה: 5-6 נשימות/דק', linkTo: 'breathing' },
      { icon: 'thought', text: 'בדוק/י עובדות: "האם הרגש הזה מתאים למה שקרה באמת? או שאני מגזים/ה?"' },
    ],
    sources: [
      { ref: 'Linehan MM, et al. Dialectical behavior therapy for borderline personality disorder. Arch Gen Psychiatry. 1991.' },
      { ref: 'Neacsiu AD, et al. DBT skills use mediates outcomes. 2010.' },
      { ref: 'Kliem S, et al. DBT meta-analysis. J Consult Clin Psychol. 2010.' },
    ],
  },
  {
    id: 'regulation-window-of-tolerance',
    categoryId: 'regulation',
    titleHe: 'חלון הסבילות — למה אני לא מצליח/ה לחשוב ברגע מסוים',
    readMinutes: 3,
    evidenceTier: 'framework',
    body: `יש "חלון" שבתוכו אתה יכול לתפקד, לחשוב, לתקשר. מעליו — עוררות יתר (חרדה, פאניקה, כעס). מתחתיו — עוררות חסר (ניתוק, קהות, שיתוק).

כשאתה מחוץ לחלון — המוח מילולית לא מסוגל לעבד מידע או לתקשר יעיל.

ולכן: ויסות לפני שיחה. לא "תירגע ונדבר" — אלא "קודם נרגיע את הגוף, ואז נוכל לדבר."

החלון אפשר להרחיב — עם תרגול חוזר של רגיעה.`,
    findings: [
      {
        highlight: 'מושג "חלון הסבילות" פותח ע"י דן סיגל (1999) — מעל החלון: היפר-עוררות; מתחתיו: היפו-עוררות; טראומה מצר את החלון',
        citation: 'Siegel DJ. (1999), The Developing Mind',
      },
    ],
    tools: [
      { icon: 'breathing', text: 'כשאתה מרגיש "מחוץ לחלון" — נשימה 4-7-8 × 3 מחזירה לטווח', linkTo: 'breathing' },
      { icon: 'thought', text: 'שים/י לב: היכן אני עכשיו? מעל החלון (מוצף/ת)? מתחתיו (מנותק/ת)? או בתוכו?' },
    ],
    sources: [
      { ref: 'Siegel DJ. The Developing Mind. 1999.' },
      { ref: 'Note: זו מסגרת קלינית מועילה, לא מדע מוכח במלואו (ראו תיאוריית הפוליווגאל).' },
    ],
  },

  // ═════════════════════════════════════════════════════════════
  // 💪 הערכה עצמית
  // ═════════════════════════════════════════════════════════════
  {
    id: 'self-esteem-inner-critic',
    categoryId: 'self-esteem',
    titleHe: 'המבקר הפנימי — מאיפה הוא בא?',
    readMinutes: 4,
    evidenceTier: 'promising',
    body: `הקול הפנימי שאומר "את/ה לא מספיק/ה טוב/ה" — הוא לא את/ה. והוא גם לא אויב.

לפי IFS (Internal Family Systems), המבקר הוא "חלק מגן" שלמד את תפקידו בילדות: הוא מבקר אותך ראשון — כדי שאחרים לא יבקרו. הוא מדבר בקול של מי שביקר אותך אז.

הוא מנסה להגן, בדרך שכבר לא משרתת אותך.

העבודה: לא להילחם בו, אלא להכיר בו ("הנה הוא שוב"), להבין את הכוונה שלו, ולבקש ממנו בעדינות להרפות.`,
    findings: [
      {
        highlight: 'IFS מראה תוצאות מבטיחות: 92% ממשלימי 16 שבועות כבר לא עמדו בקריטריונים ל-PTSD',
        citation: 'Hodgdon H et al. (2021) — IFS pilot study',
      },
    ],
    tools: [
      { icon: 'thought', text: 'כשהמבקר מדבר: עצור/י וקרא/י לו בשם. "הנה המבקר." זה כבר יוצר מרחק.' },
      { icon: 'journal', text: 'כתוב/י: מה הוא מנסה להגן עליי מפניו? מה הוא מפחד שיקרה אם יפסיק?', linkTo: 'insights' },
    ],
    sources: [
      { ref: 'Schwartz RC. Internal Family Systems Therapy.' },
      { ref: 'Hodgdon H, et al. IFS pilot study. 2021.' },
      { ref: 'Note: מודל מבטיח — עדיין לא ברמת הראיות של CBT/DBT.' },
    ],
  },
  {
    id: 'self-esteem-self-compassion',
    categoryId: 'self-esteem',
    titleHe: 'חמלה עצמית — לא מה שחשבת',
    readMinutes: 4,
    evidenceTier: 'verified',
    body: `חמלה עצמית זה לא "לרחם על עצמי" או "לפנק את עצמי". זה להתייחס לעצמך כמו שהיית מתייחס לחבר טוב בכאב.

שלושה מרכיבים:
1. טוב לב עצמי (במקום שיפוט)
2. אנושיות משותפת (סבל זה חלק מלהיות אנושי, לא כישלון אישי)
3. מיינדפולנס (לא להדחיק, לא להגזים — פשוט להיות עם)

והמחקר? אנשים עם חמלה עצמית גבוהה לוקחים יותר אחריות אישית, לא פחות.`,
    findings: [
      {
        highlight: 'קשר חזק בין חמלה עצמית לבריאות נפשית: r ≈ -.54 עם דיכאון, חרדה ומתח (אפקט גדול)',
        citation: 'MacBeth A & Gumley A. (2012), Clinical Psychology Review — meta-analysis',
      },
      {
        highlight: 'שבוע אחד של תרגילי חמלה עצמית יומיים הפחית דיכאון עד 3 חודשים',
        citation: 'Shapira LB & Mongrain M. (2010)',
      },
    ],
    tools: [
      { icon: 'thought', text: 'כשאתה שופט/ת את עצמך: "מה הייתי אומר/ת לחבר/ה במצב הזה?" — ואז תגיד/י את זה לעצמך.' },
      { icon: 'journal', text: 'כתוב/י מכתב חמלה לעצמך — כאילו אתה כותב לחבר שסובל', linkTo: 'insights' },
    ],
    sources: [
      { ref: 'Neff KD. Self-compassion: an alternative conceptualization. Self and Identity. 2003.' },
      { ref: 'MacBeth A, Gumley A. Exploring compassion. Clin Psychol Rev. 2012.' },
      { ref: 'Ferrari M, et al. Self-compassion interventions meta-analysis. 2019.' },
    ],
  },

  // ═════════════════════════════════════════════════════════════
  // 👥 מערכות יחסים
  // ═════════════════════════════════════════════════════════════
  {
    id: 'relationships-same-partners',
    categoryId: 'relationships',
    titleHe: 'למה אני בוחר/ת את אותם בני זוג?',
    readMinutes: 4,
    evidenceTier: 'framework',
    body: `"למה אני תמיד בוחר/ת בגברים/נשים שפוגעים בי?"

אנחנו נוטים לשחזר את האקלים הרגשי שגדלנו בו — לא כי אנחנו רוצים לסבול, אלא כי המוכר מרגיש "כמו בית". והלא-מודע מקווה שהפעם הסיפור ייגמר אחרת.

זו לא "משיכה" — זו מוכרות. ה"כימיה" שאתה מרגיש/ה? זו אולי ההיכרות עם דפוס מהילדות, לא התאמה.

והבשורה: 20-30% מהאנשים משנים את סגנון ההתקשרות שלהם. זה אפשרי.`,
    findings: [
      {
        highlight: '20-30% מהאנשים משנים סגנון התקשרות לאורך החיים — "ביטחון נרכש" אפשרי',
        citation: 'Attachment stability research (meta-analytic findings)',
      },
      {
        highlight: 'סגנונות: ~56% בטוח, ~19% חרד, ~25% נמנע (Hazan & Shaver 1987)',
        citation: 'Hazan C & Shaver P. (1987), JPSP — romantic love as attachment process',
      },
    ],
    tools: [
      { icon: 'thought', text: 'מפה/י את הדפוס: עם מי הרגשת "כימיה" חזקה? מה משותף להם? האם זו התאמה או מוכרות?' },
      { icon: 'journal', text: 'כתוב/י: מה התפקיד שאני מלהק/ת את בני/בנות הזוג שלי לשחק?', linkTo: 'insights' },
    ],
    sources: [
      { ref: 'Hazan C, Shaver P. Romantic love conceptualized as an attachment process. JPSP. 1987.' },
      { ref: 'Bowlby J. Attachment and Loss. 1969-82.' },
      { ref: 'Levine A, Heller R. Attached. 2010.' },
      { ref: 'Note: מסגרת קלינית מועילה, לא "חוק" מוכח.' },
    ],
  },

  // ═════════════════════════════════════════════════════════════
  // ✨ כלים להרגעה
  // ═════════════════════════════════════════════════════════════
  {
    id: 'tools-grounding-54321',
    categoryId: 'calm-tools',
    titleHe: '5-4-3-2-1 — חזרה להווה',
    readMinutes: 2,
    evidenceTier: 'verified',
    body: `כשראש מלא מחשבות ופאניקה מטפטפת — החושים הם העוגן.

5 דברים שאתה רואה
4 דברים שאתה מרגיש בגוף
3 דברים שאתה שומע
2 דברים שאתה מריח
1 דבר שאתה טועם

זה עובד כי החושים קיימים רק בהווה — ורומינציה חיה בעבר ובעתיד. החושים "מעמיסים" את ערוצי הקשב ומשאירים פחות מקום למחשבות המציפות.`,
    findings: [
      {
        highlight: 'טכניקת הקרקוע נתמכת על בסיס הראיות של התערבויות חושיות-מיינדפולנס: מפחית דופק, נשימה ומתח שרירים',
        citation: 'Koniver A. (2024), ESMED clinical review; Cleveland Clinic recommendation',
      },
    ],
    tools: [
      { icon: 'breathing', text: 'שלב/י עם נשימה: כל מספר = נשימה אחת. 5 רואה + נשיפה. 4 מרגיש + נשיפה...', linkTo: 'breathing' },
      { icon: 'thought', text: 'אין RCT ייעודי ל-5-4-3-2-1 — אבל הבסיס המדעי מוצק והטכניקה נמצאת בשימוש קליני נרחב.' },
    ],
    sources: [
      { ref: 'Cleveland Clinic. 5-4-3-2-1 Grounding Technique.', link: 'https://health.clevelandclinic.org/54321-grounding-technique' },
      { ref: 'Koniver A. Grounding techniques for managing anxiety. ESMED. 2024.' },
    ],
  },
];

export const KNOWLEDGE_DISCLAIMER = DISCLAIMER_TEXT;

export const articlesByCategory = (categoryId: string) =>
  KNOWLEDGE_ARTICLES.filter((a) => a.categoryId === categoryId);

export const ARTICLE_BY_ID = new Map(KNOWLEDGE_ARTICLES.map((a) => [a.id, a]));
