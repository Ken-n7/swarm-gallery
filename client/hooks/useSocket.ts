'use client';

import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { SERVER } from '@/lib/api';

export function useSocket(onEvent: (event: string, data: unknown) => void) {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = io(SERVER, { transports: ['websocket'] });
    socketRef.current = socket;

    socket.onAny((event, data) => onEvent(event, data));

    return () => {
      socket.disconnect();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return socketRef;
}
