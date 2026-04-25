import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import pool from '@/lib/db';
import bcrypt from 'bcryptjs';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export async function GET() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { role: string } | undefined;
  if (!user || !['admin','manager'].includes(user.role))
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  const [rows] = await pool.execute<RowDataPacket[]>(
    "SELECT id, username, role, status, created_at FROM users WHERE status != 'archived' ORDER BY created_at DESC"
  );
  return NextResponse.json({ success: true, users: rows });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { role: string } | undefined;
  if (!user || !['admin','manager'].includes(user.role))
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { action } = body;

  if (action === 'create') {
    const { username, password, role } = body;
    if (!username || !password || !role)
      return NextResponse.json({ success: false, message: 'All fields required' }, { status: 400 });
    const hash = await bcrypt.hash(password, 10);
    try {
      const [r] = await pool.execute<ResultSetHeader>(
        "INSERT INTO users (username, password, role, status) VALUES (?, ?, ?, 'active')",
        [username, hash, role]
      );
      return NextResponse.json({ success: true, user_id: r.insertId });
    } catch {
      return NextResponse.json({ success: false, message: 'Username already taken' }, { status: 409 });
    }
  }

  if (action === 'archive') {
    const { user_id } = body;
    await pool.execute("UPDATE users SET status='archived' WHERE id=?", [user_id]);
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ success: false, message: 'Invalid action' }, { status: 400 });
}
