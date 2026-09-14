import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'שיתוף תוכן | WiseCare',
  description: 'שיתוף סרטונים ותכנים מהרשת לספריית התוכן ולמרחב האישי ב-WiseCare',
};

export default function ShareLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
