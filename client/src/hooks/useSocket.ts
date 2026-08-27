// import { useCallback } from 'react';

// type EventCallback<T = unknown> = (data: T) => void;

// export function useSocket() {
//   const on = useCallback(
//     <T = unknown>(
//       event: string,
//       callback: EventCallback<T>
//     ) => {
//       void event;
//       void callback;

//       return () => {};
//     },
//     []
//   );

//   return { on };
// }

export { useSocket } from '../context/SocketContext';