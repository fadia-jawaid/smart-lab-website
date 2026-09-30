import { Server as SocketIOServer, Socket } from 'socket.io';
import { verifyToken } from '../utils/jwt';

let io: SocketIOServer | null = null;

// Every currently-consumed real-time event (new transactions, alerts,
// inventory changes, restock notifications, live RFID scans) is only ever
// read by Admin/Lab Incharge dashboards — no Student-facing screen
// listens to any of them. So instead of broadcasting to every connected
// socket, everything goes to this one staff-only room.
const STAFF_ROOM = 'staff';

export function initSocketService(socketIO: SocketIOServer): void {
  io = socketIO;

  // Reject the connection outright if it doesn't carry a valid JWT.
  // Previously Socket.io had no authentication at all — literally any
  // device on the network (not just a logged-in student, ANY client) could
  // open a connection and receive every live event: student names, roll
  // numbers, RFID tags, and transaction details, with zero login required.
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) {
      return next(new Error('Authentication required'));
    }
    try {
      const payload = verifyToken(token);
      socket.data.user = payload;
      next();
    } catch {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = socket.data.user as { userId: string; role: string; name: string } | undefined;
    console.log(`🔌  Socket connected: ${socket.id} (${user?.name ?? 'unknown'}, ${user?.role ?? 'unknown role'})`);

    // Staff (Admin/Lab Incharge) get the live dashboard feed. A Student's
    // socket is authenticated too (so their own future features, like a
    // personal notification, could target them directly by user ID) but
    // is deliberately not added to the broadcast room — they have no
    // legitimate reason to see other students' activity in real time.
    if (user?.role === 'ADMIN' || user?.role === 'LAB_INCHARGE') {
      socket.join(STAFF_ROOM);
    }

    socket.on('disconnect', (reason) => {
      console.log(`🔌  Socket disconnected: ${socket.id} (${reason})`);
    });

    socket.on('error', (err) => {
      console.error(`Socket error [${socket.id}]:`, err);
    });
  });
}

export const SOCKET_EVENTS = {
  NEW_EVENT:        'new_event',
  ALERT_TRIGGERED:  'alert_triggered',
  ALERT_RESOLVED:   'alert_resolved',
  INVENTORY_UPDATE: 'inventory_update',
  USER_SCAN:        'user_scan',
  RESTOCK_LOGGED:   'restock_logged',
} as const;

export type SocketEventName = typeof SOCKET_EVENTS[keyof typeof SOCKET_EVENTS];

export function emitEvent(eventName: SocketEventName | string, data: unknown): void {
  if (!io) {
    console.warn('Socket.io not initialised — cannot emit:', eventName);
    return;
  }
  io.to(STAFF_ROOM).emit(eventName, data);
}

export function emitToRoom(room: string, eventName: string, data: unknown): void {
  if (!io) return;
  io.to(room).emit(eventName, data);
}

export function getConnectedClients(): number {
  return io?.sockets.sockets.size ?? 0;
}