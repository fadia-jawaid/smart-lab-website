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
import restockLogsRoutes from './restockLogs';


import passwordResetRoutes from './passwordReset';
import deviceValidateRoutes from './deviceValidate';
import eventsRoutes from './events';
import systemRoutes from './system';
import usersRoutes from './users';

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
router.use('/restock-logs', restockLogsRoutes);
router.use('/system', systemRoutes);
router.use('/users', usersRoutes);


router.use('/password-reset', passwordResetRoutes);

// ESP32 RFID validation endpoint: POST /api/validate
router.use('/validate', deviceValidateRoutes);

// ESP32 event endpoint: POST /api/events
router.use('/events', eventsRoutes);


export default router;