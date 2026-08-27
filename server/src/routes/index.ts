import { Router } from 'express';

import authRoutes      from './auth';
import scanRoutes      from './scan';
import inventoryRoutes from './inventory';
import logsRoutes      from './logs';
import alertsRoutes    from './alerts';
import studentsRoutes  from './students';
import inchargesRoutes from './incharges';
import myHistoryRoutes from './myHistory';
import settingsRoutes  from './settings';


import passwordResetRoutes from './passwordReset';

const router = Router();

router.use('/auth',      authRoutes);
router.use('/scan',      scanRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/logs',      logsRoutes);
router.use('/alerts',    alertsRoutes);
router.use('/students',  studentsRoutes);
router.use('/incharges', inchargesRoutes);
router.use('/my',        myHistoryRoutes);
router.use('/settings',  settingsRoutes);


router.use('/password-reset', passwordResetRoutes);


export default router;