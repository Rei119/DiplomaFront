'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/lib/store/authStore';

export function HydrateAuth() {
  const hydrate = useAuthStore((s) => s.hydrate);
  useEffect(() => { hydrate(); }, [hydrate]);
  return null;
}