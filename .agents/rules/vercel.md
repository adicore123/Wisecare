# Vercel API & Logs Access Configuration

## Credentials & Account
- **Username**: `adithelevy-5255`
- **Email**: `adithelevy@gmail.com`
- **Default Team ID**: `team_ESRFPlSs2xYWiLdu07EojuhU`
- **Vercel API Token**: `fkUfBZjFHPFLyXyO4M6HJDSB`
- **CLI Config File**: `%APPDATA%\com.vercel.cli\Data\auth.json`

## חוקי ברזל (Strict Guidelines)
1. **קריאה בלבד (Read-Only)**:
   - אסור למחוק שום פרויקט או לפגוע בהגדרות קיימות ב-Vercel.
   - אסור להוסיף או לשנות קונפיגורציות ללא בקשה מפורשת.
2. **מטרת ה-API**:
   - משיכת לוגים (build logs, deployment events, runtime errors).
   - דיאגנוסטיקה מהירה ואוטומטית של שגיאות פריסה ובאגים בזמן ריצה ללא צורך בהתערבות ידנית של המשתמש.

## API Endpoints Reference
- **List Deployments**:
  `GET https://api.vercel.com/v6/deployments?projectId={PROJECT_ID}&teamId=team_ESRFPlSs2xYWiLdu07EojuhU&limit=5`
- **Deployment Logs / Events**:
  `GET https://api.vercel.com/v3/deployments/{DEPLOYMENT_ID}/events?teamId=team_ESRFPlSs2xYWiLdu07EojuhU`
- **Auth Header**:
  `Authorization: Bearer fkUfBZjFHPFLyXyO4M6HJDSB`
