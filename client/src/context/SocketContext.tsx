// import { createContext, useContext, useEffect, useRef, useState } from 'react';
// import type { ReactNode } from 'react';
// import { io } from 'socket.io-client';
// import type { Socket } from 'socket.io-client';

// interface SocketContextType {
//   connected: boolean;
//   on: (event: string, callback: (data: any) => void) => () => void;
//   off: (event: string, callback?: (data: any) => void) => void;
// }

// const SocketContext = createContext<SocketContextType>({} as SocketContextType);

// export function SocketProvider({ children }: { children: ReactNode }) {
//   const socketRef = useRef<Socket | null>(null);
//   const [connected, setConnected] = useState(false);

//   useEffect(() => {
//     const token = localStorage.getItem('token');

//     socketRef.current = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000', {
//       transports: ['websocket', 'polling'],
//       auth: token ? { token } : undefined,
//     });

//     socketRef.current.on('connect', () => setConnected(true));
//     socketRef.current.on('disconnect', () => setConnected(false));

//     return () => {
//       socketRef.current?.disconnect();
//     };
//   }, []);

//   const on = (event: string, callback: (data: any) => void) => {
//     socketRef.current?.on(event, callback);
//     return () => {
//       socketRef.current?.off(event, callback);
//     };
//   };

//   const off = (event: string, callback?: (data: any) => void) => {
//     socketRef.current?.off(event, callback);
//   };

//   return (
//     <SocketContext.Provider value={{ connected, on, off }}>{children}</SocketContext.Provider>
//   );
// }

// // eslint-disable-next-line react-refresh/only-export-components
// export function useSocket() {
//   return useContext(SocketContext);
// }



import { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';

interface SocketContextType {
  connected: boolean;
  on: (event: string, callback: (data: any) => void) => () => void;
  off: (event: string, callback?: (data: any) => void) => void;
}

const SocketContext = createContext<SocketContextType>({} as SocketContextType);

export function SocketProvider({ children }: { children: ReactNode }) {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');

    // Empty string = connect to the same origin the page was loaded from.
    // Vite's dev server proxy (see vite.config.ts) forwards /socket.io
    // requests to the real backend on port 5000 — this works identically
    // on localhost AND through the ngrok URL with zero extra config.
    socketRef.current = io(import.meta.env.VITE_SOCKET_URL || '', {
      transports: ['websocket', 'polling'],
      auth: token ? { token } : undefined,
    });

    socketRef.current.on('connect', () => setConnected(true));
    socketRef.current.on('disconnect', () => setConnected(false));

    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

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