'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useUIStore } from '@/store/ui-store';

export type AppError = 
  | { type: 'network'; message: string; retryable: true }
  | { type: 'validation'; message: string; field?: string }
  | { type: 'auth'; message: string; redirect?: string }
  | { type: 'not_found'; message: string }
  | { type: 'server'; message: string };

const errorMessages = {
  en: {
    network_error: 'Network error. Please check your connection.',
    auth_error: 'Authentication error. Please sign in again.',
    not_found: 'The requested resource was not found.',
    server_error: 'Something went wrong. Please try again.',
    retry: 'Retry',
  },
  id: {
    network_error: 'Kesalahan jaringan. Periksa koneksi Anda.',
    auth_error: 'Kesalahan autentikasi. Silakan masuk kembali.',
    not_found: 'Sumber daya yang diminta tidak ditemukan.',
    server_error: 'Terjadi kesalahan. Silakan coba lagi.',
    retry: 'Coba Lagi',
  },
};

export function useErrorHandler() {
  const router = useRouter();
  const { language } = useUIStore();
  const t = errorMessages[language] || errorMessages.en;

  const handleError = useCallback((error: AppError) => {
    switch (error.type) {
      case 'network':
        // Show toast with retry option
        console.error('Network error:', error.message);
        alert(t.network_error);
        break;
        
      case 'validation':
        // Show validation error
        console.error('Validation error:', error.message);
        alert(error.message);
        break;
        
      case 'auth':
        // Redirect to sign-in
        console.error('Auth error:', error.message);
        if (error.redirect) {
          router.push(error.redirect);
        } else {
          router.push('/auth/sign-in');
        }
        break;
        
      case 'not_found':
        console.error('Not found:', error.message);
        alert(t.not_found);
        break;
        
      case 'server':
        console.error('Server error:', error.message);
        alert(t.server_error);
        break;
    }
  }, [language, router, t]);

  return { handleError };
}

/**
 * Parse error from server action response
 */
export function parseServerError(error: string | null): AppError | null {
  if (!error) return null;

  if (error === 'Unauthorized') {
    return { type: 'auth', message: error, redirect: '/auth/sign-in' };
  }

  if (error.includes('not found') || error.includes('PGRST116')) {
    return { type: 'not_found', message: error };
  }

  if (error.includes('network') || error.includes('fetch')) {
    return { type: 'network', message: error, retryable: true };
  }

  return { type: 'server', message: error };
}
