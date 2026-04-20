'use client';
import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/lib/store/authStore';

export default function GoogleSuccess() {
  const router = useRouter();
  const params = useSearchParams();
  const { login } = useAuthStore();

  useEffect(() => {
    const token = params.get('token');
    const role = params.get('role');
    const username = params.get('username');
    if (token && role && username) {
      login({ username, role } as any, token);
      router.push(role === 'teacher' ? '/teacher/dashboard' : '/student/dashboard');
    } else {
      router.push('/login');
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 dark:bg-neutral-950">
      <div className="text-center">
        <div className="spinner w-10 h-10 mx-auto mb-3" />
        <p className="text-neutral-600 dark:text-neutral-400">Google нэвтрэлт хийгдэж байна...</p>
      </div>
    </div>
  );
}