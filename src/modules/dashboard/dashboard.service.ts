import { query } from "../../config/db";

/**
 * Everything here is computed live from real tables (transactions,
 * inventory, farmers) rather than stored as a static summary blob — so the
 * dashboard can never show stale numbers.
 */
export const dashboardService = {
  async getSummary(tenantId: string | null) {
    const todayRevenueResult = await query<{ total: string }>(
      `SELECT COALESCE(SUM(amount), 0) AS total FROM transactions
       WHERE type = 'sale' AND tenant_id IS NOT DISTINCT FROM $1 AND date::date = CURRENT_DATE`,
      [tenantId]
    );
    const yesterdayRevenueResult = await query<{ total: string }>(
      `SELECT COALESCE(SUM(amount), 0) AS total FROM transactions
       WHERE type = 'sale' AND tenant_id IS NOT DISTINCT FROM $1 AND date::date = CURRENT_DATE - INTERVAL '1 day'`,
      [tenantId]
    );
    const activeOrdersResult = await query<{ count: string }>(
      `SELECT COUNT(*)::int AS count FROM transactions
       WHERE tenant_id IS NOT DISTINCT FROM $1 AND status = 'pending'`,
      [tenantId]
    );
    const newOrdersSinceNoonResult = await query<{ count: string }>(
      `SELECT COUNT(*)::int AS count FROM transactions
       WHERE tenant_id IS NOT DISTINCT FROM $1 AND date::date = CURRENT_DATE AND date::time >= '12:00'`,
      [tenantId]
    );
    const lowStockResult = await query<{ count: string }>(
      `SELECT COUNT(*)::int AS count FROM inventory
       WHERE tenant_id IS NOT DISTINCT FROM $1 AND stock_status IN ('low', 'out')`,
      [tenantId]
    );
    const activeFarmersResult = await query<{ count: string }>(
      `SELECT COUNT(*)::int AS count FROM farmers WHERE tenant_id IS NOT DISTINCT FROM $1`,
      [tenantId]
    );
    const newFarmersThisWeekResult = await query<{ count: string }>(
      `SELECT COUNT(*)::int AS count FROM farmers
       WHERE tenant_id IS NOT DISTINCT FROM $1 AND created_at >= CURRENT_DATE - INTERVAL '7 days'`,
      [tenantId]
    );
    const revenueSeriesResult = await query<{ day: string; total: string }>(
      `SELECT date::date AS day, COALESCE(SUM(amount), 0) AS total FROM transactions
       WHERE type = 'sale' AND tenant_id IS NOT DISTINCT FROM $1 AND date >= CURRENT_DATE - INTERVAL '6 days'
       GROUP BY day ORDER BY day`,
      [tenantId]
    );
    const purchaseSeriesResult = await query<{ day: string; total: string }>(
      `SELECT date::date AS day, COALESCE(SUM(amount), 0) AS total FROM transactions
       WHERE type = 'purchase' AND tenant_id IS NOT DISTINCT FROM $1 AND date >= CURRENT_DATE - INTERVAL '6 days'
       GROUP BY day ORDER BY day`,
      [tenantId]
    );

    const todayRevenue = Number(todayRevenueResult.rows[0]?.total ?? 0);
    const yesterdayRevenue = Number(yesterdayRevenueResult.rows[0]?.total ?? 0);
    const revenueDeltaPct = yesterdayRevenue > 0 ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100 : 0;

    const revenueSeries = revenueSeriesResult.rows.map((r) => Number(r.total));
    const purchaseSeries = purchaseSeriesResult.rows.map((r) => Number(r.total));

    return {
      todayRevenue,
      revenueDeltaPct: Number(revenueDeltaPct.toFixed(2)),
      activeOrders: Number(activeOrdersResult.rows[0]?.count ?? 0),
      newOrdersSinceNoon: Number(newOrdersSinceNoonResult.rows[0]?.count ?? 0),
      lowStockCount: Number(lowStockResult.rows[0]?.count ?? 0),
      activeFarmers: Number(activeFarmersResult.rows[0]?.count ?? 0),
      newFarmersThisWeek: Number(newFarmersThisWeekResult.rows[0]?.count ?? 0),
      revenueSeries,
      purchaseSeries,
      revenuePeriodTotal: revenueSeries.reduce((a, b) => a + b, 0).toFixed(2),
      purchasePeriodTotal: purchaseSeries.reduce((a, b) => a + b, 0).toFixed(2),
    };
  },
};
