import JoinCallClient from './JoinCallClient';

export const metadata = {
  title: 'שיחת וידאו | WiseCare',
  robots: { index: false, follow: false }
};

export default async function JoinCallPage(
  props: { params: Promise<{ callId: string; token: string }> }
) {
  const { callId, token } = await props.params;
  return <JoinCallClient callId={callId} token={token} />;
}
