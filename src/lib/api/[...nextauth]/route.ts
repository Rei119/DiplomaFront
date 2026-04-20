import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      // Auto-register with your FastAPI backend using Google email as username
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
        const username = user.email!.split('@')[0]; // e.g. "orgil" from "orgil@gmail.com"
        const password = `google_${user.email}`; // deterministic password

        // Try login first
        let res = await fetch(`${baseUrl}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password }),
        });

        // If login fails, register then login
        if (!res.ok) {
          await fetch(`${baseUrl}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, role: 'student' }),
          });
          res = await fetch(`${baseUrl}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
          });
        }

        const data = await res.json();
        // Store token in user object to pass to session
        (user as any).backendToken = data.access_token;
        (user as any).backendUser = data.user;
      } catch {
        return false;
      }
      return true;
    },

    async jwt({ token, user }) {
      if (user) {
        token.backendToken = (user as any).backendToken;
        token.backendUser = (user as any).backendUser;
      }
      return token;
    },

    async session({ session, token }) {
      (session as any).backendToken = token.backendToken;
      (session as any).backendUser = token.backendUser;
      return session;
    },
  },
});

export { handler as GET, handler as POST };
