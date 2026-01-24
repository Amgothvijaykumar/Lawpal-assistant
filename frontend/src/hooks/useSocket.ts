import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@/contexts/AuthContext';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3007';

export function useSocket() {
    const { user, token } = useAuth();
    const socketRef = useRef<Socket | null>(null);

    useEffect(() => {
        if (!token || !user) {
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
            }
            return;
        }

        if (!socketRef.current) {
            socketRef.current = io(SOCKET_URL, {
                auth: { token },
                transports: ['websocket']
            });

            socketRef.current.on('connect', () => {
                console.log('✅ Socket connected');
                // Register user to their private room
                socketRef.current?.emit('register_user', user.id);
            });

            socketRef.current.on('disconnect', () => {
                console.log('🔌 Socket disconnected');
            });
        }

        return () => {
            // We don't necessarily want to disconnect on every re-render
            // but if the component unmounts it's safer.
            // However, usually we want a singleton for the app session.
        };
    }, [token, user]);

    const joinSession = (sessionId: string) => {
        socketRef.current?.emit('join_session', sessionId);
    };

    return {
        socket: socketRef.current,
        joinSession
    };
}
