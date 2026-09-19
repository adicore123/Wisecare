# חניית מודול הזום (Zoom module parking)

הקבצים כאן הם גיבוי זמני של מודול פגישות הזום שהוחלף במודול LiveKit ("פגישות וידאו").

- המודול הוסר מהניווט, מהמסכים ומכל מסלולי ה-API של המערכת הרצה — אין לו שום השפעה.
- הקבצים אינם נבדקים ע"י TypeScript (נוספו ל-`exclude` ב-tsconfig.json).
- מקורות הקבצים (לצורך שחזור): `src/components/ZoomManager.tsx`, `src/services/zoom.ts`,
  `src/app/crm/[code]/zoom/page.tsx`, `src/app/join-meeting/[appointmentId]/page.tsx`, `src/app/api/zoom/*`.

**מחיקה סופית:** אחרי שבוע יציבות של LiveKit — למחוק את התיקייה הזו ולנקות את שדות ה-Zoom
מה-settings הגלובלי וממסמכי המשתמשים במסד (`zoomAccountId`, `zoomClientId`, `zoomClientSecret`,
`zoomOAuthClientId`, `zoomOAuthClientSecret`, `zoomSdkKey`, `zoomSdkSecret`, `zoomAccessToken`,
`zoomRefreshToken`, `zoomTokenExpiresAt`, `zoomUserEmail`, `zoomUserId`) בקומיט אחד.
