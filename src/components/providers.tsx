'use client';

import { ReactNode, useEffect } from 'react';
import { useUIStore } from '@/store/ui-store';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  const { theme } = useUIStore();

  useEffect(() => {
    // Apply theme class to document
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
  }, [theme]);

  return <>{children}</>;
}
