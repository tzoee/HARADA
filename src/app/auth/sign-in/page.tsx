import { SignInForm } from '@/components/auth/sign-in-form';
import Link from 'next/link';

export default function SignInPage() {
  return (
    <div className="glass-card rounded-lg p-8">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold mb-2">Welcome back</h1>
        <p className="text-muted-foreground">
          Enter your credentials to access your planning workspace
        </p>
      </div>
      
      <SignInForm />
      
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{' '}
        <Link href="/auth/sign-up" className="text-primary hover:underline">
          Sign up
        </Link>
      </p>
    </div>
  );
}
