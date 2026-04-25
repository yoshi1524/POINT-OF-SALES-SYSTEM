import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import pool from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  const [rows] = await pool.execute<RowDataPacket[]>('SELECT * FROM ingredients ORDER BY name ASC');
  return NextResponse.json({ success: true, ingredients: rows });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  const body = await req.json();
  const { action } = body;

  if (action === 'add') {
    const { name, unit, stock, min_stock, unit_price } = body.ingredient;
    if (!name) return NextResponse.json({ success: false, message: 'Name required' }, { status: 400 });
    const [r] = await pool.execute<ResultSetHeader>(
      'INSERT INTO ingredients (name, unit, stock, min_stock, unit_price, status) VALUES (?,?,?,?,?,"available")',
      [name, unit || 'kg', stock || 0, min_stock || 5, unit_price || 0]
    );
    return NextResponse.json({ success: true, ingredient_id: r.insertId });
  }

  if (action === 'restock') {
    const { ingredient_id, stock } = body;
    const [rows] = await pool.execute<RowDataPacket[]>('SELECT stock FROM ingredients WHERE id=?', [ingredient_id]);
    if (!rows[0]) return NextResponse.json({ success: false, message: 'Not found' }, { status: 404 });
    await pool.execute('UPDATE ingredients SET stock=? WHERE id=?', [stock, ingredient_id]);
    return NextResponse.json({ success: true, new_stock: stock });
  }

  return NextResponse.json({ success: false, message: 'Invalid action' }, { status: 400 });
}
