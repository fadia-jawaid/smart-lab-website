import { Router } from 'express';
import { db }                    from '../config/db';
import { authenticate,
         requireAdmin,
         requireLabIncharge }    from '../middleware/auth';
import { ok, fail }              from '../utils/response';

const router = Router();

// GET /api/logs — filterable transaction history
router.get('/', authenticate, requireLabIncharge, async (req, res) => {
  try {
    const {
      studentId, bottleId, status,
      department, lab, from, to,
      page  = '1',
      limit = '25',
    } = req.query;

    const pageNum  = Math.max(1, Number(page));
    const limitNum = Math.min(100, Math.max(1, Number(limit)));

    const where: any = {};

    if (studentId)  where.studentId = studentId as string;
    if (bottleId)   where.bottleId  = bottleId  as string;
    if (status)     where.status    = status     as string;
    if (department) where.student   = { department: department as string };
    if (lab)        where.lab       = lab        as string;

    if (from || to) {
      where.timeTaken = {};
      if (from) where.timeTaken.gte = new Date(from as string);
      if (to) {
        // A bare "YYYY-MM-DD" parses to 00:00:00.000 on that date, so an
        // .lte filter using it as-is excludes every transaction that
        // happened during the selected day itself. Push it to the last
        // millisecond of that day so "to" is inclusive of the whole date.
        const toDate = new Date(to as string);
        toDate.setHours(23, 59, 59, 999);
        where.timeTaken.lte = toDate;
      }
    }

    const [total, transactions] = await Promise.all([
      db.transaction.count({ where }),
      db.transaction.findMany({
        where,
        include: {
          student:     { select: { name: true, rollNo: true, department: true, batch: true } },
          bottle:      { select: { chemicalName: true, unit: true } },
          labIncharge: { select: { name: true } },
        },
        orderBy: { timeTaken: 'desc' },
        skip:    (pageNum - 1) * limitNum,
        take:    limitNum,
      }),
    ]);

    return ok(res, transactions, {
      total,
      page:       pageNum,
      limit:      limitNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (err) {
    console.error('Logs fetch error:', err);
    return fail(res, 500, 'Failed to fetch logs');
  }
});

// GET /api/logs/export — CSV download (Admin only)
router.get('/export', authenticate, requireAdmin, async (req, res) => {
  try {
    const transactions = await db.transaction.findMany({
      include: {
        student:     { select: { name: true, rollNo: true, department: true, batch: true } },
        bottle:      { select: { chemicalName: true, unit: true } },
        labIncharge: { select: { name: true } },
      },
      orderBy: { timeTaken: 'desc' },
      take: 5000,
    });

    const headers = [
      'Student Name', 'Roll No', 'Department', 'Batch',
      'Chemical', 'Unit', 'Initial Weight', 'Final Weight', 'Quantity Used',
      'Lab',
      'Time Taken', 'Time Returned', 'Duration (min)',
      'Purpose', 'Status', 'Processed By',
    ];

    // Excel/Google Sheets treats a cell starting with =, +, -, @ (or a tab/
    // carriage-return) as a formula, not text. A student/incharge name or
    // a free-text "purpose" field is user-controlled input, so without this
    // guard someone could plant a formula (e.g. one that shells out or
    // pulls data from another sheet) that silently executes the moment an
    // admin opens the exported CSV in a spreadsheet program. Prefixing
    // with a single quote forces it to be read as plain text instead.
    const FORMULA_TRIGGER = /^[=+\-@\t\r]/;
    const csvSafe = (value: unknown): string => {
      const str = String(value ?? '');
      return FORMULA_TRIGGER.test(str) ? `'${str}` : str;
    };

    const rows = transactions.map(tx => {
      const duration = tx.timeReturned
        ? Math.round((new Date(tx.timeReturned).getTime() - new Date(tx.timeTaken).getTime()) / 60000)
        : '';

      return [
        csvSafe(tx.student?.name       ?? ''),
        csvSafe(tx.student?.rollNo     ?? ''),
        csvSafe(tx.student?.department ?? ''),
        csvSafe(tx.student?.batch      ?? ''),
        csvSafe(tx.bottle?.chemicalName ?? ''),
        tx.bottle?.unit        ?? '',
        tx.initialWeight       != null ? tx.initialWeight.toFixed(2) : '',
        tx.finalWeight         != null ? tx.finalWeight.toFixed(2) : '',
        tx.quantityUsed        != null ? tx.quantityUsed.toFixed(2) : '',
        tx.lab ?? '',
        new Date(tx.timeTaken).toISOString(),
        tx.timeReturned ? new Date(tx.timeReturned).toISOString() : '',
        duration,
        csvSafe(tx.purpose ?? ''),
        tx.status,
        csvSafe(tx.labIncharge?.name ?? ''),
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="smartlab-logs-${Date.now()}.csv"`);
    return res.send(csv);
  } catch (err) {
    return fail(res, 500, 'Failed to export logs');
  }
});

export default router;