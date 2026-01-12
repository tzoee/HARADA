import { SignUpForm } from '@/components/auth/sign-up-form';
import Link from 'next/link';

export default function SignUpPage() {
  return (
    <div className="glass-card rounded-lg p-8">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold mb-2">Create your account</h1>
        <p className="text-muted-foreground">
          Start organizing your goals with the Harada method
        </p>
      </div>
      
      <SignUpForm />
      
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link href="/auth/sign-in" className="text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
