import { Router } from 'express';
import { db }                              from '../config/db';
import { authenticate, requireAdmin,
         requireLabIncharge }              from '../middleware/auth';
import { ok, fail }                        from '../utils/response';

const router = Router();

// GET /api/inventory — Admin + Lab Incharge
router.get('/', authenticate, requireLabIncharge, async (req, res) => {
  try {
    const { search, isActive } = req.query;

    const bottles = await db.bottle.findMany({
      where: {
        isActive:    isActive === 'false' ? false : true,
        chemicalName: search
          ? { contains: search as string, mode: 'insensitive' }
          : undefined,
      },
      orderBy: { chemicalName: 'asc' },
    });

    return ok(res, bottles);
  } catch (err) {
    console.error('Inventory fetch error:', err);
    return fail(res, 500, 'Failed to fetch inventory');
  }
});

// GET /api/inventory/:id — single bottle with transaction history
router.get('/:id', authenticate, requireLabIncharge, async (req, res) => {
  try {
    const bottleId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const bottle = await db.bottle.findUnique({
      where:   { id: bottleId },
      include: {
        transactions: {
          include: {
            student:     { select: { name: true, rollNo: true, department: true } },
            labIncharge: { select: { name: true } },
          },
          orderBy: { timeTaken: 'desc' },
          take:    50,
        },
      },
    });

    if (!bottle) return fail(res, 404, 'Bottle not found');
    return ok(res, bottle);
  } catch (err) {
    return fail(res, 500, 'Failed to fetch bottle');
  }
});

// POST /api/inventory — Admin only
router.post('/', authenticate, requireAdmin, async (req, res) => {
  const {
    rfidTag, chemicalName, description,
    unit, initialQty, location, supplier, lowStockPct,
  } = req.body;

  if (!rfidTag || !chemicalName || !initialQty) {
    return fail(res, 400, 'rfidTag, chemicalName, and initialQty are required');
  }

  try {
    const bottle = await db.bottle.create({
      data: {
        rfidTag:     rfidTag.toUpperCase().trim(),
        chemicalName,
        description: description ?? null,
        unit:        unit        ?? 'ml',
        initialQty:  Number(initialQty),
        currentQty:  Number(initialQty),
        location:    location    ?? null,
        supplier:    supplier    ?? null,
        lowStockPct: lowStockPct ? Number(lowStockPct) : 20,
      },
    });
    return ok(res, bottle);
  } catch (err: any) {
    if (err.code === 'P2002') return fail(res, 409, 'A bottle with this RFID tag already exists');
    return fail(res, 500, 'Failed to add bottle');
  }
});

// PATCH /api/inventory/:id — Admin and Lab Incharge (lab incharge can update currentQty)
router.patch('/:id', authenticate, requireLabIncharge, async (req, res) => {
  const {
    chemicalName, description, unit,
    currentQty, location, supplier, lowStockPct, isActive,
  } = req.body;

  const bottleId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

  // Lab Incharge can only update currentQty — not structural fields
  const isLabIncharge = req.user?.role === 'LAB_INCHARGE';

  try {
    const updateData: any = {};

    if (!isLabIncharge) {
      // Admin can update everything
      if (chemicalName !== undefined) updateData.chemicalName = chemicalName;
      if (description  !== undefined) updateData.description  = description;
      if (unit         !== undefined) updateData.unit         = unit;
      if (location     !== undefined) updateData.location     = location;
      if (supplier     !== undefined) updateData.supplier     = supplier;
      if (lowStockPct  !== undefined) updateData.lowStockPct  = Number(lowStockPct);
      if (isActive     !== undefined) updateData.isActive     = isActive;
    }

    // Both roles can update currentQty
    if (currentQty !== undefined) updateData.currentQty = Number(currentQty);

    if (Object.keys(updateData).length === 0) {
      return fail(res, 400, 'No valid fields to update');
    }

    const bottle = await db.bottle.update({
      where: { id: bottleId },
      data:  updateData,
    });

    return ok(res, bottle);
  } catch (err: any) {
    if (err.code === 'P2025') return fail(res, 404, 'Bottle not found');
    return fail(res, 500, 'Failed to update bottle');
  }
});

// DELETE /api/inventory/:id — Admin only (soft delete)
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  const bottleId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

  try {
    await db.bottle.update({
      where: { id: bottleId },
      data:  { isActive: false },
    });
    return ok(res, { message: 'Bottle deactivated successfully' });
  } catch (err: any) {
    if (err.code === 'P2025') return fail(res, 404, 'Bottle not found');
    return fail(res, 500, 'Failed to deactivate bottle');
  }
});

export default router;