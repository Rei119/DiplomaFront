import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';

export async function GET() {
  const session = await getServerSession() as any;
  if (session?.backendToken && session?.backendUser) {
    // Pass token to frontend via URL param (frontend will pick it up)
    const role = session.backendUser?.role || 'student';
    redirect(`/auth/google-success?token=${session.backendToken}&role=${role}&username=${session.backendUser?.username}`);
  }
  redirect('/login?error=google_failed');
}