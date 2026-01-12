'use server';

import { createClient } from '@/lib/supabase/server';
import { signUpSchema, signInSchema } from '@/lib/validations/auth';
import { redirect } from 'next/navigation';

export type AuthActionResult = {
  error?: string;
  success?: boolean;
};

export async function signUp(formData: FormData): Promise<AuthActionResult> {
  const rawData = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  };

  const validationResult = signUpSchema.safeParse(rawData);
  if (!validationResult.success) {
    return { error: validationResult.error.errors[0].message };
  }

  const { email, password } = validationResult.data;
  const supabase = await createClient();

  const { error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  redirect('/app');
}

export async function signIn(formData: FormData): Promise<AuthActionResult> {
  const rawData = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  };

  const validationResult = signInSchema.safeParse(rawData);
  if (!validationResult.success) {
    return { error: validationResult.error.errors[0].message };
  }

  const { email, password } = validationResult.data;
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    // Don't reveal which field is incorrect
    return { error: 'Invalid email or password' };
  }

  redirect('/app');
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/auth/sign-in');
}
