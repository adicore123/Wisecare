import SpaceLanding from '@/components/SpaceLanding';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'מרחב אישי להתפתחות ולשיפור מצב הרוח | WiseCare',
  description: 'מרחב אישי דיגיטלי: נשימות מונחות, השירים שלך עם נגן רקע, יומן מצב-רוח ומשימות אישיות — נפתח בדקה, פרטי ושלך.',
  openGraph: {
    title: 'המרחב האישי שלך — WiseCare',
    description: 'נשימות מונחות, שירים שעושים טוב, יומן ומשימות — הכול במקום אחד פרטי.',
    type: 'website'
  }
};

export default function SpacePage() {
  return <SpaceLanding />;
}
