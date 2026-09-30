import { Router } from 'express';
import { db }                              from '../config/db';
import { authenticate, requireAdmin,
         requireLabIncharge }              from '../middleware/auth';
import { ok, fail }                        from '../utils/response';
import { emitEvent, SOCKET_EVENTS }        from '../services/socketService';
import { getSettingNumber, checkLowStock, resolveLowStockIfRecovered } from '../services/alertService';
import { env }                             from '../config/env';

const router = Router();

// GET /api/inventory — Admin + Lab Incharge
router.get('/', authenticate, requireLabIncharge, async (req, res) => {
  try {
    const { search, isActive } = req.query;

    const bottles = await db.bottle.findMany({
      where: {
        isActive:    isActive === 'false' ? false : true,
        chemicalName: search
          ? { contains: search as string }
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

// POST /api/inventory — Admin + Lab Incharge
router.post('/', authenticate, requireLabIncharge, async (req, res) => {
  const {
    rfidTag, chemicalName, description,
    initialQty, maxCapacity, location, supplier, lowStockPct,
  } = req.body;

  if (!rfidTag || !chemicalName || !initialQty) {
    return fail(res, 400, 'rfidTag, chemicalName, and initialQty are required');
  }

  // maxCapacity (physical/hardware ceiling, e.g. 92g) must be able to hold
  // at least the normal full-stock reference (initialQty, e.g. 50g) —
  // otherwise every single refill up to a bottle's "normal" fill level
  // would already read as an Overload.
  if (maxCapacity !== undefined && Number(maxCapacity) < Number(initialQty)) {
    return fail(res, 400, 'maxCapacity must be greater than or equal to initialQty');
  }

  try {
    // Only used when the person creating this bottle didn't set their
    // own threshold — previously this silently fell back to a hardcoded
    // 20 no matter what "Low Stock Threshold (%)" was set to on the
    // Settings page.
    const defaultLowStockPct = lowStockPct
      ? Math.round(Number(lowStockPct))
      : await getSettingNumber('ALERT_LOW_STOCK_PCT', env.ALERT_LOW_STOCK_PCT);

    const bottle = await db.bottle.create({
      data: {
        rfidTag:     rfidTag.toUpperCase().trim(),
        chemicalName,
        description: description ?? null,
        // Standardized system-wide to grams — the load cell hardware only
        // ever measures weight, never volume, so "unit" is intentionally
        // NOT accepted from the client here. Letting the frontend pick
        // between g/ml previously let different bottles disagree on unit,
        // which silently broke any total that summed quantities across
        // bottles (e.g. a student's "Volume Dispensed" stat).
        unit:        'g',
        initialQty:  Number(initialQty),
        // Falls back to the schema default (92) when not supplied, rather
        // than silently defaulting to initialQty — a bottle's physical
        // capacity shouldn't quietly collapse to its normal-fill number.
        ...(maxCapacity !== undefined ? { maxCapacity: Number(maxCapacity) } : {}),
        currentQty:  Number(initialQty),
        location:    location    ?? null,
        supplier:    supplier    ?? null,
        lowStockPct: defaultLowStockPct,
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
    chemicalName, description,
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
      // "unit" is intentionally not updatable — see the note in the POST
      // handler above. It's fixed to 'g' for every bottle system-wide.
      if (location     !== undefined) updateData.location     = location;
      if (supplier     !== undefined) updateData.supplier     = supplier;
      if (lowStockPct  !== undefined) updateData.lowStockPct  = Number(lowStockPct);
      if (isActive     !== undefined) updateData.isActive     = isActive;
      if (req.body.initialQty   !== undefined) updateData.initialQty   = Number(req.body.initialQty);
      if (req.body.maxCapacity  !== undefined) updateData.maxCapacity  = Number(req.body.maxCapacity);
    }

    // Both roles can update currentQty. A Lab Incharge can also correct
    // initialQty (normal reference) or maxCapacity (hardware ceiling) —
    // they're the one physically at the scale when an Overfill/Overload
    // alert fires and need to fix the recorded number immediately,
    // rather than wait for an Admin.
    if (currentQty !== undefined) updateData.currentQty = Number(currentQty);
    if (isLabIncharge && req.body.initialQty  !== undefined) {
      updateData.initialQty = Number(req.body.initialQty);
    }
    if (isLabIncharge && req.body.maxCapacity !== undefined) {
      updateData.maxCapacity = Number(req.body.maxCapacity);
    }

    if (Object.keys(updateData).length === 0) {
      return fail(res, 400, 'No valid fields to update');
    }

    const bottle = await db.bottle.update({
      where: { id: bottleId },
      data:  updateData,
    });

    // A manual quantity correction (Edit, or "Confirm & Apply Refill") can
    // move stock back above the low-stock threshold, but previously only
    // an actual refill event re-checked stock alerts — an Admin/Incharge
    // editing currentQty here never did, so an old "OUT OF STOCK" or "LOW
    // STOCK" alert stayed open forever even after the real number was
    // fixed. Re-run both directions: resolve anything that's now
    // recovered, and raise anything that newly dropped into a low tier.
    if (updateData.currentQty !== undefined) {
      await resolveLowStockIfRecovered(bottle);
      await checkLowStock(bottle);
    }

    emitEvent(SOCKET_EVENTS.INVENTORY_UPDATE, bottle);

    return ok(res, bottle);
  } catch (err: any) {
    if (err.code === 'P2025') return fail(res, 404, 'Bottle not found');
    return fail(res, 500, 'Failed to update bottle');
  }
});

// DELETE /api/inventory/:id — Admin + Lab Incharge (soft delete)
// rfidTag is @unique on Bottle, so a plain isActive:false soft delete leaves
// the old rfidTag permanently locking that load-cell position — a new
// chemical can never be re-added there (Prisma P2002). We free the tag by
// renaming it on the deactivated row so it no longer collides.
router.delete('/:id', authenticate, requireLabIncharge, async (req, res) => {
  const bottleId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

  try {
    const existing = await db.bottle.findUnique({ where: { id: bottleId } });
    if (!existing) return fail(res, 404, 'Bottle not found');

    await db.bottle.update({
      where: { id: bottleId },
      data: {
        isActive: false,
        // Only rename if not already freed (idempotent on repeat deletes).
        rfidTag: existing.rfidTag.includes('__DELETED__')
          ? existing.rfidTag
          : `${existing.rfidTag}__DELETED__${Date.now()}`,
      },
    });
    return ok(res, { message: 'Bottle deactivated successfully. Its load cell position is now free for a new chemical.' });
  } catch (err: any) {
    if (err.code === 'P2025') return fail(res, 404, 'Bottle not found');
    return fail(res, 500, 'Failed to deactivate bottle');
  }
});

export default router;