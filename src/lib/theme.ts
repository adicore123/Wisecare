/**
 * WiseCare Therapeutic Design Themes
 * 7 Curated Color Palettes Tailored for Psychological & Emotional Therapy Clinics
 */

export interface ThemePalette {
  id: string;
  name: string;
  englishName: string;
  emoji: string;
  description: string;
  colors: {
    primary: string;
    primaryHover: string;
    primaryLight: string;
    primaryGlow: string;
    accent: string;
    accentLight: string;
    sidebar: string;
    sidebarGradient: string;
    sidebarHover: string;
    sidebarActiveBg: string;
    sidebarActiveColor: string;
    sidebarActiveBorder: string;
    brandGradient: string;
    sidebarBorder: string;
    previewBadge: string;
  };
}

export const THEME_PALETTES: ThemePalette[] = [
  {
    id: 'sage',
    name: 'רוגע ומרווה קלינית',
    englishName: 'Sage & Serenity',
    emoji: '🌿',
    description: 'הפלטה הקלאסית לטיפול רגשי ופסיכולוגיה. משדרת שלווה, ניקיון מחשבתי, בהירות ורוגע עמוק.',
    colors: {
      primary: '#0d9488',
      primaryHover: '#0f766e',
      primaryLight: '#ccfbf1',
      primaryGlow: 'rgba(13, 148, 136, 0.22)',
      accent: '#6366f1',
      accentLight: '#e0e7ff',
      sidebar: '#07191d',
      sidebarGradient: '#053f3b',
      sidebarHover: 'rgba(13, 148, 136, 0.16)',
      sidebarActiveBg: 'rgba(255, 255, 255, 0.11)',
      sidebarActiveColor: '#ffffff',
      sidebarActiveBorder: '#14b8a6',
      brandGradient: '#0f766e',
      sidebarBorder: 'rgba(20, 184, 166, 0.15)',
      previewBadge: '#14b8a6'
    }
  },
  {
    id: 'ocean',
    name: 'אוקיינוס עמוק ומדיטטיבי',
    englishName: 'Deep Ocean Calm',
    emoji: '🌊',
    description: 'משרה ביטחון יציב, פתיחות נשימתית והפחתת מתחים. מושלם לטיפולי CBT והרגעת חרדות.',
    colors: {
      primary: '#0284c7',
      primaryHover: '#0369a1',
      primaryLight: '#e0f2fe',
      primaryGlow: 'rgba(2, 132, 199, 0.22)',
      accent: '#06b6d4',
      accentLight: '#cffafe',
      sidebar: '#06192a',
      sidebarGradient: '#073452',
      sidebarHover: 'rgba(2, 132, 199, 0.16)',
      sidebarActiveBg: 'rgba(255, 255, 255, 0.11)',
      sidebarActiveColor: '#ffffff',
      sidebarActiveBorder: '#0284c7',
      brandGradient: '#0369a1',
      sidebarBorder: 'rgba(56, 189, 248, 0.15)',
      previewBadge: '#38bdf8'
    }
  },
  {
    id: 'lavender',
    name: 'לוונדר ואיזון רגשי',
    englishName: 'Lavender Balance',
    emoji: '🪻',
    description: 'גוונים מעודנים של לוונדר ולילך. מעודדים חמלה עצמית, מיינדפולנס וריפוי רגשי מעמיק.',
    colors: {
      primary: '#7c3aed',
      primaryHover: '#6d28d9',
      primaryLight: '#ede9fe',
      primaryGlow: 'rgba(124, 58, 237, 0.22)',
      accent: '#a855f7',
      accentLight: '#f3e8ff',
      sidebar: '#180929',
      sidebarGradient: '#2f1850',
      sidebarHover: 'rgba(124, 58, 237, 0.16)',
      sidebarActiveBg: 'rgba(255, 255, 255, 0.11)',
      sidebarActiveColor: '#ffffff',
      sidebarActiveBorder: '#a855f7',
      brandGradient: '#6d28d9',
      sidebarBorder: 'rgba(168, 85, 247, 0.15)',
      previewBadge: '#a78bfa'
    }
  },
  {
    id: 'terracotta',
    name: 'אדמה חמה וטרקוטה',
    englishName: 'Warm Earth & Sand',
    emoji: '🏺',
    description: 'גווני קרקוע (Grounding) חמים של חול וטרקוטה. מעניקים תחושת עוגן, מוגנות וקרקוע בטוח.',
    colors: {
      primary: '#c2410c',
      primaryHover: '#9a3412',
      primaryLight: '#ffedd5',
      primaryGlow: 'rgba(194, 65, 12, 0.22)',
      accent: '#d97706',
      accentLight: '#fef3c7',
      sidebar: '#200d07',
      sidebarGradient: '#4a2114',
      sidebarHover: 'rgba(194, 65, 12, 0.16)',
      sidebarActiveBg: 'rgba(255, 255, 255, 0.11)',
      sidebarActiveColor: '#ffffff',
      sidebarActiveBorder: '#f97316',
      brandGradient: '#9a3412',
      sidebarBorder: 'rgba(249, 115, 22, 0.15)',
      previewBadge: '#fb923c'
    }
  },
  {
    id: 'forest',
    name: 'יער ירוק ואקליפטוס',
    englishName: 'Forest Growth & Renewal',
    emoji: '🌲',
    description: 'ירוק אזמרגד עשיר וטבעי. מסמל צמיחה אישית, התחדשות, חוסן נפשי ותקווה לשינוי.',
    colors: {
      primary: '#15803d',
      primaryHover: '#166534',
      primaryLight: '#dcfce7',
      primaryGlow: 'rgba(21, 128, 61, 0.22)',
      accent: '#059669',
      accentLight: '#d1fae5',
      sidebar: '#051a0e',
      sidebarGradient: '#0d3b22',
      sidebarHover: 'rgba(21, 128, 61, 0.16)',
      sidebarActiveBg: 'rgba(255, 255, 255, 0.11)',
      sidebarActiveColor: '#ffffff',
      sidebarActiveBorder: '#22c55e',
      brandGradient: '#166534',
      sidebarBorder: 'rgba(34, 197, 94, 0.15)',
      previewBadge: '#4ade80'
    }
  },
  {
    id: 'rose',
    name: 'שקיעה ורודה ורכות',
    englishName: 'Soft Rose & Empathy',
    emoji: '🌸',
    description: 'גווני פודרה ורוז עוטפים. מייצרים תחושת הכלה, אמפתיה חמימה, קבלה ופגיעות מוגנת.',
    colors: {
      primary: '#db2777',
      primaryHover: '#be185d',
      primaryLight: '#fce7f3',
      primaryGlow: 'rgba(219, 39, 119, 0.22)',
      accent: '#f43f5e',
      accentLight: '#ffe4e6',
      sidebar: '#240510',
      sidebarGradient: '#4b1028',
      sidebarHover: 'rgba(219, 39, 119, 0.16)',
      sidebarActiveBg: 'rgba(255, 255, 255, 0.11)',
      sidebarActiveColor: '#ffffff',
      sidebarActiveBorder: '#f43f5e',
      brandGradient: '#be185d',
      sidebarBorder: 'rgba(244, 63, 94, 0.15)',
      previewBadge: '#f472b6'
    }
  },
  {
    id: 'slate',
    name: 'גרפיט מודרני אלגנטי',
    englishName: 'Minimalist Slate',
    emoji: '🏛️',
    description: 'סגנון קליני מינימליסטי ומלוטש בגווני סלייט ופחם. משדר דיוק, סדר, מקצועיות וסמכות רפואית.',
    colors: {
      primary: '#475569',
      primaryHover: '#334155',
      primaryLight: '#f1f5f9',
      primaryGlow: 'rgba(71, 85, 105, 0.22)',
      accent: '#2563eb',
      accentLight: '#dbeafe',
      sidebar: '#0b0f19',
      sidebarGradient: '#18212f',
      sidebarHover: 'rgba(255, 255, 255, 0.08)',
      sidebarActiveBg: 'rgba(255, 255, 255, 0.11)',
      sidebarActiveColor: '#e2e8f0',
      sidebarActiveBorder: '#94a3b8',
      brandGradient: '#334155',
      sidebarBorder: 'rgba(255, 255, 255, 0.1)',
      previewBadge: '#94a3b8'
    }
  }
];

