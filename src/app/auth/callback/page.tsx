'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/lib/store/authStore';

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuthStore();
  const [error, setError] = useState('');
  const exchanged = useRef(false);

  useEffect(() => {
    if (exchanged.current) return;
    exchanged.current = true;

    const code = searchParams.get('code');
    const username = searchParams.get('username');
    const role = searchParams.get('role') as 'teacher' | 'student';
    const id = searchParams.get('id');

    if (!code || !username || !role) {
      setError('Google нэвтрэлт амжилтгүй болсон');
      setTimeout(() => router.push('/login'), 2000);
      return;
    }

    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
    fetch(`${apiBase}/auth/google/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    })
      .then((res) => {
        if (!res.ok) return res.text().then(t => { throw new Error(`${res.status}: ${t}`); });
        return res.json();
      })
      .then(({ access_token }) => {
        login(
          { id: id ?? '', username, role, full_name: null, email: null, created_at: new Date().toISOString() } as any,
          access_token
        );
        router.push(role === 'teacher' ? '/teacher/dashboard' : '/student/dashboard');
      })
      .catch(() => {
        setError('Google нэвтрэлт амжилтгүй болсон');
        setTimeout(() => router.push('/register'), 2000);
      });
  }, [searchParams]);

  if (error) {
    return (
      <div className="min-h-screen bg-stone-50 dark:bg-neutral-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400 font-semibold mb-2">{error}</p>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">Нэвтрэх хуудас руу буцаж байна...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-neutral-950 flex items-center justify-center">
      <div className="text-center">
        <div className="spinner w-10 h-10 mx-auto mb-4" />
        <p className="text-neutral-600 dark:text-neutral-400">Google-ээр нэвтэрч байна...</p>
      </div>
    </div>
  );
}
