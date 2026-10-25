import { Redirect } from 'expo-router';
import { useAuth } from '@/lib/auth';

export default function Index() {
  const { status, user } = useAuth();
  if (status !== 'signedIn') return <Redirect href="/welcome" />;
  return <Redirect href={user?.onboarded ? '/home' : '/onboarding'} />;
}