/**
 * Maps palette color keys to the CSS custom properties they drive.
 * Shared by applyTheme() and the pre-paint boot script in layout.tsx so the
 * two never drift apart. previewBadge has no CSS var (preview rendering only).
 */
export const THEME_CSS_VARS = {
  primary: '--primary',
  primaryHover: '--primary-hover',
  primaryLight: '--primary-light',
  primaryGlow: '--primary-glow',
  accent: '--accent-purple',
  accentLight: '--accent-purple-light',
  sidebar: '--bg-sidebar',
  sidebarGradient: '--bg-sidebar-gradient',
  sidebarHover: '--bg-sidebar-hover',
  sidebarActiveBg: '--bg-sidebar-active',
  sidebarActiveColor: '--sidebar-active-color',
  sidebarActiveBorder: '--sidebar-active-border',
  brandGradient: '--brand-gradient',
  sidebarBorder: '--sidebar-border',
} as const satisfies Record<Exclude<keyof ThemePalette['colors'], 'previewBadge'>, string>;

export function paletteToCssVars(palette: ThemePalette): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const key of Object.keys(THEME_CSS_VARS) as (keyof typeof THEME_CSS_VARS)[]) {
    vars[THEME_CSS_VARS[key]] = palette.colors[key];
  }
  return vars;
}

export function applyTheme(themeId: string): ThemePalette {
  if (typeof window === 'undefined') return THEME_PALETTES[0];
  const palette = THEME_PALETTES.find(p => p.id === themeId) || THEME_PALETTES[0];
  const root = document.documentElement;

  for (const [cssVar, value] of Object.entries(paletteToCssVars(palette))) {
    root.style.setProperty(cssVar, value);
  }

  // Keep the mobile browser chrome (address bar) in sync with the palette.
  // <meta name="theme-color"> cannot resolve var(), so it needs the raw value.
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', palette.colors.primary);

  localStorage.setItem('wisecare_theme', palette.id);
  return palette;
}

export function getStoredTheme(): ThemePalette {
  if (typeof window === 'undefined') return THEME_PALETTES[0];
  const stored = localStorage.getItem('wisecare_theme');
  return THEME_PALETTES.find(p => p.id === stored) || THEME_PALETTES[0];
}
