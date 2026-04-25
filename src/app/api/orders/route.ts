import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import pool from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get('limit') || '50');
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT o.*, GROUP_CONCAT(oi.item_name, " x", oi.quantity SEPARATOR ", ") AS items_summary FROM orders o LEFT JOIN order_items oi ON o.id = oi.order_id GROUP BY o.id ORDER BY o.created_at DESC LIMIT ?',
    [limit]
  );
  return NextResponse.json({ success: true, orders: rows });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  const body = await req.json();
  const { order } = body;
  if (!order?.items?.length) return NextResponse.json({ success: false, message: 'No items in order' }, { status: 400 });

  const user = session.user as { id: string; username: string; role: string; branch_id?: number };
  const userId = parseInt(user.id);
  const username = user.username;

  const discountMap: Record<string, number> = { regular: 0, pwd: 20, senior: 20 };
  const discountPercent = discountMap[order.customer_type || 'regular'] || 0;
  const subtotal = parseFloat(order.subtotal) || 0;
  const discount = Math.round(subtotal * (discountPercent / 100) * 100) / 100;
  const total = Math.max(0, subtotal - discount);
  const cashReceived = parseFloat(order.cash) || 0;
  const changeAmount = order.payment_method === 'cash' ? cashReceived - total : 0;
  const orderNumber = `ORD-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${Date.now()}`;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [result] = await conn.execute<ResultSetHeader>(
      'INSERT INTO orders (order_number,user_id,username,customer_name,table_name,subtotal,discount_amount,discount_percent,discount_type,discount_label,total,payment_method,payment_reference,cash_received,change_amount,completed_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,NOW())',
      [orderNumber, userId, username, order.customer_name || '', order.table || 'Walk-in',
       subtotal, discount, discountPercent, order.customer_type || 'regular',
       order.discount_label || 'Regular', total, order.payment_method || 'cash',
       order.payment_reference || '', cashReceived, changeAmount]
    );
    const orderId = result.insertId;
    for (const item of order.items) {
      await conn.execute(
        'INSERT INTO order_items (order_id, menu_item_id, item_name, emoji, quantity, unit_price, item_total) VALUES (?,?,?,?,?,?,?)',
        [orderId, item.id || null, item.name, item.emoji || '', item.qty, item.price, item.price * item.qty]
      );
      if (item.id) {
        await conn.execute('UPDATE menu_items SET stock = GREATEST(0, stock - ?) WHERE id = ?', [item.qty, item.id]);
      }
    }
    await conn.commit();
    return NextResponse.json({ success: true, order_id: orderId, order_number: orderNumber });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    return NextResponse.json({ success: false, message: 'Order failed' }, { status: 500 });
  } finally {
    conn.release();
  }
}
