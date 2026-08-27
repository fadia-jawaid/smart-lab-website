import { Server as SocketIOServer, Socket } from 'socket.io';

let io: SocketIOServer | null = null;

export function initSocketService(socketIO: SocketIOServer): void {
  io = socketIO;

  io.on('connection', (socket: Socket) => {
    console.log(`🔌  Socket connected: ${socket.id}`);

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
  INVENTORY_UPDATE: 'inventory_update',
  USER_SCAN:        'user_scan',
} as const;

export type SocketEventName = typeof SOCKET_EVENTS[keyof typeof SOCKET_EVENTS];

export function emitEvent(eventName: SocketEventName | string, data: unknown): void {
  if (!io) {
    console.warn('Socket.io not initialised — cannot emit:', eventName);
    return;
  }
  io.emit(eventName, data);
}

export function emitToRoom(room: string, eventName: string, data: unknown): void {
  if (!io) return;
  io.to(room).emit(eventName, data);
}

export function getConnectedClients(): number {
  return io?.sockets.sockets.size ?? 0;
}