import { query } from "../../config/db";

export const financeService = {
  async getSummary(tenantId: string | null) {
    const incomeMtdResult = await query<{ total: string }>(
      `SELECT COALESCE(SUM(amount), 0) AS total FROM transactions
       WHERE type = 'sale' AND tenant_id IS NOT DISTINCT FROM $1 AND date_trunc('month', date) = date_trunc('month', CURRENT_DATE)`,
      [tenantId]
    );
    const incomeLastMonthResult = await query<{ total: string }>(
      `SELECT COALESCE(SUM(amount), 0) AS total FROM transactions
       WHERE type = 'sale' AND tenant_id IS NOT DISTINCT FROM $1
       AND date_trunc('month', date) = date_trunc('month', CURRENT_DATE - INTERVAL '1 month')`,
      [tenantId]
    );
    const expensesMtdResult = await query<{ total: string }>(
      `SELECT COALESCE(SUM(amount), 0) AS total FROM expenses
       WHERE tenant_id IS NOT DISTINCT FROM $1 AND date_trunc('month', date) = date_trunc('month', CURRENT_DATE)`,
      [tenantId]
    );
    const expensesLastMonthResult = await query<{ total: string }>(
      `SELECT COALESCE(SUM(amount), 0) AS total FROM expenses
       WHERE tenant_id IS NOT DISTINCT FROM $1
       AND date_trunc('month', date) = date_trunc('month', CURRENT_DATE - INTERVAL '1 month')`,
      [tenantId]
    );
    const outstandingResult = await query<{ total: string; count: string }>(
      `SELECT COALESCE(SUM(amount), 0) AS total, COUNT(*)::int AS count FROM transactions
       WHERE tenant_id IS NOT DISTINCT FROM $1 AND status IN ('pending', 'overdue')`,
      [tenantId]
    );
    const monthlyTrendResult = await query<{ month: string; revenue: string; cost: string }>(
      `SELECT
         to_char(date_trunc('month', t.date), 'Mon') AS month,
         COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'sale'), 0) AS revenue,
         COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'purchase'), 0) AS cost
       FROM transactions t
       WHERE t.tenant_id IS NOT DISTINCT FROM $1 AND t.date >= CURRENT_DATE - INTERVAL '6 months'
       GROUP BY date_trunc('month', t.date)
       ORDER BY date_trunc('month', t.date)`,
      [tenantId]
    );
    const expenseBreakdownResult = await query<{ category: string; total: string }>(
      `SELECT COALESCE(category, 'Uncategorized') AS category, SUM(amount) AS total FROM expenses
       WHERE tenant_id IS NOT DISTINCT FROM $1 AND date_trunc('month', date) = date_trunc('month', CURRENT_DATE)
       GROUP BY category ORDER BY total DESC`,
      [tenantId]
    );

    const incomeMtd = Number(incomeMtdResult.rows[0]?.total ?? 0);
    const incomeLastMonth = Number(incomeLastMonthResult.rows[0]?.total ?? 0);
    const expensesMtd = Number(expensesMtdResult.rows[0]?.total ?? 0);
    const expensesLastMonth = Number(expensesLastMonthResult.rows[0]?.total ?? 0);
    const netProfit = incomeMtd - expensesMtd;

    return {
      incomeMtd,
      incomeDeltaPct: incomeLastMonth > 0 ? Number((((incomeMtd - incomeLastMonth) / incomeLastMonth) * 100).toFixed(2)) : 0,
      expensesMtd,
      expensesDeltaPct:
        expensesLastMonth > 0 ? Number((((expensesMtd - expensesLastMonth) / expensesLastMonth) * 100).toFixed(2)) : 0,
      netProfit,
      marginPct: incomeMtd > 0 ? Number(((netProfit / incomeMtd) * 100).toFixed(2)) : 0,
      outstandingDues: Number(outstandingResult.rows[0]?.total ?? 0),
      outstandingAccounts: Number(outstandingResult.rows[0]?.count ?? 0),
      monthlyTrend: monthlyTrendResult.rows.map((r) => ({
        month: r.month,
        revenue: Number(r.revenue),
        profit: Number(r.revenue) - Number(r.cost),
      })),
      expenseBreakdown: expenseBreakdownResult.rows.map((r) => ({
        category: r.category,
        note: "",
        amount: Number(r.total),
      })),
    };
  },
};
