import TherapistLoginForm from '@/components/TherapistLoginForm';
import type { Metadata } from 'next';

interface LoginPageProps {
  params: Promise<{ loginCode: string }>;
}

export async function generateMetadata(props: LoginPageProps): Promise<Metadata> {
  const { loginCode } = await props.params;
  return {
    title: `כניסה אישית למרחב הטיפולי (${loginCode}) | WiseCare`,
    description: 'מרחב כניסה אישי ומאובטח למטפל/ת במערכת WiseCare',
  };
}

export default async function TherapistSpecificLoginPage(props: LoginPageProps) {
  const { loginCode } = await props.params;
  return <TherapistLoginForm loginCode={loginCode} />;
}
