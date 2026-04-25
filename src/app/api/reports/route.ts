import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import pool from '@/lib/db';
import { RowDataPacket } from 'mysql2';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { role: string; id: string; branch_id?: number } | undefined;
  if (!user) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const dateFrom = searchParams.get('from') || new Date().toISOString().slice(0,8)+'01';
  const dateTo   = searchParams.get('to')   || new Date().toISOString().slice(0,10);
  const isAdmin  = user.role === 'admin';
  const branchId = user.branch_id ?? null;

  // Summary
  const summaryWhere = isAdmin ? '' : `AND (o.branch_id = ${branchId} OR o.branch_id IS NULL)`;
  const [summaryRows] = await pool.execute<RowDataPacket[]>(`
    SELECT COUNT(*) AS total_orders, COALESCE(SUM(o.total),0) AS total_revenue,
           COALESCE(SUM(o.discount_amount),0) AS total_discounts,
           COALESCE(AVG(o.total),0) AS avg_order_value,
           COALESCE(SUM(CASE WHEN o.payment_method='cash' THEN o.total ELSE 0 END),0) AS cash_sales,
           COALESCE(SUM(CASE WHEN o.payment_method='e_wallet' THEN o.total ELSE 0 END),0) AS ewallet_sales,
           COALESCE(SUM(CASE WHEN o.payment_method IN ('online','card') THEN o.total ELSE 0 END),0) AS online_sales
    FROM orders o WHERE o.status='completed' AND DATE(o.created_at) BETWEEN ? AND ? ${summaryWhere}`,
    [dateFrom, dateTo]
  );

  // Per-branch breakdown (admin only)
  let branches: RowDataPacket[] = [];
  if (isAdmin) {
    const [br] = await pool.execute<RowDataPacket[]>(`
      SELECT COALESCE(b.branch_name, 'Main Branch') AS branch_name,
             COUNT(*) AS total_orders, COALESCE(SUM(o.total),0) AS total_revenue,
             COALESCE(SUM(o.discount_amount),0) AS total_discounts,
             COALESCE(AVG(o.total),0) AS avg_order_value,
             COALESCE(SUM(CASE WHEN o.payment_method='cash' THEN o.total ELSE 0 END),0) AS cash_sales,
             COALESCE(SUM(CASE WHEN o.payment_method='e_wallet' THEN o.total ELSE 0 END),0) AS ewallet_sales,
             COALESCE(SUM(CASE WHEN o.payment_method IN ('online','card') THEN o.total ELSE 0 END),0) AS online_sales
      FROM orders o LEFT JOIN branches b ON o.branch_id = b.id
      WHERE o.status='completed' AND DATE(o.created_at) BETWEEN ? AND ?
      GROUP BY o.branch_id ORDER BY total_revenue DESC`, [dateFrom, dateTo]);
    branches = br;
  }

  // Daily sales
  const dailyWhere = isAdmin ? '' : `AND (o.branch_id = ${branchId} OR o.branch_id IS NULL)`;
  const [dailyRows] = await pool.execute<RowDataPacket[]>(`
    SELECT DATE(o.created_at) AS sale_date, COALESCE(b.branch_name,'Main') AS branch_name,
           COUNT(*) AS orders, SUM(o.total) AS revenue
    FROM orders o LEFT JOIN branches b ON o.branch_id=b.id
    WHERE o.status='completed' AND DATE(o.created_at) BETWEEN ? AND ? ${dailyWhere}
    GROUP BY DATE(o.created_at), o.branch_id ORDER BY sale_date DESC`, [dateFrom, dateTo]);

  // Top items
  const topWhere = isAdmin ? '' : `AND (o.branch_id = ${branchId} OR o.branch_id IS NULL)`;
  const [topItems] = await pool.execute<RowDataPacket[]>(`
    SELECT oi.item_name, oi.emoji, SUM(oi.quantity) AS qty_sold, SUM(oi.item_total) AS revenue
    FROM order_items oi JOIN orders o ON oi.order_id=o.id
    WHERE o.status='completed' AND DATE(o.created_at) BETWEEN ? AND ? ${topWhere}
    GROUP BY oi.item_name, oi.emoji ORDER BY qty_sold DESC LIMIT 8`, [dateFrom, dateTo]);

  // Recent transactions
  const recentWhere = isAdmin ? '' : `AND (o.branch_id = ${branchId} OR o.branch_id IS NULL)`;
  const [recent] = await pool.execute<RowDataPacket[]>(`
    SELECT o.id, o.order_number, o.table_name, o.username, o.total, o.discount_amount, o.payment_method,
           o.customer_name, o.created_at, COALESCE(b.branch_name,'Main') AS branch_name
    FROM orders o LEFT JOIN branches b ON o.branch_id=b.id
    WHERE o.status='completed' AND DATE(o.created_at) BETWEEN ? AND ? ${recentWhere}
    ORDER BY o.created_at DESC LIMIT 20`, [dateFrom, dateTo]);

  return NextResponse.json({
    success: true,
    summary: summaryRows[0],
    branches,
    daily: dailyRows,
    top_items: topItems,
    recent,
  });
}
