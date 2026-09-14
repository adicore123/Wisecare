import CRMWorkspaceLayout from '@/components/CRMWorkspaceLayout';

export default function CRMLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <CRMWorkspaceLayout>{children}</CRMWorkspaceLayout>;
}
