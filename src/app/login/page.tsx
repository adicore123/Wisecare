import TherapistLoginForm from '@/components/TherapistLoginForm';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'כניסה למערכת | WiseCare CRM',
  description: 'מרחב כניסה מורשה למטפלים ולמנהלי מערכת WiseCare',
};

export default function LoginPage() {
  return <TherapistLoginForm />;
}
