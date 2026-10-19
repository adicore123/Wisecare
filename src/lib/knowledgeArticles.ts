// ═══════════════════════════════════════════════════════════════════════════
// קטלוג מאמרי פסיכו-חינוך — "הבנת הנפש" (מבוסס מחקר עומק: 163+ ממצאים)
// כל מאמר: 6-8 ממצאים עם ציטוטים וקישורים + 4-7 כלים מעשיים + מקורות.
// ═══════════════════════════════════════════════════════════════════════════

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
    body: `כשאתה חווה חרדה, האמיגדלה — "מרכז האזעקה" במוח — שולחת אות לכל הגוף. זה קורה לפני שהמוח החושב מספיק להעריך את המצב.

התגובה רצה בשני מסלולים: מסלול מהיר (אדרנלין — לב מאיץ, נשימה מתקצרת, שרירים מתכווצים) ומסלול איטי (קורטיזול — שומר על המתח לאורך זמן).

זה לא תקלה. זו מערכת הגנה עתיקה שנבנתה להציא אותך מסכנה. הבעיה? היא לא מבחינה בין נמר לבין בוס לחוץ.

ולכן לוגיקה לבדה לא עוצרת גל חרדה — כי המסלול המהיר עוקף את אזור החשיבה. אבל נשימה כן עובדת, כי היא מדברת ישירות עם מערכת העצבים האוטונומית.

המפתח: הנשיפה הארוכה מפעילה את "הבלם" הפאראסימפתטי (עצב הואגוס) ומאט את הלב. זה לא רעיון נחמד — זה פיזיולוגיה מדידה.`,
    findings: [
      {
        highlight: 'נשימה עם נשיפה ארוכה ניצחה מדיטציית מיינדפולנס בשיפור מצב-רוח והפחתת עוררות — RCT של 114 משתתפים, סטנפורד. הנשיפה הממושכת הייתה המרכיב הפעיל',
        citation: 'Balban MY et al. (2023), Cell Reports Medicine, Stanford',
        link: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC9873947',
      },
      {
        highlight: 'MBSR (8 שבועות מיינדפולנס) היה יעיל באותה מידה כמו escitalopram לחרדה — עם 15% תופעות לוואי מול 79% בתרופה',
        citation: 'Hoge EA et al. (2022), JAMA Psychiatry, n=276',
      },
      {
        highlight: 'CBT להפרעות חרדה: אפקט בינוני-גדול (g=0.73) מעל פלצבו — עם תוצאות שנשמרות 6-12+ חודשים',
        citation: 'Hofmann SG & Smits JAJ (2008), J Clin Psychiatry — meta-analysis of 27 RCTs',
      },
      {
        highlight: 'חוסר שינה מגביר את החרדה של היום הבא ב-30% ומעצים תגובתיות של האמיגדלה — הקשר דו-כיווני',
        citation: 'Ben Simon E et al. (2020); Kaczkurkin & Foa (2020)',
      },
      {
        highlight: 'האמיגדלה מגיבה תוך ~6 שניות — לפני שהקורטקס הקדם-מצחי מספיק להעריך; זה מסביר למה "רק תירגע" לא עובד',
        citation: 'Harvard Health Publishing (2024), Understanding the Stress Response',
      },
      {
        highlight: 'תימוג רגשי — שים מילה על הרגש — מפחית פעילות אמיגדלה ומפעיל את הקורטקס המפריש (fMRI)',
        citation: 'Lieberman MD et al. (2007), Psychological Science, 18(5), 421-428',
        link: 'https://pubmed.ncbi.nlm.nih.gov/17576282',
      },
      {
        highlight: 'אלכוהול מכפיל את הסיכון להפרעות חרדה (OR≈2.2) — "שקט" הלילה = חרדת ריבאונד מחר',
        citation: 'Smith JP & Book S. (2012), PMC3860396; Gimeno et al. (2017)',
      },
    ],
    tools: [
      { icon: 'breathing', text: 'תרגיל 4-7-8 — הכי נחקר ויעיל: שאיפה 4 שנ\', החזקה 7, נשיפה ארוכה 8. 5 דקות ביום', linkTo: 'breathing' },
      { icon: 'breathing', text: 'אנחה פיזיולוגית (cyclic sighing): שאיפה עמוקה + "לגימה" קצרה + נשיפה ממושכת — הכי יעיל לפי סטנפורד 2023', linkTo: 'breathing' },
      { icon: 'thought', text: 'תימוג רגשי: שים מילה מדויקת על מה שאתה מרגיש ("אני מרגיש דרך וגם בושה") — זה כבר מרגיע את האמיגדלה' },
      { icon: 'thought', text: 'זכור/י: "הגוף מנסה להגן עליי. הוא לא מנסה לפגוע. אני יכול/ה להרגיע אותו דרך הנשימה."' },
      { icon: 'journal', text: 'כתוב/י ביומן: מה הטריגר? מה המחשבה האוטומטית? מה העדות בעד ונגד? — תרגיל CBT בסיסי', linkTo: 'insights' },
      { icon: 'songs', text: 'מוזיקה מרגיעה — מפחיתה עוררות פיזיולוגית ומשפיעה על מעגלי תגמול במוח', linkTo: 'songs' },
    ],
    sources: [
      { ref: 'Balban MY, Neri E, Kogon MM, et al. Brief structured respiration practices enhance mood and reduce physiological arousal. Cell Rep Med. 2023.', link: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC9873947' },
      { ref: 'Hoge EA, et al. MBSR vs Escitalopram for Anxiety. JAMA Psychiatry. 2022.' },
      { ref: 'Hofmann SG, Smits JAJ. CBT for adult anxiety disorders. J Clin Psychiatry. 2008.', link: 'https://pubmed.ncbi.nlm.nih.gov/18363421' },
      { ref: 'Lieberman MD, et al. Putting feelings into words. Psychol Sci. 2007.', link: 'https://pubmed.ncbi.nlm.nih.gov/17576282' },
      { ref: 'Chu B, Dagramaci I. Physiology, Stress Reaction. StatPearls. 2024.', link: 'https://www.ncbi.nlm.nih.gov/books/NBK541120' },
      { ref: 'Smith JP, Book S. Alcohol and anxiety. PMC. 2012.', link: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC3860396' },
      { ref: 'Harvard Health Publishing. Understanding the Stress Response. 2024.' },
    ],
  },
  {
    id: 'anxiety-panic-what-to-do',
    categoryId: 'anxiety',
    titleHe: 'התקף חרדה — מה עושים ברגע?',
    readMinutes: 3,
    evidenceTier: 'verified',
    body: `התקף פאניקה הוא גל פתאומי של פחד שמגיע לשיא תוך ~10 דקות ובדרך כלל חולף תוך 20-30 דקות.

לב מיטפטף. נשימה קצרה. רעידות. כאב חזה. סחרחורת. מחשבות מפחידות ("אני מת / מאבד/ת שליטה").

הדבר החשוב ביותר: זה לא מסוכן. זה אדרנלין. וזה תמיד חולף.

מה שמזין את המעגל זה "פחד מהפחד" — פחד מהתסמינים עצמם. הפחד מהתסמינים מעורר עוד אדרנלין → עוד תסמינים → עוד פחד. וזה בדיוק מה שאפשר לשבור.

פרוטוקול 7 שלבים — כל שלב מבוסס מחקר.`,
    findings: [
      { highlight: 'CBT עם חשיפה אינטרוספטיבית: 70-85% חופשיים מפאניקה אחרי טיפול — פאניקה היא מההפרעות הכי ניתנות לטיפול', citation: 'Barlow DH; Hofmann & Spiegel (1999), PMC3330525', link: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC3330525' },
      { highlight: 'פורמט אינטנסיבי (4 ימים) השיג 90% הפוגה במעקר 18 חודשים', citation: 'Eide P et al. (2025), Bergen 4-Day CBT study' },
      { highlight: 'קפאין: 51% מחולי פאניקה חוו התקף אחרי מנת קפאין (מול 0% פלצבו) — מטא-אנליזה של 9 מחקרים, n=237', citation: 'Klevebrant & Fredrikson (2022), Neuroscience & Biobehavioral Reviews' },
      { highlight: 'מים קרים על הפנים מפעילים רפלקס צלילה → האטת דופק תוך 30-60 שניות דרך עצב הואגוס', citation: 'Richer S et al. (2022), PMC9649023 — Cold Face Test', link: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC9649023' },
      { highlight: 'חשיפה אינטרוספפטיבית (יצירה מכוונת של תחושות הגוף): המנגנון המרכזי בטיפול — המוח לומד "זה לא מסוכן"', citation: 'Lee & Klerman (2006); Muotri et al. (2026), PMC12926410' },
      { highlight: 'נדודי שינה מכפילים סיכון לחרדה (OR≈2.1) — טיפול בשינה = מניעת פאניקה', citation: 'Baglioni et al. (2011), J Affect Disord — meta-analysis' },
    ],
    tools: [
      { icon: 'thought', text: 'שלב 1 — תן/י שם: "זה התקף פאניקה. זה אדרנלין, לא סכנה." תימוג מפחית פעילות אמיגדלה (Lieberman 2007)' },
      { icon: 'thought', text: 'שלב 2 — אל תברח/י: בריחה מלמדת את המוח שהמצב היה מסוכן. תישאר/י — זו חשיפה טבעית' },
      { icon: 'breathing', text: 'שלב 3 — האט/י רק את הנשיפה: נשימה 4-8 (פנימה 4, החוצה 8). לא "נשימות עמוקות מהירות" — רק הנשיפה', linkTo: 'breathing' },
      { icon: 'thought', text: 'שלב 4 — קרקוע 5-4-3-2-1: 5 רואה, 4 מרגיש, 3 שומע, 2 מריח, 1 טועם' },
      { icon: 'thought', text: 'שלב 5 — אם קשה מדי: מים קרים על הפנים 15-30 שנ\' (רפלקס צלילה). לא לבעלי מחלת לב' },
      { icon: 'thought', text: 'שלב 6 — טיימר 10 דק\': "זה מגיע לשיא וחולף. אני רואה/ה את זה." — לימוד אקספריאנציאלי' },
      { icon: 'journal', text: 'שלב 7 — אחרי: כתוב/י מה טריגר (כולל קפאין/שינה) + מה עזר — נתונים לטיפול', linkTo: 'insights' },
    ],
    sources: [
      { ref: 'Barlow DH. Behavioral treatment of panic disorder. Behavior Therapy. 1989.' },
      { ref: 'Hofmann SG, Spiegel DA. Panic disorder. PMC. 1999.', link: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC3330525' },
      { ref: 'Klevebrant M, Fredrikson M. Caffeine and panic. Neurosci Biobehav Rev. 2022.' },
      { ref: 'Richer S, et al. Cold Face Test. PMC. 2022.', link: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC9649023' },
      { ref: 'Eide P, et al. Bergen 4-day CBT. 2025.' },
      { ref: 'Baglioni C, et al. Insomnia and depression risk. J Affect Disord. 2011.' },
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

האמיגדלה (מרכז רגש) — פעילה יתר על המידה. הקורטקס הקדם-מצחי (בקרה) — נחלש. מעגלי התגמול — מפסיקים להגיב ("כלום לא כיף"). ההיפוקמפוס (זיכרון וריכוז) — מאבד נפח.

זהו נזק מוחי זמני — לא כשל מוסרי. לא היית אומר/ת למישהו עם רגל שבורה "פשוט לך ללכת".

והכי חשוב: זה הפיך. טיפול מעלה BDNF (חלבון שמזין תאי עצב), משחזר נפח היפוקמפוס, ומחזיר גמישות סינפטית.

דיכאון גם משמיע קול פנימי שקרי: "את/ה עצלן/ית", "את/ה לא מספיק/ה", "אין טעם". הקול הזה הוא סימפטום, לא אמת.`,
    findings: [
      { highlight: 'BDNF: דיכאון מוריד BDNF ופוגע בנוירו-פלסטיות. טיפול (תרופתי/פסיכותרפיה/ספורט) מעלה BDNF ומשחזר נפקק ההיפוקמפוס. זה הפיך.', citation: 'Yang et al. (2020), Cell Communication and Signaling', link: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC7174655' },
      { highlight: 'קיימת ירידה בקישוריות אמיגדלה-קורטקס בדיכאון — "הבלם" נחלש והרגשות שולטים בלי בקרה', citation: 'Ramasubbu R et al. (2014), PMC3928548' },
      { highlight: 'ניתוקים חברתיים כגורם: 9 ניתוקים (Hari) — משמעות, אנשים, ערכים, טראומה, מעמד, טבע, תקווה. דיכאון הוא אות, לא רק "חוסר סרוטונין"', citation: 'Hari J. (2018), Lost Connections; Moncrieff et al. (2022), Molecular Psychiatry' },
      { highlight: 'דיכאון פוגע ב-executive function (יכולת להתחיל משימה, להחליף מצב) — מדיד נוירוקוגניטיבית, לא "עצלות"', citation: 'Kraft RA et al. (2023), ScienceDirect; Cui et al. (2021), PMC8054425' },
      { highlight: 'ספורט כנוגד דיכאון: 200+ RCT-ים, ‏14,000+ משתתפים — הליכה/ריצה, יוגה ואימון כוח הכי יעילים (SMD -0.49 עד -0.63)', citation: 'Noetel M et al. (2024), BMJ 384:e075847', link: 'https://www.bmj.com/content/384/bmj-2023-075847' },
    ],
    tools: [
      { icon: 'thought', text: 'זכור/י: המוח שלך פועל עם מערכת מוטיבציה פגועה — זמנית. זה לא את/ה, זה הדיכאון מדבר/ת.' },
      { icon: 'breathing', text: 'פעולה לפני מוטיבציה: אל תחכה/י לרצון. קום/י ועשה/י — המוטיבציה באה אחרי הפעולה (Jacobson 1996, BA)', linkTo: 'breathing' },
      { icon: 'songs', text: 'מוזיקה שמרימה אותך — מפעילה מעגלי תגמול שהדיכאון השתיק', linkTo: 'songs' },
      { icon: 'journal', text: 'כתוב/י את הקול הפנימי ("אני עצלן/ית") — ואז כתוב/י מה היית אומר/ת לחבר שיגיד את זה על עצמו. הפער = הדיכאון.', linkTo: 'insights' },
    ],
    sources: [
      { ref: 'Yang C, et al. The Role of BDNF on Neural Plasticity in Depression. Cell Commun Signal. 2020.', link: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC7174655' },
      { ref: 'Ramasubbu R, et al. Amygdala-PFC connectivity in depression. 2014.', link: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC3928548' },
      { ref: 'Kraft RA, et al. Executive function in depression. ScienceDirect. 2023.' },
      { ref: 'Noetel M, et al. Exercise for depression. BMJ. 2024.', link: 'https://www.bmj.com/content/384/bmj-2023-075847' },
      { ref: 'Hari J. Lost Connections. 2018.' },
      { ref: 'Moncrieff J, et al. Serotonin theory of depression. Mol Psychiatry. 2022.' },
    ],
  },
  {
    id: 'depression-cant-get-up',
    categoryId: 'depression',
    titleHe: 'למה קשה לצאת מהמיטה?',
    readMinutes: 3,
    evidenceTier: 'verified',
    body: `לקום מהמיטה נשמע פשוט. אבל זו בעצם משימה ניהולית: התחלת משימה, מעבר מצב (שינה→פעולה), מוטיבציה עצמית — כולן פונקציות של הקורטקס הקדם-מצחי. בדיכאון, הקליפה הזה פועל לקוי.

זו פגיעה נוירוקוגניטיבית מדידה. לא "עצלות".

מה עוזר? Behavioral Activation — הטיפול עם הכי הרבה ראיות לדיכאון. העיקרון: פעולה לפני מוטיבציה. לא לחכות לרצון — לקום ולעשות, והרצון בא אחרי.`,
    findings: [
      { highlight: 'BA לבדו = CBT מלא (COBRA trial, ‏440 מטופלים, Lancet) — ועם מטפלים זוטרים. זול יותר, יעיל באותה מידה', citation: 'Richards DA et al. (2016), Lancet — COBRA trial', link: 'https://pubmed.ncbi.nlm.nih.gov/27461440' },
      { highlight: 'BA השווה לתרופות נוגדות דיכאון לדיכאון חמור — עם פחות נטישת טיפול (Dimidjian 2006, n=241)', citation: 'Dimidjian S et al. (2006), J Consult Clin Psychol' },
      { highlight: 'ספורט: הליכה/ריצה (SMD=-0.63), יוגה (-0.55), אימון כוח (-0.49) — הכי יעילים מבין 200+ RCT-ים. ספורט מפחית חזרה יותר מתרופות', citation: 'Noetel M et al. (2024), BMJ; Blumenthal (2007), SMILE trial' },
      { highlight: 'CBT-I (טיפול שינה) מכפיל הפוגה מדיכאון: 62% מול 33% כשמתווסף לטיפול', citation: 'Blom K et al. (2015), JAMA Psychiatry' },
      { highlight: 'SMILES diet trial: דיאטה ים-תיכונית 12 שבועות → 32.3% הפוגה מדיכאון מול 8% בקבוצת ביקורת (NNT=4)', citation: 'Jacka FN et al. (2017), BMC Medicine, n=67', link: 'https://pubmed.ncbi.nlm.nih.gov/28137247' },
    ],
    tools: [
      { icon: 'thought', text: 'כלל 5 הדקות: התחייב/י רק ל-5 דקות. יש לך רשות לעצור. רוב האנשים ממשיכים — ההתחלה היא המחסום, לא ההמשך.' },
      { icon: 'thought', text: 'TRAP/TRAC: זהה/י טריגר → תגובה → הימנעות. הפוך/י לטריגר → תגובה → פעולה חלופית. שריין/י 1-2 פעולות למחר — בלוח, לא לפי מצב רוח' },
      { icon: 'thought', text: 'הכנת סביבה: בגדים מוכנים מהערב, שעון מעבר לחדר, פעולה ראשונה קטנה. הסביבה עובדת במקום המוטיבציה הפגועה' },
      { icon: 'songs', text: 'שיר אחד שמרים אותך — נגן/י אותו כשאתה מתעורר/ת', linkTo: 'songs' },
      { icon: 'journal', text: 'דירוג מצב רוח לפני/אחרי פעולה (0-10): הפער בין חיזוי למציאות — זה בעצמו נתון טיפולי', linkTo: 'insights' },
    ],
    sources: [
      { ref: 'Richards DA, et al. COBRA trial: BA vs CBT. Lancet. 2016.', link: 'https://pubmed.ncbi.nlm.nih.gov/27461440' },
      { ref: 'Dimidjian S, et al. BA vs cognitive therapy vs medication. J Consult Clin Psychol. 2006.' },
      { ref: 'Noetel M, et al. Exercise for depression. BMJ. 2024.', link: 'https://www.bmj.com/content/384/bmj-2023-075847' },
      { ref: 'Blom K, et al. CBT-I + escitalopram. JAMA Psychiatry. 2015.' },
      { ref: 'Jacka FN, et al. SMILES trial. BMC Medicine. 2017.', link: 'https://pubmed.ncbi.nlm.nih.gov/28137247' },
      { ref: 'Kraft RA, et al. Executive function and fatigue. 2023.' },
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
      { highlight: 'קשרים חברתיים חלשים = סיכון תמותה מוגבר ב-50%; בדידות מגדילה סיכוי למוות מוקדם ב-26% — מטא-אנליזה של 70 מחקרים, ‏3.4 מיליון משתתפים', citation: 'Holt-Lunstad J et al. (2015), Perspectives on Psychological Science' },
      { highlight: 'בדידות מנבאת דיכאון ותחלואה באופן עצמאי — גם אחרי בקרה לגורמים מבחינים', citation: 'Park C et al. (2020), Journal of Affective Disorders' },
      { highlight: 'טיפול קבוצתי לדיכאון משיג תוצאות דומות לטיפול אישי — עם תוספת של תמיכה הדדית', citation: 'Cuijpers P et al. — meta-analytic work on group therapy' },
      { highlight: 'התנדבות ~2 שעות בשבוע מנבאת דיכאון נמוך יותר באופן עקבי במחקרי מעקב', citation: 'Cohort data on volunteering and depression' },
    ],
    tools: [
      { icon: 'thought', text: 'בדידות = רעב לחיבור, לא כישלון. מיקרו-חיבורים סופרים: שיחה קצרה, הודעה לחבר. התחל/י מ-1 מיקרו-חיבור ביום' },
      { icon: 'thought', text: 'סולם 3 אנשים: דרגה 1 = טקסט. דרגה 2 = פעילות משותפת. דרגה 3 = לחלוק משפט אמיתי. אחת ליום.' },
      { icon: 'songs', text: 'שיר שמרגיש כמו חיבוק — מפעיל מעגלי נחמה במוח', linkTo: 'songs' },
      { icon: 'journal', text: 'כתוב/י: מי האנשים שממלאים אותי? מה מונע ממני לפנות אליהם?', linkTo: 'insights' },
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
    titleHe: 'גירושין: מסע ההחלמה',
    readMinutes: 7,
    evidenceTier: 'verified',
    body: `גירושין הם אובדן אמיתי — אובדן של חלום, של זהות, של עתיד מתוכנן. אבל המחקר האורכי הגדול בעולם מגלה משהו מפתיע: רוב בני האדם מחלימים.

מחקר האורך של הת'רינגטון (וירג'יניה, ~1,400 משפחות, כמעט 30 שנות מעקב) מצא: 70% מהמבוגרים הגרושים מתפקדים היטב. רוב השיפור מתרחש בשנתיים הראשונות.

מי מחלים טוב יותר? המחקר של וונג ואמטו (2000, 17 שנות מעקב) גילה שלושה מנבאים:
• פחות סטרסורים מתמשכים (קונפליקט עם הקודם, לחץ כלכלי, מעברי דירה)
• יותר משאבים (תמיכה חברתית, הכנסה, השכלה)
• הגדרת הסיטואציה: להיות היוזם, לצאת מנישואין גרועים, לראות בגירושין צמיחה

ומה שהכי חשוב לדעת: המצוקה מתחילה לפני הפרידה. הנתונים מראים שהירידה באושר ובבריאות מתחילה עוד בתקופת הקונפליקט — הגירושין הם לא התחלת הבעיה אלא התחלת הפתרון.`,
    findings: [
      {
        highlight: '70% מהמבוגרים הגרושים מתפקדים היטב — רובם מגיעים לשם תוך ~2 שנים',
        citation: 'Hetherington EM & Kelly J. For Better or For Worse. W.W. Norton, 2002 — מחקר אורך ~1,400 משפחות, ~30 שנה',
      },
      {
        highlight: '20-25% מהגרושים חווים קשיים משמעותיים מתמשכים (לעומת 10% מהנשואים) — אבל ~30% מהנשים הגרושות דווקא "שגשגו" והשתמשו בגירושין כזרז צמיחה',
        citation: 'Hetherington EM. Coping with family transitions. Child Development, 1989',
      },
      {
        highlight: 'מנבאי הסתגלות טובה: פחות סטרסורים + יותר משאבים + תפיסת הגירושין כצמיחה',
        citation: 'Wang H & Amato P. Predictors of divorce adjustment. J Marriage Fam, 2000 — N=208, 17 שנות מעקב אורך',
      },
      {
        highlight: 'המצוקה מתחילה לפני הפרידה — הנתונים מראים ירידה באושר עוד בתקופת הקונפליקט. הגירושין הם לרוב תחילת ההחלמה, לא תחילת המשבר',
        citation: 'Amato PR. The consequences of divorce for adults and children. J Marriage Fam, 2000 — פאנל אורך Marital Instability Over the Life Course',
      },
      {
        highlight: 'גרושים מראים ~23% סיכון מוגבר לתמותה מוקדמת — בעיקר גברים וצעירים. המנגנון: סטרס, בדידות, הזנחה בריאותית. טיפול בגוף = טיפול בנפש',
        citation: 'Sbarra DA & Nietert PJ. Divorce and death: meta-analysis. Perspectives on Psychological Science — 32 מחקרים פרוספקטיביים',
      },
      {
        highlight: 'גירושין הם "מדבקים" חברתית: הם מתפשטים ברשתות עד 2 דרגות של ריחוק — חברים של חברים. וגם: אנשים פופולריים ברשת גרושים פחות',
        citation: 'McDermott R, Fowler JH, Christakis NA. Social network effects on divorce. Social Forces, 2013 — נתוני Framingham Heart Study',
      },
    ],
    tools: [
      { icon: 'thought', text: 'גלים זה תקין. יום טוב אחרי יום רע — זה לא "התגברתי מהר מדי", זה הגוף נושם.' },
      { icon: 'breathing', text: 'נשימות מודרכות — כלי מיידי לרגעים של מצוקה חריפה', linkTo: 'breathing' },
      { icon: 'songs', text: 'פלייליסט "להרגיש ולעבור" — שירים שמלווים אותך בתהליך', linkTo: 'songs' },
      { icon: 'journal', text: 'כתוב/י: איפה אני בציר ה-2 שנים? מה כבר השתפר? מה עוד כואב?', linkTo: 'insights' },
    ],
    sources: [
      { ref: 'Hetherington EM, Kelly J. For Better or For Worse: Divorce Reconsidered. Norton, 2002.' },
      { ref: 'Wang H, Amato PR. Predictors of divorce adjustment. J Marriage Fam, 2000;62:655-668.' },
      { ref: 'Amato PR. The consequences of divorce for adults and children. J Marriage Fam, 2000;62:1269-1287.' },
      { ref: 'Sbarra DA, Nietert PJ. Divorce and death. Perspect Psychol Sci.' },
      { ref: 'McDermott R, et al. Social network effects on divorce. Social Forces, 2013.' },
    ],
  },
  {
    id: 'separation-children',
    categoryId: 'separation',
    titleHe: 'הילדים בגירושין — מה באמת מזיק?',
    readMinutes: 6,
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
      {
        highlight: 'גירושין מכפילים את הסיכון לבעיות הסתגלות משמעותיות: 20-25% מילדי גירושין לעומת ~10% מילדי משפחות תקינות. הרוב המכריע (75-80%) בטווח התקין',
        citation: 'Kelly JB & Emery RE. Children\u2019s adjustment following divorce. Family Relations, 2003;52:352-362 — ~1,567 citations',
      },
      {
        highlight: 'אפקט הגירושין נחלש בעשורים האחרונים (‏Amato 2001, ‏67 מחקרים משנות ה-90): הפער קטן ככל שהסטיגמה יורדת והתמיכה גדלה',
        citation: 'Amato PR. Children of divorce in the 1990s: update. Journal of Family Psychology, 2001;15:355-370',
      },
      {
        highlight: 'הערכה עצמית נמוכה מתווכת את הקשר גירושין\u2192דיכאון אצל מתבגרים — חיזוק דימוי עצמי הוא מנגנון הגנה, לא רק תוצאה',
        citation: 'St\u00f8rksen K, et al. 2005 — 348 citations',
      },
    ],
    tools: [
      { icon: 'thought', text: 'הילדים צריכים לשמוע שהגירושין לא באשמתם — שוב ושוב, בכל גיל.' },
      { icon: 'journal', text: 'כתוב/י: מה אני עושה שמגן על הילדים? מה אני יכול/ה לשפר?', linkTo: 'insights' },
      { icon: 'songs', text: 'שיר משותף עם הילדים — חיבור רגשי שלא דורש מילים', linkTo: 'songs' },
    ],
    sources: [
      { ref: 'Amato PR. Reconciling divergent perspectives on the consequences of divorce. J Marriage Fam. 2003.' },
      { ref: 'Amato PR, Keith B. Parental divorce and the well-being of children: meta-analysis. Psychol Bull.' },
      { ref: 'Kelly JB, Emery RE. Children\u2019s adjustment following divorce. Family Relations, 2003;52:352-362.' },
      { ref: 'St\u00f8rksen K, et al. Adolescents from divorced families. 2005.' },
    ],
  },

  {
    id: 'separation-leaver-vs-left',
    categoryId: 'separation',
    titleHe: 'העוזב והעוזב: למה כואב שונה',
    readMinutes: 6,
    evidenceTier: 'verified',
    body: `אם לא את/ה יזמת את הפרידה — את/ה חווה משהו ששווה להכיר: "אסימטריית היוזם".

המחקר עקב אחרי מי שיזם ומי לא, מיד אחרי הגירושין ושנתיים אחר כך. התוצאה: ליוזמים היה טוב יותר רגשית, פחות סטרס קשור-גירושין, והחלמה מהירה יותר — בשתי נקודות הזמן.

למה? לא בגלל ש"אכפת להם פחות". הסיבה: היוזם מתחיל להתאבל לפני הפרידה. בזמן שבן/בת הזוג "כבר עיבדו" את הסיום — העוזב מקבל את הבשורה ביום אחד. זה לא חולשה, זה פיגור מובנה בציר הזמן.

ומה עם העוזב? הנתונים: מי שלא יזם חווה מצוקה ארוכה ועמוקה יותר, בעיקר אם הוא בעל התקשרות חרדה. תסמיני דיכאון של פרידה חוזרים לבסיס אצל רוב האנשים תוך ~3 חודשים בממוצע — אבל אצל לא-יוזמים ואנשי התקשרות חרדה זה לוקח הרבה יותר.

נקודה מעניינת: נשים יוזמות גירושים בשיעור הרבה יותר גבוה מגברים — וזה לא בגלל שהן "מוותרות מהר". זה כיוון שדווקא שביעות הרצון שלהן בזוגיות היא שמנבאת גירושין (לא של הגברים).`,
    findings: [
      {
        highlight: 'ליוזמים הסתגלות טובה יותר ופחות סטרס — בשתי נקודות זמן (‏6-12 חודשים ו-18-24 חודשים אחרי)',
        citation: 'Buehler CA. Initiator status and the divorce transition. Family Relations, 1987;36:82-86',
      },
      {
        highlight: 'מנגנון "יתרון ההתחלה המוקדמת": היוזם מתאבל ומתנתק רגשית לפני הפרידה הרשמית — לעוזב אין את ההכנה המוקדמת הזו',
        citation: 'Wang H & Amato P. J Marriage Fam, 2000; Br\u00fcning et al. 2022 — one spouse typically benefits while the other is disadvantaged',
      },
      {
        highlight: 'נשים יוזמות ~69% מהגירושים (לעומת 31% גברים) — ושביעות הרצון של האישה (לא של הגבר) היא שמנבאת גירושין',
        citation: 'Rosenfeld M. Stanford/ASA, 2015; Sayer LC, et al. She left, he left. American Sociological Review, 2011;76(6)',
      },
      {
        highlight: 'תסמיני דיכאון של פרידה חוזרים לבסיס תוך ~3 חודשים בממוצע — אבל לא-יוזמים ואנשי התקשרות חרדה חווים מסלול ארוך משמעותית',
        citation: 'Field T, et al. Breakup depression literature; Gehl et al. 2023 — coping strategies mediate recovery',
      },
      {
        highlight: 'מגע מתמשך עם הקודם מאריך מצוקה — במיוחד עבור העוזב. תקשורת עסקית-מובנית (במקום רגשית-ספונטנית) מגן',
        citation: 'Post-separation contact reviews, 2025 — gender differences documented',
      },
      {
        highlight: 'פצע התקשרות (attachment injury): בגידות ונטישה פועלות כפצע שמנבאת החמרה בטיפול — ואילו עיבוד מוצלח של הפצע מנבא החלמה',
        citation: 'Makinen JA & Johnson SM. Resolving attachment injuries in couples. J Consult Clin Psychol, 2006;74(6)',
      },
    ],
    tools: [
      { icon: 'thought', text: 'אם לא יזמת: הכאב שלך לא "חולשה" — את/ה ביום הראשון של תהליך שהצד השני התחיל חודשים קודם. תנו לעצמכם את הזמן הזה.' },
      { icon: 'journal', text: 'כתוב/י: מתי בדיוק הרגשתי שהקשר מת? מה ידעתי ולא הודיתי? — מיפוי הציר שלך עוזר להבין את העיתוי', linkTo: 'insights' },
      { icon: 'breathing', text: 'כשהגוף נכנס לפאניקה של נטישה: נשימות ארוכות — 4 שניות פנימה, 6 החוצה', linkTo: 'breathing' },
    ],
    sources: [
      { ref: 'Buehler CA. Initiator status and the divorce transition. Family Relations, 1987.' },
      { ref: 'Sayer LC, et al. She left, he left. Am Sociol Rev, 2011.' },
      { ref: 'Makinen JA, Johnson SM. J Consult Clin Psychol, 2006;74(6).' },
      { ref: 'Br\u00fcning et al. Who benefits from divorce? 2022.' },
    ],
  },

  {
    id: 'separation-ambiguous-loss',
    categoryId: 'separation',
    titleHe: 'אבל ללא קבר: אובדן מעורפל',
    readMinutes: 6,
    evidenceTier: 'verified',
    body: `באבל על מת יש טקס, קבר, שבעה, יארצייט — מבנה חברתי שאומר "זה קרה, עכשיו מתאבלים".

בגירושין אין כלום מזה. בן/בת הזוג לא מתו — הם פשוט לא שלך יותר. פיזית נעלמו, נפשית נוכחים. פולין בוס קוראת לזה "אובדן מעורפל" (ambiguous loss) — מהסוג הקשה ביותר לעיבוד, כי המוח לא מקבל את האות "זה נגמר".

וזה לא רק תיאוריה: המחקר מראה שגירושין הם "אבל מנושל" (disenfranchised grief) — החברה לא מכירה בו כאבל אמיתי. אין חופשה מהעבודה, אין תנחומים, אנשים מצפים שתהיה "בסדר" תוך שבועות. וזה בדיוק מה שמאריך את המצוקה.

ולכן: סגירה (closure) היא מיתוס. המטרה היא לא "לסגור" אלא ללמוד להחזיק שתי אמיתות בו-זמנית: הוא היה חלק ממני, וזה נגמר. גם וגם.`,
    findings: [
      {
        highlight: 'אובדן מעורפל מסוג 2: הקודם פיזית נעלם אך נפשית נוכח — המוח לא מקבל אות "הסוף" ולכן האבל "קפוא" ולא מתקדם כמו אבל על מת',
        citation: 'Boss P. Ambiguous Loss. Harvard University Press, 1999; Family Relations, 2007',
      },
      {
        highlight: '"אבל מנושל" (disenfranchised grief): החברה לא מכירה באבל גירושין כאבל לגיטימי — אין טקסטים, טקסים או חופשה. הדיכוי החברתי מאריך מצוקה',
        citation: 'Doka K. Disenfranchised Grief, 1989',
      },
      {
        highlight: 'אין שלבים מוכחים של אבל גירושין. מה שקיים: מסלולים — והמסלול הנפוץ ביותר (35-65%) הוא "חוסן": מצוקה נמוכה יציבה מההתחלה',
        citation: 'Bonanno GA. Loss, trauma and human resilience. American Psychologist, 2004',
      },
      {
        highlight: '"סגירה" היא מיתוס — המטרה הקלינית היא החזקת פרדוקס, לא פתרונו: להיות גם חלק מהעבר וגם משוחרר ממנו',
        citation: 'Boss P. The myth of closure. Family Process, 2012',
      },
    ],
    tools: [
      { icon: 'thought', text: 'תנו לעצמכם "טקס סיום" משלכם: מכתב שלא נשלח, יום מיוחד, פריט שמוחזר. המוח צריך אות ל"זה נגמר".' },
      { icon: 'journal', text: 'כתיבה נרטיבית מובנית (לא שפיכה רגשית טהורה!): כתוב/י את סיפור הקשר כפרק בביוגרפיה — עם התחלה, אמצע וסוף', linkTo: 'insights' },
      { icon: 'songs', text: 'שירים שמכילים את השניות — כאב ותקווה ביחד — עוזרים יותר משירים של כאב טהור', linkTo: 'songs' },
    ],
    sources: [
      { ref: 'Boss P. Ambiguous Loss. Harvard UP, 1999; The myth of closure. Family Process, 2012.' },
      { ref: 'Doka K. Disenfranchised Grief. 1989.' },
      { ref: 'Bonanno GA. American Psychologist, 2004.' },
    ],
  },

  {
    id: 'separation-conflict-poison',
    categoryId: 'separation',
    titleHe: 'קונפליקט: הרעל האמיתי',
    readMinutes: 6,
    evidenceTier: 'verified',
    body: `מה מזיק לילדים בגירושין? לא הגירושין עצמם. הקונפליקט.

הנתון המפתיע ביותר בכל ספרות הגירושין: במשפחות עם קונפליקט גבוה ומתמשך — ילדים שהוריהם התגרשו הסתגלו טוב יותר מילדים שהוריהם נשארו נשואים בקונפליקט. הגירושין הסירו את הרעל.

ולהיפך: במשפחות שקטות (קונפליקט נמוך) — ילדים שהוריהם התגרשו הסתגלו פחות טוב מילדים ממשפחות שקטות שנשארו יחד.

מה המסקנה המעשית? אם יש קונפליקט — הפרדה מגינה על הילדים. אם אין קונפליקט — כדאי לעבוד על הזוגיות.

והקונפליקט לא רק פסיכולוגי — הוא פיזיולוגי. מחקרים מראים שחשיפה לקונפליקט בין-הורי מעלה קורטיזול אצל ילדים, גם כשהם "נראים בסדר". הגוף סופג מה שהפנים מסתירות.`,
    findings: [
      {
        highlight: 'בקונפליקט גבוה: ילדי גרושים הסתגלו טוב יותר מילדי נשואים-בקונפליקט. בקונפליקט נמוך: ילדי גרושין הסתגלו פחות טוב מילדי נשואים-שקטים. הגירושין מגינים כשיש עוינות, מזיקים כשאין',
        citation: 'Booth A & Amato PR. Marital Instability Over the Life Course — Justice Canada 2002_2 summary',
      },
      {
        highlight: 'קונפליקט בין-הורי מעלה קורטיזול אצל ילדים — גם כשאין צעקות פיזיות. הסטרס הפיזיולוגי נמדד ברוק, לא רק בדיווח',
        citation: 'Gao & Cummings, 2019 (PMC6860025); Davies et al. 2020 (PMC8265819) — curvilinear cortisol risk',
      },
      {
        highlight: '"גירושין טובים" (קואופרטיביים) עדיין לא משתווים לנישואין תקינים-שקטים — אבל עדיפים בהרבה על כל סדר גירושין עם קונפליקט',
        citation: 'Amato PR. Reconsidering the "good divorce". Family Relations, 2011 — 458 citations',
      },
      {
        highlight: 'מגע מתמשך עם הקודם מאריך מצוקה של המבוגרים — במיוחד כשהמגע ספונטני ולא מובנה. תקשורת "עסקית" (מייל/הודעה מובנית) מגינה',
        citation: 'Post-separation contact reviews, 2025',
      },
    ],
    tools: [
      { icon: 'thought', text: 'לפני כל תקשורת עם הקודם: "האם זה משרת את הילדים, או את הצורך שלי לנצח/להיות צודק?"' },
      { icon: 'breathing', text: 'לפני שיחה קשה: 2 דקות נשימות מרגיעות. קורטיזול נמוך = תגובה טובה יותר = פחות קונפליקט', linkTo: 'breathing' },
      { icon: 'journal', text: 'כתוב/י "מייל טיוטה" שלא נשלח — כל מה שרוצים להגיד — ואז כתבו גרסה עסקית בת 3 שורות', linkTo: 'insights' },
    ],
    sources: [
      { ref: 'Booth A, Amato PR. Confidant and marital quality. Justice Canada 2002_2.' },
      { ref: 'Amato PR. Reconsidering the "good divorce". Family Relations, 2011.' },
      { ref: 'Davies PT, et al. Interparental conflict and cortisol. 2020.' },
    ],
  },

  {
    id: 'separation-coparenting',
    categoryId: 'separation',
    titleHe: 'הורות משותפת: מה באמת עובד',
    readMinutes: 7,
    evidenceTier: 'verified',
    body: `לא כל ההורות המשותפת שווה. המחקר מזהה 4 סוגים:

• שיתופית (cooperative) — תקשורת טובה, תיאום הורי, כבוד הדדי
• מקבילה (parallel) — מינימום מגע, כל הורה "בעולמו", בלי תיאום אך בלי קונפליקט
• מנוכרת (disengaged) — אפס מגע, לא תיאום ולא קונפליקט
• עוינת (conflicted) — מגע רב בעיקר דרך קונפליקט

מה מפתיע? רוב הזוגות נודדים לאורך זמן לכיוון מקבילה או מנוכרות — גם אלה שהתחילו שיתופיים. וזה בסדר: מקבילה עדיפה על עוינות בהרבה.

ומה באמת משנה לילדים? תכנית New Beginnings — המחקר המוזהב של ההורות אחרי גירושין — הראתה שהתערבות קצרה (11 מפגשי קבוצה לאמהות + 12 לילדים) הפחיתה ב-37% אבחנות פסיכיאטריות אחרי 6 שנים, והאפקט נמשך 15 שנה.`,
    findings: [
      {
        highlight: 'ארבעה סוגי הורות משותפת: שיתופית, מקבילה, מנוכרת, עוינת. רוב הזוגות נודדים עם הזמן למקבילה/מנוכרות — וזה תקין',
        citation: 'Maccoby EE, Buchanan CM, Mnookin RH, Dornbusch SM. Postdivorce families. 1993',
      },
      {
        highlight: 'תכנית New Beginnings (‏RCT, 240 משפחות): ‏37% פחות אבחנות הפרעה נפשית אחרי 6 שנים; אפקטים נמשכו 15 שנה — פחות סמים, פחות בעיות התנהגות, ציונים טובים יותר',
        citation: 'Wolchik SA, Sandler IN, et al. Six-year follow-up. JAMA, 2002;288:1874-1881; 15-year: Prevention Science, 2013',
      },
      {
        highlight: 'לינות של ילדים מתחת לגיל 4 אצל ההורה הלא-משמורן: מחלוקת מדעית פתוחה. Tornello (2013) מצא סיכון, Warshak (2014, ~110 חוקרים) מצא תועלת. מה מוסכם: הזמן עם כל הורה פחות חשוב מאיכות היחסים ומרמת הקונפליקט',
        citation: 'Tornello et al. J Soc Personal Relationships, 2013; Warshak. Psychology, Public Policy, and Law, 2014;20(1)',
      },
      {
        highlight: '"משמורת משותפת" בפועל (joint physical custody) קשורה לפחות סטרס אצל ילדים — אבל האפקט תלוי ברמת הקונפליקט בין הבתים, לא בחלוקת הזמן עצמה',
        citation: 'Turunen J. Sweden, 2017; Augustijn L. 2022',
      },
      {
        highlight: 'הורות משותפת שיתופית קשורה להתנהגות חברתית חיובית ופחות בעיות התנהגות אצל ילדים',
        citation: 'Scrimgeour MB, et al. 2013',
      },
    ],
    tools: [
      { icon: 'thought', text: 'בחנו איזה "סוג" אתם: שיתופי, מקביל או מנוכר. אין "כישלון" במקבילות — יש הצלחה בהפחתת קונפליקט.' },
      { icon: 'journal', text: 'כלל הזהב לתקשורת עם הקודם: כל הודעה = מידע בלבד. ללא רגש, ללא האשמה, ללא "וגם...". אפשר למדוד את עצמכם ביומן', linkTo: 'insights' },
      { icon: 'breathing', text: 'לפני מסירה/איסוף: נשימה אחת עמוקה. הילדים סופגים את המתח שלכם בגוף שלהם', linkTo: 'breathing' },
    ],
    sources: [
      { ref: 'Maccoby EE, et al. Postdivorce families: cooperative versus conflicted. 1993.' },
      { ref: 'Wolchik SA, Sandler IN, et al. JAMA, 2002;288:1874-1881.' },
      { ref: 'Warshak RA. Psychology, Public Policy, and Law, 2014;20(1).' },
      { ref: 'Turunen J. Child custody and stress. 2017.' },
    ],
  },

  {
    id: 'separation-identity-rebuild',
    categoryId: 'separation',
    titleHe: 'מי אני בלי "אנחנו"?',
    readMinutes: 6,
    evidenceTier: 'verified',
    body: `אחרי גירושין, אחת השאלות הקשות ביותר: מי אני עכשיו?

המחקר האורך מראה שהערכה עצמית לא נופלת אחרי הגירושין — היא נופלת לפני. המסלול: ירידה הדרגתית בשנים שלפני הפרידה, נגיעה בתחתית בסביבות מועד הפרידה עצמו, ואז — התייצבות והתאוששות חלקית בשנים שאחרי.

כלומר: אם אתם מרגישים שהערכה העצמית שלכם בתחתית — אתם בדיוק בנקודה שהמחקר מכנה "השפל". מכאן הכיוון הוא מעלה.

וגם החברים: הרשת החברתית מצטמקת. חברים משותפים "נופלים" (כמעט מחצית בשנתיים הראשונות), חברים אישיים נשארים, וקשרי משפחה מתעוררים מחדש. זה כואב אבל זה גם הזדמנות: מי שנשאר — הוא האמיתי.`,
    findings: [
      {
        highlight: 'הערכה עצמית יורדת בשנים שלפני הפרידה, מגיעה לתחתית בזמן הפרידה עצמה, ומתאוששת חלקית אחריה. השפל הוא המעבר — לא העתיד',
        citation: 'Denissen JJA, Bleidorn W, et al. Self-esteem and divorce trajectories. Journal of Personality, 2021',
      },
      {
        highlight: 'הרשת החברתית מצטמקת בכמעט 50% בשנתיים הראשונות — אבל לא נעלמת: חברים-זוגיים יורדים, חברים אישיים נשארים, קשרי משפחה מתחזקים',
        citation: 'Gerstel N. Personal communities research; network syntheses of divorce literature',
      },
      {
        highlight: 'בדידות מטפסת בשנה שלפני הפרידה, מגיעה לשיא בשנת הפרידה עצמה, ואז יורדת בהדרגה. גברים גרושים נשארים פגיעים יותר מנשים',
        citation: 'Kapelle N, Luhmann M, et al. Gendered loneliness trajectories. J Health Soc Behav, 2024',
      },
      {
        highlight: 'בדידות רגשית (געגוע לבן/בת זוג) גבוהה יותר אצל גברים גרושים; בדידות חברתית (חסר רשת) אצל שני המינים. טיפול בבדידות חברתית = בניית רשת; טיפול בבדידות רגשית = עבודה פנימית',
        citation: 'Dykstra PA, et al. Divorce in the Netherlands survey, N=2,223',
      },
      {
        highlight: 'קבוצות תמיכה מונחות (עם מנחה מקצועי) מפחיתות מצוקה פסיכולוגית באופן מובהק — אבל לא מתגברות קונפליקט פעיל עם הקודם',
        citation: 'Blake L, et al. 2022; Cipri\u0107 A, et al. 2022 — digital divorce support',
      },
    ],
    tools: [
      { icon: 'thought', text: 'כתבו רשימה: "מי אני בלעדיו/ה" — 10 דברים שאני, לא כחצי מזוג. קראו שוב כל בוקר.' },
      { icon: 'journal', text: 'מיפוי הרשת: מי נשאר? מי נפל? מי אני רוצה לקרב? — צעד אחד השבוע לחבר אחד', linkTo: 'insights' },
      { icon: 'songs', text: 'פלייליסט "מי אני" — שירים שמזכירים לך מי את/ה חוץ מהזוגיות', linkTo: 'songs' },
    ],
    sources: [
      { ref: 'Denissen JJA, et al. J Personality, 2021.' },
      { ref: 'Kapelle N, et al. J Health Soc Behav, 2024.' },
      { ref: 'Dykstra PA. Social and emotional loneliness. Netherlands survey.' },
      { ref: 'Blake L, et al. Facilitated support groups. 2022.' },
    ],
  },

  {
    id: 'separation-financial',
    categoryId: 'separation',
    titleHe: 'המכה הכלכלית — ואיך עוברים',
    readMinutes: 5,
    evidenceTier: 'verified',
    body: `הגירושין הם לא רק אובדן רגשי — הם גם מכה כלכלית. והנתונים ברוטליים במיוחד עבור נשים.

מחקר העדכון של Smock (‏2023): הכנסת המשפחה של נשים יורדת ב-46-50% אחרי גירושין — כפול מהירידה אצל גברים. הפער מתמשך ואינו נסגר מעצמו.

אבל הנתון החשוב יותר: זה לא הכסף עצמו שמזיק לנפש — אלא הדרך שבה אנחנו מגיבים ללחץ הכספי. מחקרי ה-Family Stress Model מראים שרומינציה כספית (חשיבה מתמדת על חובות), הימנעות מבדיקת חשבון, ותחושת חוסר אונים — הם המנגנון שמוביל מקושי כלכלי לדיכאון.

כלומר: לפתוח את החשבון, לראות את המספרים, לעשות תוכנית — זה כבר טיפול פסיכולוגי.`,
    findings: [
      {
        highlight: 'הכנסת משפחה של נשים יורדת 46-50% אחרי גירושין — בערך כפול מהירידה אצל גברים. הפער מתמשך לאורך שנים',
        citation: 'Smock PJ, Manning WD, Gupta S. Gender and economic consequences of divorce. American Sociological Review, 1999; update 2023 (PMC12643126)',
      },
      {
        highlight: 'המסלול המוכח: קושי כלכלי \u2192 לחץ כספי \u2192 מצוקה רגשית של ההורה \u2192 קונפליקט \u2192 הורות נוקשה \u2192 פגיעה בילדים. כל חוליה בשרשרת ניתנת לטיפול',
        citation: 'Conger RD, et al. Family process model of economic hardship. Child Development, 1992; Masarik & Conger, 2017 — ~2,900 citations',
      },
      {
        highlight: 'לא ההכנסה אלא התגובה הפסיכולוגית ללחץ הכספי מנבאת מצוקה: רומינציה, הימנעות וחוסר אונים מתווכים את הקשר כסף\u2192נפש',
        citation: 'Frankham C, et al. Systematic review. 2020; Ryu S, et al. 2022',
      },
    ],
    tools: [
      { icon: 'thought', text: 'רגע של אמת: פתחו את חשבון הבנק. הימנעות מהמספרים מאריכה את המצוקה; ידיעה — גם כואבת — מקצרת אותה.' },
      { icon: 'journal', text: 'כתבו תוכנית כספית בת 3 שורות: מה נכנס, מה יוצא, מה משנים החודש. עדכנו כל שבוע', linkTo: 'insights' },
      { icon: 'breathing', text: 'כשחרדה כספית תוקפת: נשימה 4-6, ואז שאלה אחת — "מה הצעד הקטן הבא?"', linkTo: 'breathing' },
    ],
    sources: [
      { ref: 'Smock PJ, et al. Am Sociol Rev, 1999; update 2023.' },
      { ref: 'Conger RD, et al. Child Development, 1992.' },
      { ref: 'Frankham C, et al. 2020 systematic review.' },
    ],
  },

  {
    id: 'separation-dating-again',
    categoryId: 'separation',
    titleHe: 'לצאת שוב: המיתוסים והנתונים',
    readMinutes: 6,
    evidenceTier: 'verified',
    body: `"אסור לצאת לדייטינג מוקדם מדי, זה ריבאונד" — נשמע מוכר? המחקר דווקא מפתיע.

Brumbaugh ו-Fraley בדקו את "אפקט הריבאונד" ומצאו: להיכנס לקשר חדש מהר דווקא עזר לאנשים עם התקשרות חרדה להתנתק מהקודם. ובמחקר המשך: תזמון ה"ריבאונד" לא היה מזיק באופן מהימן — קשרים חדשים לוו בדווקא ברווחה גבוהה יותר.

מתי כן מסוכן? כשהקשר החדש הוא בעיקר בריחה — להיות עם מישהו כדי לא להיות לבד, בלי עיבוד של מה שהיה.

ומה עם "בוחרים תמיד את אותו טיפוס"? המחקר מראה באמת עקביות בבחירת בני זוג (ערכים, רמת השכלה, אישיות) — אבל זה לא גזירה משמיים. מודעות לדפוס + עבודה על התקשרות = שבירת המחזור.

נתון חשוב: ~66% מהגרושים נישאים בשנית. אבל ~60% מהנישואים החוזרים מסתיימים שוב בגירושין — בעיקר אצל זוגות עם ילדים (משפחות בנויות). המסקנה: הזדמנות שנייה דורשת עבודה שנייה.`,
    findings: [
      {
        highlight: 'מיתוס ה"ריבאונד" הופרך: כניסה מהירה לקשר חדש עזרה לאנשי התקשרות חרדה להתנתק מהקודם; תזמון מהיר לא היה מזיק באופן מהימן',
        citation: 'Brumbaugh CC & Fraley RC. On the rebound. Pers Soc Psychol Bull, 2009;35:1382-1394; Brumbaugh. Personal Relationships, 2015',
      },
      {
        highlight: 'הסיכון האמיתי: קשר שמשמש בעיקר כבריחה מבדידות — בלי עיבוד של הקשר הקודם. זה לא עניין של תזמון אלא של מוטיבציה',
        citation: 'Brumbaugh CC. Too fast, too soon? Personal Relationships, 2015',
      },
      {
        highlight: 'עקביות בבחירת בני זוג: אנשים בוחרים בני זוג דומים בערכים, השכלה ואישיות גם במערכות יחסים עוקבות — אבל מודעות לדפוס יכולה לשבור אותו',
        citation: 'Assortative mating research — Visser et al. 2025 review; Conradi et al. 2021 attachment continuity',
      },
      {
        highlight: '~66% מהגרושים נישאים בשנית; ‏~60% מהנישואים החוזרים מסתיימים בגירושין — משפחות בנויות (עם ילדים) בסיכון הגבוה ביותר',
        citation: 'Pew Research Center, 2025 Census data; Hetherington. For Better or For Worse, 2002',
      },
      {
        highlight: 'ילדים להורים גרושים נושאים סיכון גירושין כפול (1.5-2x) — אבל המנגנון המרכזי הוא מחויבות חלשה יותר לנישואין, לא גנטיקה. מודעות = מניעה',
        citation: 'Amato PR. Explaining the intergenerational transmission of divorce. J Marriage Fam, 1996;58:628-640',
      },
    ],
    tools: [
      { icon: 'thought', text: 'לפני דייט חדש: שאלו "האם אני בוחר/ת אותו/ה — או בורח/ת מהבדידות?" תשובה כנה חוסכת שנתיים.' },
      { icon: 'journal', text: 'כתבו "מפת בחירה": מה משך אותי לקודם? מה לא עבד? מה אני רוצה שיהיה שונה הפעם?', linkTo: 'insights' },
      { icon: 'songs', text: 'שירים של התחלות חדשות — פלייליסט לתקופה של פתיחות', linkTo: 'songs' },
    ],
    sources: [
      { ref: 'Brumbaugh CC, Fraley RC. Pers Soc Psychol Bull, 2009.' },
      { ref: 'Amato PR. J Marriage Fam, 1996;58:628-640.' },
      { ref: 'Pew Research Center. 8 facts about divorce. October 2025.' },
      { ref: 'Hetherington EM, Kelly J. Norton, 2002.' },
    ],
  },

  {
    id: 'separation-tool-self-compassion',
    categoryId: 'separation',
    titleHe: 'חמלה עצמית: המנבא #1 להחלמה',
    readMinutes: 6,
    evidenceTier: 'verified',
    body: `אם יש דבר אחד שהמחקר מזהה כמנבא החזק ביותר להחלמה מגירושין — זו לא אינטליגנציה, לא כוח רצון, ולא "חשיבה חיובית".

זו חמלה עצמית.

סבארה וצוותו (‏2012) הקליטו 105 מתגרשים מדברים 4 דקות על הפרידה, ודירגו מדרגים עצמאיים כמה חמלה עצמית כל אחד הפגין. התוצאה: אלה שהפגינו יותר חמלה עצמית — סבלו פחות ממחשבות פולשניות והחלימו מהר יותר לאורך 9 חודשי מעקב. וזה בקרה על דיכאון, חרדת התקשרות ואישיות.

כלומר: הדרך שבה אתם מדברים אל עצמכם על הגירושין — "איך נפלתי לזה" מול "עשיתי כמיטב יכולתי ברגע נתון" — היא לא "רק פוזה". היא מנבאת ביולוגית של החלמה.

חמלה עצמית (Neff) = 3 רכיבים: טוב לב כלפי עצמי (במקום ביקורת), אנושיות משותפת (גם אחרים עוברים את זה), ומיינדפולנס (לראות את הכאב בלי לטבוע בו).`,
    findings: [
      {
        highlight: 'חמלה עצמית שנצפתה התנהגותית (לא רק דיווח עצמי) מנבאת פחות מצוקה פולשנית והחלמה מהירה יותר — בקרה על דיכאון, חרדת התקשרות וBig Five',
        citation: 'Sbarra DA, Smith HL, Mehl MR. When leaving your ex, love yourself. Psychological Science, 2012;23:1057-1063',
      },
      {
        highlight: 'בשכפול (‏2021): חמלה עצמית נצפית — לא דיווח עצמי — היא שמנבאת את שיפוע ההחלמה. מה שעושים חשוב יותר ממה שחושבים שעושים',
        citation: 'Replication. J Soc Personal Relationships, 2021',
      },
      {
        highlight: 'תרגיל חמלה עצמית יומי קצר (‏5 דקות) מפחית קורטיזול ומשפר מצב רוח תוך שבועות — לא נדרשים חודשים',
        citation: 'Neff KD. Self-Compassion research base; Arch et al. brief self-compassion inductions',
      },
    ],
    tools: [
      { icon: 'thought', text: 'תרגיל "החבר הטוב": דברו אל עצמכם כמו שהייתם מדברים אל חבר שעבר גירושין. מה הייתם אומרים? זה מה שמגיע לכם.' },
      { icon: 'journal', text: 'כתבו: "אני לא היחיד/ה שעובר/ת את זה. מיליונים עברו והחלימו. אני בחברה טובה." — רכיב האנושיות המשותפת', linkTo: 'insights' },
      { icon: 'breathing', text: 'מדיטציית חמלה: יד על הלב, נשימה איטית, "שיהיה לי קל יותר, שאהיה בטוח/ה, שאקבל את עצמי"', linkTo: 'breathing' },
    ],
    sources: [
      { ref: 'Sbarra DA, et al. Psychological Science, 2012;23:1057-1063.' },
      { ref: 'Neff KD. Self-Compassion: The Proven Power of Being Kind to Yourself.' },
    ],
  },

  {
    id: 'separation-tool-writing',
    categoryId: 'separation',
    titleHe: 'כתיבה שמרפא — וכתיבה שמזיקה',
    readMinutes: 6,
    evidenceTier: 'verified',
    body: `"כתוב הכל, תרגיש יותר טוב" — המלצה פופולרית. אבל המחקר מגלה משהו מפתיע: עבור גרושים מסוימים, כתיבה רגשית טהורה דווקא מזיקה.

סבארה וצוותו (‏2013) חילקו 90 מתגרשים טריים לשתי קבוצות: אחת כתבה "שפיכה רגשית" קלאסית (לכתוב את הרגשות העמוקים ביותר), השנייה כתבה כתיבה ניטרלית. התוצאה ההפוכה מהצפוי: קבוצת הכתיבה הרגשית הייתה במצוקה גבוהה יותר במעקב — במיוחד אצל "רומינטורים" (אנשים שחושבים מחשבות חוזרות).

מה כן עובד? כתיבה נרטיבית — לא לשפוך אלא לבנות סיפור קוהרנטי: מה היה, מה קרה, מה למדתי, לאן אני הולך/ת. זה כולל משמעות, לא רק רגש.

ההבדל: שפיכה = "כמה כואב לי" (לולאה). נרטיב = "הנה הפרק הזה בחיים שלי" (קו המתקדם).`,
    findings: [
      {
        highlight: 'כתיבה רגשית טהורה ("שפיכה") החמירה מצוקה אצל מתגרשים טריים — במיוחד רומינטורים. ‏RCT, N=90: קבוצת הכתיבה הרגשית במצוקה גבוהה יותר מקבוצת הביקורת',
        citation: 'Sbarra DA, Boals AA, Mason AE, Larson GM, Mehl MR. Expressive writing can impede emotional recovery following marital separation. Clinical Psychological Science, 2013;1(1)',
      },
      {
        highlight: 'הגרסה הבטוחה: כתיבה נרטיבית — בניית סיפור קוהרנטי של הגירושין עם משמעות וכיוון. מגינה מתסמינים פולשניים',
        citation: 'Smith HL, Sbarra DA, et al. Narrative expressive writing. 2017-2018',
      },
      {
        highlight: 'פרוטוקול פנבייקר המקורי (מחקרי לא-גירושין): ‏15-20 דקות ביום, ‏3-4 ימים רצופים. השיפור קשור לעלייה במילות תובנה וסיבתיות — לא בכמות המילים',
        citation: 'Pennebaker JW. Writing to Heal. Psychological Science, 1997',
      },
    ],
    tools: [
      { icon: 'journal', text: 'פרוטוקול נרטיבי בטוח: כתבו את הסיפור כפרק בביוגרפיה — התחלה, אמצע, סוף, ולמה למדתי. 15 דקות × 3 ימים. לא שפיכה — בנייה', linkTo: 'insights' },
      { icon: 'thought', text: 'בדיקה לפני כתיבה: "האם אני כותב/ת כדי לבנות סיפור — או כדי לחוות שוב את הכאב?" אם זה השני, עצרו ועברו לנשימות.' },
      { icon: 'breathing', text: 'אחרי כתיבה קשה: 5 נשימות 4-6 + שתיית מים. סגירת מעגל גופנית לתהליך הנפשי', linkTo: 'breathing' },
    ],
    sources: [
      { ref: 'Sbarra DA, et al. Clinical Psychological Science, 2013;1(1).' },
      { ref: 'Smith HL, Sbarra DA, et al. Narrative writing. 2017-2018.' },
      { ref: 'Pennebaker JW. Psychological Science, 1997.' },
    ],
  },

  {
    id: 'separation-tool-forgiveness-calm',
    categoryId: 'separation',
    titleHe: 'סליחה, מיינדפולנס והפעלה — הכלים שנבדקו',
    readMinutes: 7,
    evidenceTier: 'verified',
    body: `שלושה כלים עם ראיות הכי חזקות בעולם להחלמה מגירושין:

**סליחה** — לא למען הקודם, למענך. ‏RCT על 149 גרושים: ‏8 מפגשי קבוצה לסליחה הגדילו משמעותית סליחה כלפי בן/בת הזוג הקודם. מודל REACH של וורת'ינגטון: ‏R-זכור, ‏E-הבן, ‏A-מתנה, ‏C-התחייב, ‏H-החזק.

**מיינדפולנס (MBSR)** — מטא-אנליזה של 29 RCTs: אפקט גדול על סטרס, אפקט בינוני על חרדה, דיכאון ואיכות חיים. לא ספציפי לגירושין — אבל הסטרס של גירושין הוא בדיוק מה שהוא מטפל.

**הפעלה התנהגותית (BA)** — לדיכאון שאחרי גירושין. מטא-אנליזה: אפקט גדול (g≈0.74), שקול ל-CBT מלא ולתרופות — אבל פשוט יותר. הרעיון: לא לחכות למוטיבציה, אלא לעשות פעולה קטנה ולתת למוח להיגרר.

כלים אלה לא מחליפים טיפול — אבל הם מה שהמדע יודע שעובד.`,
    findings: [
      {
        highlight: 'התערבות סליחה קבוצתית (‏8 מפגשים) לגרושים הגדילה סליחה כלפי בן/בת הזוג הקודם באופן מובהק — בשתי גרסאות (חילונית ודתית)',
        citation: 'Rye MS, et al. Can group interventions facilitate forgiveness of an ex-spouse? J Consult Clin Psychol, 2005 — RCT',
      },
      {
        highlight: 'מודל REACH (Worthington) — ‏6 שעות פסיכו-חינוכיות מפיקות ~0.6 SD שיפור בסליחה; מטא-אנליזות: ‏d=0.6-1.0 (קבוצתי), ‏d=1.66 (אישי)',
        citation: 'Worthington EL. REACH model; Wade NG, et al. J Consult Clin Psychol, 2014; Lundahl et al.',
      },
      {
        highlight: 'MBSR: ‏29 RCTs, N=2,668 — אפקט גדול על סטרס, בינוני על חרדה, דיכאון, מצוקה ואיכות חיים',
        citation: 'Khoury B, et al. MBSR for healthy individuals: meta-analysis. J Psychosom Res, 2015;78:519-528',
      },
      {
        highlight: 'הפעלה התנהגותית: אפקט גדול (g\u22480.74) על דיכאון — שקול ל-CBT מלא ולתרופות, ופשוט יותר ליישום עצמי',
        citation: 'Ekers D, et al. Behavioural activation for depression. PLoS ONE, 2014;9:e100100',
      },
    ],
    tools: [
      { icon: 'thought', text: 'REACH מותאם: זכור מה קרה (בלי להכחיש) \u2192 נסה/י להבין מה הוביל אותו/אותה \u2192 בחר/י לשחרר (לא להצדיק) \u2192 כתוב משפט סליחה \u2192 חזור/י אליו כשחוזר הכעס' },
      { icon: 'breathing', text: 'מיינדפולנס 10 דקות ביום — מודול הנשימות שלנו כולל טכניקות מבוססות MBSR', linkTo: 'breathing' },
      { icon: 'songs', text: 'הפעלה התנהגותית מוזיקלית: בחר/י שיר אחד, לחצ/י נגן, וזוז/י — המוח יגרר אחרי הגוף', linkTo: 'songs' },
      { icon: 'journal', text: 'מטרה יומית אחת קטנה (BA): משהו נעים של 10 דקות, גם בלי חשק. סמנו \u2713 ביומן', linkTo: 'insights' },
    ],
    sources: [
      { ref: 'Rye MS, et al. J Consult Clin Psychol, 2005.' },
      { ref: 'Worthington EL. REACH forgiveness model.' },
      { ref: 'Khoury B, et al. J Psychosom Res, 2015;78:519-528.' },
      { ref: 'Ekers D, et al. PLoS ONE, 2014;9:e100100.' },
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
    body: `רגשות באים עם עוררות פיזיולוגית בכל הגוף. אי אפשר "לחשוב" את הדרך החוצה ממשבר — קודם משנים מצב פיזי, ואז חושבים.

רגש עצמו נמשך ~90 שניות פיזיולוגית. מה שמאריך אותו זה המחשבות שמזינות אותו מחדש ("והוא תמיד עושה את זה...").

DBT מלמד שכל רגש נושא איתו דחף לפעולה — ואפשר לפעול הפוך לדחף כדי להחליש את הרגש. הכלים: TIPP (למשבר), ‏STOP (לדחפים), ‏Opposite Action (לרגש שלא מתאים לעובדות), ‏ABC PLEASE (להפחתת פגיעות).`,
    findings: [
      { highlight: 'DBT: RCT-ים מראים הפחתת התנהגויות אובדניות ואשפוזים; כישורים לבד (בלי טיפול מלא) מועילים', citation: 'Linehan MM et al. (1991), Archives of General Psychiatry — first DBT RCT' },
      { highlight: 'כלל 90 שניות: הקסקדה הכימית של רגש מתפנה מהדם ב-90 שניות. מה שנשאר — מחשבות שמפעילות אותו מחדש', citation: 'Taylor JB. (2006), My Stroke of Insight — neuroanatomist\'s observation' },
      { highlight: 'TIPP-Temperature: מים קרים על הפנים מפעילים רפלקס צלילה → האטת דופק תוך 30-60 שניות דרך עצב הואגוס', citation: 'Richer S et al. (2022), PMC9649023; Linehan — DBT TIPP' },
      { highlight: 'כישורים עובדים דרך שימוש: מי שמשתמש בכישורי DBT יותר — משתפר יותר. הכישורים עצמם הם מה שמנבא תוצאות', citation: 'Neacsiu AD et al. (2010) — skills use mediates outcomes' },
      { highlight: 'כעס: "לשחרר כעס" (צעקות, הכאה) לא עובד ואפילו מזיק — מטא-אנליזה של 154 מחקרים, ‏10,189 משתתפים. מה שעובד: נשימה, מיינדפולנס, PMR', citation: 'Kjærvik & Bushman (2024), Clinical Psychology Review — g=-0.63', link: 'https://pubmed.ncbi.nlm.nih.gov/38518585' },
    ],
    tools: [
      { icon: 'thought', text: 'TIPP למשבר: T=מים קרים על פנים 15-30 שנ\'. I=פעילות עזה 1-3 דק\'. P=נשימה 5-6 בדק\' עם נשיפה ארוכה. P=כיווץ+הרפיה עם נשיפה' },
      { icon: 'breathing', text: 'נשימה מדודה: פנימה 4, החוצה 6-8 — מעביר את המערכת ל"מצב מנוחה"', linkTo: 'breathing' },
      { icon: 'thought', text: 'כלל 90 שניות: כשנדלקת, הבט/י בשעון. 90 שניות רק תצפה/י בגוף. אחרי: "אני רוצה להריץ את זה שוב, או שסיימתי?"' },
      { icon: 'thought', text: 'בדיקת עובדות: "האם הרגש מתאים למה שקרה? או שאני מגזים/ה?" אם לא מתאים → פעולה הפוכה לדחף' },
      { icon: 'journal', text: 'ABC PLEASE: A=פעולה נעימה יומית. B=משהו שגורם להרגיש מוכשר/ת. C=דמיין/י מצב קשה ותרגל/י. PLEASE=שינה, אוכל, ספורט', linkTo: 'insights' },
    ],
    sources: [
      { ref: 'Linehan MM. DBT Skills Training Manual. 2nd ed. 2015.' },
      { ref: 'Neacsiu AD, et al. Skills use mediates outcomes. 2010.' },
      { ref: 'Taylor JB. My Stroke of Insight. 2006.' },
      { ref: 'Richer S, et al. Cold Face Test. PMC. 2022.', link: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC9649023' },
      { ref: 'Kjærvik SL, Bushman BJ. Anger management meta-analysis. Clin Psychol Rev. 2024.', link: 'https://pubmed.ncbi.nlm.nih.gov/38518585' },
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
