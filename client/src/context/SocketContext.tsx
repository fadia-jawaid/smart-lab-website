import { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import { useAuth } from '../hooks/useAuth';

interface SocketContextType {
  connected: boolean;
  on: (event: string, callback: (data: any) => void) => () => void;
  off: (event: string, callback?: (data: any) => void) => void;
}

const SocketContext = createContext<SocketContextType>({} as SocketContextType);

export function SocketProvider({ children }: { children: ReactNode }) {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const { token } = useAuth();

  useEffect(() => {
    // The server now requires a valid JWT to even open a connection — no
    // token yet (e.g. the person hasn't logged in) means there's nothing
    // to connect with. This re-runs on login/logout (token is a dependency
    // below), so the socket reconnects with the fresh token right after
    // sign-in instead of staying in whatever state it was in before.
    if (!token) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      setConnected(false);
      return;
    }

    // Empty string = connect to the same origin the page was loaded from.
    // Vite's dev server proxy (see vite.config.ts) forwards /socket.io
    // requests to the real backend on port 5000 — this works identically
    // on localhost AND through the ngrok URL with zero extra config.
    socketRef.current = io(import.meta.env.VITE_SOCKET_URL || '', {
      transports: ['websocket', 'polling'],
      auth: { token },
    });

    socketRef.current.on('connect', () => setConnected(true));
    socketRef.current.on('disconnect', () => setConnected(false));
    // The server actively rejects a missing/expired/invalid token (instead
    // of just silently refusing the connection), so surface that instead
    // of leaving the person wondering why the "live" indicator never lights up.
    socketRef.current.on('connect_error', (err) => {
      console.warn('Socket connection rejected:', err.message);
      setConnected(false);
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, [token]);

  const on = (event: string, callback: (data: any) => void) => {
    socketRef.current?.on(event, callback);
    return () => {
      socketRef.current?.off(event, callback);
    };
  };

  const off = (event: string, callback?: (data: any) => void) => {
    socketRef.current?.off(event, callback);
  };

  return (
    <SocketContext.Provider value={{ connected, on, off }}>{children}</SocketContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSocket() {
  return useContext(SocketContext);
}