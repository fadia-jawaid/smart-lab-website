
// import express       from 'express';
// import http          from 'http';
// import cors          from 'cors';
// import helmet        from 'helmet';
// import morgan        from 'morgan';
// import { Server as SocketIO } from 'socket.io';

// import { env }                      from './config/env';
// import { connectDB, db }            from './config/db';
// import { connectMQTT }              from './config/mqtt';
// import { initSocketService }        from './services/socketService';
// import { checkOverdueTransactions } from './services/alertService';
// import { errorHandler }             from './middleware/errorHandler';
// import { apiLimiter }               from './middleware/rateLimiter';
// import routes                       from './routes';

// const app    = express();
// const server = http.createServer(app);

// // ── CORS — Must be FIRST before everything ────────────────────────
// const corsOptions = {
//   origin: [
//     'http://localhost:5173',
//     'http://localhost:5174',
//     'http://127.0.0.1:5173',
//     'http://127.0.0.1:5174',
//   ],
//   credentials:    true,
//   methods:        ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
//   allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
//   preflightContinue: false,
//   optionsSuccessStatus: 200,
// };

// app.use(cors(corsOptions));

// // Handle preflight for all routes
// app.use((req, res, next) => {
//   res.header('Access-Control-Allow-Origin', 'http://localhost:5173');
//   res.header('Access-Control-Allow-Credentials', 'true');
//   res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
//   res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With');
//   if (req.method === 'OPTIONS') {
//     return res.sendStatus(200);
//   }
//   return next();
// });

// // ── Socket.io ─────────────────────────────────────────────────────
// const io = new SocketIO(server, {
//   cors: {
//     origin:      ['http://localhost:5173', 'http://localhost:5174'],
//     credentials: true,
//     methods:     ['GET', 'POST'],
//   },
// });

// // ── Other Middleware ──────────────────────────────────────────────
// app.use(helmet({ crossOriginResourcePolicy: false }));
// app.use(morgan('dev'));
// app.use(express.json({ limit: '10mb' }));
// app.use(express.urlencoded({ extended: false }));
// app.use('/api', apiLimiter);

// // ── API Routes ────────────────────────────────────────────────────
// app.use('/api', routes);

// // ── Health Check ──────────────────────────────────────────────────
// app.get('/api/health', async (_req, res) => {
//   try {
//     await db.$queryRaw`SELECT 1`;
//     res.json({ status: 'ok', db: 'connected', uptime: process.uptime() });
//   } catch {
//     res.status(503).json({ status: 'degraded', db: 'disconnected' });
//   }
// });

// // ── 404 ───────────────────────────────────────────────────────────
// app.use((_req, res) => {
//   res.status(404).json({ success: false, error: 'Route not found' });
// });

// // ── Error Handler ─────────────────────────────────────────────────
// app.use(errorHandler);

// // ── Overdue Check Every 5 Minutes ─────────────────────────────────
// setInterval(checkOverdueTransactions, 5 * 60 * 1000);

// // ── Boot ──────────────────────────────────────────────────────────
// async function start() {
//   await connectDB();

//   try {
//     await connectMQTT();
//   } catch {
//     console.warn('⚠️   MQTT not available — continuing without IoT events');
//   }

//   initSocketService(io);

//   server.listen(Number(env.PORT), () => {
//     console.log(`\n🚀  Server running on http://localhost:${env.PORT}`);
//     console.log(`    Environment : ${env.NODE_ENV}`);
//     console.log(`    Client URL  : http://localhost:5173`);
//     console.log(`    Health check: http://localhost:${env.PORT}/api/health\n`);
//   });

//   process.on('SIGINT',  async () => { await db.$disconnect(); process.exit(0); });
//   process.on('SIGTERM', async () => { await db.$disconnect(); process.exit(0); });
// }

// start().catch(err => {
//   console.error('Failed to start server:', err);
//   process.exit(1);
// });



import express       from 'express';
import http          from 'http';
import cors          from 'cors';
import helmet        from 'helmet';
import morgan        from 'morgan';
import { Server as SocketIO } from 'socket.io';

import { env }                      from './config/env';
import { connectDB, db }            from './config/db';
import { connectMQTT }              from './config/mqtt';
import { initSocketService }        from './services/socketService';
import { checkOverdueTransactions } from './services/alertService';
import { errorHandler }             from './middleware/errorHandler';
import { apiLimiter }               from './middleware/rateLimiter';
import routes                       from './routes';

const app    = express();
const server = http.createServer(app);

// ── Allowed origins — used by both CORS and Socket.io below ───────
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
];

// ── CORS — Must be FIRST before everything ────────────────────────
const corsOptions = {
  origin: allowedOrigins,
  credentials:    true,
  methods:        ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  preflightContinue: false,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));

// Handle preflight for all routes — reflect the actual request origin
// instead of hardcoding one, so this still works correctly no matter
// which localhost port/device is calling in.
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  return next();
});

// ── Socket.io ─────────────────────────────────────────────────────
const io = new SocketIO(server, {
  cors: {
    origin:      allowedOrigins,
    credentials: true,
    methods:     ['GET', 'POST'],
  },
});

// ── Other Middleware ──────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false }));
app.use('/api', apiLimiter);

// ── API Routes ────────────────────────────────────────────────────
app.use('/api', routes);

// ── Health Check ──────────────────────────────────────────────────
app.get('/api/health', async (_req, res) => {
  try {
    await db.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', db: 'connected', uptime: process.uptime() });
  } catch {
    res.status(503).json({ status: 'degraded', db: 'disconnected' });
  }
});

// ── 404 ───────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

// ── Error Handler ─────────────────────────────────────────────────
app.use(errorHandler);

// ── Overdue Check Every 5 Minutes ─────────────────────────────────
setInterval(checkOverdueTransactions, 5 * 60 * 1000);

// ── Boot ──────────────────────────────────────────────────────────
async function start() {
  await connectDB();

  // Start embedded Aedes MQTT broker on port 1883
  try {
    const { startBroker } = await import('./broker');
    await startBroker();
  } catch (err) {
    console.warn('⚠️ Embedded MQTT broker startup note:', err);
  }

  connectMQTT();
  initSocketService(io);

  server.listen(Number(env.PORT), () => {
    console.log(`\n🚀  Server running on http://localhost:${env.PORT}`);
    console.log(`    Environment : ${env.NODE_ENV}`);
    console.log(`    Client URL  : http://localhost:5173`);
    console.log(`    Health check: http://localhost:${env.PORT}/api/health\n`);
  });

  process.on('SIGINT',  async () => { await db.$disconnect(); process.exit(0); });
  process.on('SIGTERM', async () => { await db.$disconnect(); process.exit(0); });
}

start().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});