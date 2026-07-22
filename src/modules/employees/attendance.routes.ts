import { Router } from "express";
import { z } from "zod";
import { query } from "../../config/db";
import { authenticate } from "../../common/middlewares/authenticate";
import { validateRequest } from "../../common/middlewares/validateRequest";
import { asyncHandler } from "../../common/utils/asyncHandler";
import { sendSuccess } from "../../common/utils/ApiResponse";
import { rowsToCamel, snakeToCamel } from "../../common/utils/caseMapper";

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: string;
  checkIn: string | null;
  status: "present" | "late" | "absent";
}

const createSchema = z.object({
  date: z.string().date().optional(),
  checkIn: z.string().trim().max(20).optional(),
  status: z.enum(["present", "late", "absent"]).default("present"),
});
const employeeIdParamSchema = z.object({ employeeId: z.string().uuid("Invalid employee id") });

// mergeParams: true lets this router read :employeeId from the parent
// employeesRouter it's mounted under (see employees.routes.ts).
export const attendanceRouter = Router({ mergeParams: true });
attendanceRouter.use(authenticate);

attendanceRouter.get(
  "/",
  validateRequest({ params: employeeIdParamSchema }),
  asyncHandler(async (req, res) => {
    const { employeeId } = req.params;
    const tenantId = req.user?.tenantId ?? null;
    const result = await query(
      `SELECT a.* FROM attendance a
       JOIN employees e ON e.id = a.employee_id
       WHERE a.employee_id = $1 AND e.tenant_id IS NOT DISTINCT FROM $2
       ORDER BY a.date DESC`,
      [employeeId, tenantId]
    );
    sendSuccess(res, { items: rowsToCamel<AttendanceRecord>(result.rows as Record<string, unknown>[]) }, "Attendance fetched");
  })
);

attendanceRouter.post(
  "/",
  validateRequest({ params: employeeIdParamSchema, body: createSchema }),
  asyncHandler(async (req, res) => {
    const { employeeId } = req.params;
    const { date, checkIn, status } = req.body;
    const result = await query(
      `INSERT INTO attendance (employee_id, date, check_in, status)
       VALUES ($1, COALESCE($2, CURRENT_DATE), $3, $4)
       RETURNING *`,
      [employeeId, date ?? null, checkIn ?? null, status]
    );
    sendSuccess(res, { item: snakeToCamel<AttendanceRecord>(result.rows[0] as Record<string, unknown>) }, "Attendance recorded", 201);
  })
);
