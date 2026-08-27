// import { Router } from 'express';
// import { db }                    from '../config/db';
// import { authenticate,
//          requireLabIncharge }    from '../middleware/auth';
// import { ok, fail }              from '../utils/response';

// const router = Router();

// // GET /api/logs — filterable transaction history
// router.get('/', authenticate, requireLabIncharge, async (req, res) => {
//   try {
//     const {
//       studentId, bottleId, status,
//       department, from, to,
//       page  = '1',
//       limit = '25',
//     } = req.query;

//     const pageNum  = Math.max(1, Number(page));
//     const limitNum = Math.min(100, Math.max(1, Number(limit)));

//     const where: any = {};

//     if (studentId)  where.studentId = studentId as string;
//     if (bottleId)   where.bottleId  = bottleId  as string;
//     if (status)     where.status    = status     as string;
//     if (department) where.student   = { department: department as string };

//     if (from || to) {
//       where.timeTaken = {};
//       if (from) where.timeTaken.gte = new Date(from as string);
//       if (to)   where.timeTaken.lte = new Date(to   as string);
//     }

//     const [total, transactions] = await Promise.all([
//       db.transaction.count({ where }),
//       db.transaction.findMany({
//         where,
//         include: {
//           student:     { select: { name: true, rollNo: true, department: true, batch: true } },
//           bottle:      { select: { chemicalName: true, unit: true } },
//           labIncharge: { select: { name: true } },
//         },
//         orderBy: { timeTaken: 'desc' },
//         skip:    (pageNum - 1) * limitNum,
//         take:    limitNum,
//       }),
//     ]);

//     return ok(res, transactions, {
//       total,
//       page:       pageNum,
//       limit:      limitNum,
//       totalPages: Math.ceil(total / limitNum),
//     });
//   } catch (err) {
//     console.error('Logs fetch error:', err);
//     return fail(res, 500, 'Failed to fetch logs');
//   }
// });

// // GET /api/logs/export — CSV download (Admin only)
// router.get('/export', authenticate, async (req, res) => {
//   try {
//     const transactions = await db.transaction.findMany({
//       include: {
//         student:     { select: { name: true, rollNo: true, department: true, batch: true } },
//         bottle:      { select: { chemicalName: true, unit: true } },
//         labIncharge: { select: { name: true } },
//       },
//       orderBy: { timeTaken: 'desc' },
//       take: 5000,
//     });

//     const headers = [
//       'Student Name', 'Roll No', 'Department', 'Batch',
//       'Chemical', 'Unit', 'Quantity Used',
//       'Time Taken', 'Time Returned', 'Duration (min)',
//       'Purpose', 'Status', 'Processed By',
//     ];

//     const rows = transactions.map(tx => {
//       const duration = tx.timeReturned
//         ? Math.round((new Date(tx.timeReturned).getTime() - new Date(tx.timeTaken).getTime()) / 60000)
//         : '';

//       return [
//         tx.student?.name      ?? '',
//         tx.student?.rollNo    ?? '',
//         tx.student?.department ?? '',
//         tx.student?.batch     ?? '',
//         tx.bottle?.chemicalName ?? '',
//         tx.bottle?.unit       ?? '',
//         tx.quantityUsed       != null ? tx.quantityUsed.toFixed(2) : '',
//         new Date(tx.timeTaken).toISOString(),
//         tx.timeReturned ? new Date(tx.timeReturned).toISOString() : '',
//         duration,
//         tx.purpose            ?? '',
//         tx.status,
//         tx.labIncharge?.name  ?? '',
//       ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
//     });

//     const csv = [headers.join(','), ...rows].join('\n');

//     res.setHeader('Content-Type', 'text/csv');
//     res.setHeader('Content-Disposition', `attachment; filename="smartlab-logs-${Date.now()}.csv"`);
//     return res.send(csv);
//   } catch (err) {
//     return fail(res, 500, 'Failed to export logs');
//   }
// });

// export default router;

//new updated code 
import { Router } from 'express';
import { db }                    from '../config/db';
import { authenticate,
         requireLabIncharge }    from '../middleware/auth';
import { ok, fail }              from '../utils/response';

const router = Router();

// GET /api/logs — filterable transaction history
router.get('/', authenticate, requireLabIncharge, async (req, res) => {
  try {
    const {
      studentId, bottleId, status,
      department, from, to,
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

    if (from || to) {
      where.timeTaken = {};
      if (from) where.timeTaken.gte = new Date(from as string);
      if (to)   where.timeTaken.lte = new Date(to   as string);
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
router.get('/export', authenticate, async (req, res) => {
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
      'Chemical', 'Unit', 'Quantity Used',
      'Lab',
      'Time Taken', 'Time Returned', 'Duration (min)',
      'Purpose', 'Status', 'Processed By',
    ];

    const rows = transactions.map(tx => {
      const duration = tx.timeReturned
        ? Math.round((new Date(tx.timeReturned).getTime() - new Date(tx.timeTaken).getTime()) / 60000)
        : '';

      return [
        tx.student?.name       ?? '',
        tx.student?.rollNo     ?? '',
        tx.student?.department ?? '',
        tx.student?.batch      ?? '',
        tx.bottle?.chemicalName ?? '',
        tx.bottle?.unit        ?? '',
        tx.quantityUsed        != null ? tx.quantityUsed.toFixed(2) : '',
        tx.lab ?? '',
        new Date(tx.timeTaken).toISOString(),
        tx.timeReturned ? new Date(tx.timeReturned).toISOString() : '',
        duration,
        tx.purpose              ?? '',
        tx.status,
        tx.labIncharge?.name    ?? '',
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