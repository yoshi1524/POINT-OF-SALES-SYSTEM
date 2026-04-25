import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import pool from '@/lib/db';
import { RowDataPacket } from 'mysql2';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;
        try {
          const [rows] = await pool.execute<RowDataPacket[]>(
            'SELECT id, username, password, role, status, branch_id FROM users WHERE username = ? LIMIT 1',
            [credentials.username]
          );
          const user = rows[0];
          if (!user) return null;
          if (user.status !== 'active') throw new Error('Account is archived and cannot log in.');
          const valid = await bcrypt.compare(credentials.password, user.password);
          if (!valid) return null;
          return {
            id: String(user.id),
            name: user.username,
            email: user.role,
            image: String(user.branch_id ?? ''),
          };
        } catch (err: unknown) {
          if (err instanceof Error) throw err;
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id        = user.id;
        token.username  = user.name;
        token.role      = user.email;
        token.branch_id = user.image ? (parseInt(user.image) || null) : null;
      }
      return token;
    },
    async session({ session, token }) {
      (session.user as Record<string, unknown>) = {
        id:        token.id,
        username:  token.username,
        role:      token.role,
        branch_id: token.branch_id,
      };
      return session;
    },
  },
  pages: { signIn: '/login', error: '/login' },
  session: { strategy: 'jwt' },
  secret: process.env.NEXTAUTH_SECRET || 'countryside-pos-secret',
};
