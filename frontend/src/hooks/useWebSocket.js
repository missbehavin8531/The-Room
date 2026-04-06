import { useEffect, useRef, useState, useCallback } from 'react';

const RECONNECT_DELAYS = [1000, 2000, 4000, 8000, 15000];
const PING_INTERVAL = 25000;

export function useWebSocket(url, { onMessage, onConnect, onDisconnect, enabled = true } = {}) {
    const [status, setStatus] = useState('disconnected'); // 'connecting' | 'connected' | 'disconnected'
    const [onlineCount, setOnlineCount] = useState(0);
    const wsRef = useRef(null);
    const reconnectAttempt = useRef(0);
    const reconnectTimer = useRef(null);
    const pingTimer = useRef(null);
    const enabledRef = useRef(enabled);
    const callbacksRef = useRef({ onMessage, onConnect, onDisconnect });

    // Keep callbacks ref current
    useEffect(() => {
        callbacksRef.current = { onMessage, onConnect, onDisconnect };
    }, [onMessage, onConnect, onDisconnect]);

    useEffect(() => {
        enabledRef.current = enabled;
    }, [enabled]);

    const cleanup = useCallback(() => {
        if (pingTimer.current) clearInterval(pingTimer.current);
        if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
        if (wsRef.current) {
            wsRef.current.onclose = null; // prevent reconnect on intentional close
            wsRef.current.close();
            wsRef.current = null;
        }
    }, []);

    const connect = useCallback(() => {
        if (!enabledRef.current || !url) return;

        cleanup();
        setStatus('connecting');

        try {
            const ws = new WebSocket(url);
            wsRef.current = ws;

            ws.onopen = () => {
                setStatus('connected');
                reconnectAttempt.current = 0;
                callbacksRef.current.onConnect?.();

                // Start heartbeat
                pingTimer.current = setInterval(() => {
                    if (ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify({ type: 'ping' }));
                    }
                }, PING_INTERVAL);
            };

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'pong') return;
                    if (data.type === 'connected' || data.type === 'user_left') {
                        setOnlineCount(data.online_count || 0);
                    }
                    callbacksRef.current.onMessage?.(data);
                } catch (e) {
                    console.error('WS parse error:', e);
                }
            };

            ws.onclose = (event) => {
                setStatus('disconnected');
                callbacksRef.current.onDisconnect?.();
                if (pingTimer.current) clearInterval(pingTimer.current);

                // Auto-reconnect unless intentionally closed
                if (enabledRef.current && event.code !== 4001 && event.code !== 4003) {
                    const delay = RECONNECT_DELAYS[Math.min(reconnectAttempt.current, RECONNECT_DELAYS.length - 1)];
                    reconnectAttempt.current++;
                    reconnectTimer.current = setTimeout(connect, delay);
                }
            };

            ws.onerror = () => {
                // onclose will fire after this
            };
        } catch (e) {
            console.error('WS connection failed:', e);
            setStatus('disconnected');
        }
    }, [url, cleanup]);

    const send = useCallback((data) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify(data));
            return true;
        }
        return false;
    }, []);

    const disconnect = useCallback(() => {
        enabledRef.current = false;
        cleanup();
        setStatus('disconnected');
    }, [cleanup]);

    useEffect(() => {
        if (enabled && url) {
            connect();
        }
        return cleanup;
    }, [url, enabled, connect, cleanup]);

    return { status, onlineCount, send, disconnect, reconnect: connect };
}
