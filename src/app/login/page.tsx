import TherapistLoginForm from '@/components/TherapistLoginForm';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'התחברות למערכת | WiseCare',
  description: 'כניסה מאוחדת למטפלים, מטופלים ובעלי מרחב אישי במערכת WiseCare',
};

export default function LoginPage() {
  return <TherapistLoginForm />;
}
