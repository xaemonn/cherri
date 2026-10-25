import { AuthScreen } from '@/components/auth/auth-screen';

export const metadata = { title: 'Log in · Cherri' };

export default function LoginPage() {
  return <AuthScreen mode="login" />;
}
