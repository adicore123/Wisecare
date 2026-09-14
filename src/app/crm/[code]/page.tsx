import { redirect } from 'next/navigation';

interface CRMPageProps {
  params: Promise<{ code: string }>;
}

export default async function CRMIndexPage(props: CRMPageProps) {
  const { code } = await props.params;
  redirect(`/crm/${code}/clients`);
}
