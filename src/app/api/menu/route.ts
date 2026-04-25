import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import pool from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

function requireSession(session: ReturnType<typeof getServerSession> extends Promise<infer T> ? T : never) {
  if (!session) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  return null;
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      "SELECT * FROM menu_items WHERE status != 'archived' ORDER BY category, name"
    );
    const items = rows.map((r) => ({
      ...r,
      id: Number(r.id),
      price: parseFloat(r.price),
      stock: Number(r.stock),
    }));
    return NextResponse.json({ success: true, items });
  } catch {
    return NextResponse.json({ success: false, message: 'Failed to load menu items' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { action, item, item_id, quantity } = body;

  if (action === 'add') {
    if (!item?.name || !item?.price)
      return NextResponse.json({ success: false, message: 'Name and price required' }, { status: 400 });
    try {
      const [result] = await pool.execute<ResultSetHeader>(
        'INSERT INTO menu_items (emoji, name, category, price, stock, status) VALUES (?, ?, ?, ?, ?, ?)',
        [item.emoji || '🍽', item.name, item.category || 'Extras', item.price, item.stock || 0, item.status || 'available']
      );
      return NextResponse.json({ success: true, item_id: result.insertId });
    } catch {
      return NextResponse.json({ success: false, message: 'Failed to add item' }, { status: 500 });
    }
  }

  if (action === 'update') {
    if (!item?.id) return NextResponse.json({ success: false, message: 'Item ID required' }, { status: 400 });
    try {
      await pool.execute(
        'UPDATE menu_items SET emoji=?, name=?, category=?, price=?, stock=?, status=? WHERE id=?',
        [item.emoji || '🍽', item.name, item.category, item.price, item.stock, item.status, item.id]
      );
      return NextResponse.json({ success: true });
    } catch {
      return NextResponse.json({ success: false, message: 'Failed to update item' }, { status: 500 });
    }
  }

  if (action === 'archive') {
    if (!item_id) return NextResponse.json({ success: false, message: 'Item ID required' }, { status: 400 });
    try {
      await pool.execute("UPDATE menu_items SET status='archived' WHERE id=?", [item_id]);
      return NextResponse.json({ success: true });
    } catch {
      return NextResponse.json({ success: false, message: 'Failed to archive item' }, { status: 500 });
    }
  }

  if (action === 'restock') {
    if (!item_id || !quantity)
      return NextResponse.json({ success: false, message: 'Item ID and quantity required' }, { status: 400 });
    try {
      await pool.execute('UPDATE menu_items SET stock = stock + ? WHERE id = ?', [quantity, item_id]);
      const [rows] = await pool.execute<RowDataPacket[]>('SELECT stock FROM menu_items WHERE id = ?', [item_id]);
      return NextResponse.json({ success: true, new_stock: Number(rows[0]?.stock ?? 0) });
    } catch {
      return NextResponse.json({ success: false, message: 'Restock failed' }, { status: 500 });
    }
  }

  if (action === 'deduct_stock') {
    const items: { id: number; qty: number }[] = body.items || [];
    try {
      for (const i of items) {
        if (i.id > 0 && i.qty > 0)
          await pool.execute('UPDATE menu_items SET stock = GREATEST(0, stock - ?) WHERE id = ?', [i.qty, i.id]);
      }
      return NextResponse.json({ success: true });
    } catch {
      return NextResponse.json({ success: false, message: 'Stock deduction failed' }, { status: 500 });
    }
  }

  return NextResponse.json({ success: false, message: 'Invalid action' }, { status: 400 });
}
