import { useEffect, useRef } from "react";
import { Client, IMessage } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { useRecoilState } from "recoil";
import { notificationsState, Notification } from "../atoms/notificationsAtom";

/**
 * WebSocket/STOMP notifications bridge.
 * Connects to Spring Boot SockJS endpoint and subscribes to user notifications queue.
 * Requires env: NEXT_PUBLIC_WS_URL (e.g., http://localhost:8080/ws)
 */
export function useStompNotifications(enabled: boolean = true) {
  const [notifState, setNotifState] = useRecoilState(notificationsState);
  const clientRef = useRef<Client | null>(null);

  useEffect(() => {
    if (!enabled) return;
    if (typeof window === 'undefined') return;
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:8080/ws';
    // Resolve token and role client-side
    const getToken = () => {
      try {
        const cookie = document.cookie || '';
        const m = cookie.match(/(?:^|; )token=([^;]+)/);
        if (m && m[1]) {
          let v = decodeURIComponent(m[1]);
          try { const p = JSON.parse(v); if (p && p.token) return String(p.token); } catch {}
          return v;
        }
      } catch {}
      try { const ls = window.localStorage.getItem('authToken'); if (ls) { try { const p = JSON.parse(ls); if (p && p.token) return String(p.token); } catch {} return ls; } } catch {}
      return undefined;
    };
    const token = getToken();
    const role = (typeof window !== 'undefined' ? String(window.localStorage.getItem('role') || '') : '').toLowerCase();
    try {
      console.log('[WS] init', { wsUrl, hasToken: !!token, tokenLen: token ? token.length : 0, role });
    } catch {}

  const wsUrlWithToken = token ? `${wsUrl}${wsUrl.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}` : wsUrl;
  try { console.log('[WS] connecting', { wsUrlWithToken }); } catch {}
  const socket = new SockJS(wsUrlWithToken);
    const client = new Client({
      webSocketFactory: () => socket as any,
      debug: (str: string) => { if (process.env.NODE_ENV !== 'production') console.log('[STOMP]', str); },
      reconnectDelay: 3000,
      connectHeaders: token ? { Authorization: `Bearer ${token}` } as any : undefined,
    });
    clientRef.current = client;

    client.onConnect = () => {
      try { console.log('[WS] connected'); } catch {}
  // Subscribe to user notifications queue
      client.subscribe('/user/queue/notifications', (message: IMessage) => {
        try { console.log('[WS] /user/queue/notifications message', { body: message?.body?.slice?.(0, 200) }); } catch {}
        const now = new Date();
        let parsed: any = undefined;
        try { parsed = message?.body ? JSON.parse(message.body) : undefined; } catch {}
        const body = parsed?.message || message?.body || '';
        const n: Notification = {
          id: `${now.getTime()}_${Math.random().toString(36).slice(2)}`,
          type: parsed?.type || 'post',
          message: body,
          userId: parsed?.userId || '',
          targetUserId: parsed?.targetUserId || '',
          postId: parsed?.postId,
          postTitle: parsed?.postTitle,
          communityName: parsed?.communityName,
          pending: parsed?.pending ?? true,
          timestamp: { toDate: () => now } as any,
          read: false,
        } as Notification;
        try { console.log('[WS] mapped notification', { type: n.type, postId: n.postId, pending: n.pending }); } catch {}
        setNotifState(prev => {
          const notifications = [n, ...prev.notifications];
          const unreadCount = notifications.filter(x => !x.read).length;
          return { ...prev, notifications, unreadCount };
        });
      });
      // Fallback/broadcast topic for admins
      if (role === 'admin') {
        try { console.log('[WS] subscribing /topic/admin-notifications'); } catch {}
        client.subscribe('/topic/admin-notifications', (message: IMessage) => {
          try { console.log('[WS] /topic/admin-notifications message', { body: message?.body?.slice?.(0, 200) }); } catch {}
          const now = new Date();
          let parsed: any = undefined;
          try { parsed = message?.body ? JSON.parse(message.body) : undefined; } catch {}
          const body = parsed?.message || message?.body || '';
          const n: Notification = {
            id: `${now.getTime()}_${Math.random().toString(36).slice(2)}`,
            type: parsed?.type || 'post',
            message: body,
            userId: parsed?.userId || '',
            targetUserId: parsed?.targetUserId || '',
            postId: parsed?.postId,
            postTitle: parsed?.postTitle,
            communityName: parsed?.communityName,
            pending: parsed?.pending ?? true,
            timestamp: { toDate: () => now } as any,
            read: false,
          } as Notification;
          try { console.log('[WS] mapped admin notification', { type: n.type, postId: n.postId, pending: n.pending }); } catch {}
          setNotifState(prev => {
            const notifications = [n, ...prev.notifications];
            const unreadCount = notifications.filter(x => !x.read).length;
            return { ...prev, notifications, unreadCount };
          });
        });
      }
    };

  client.onStompError = (frame: any) => {
      try { console.error('[WS] stomp error', frame?.headers?.message, frame?.body); } catch {}
    };
    (client as any).onWebSocketClose = (evt: any) => {
      try { console.warn('[WS] socket closed', { code: evt?.code, reason: evt?.reason }); } catch {}
    };

    client.activate();
    return () => {
      try { console.log('[WS] deactivate'); } catch {}
      client.deactivate();
      clientRef.current = null;
    };
  }, [enabled, setNotifState]);
}
export default useStompNotifications;
