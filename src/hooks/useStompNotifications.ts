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
    if ((window as any).__wsActive && clientRef.current) {
      try { console.log('[WS] already active, skipping re-init'); } catch {}
      return;
    }
  const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'https://rehearten-production.up.railway.app/ws';
  const transportPref = (process.env.NEXT_PUBLIC_WS_TRANSPORT || '').toLowerCase(); // 'sockjs' | 'native'
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
    // Resolve role: prefer persisted (cookie/localStorage), else try to decode from JWT
    const readCookie = (name: string) => {
      try {
        const cookie = document.cookie || '';
        const m = cookie.match(new RegExp('(?:^|; )' + name + '=([^;]+)'));
        if (m && m[1]) return decodeURIComponent(m[1]);
      } catch {}
      return '';
    };
    const cookieRole = (readCookie('role') || readCookie('ROLE') || readCookie('userRole') || readCookie('USER_ROLE') || '').toLowerCase();
    const lsRole = (typeof window !== 'undefined' ? String(window.localStorage.getItem('role') || '') : '').toLowerCase();
    const persistedRole = cookieRole || lsRole;
    const decodeRoleFromJwt = (t?: string): string | '' => {
      if (!t) return '';
      try {
        const part = t.split('.')[1];
        const json = atob(part.replace(/-/g, '+').replace(/_/g, '/'));
        const payload = JSON.parse(json);
        const r = payload?.role || (Array.isArray(payload?.roles) ? payload.roles[0] : undefined) || (payload?.isAdmin ? 'admin' : undefined);
        return r ? String(r).toLowerCase() : '';
      } catch { return ''; }
    };
    const role = persistedRole || decodeRoleFromJwt(token) || '';
    try {
      console.log('[WS] init', { wsUrl, hasToken: !!token, tokenLen: token ? token.length : 0, role });
      console.log('[WS] Đang chuẩn bị kết nối tới WebSocket...', wsUrl);
    } catch {}

  let wsUrlWithToken = wsUrl;
  if (token) {
    const sep = wsUrl.includes('?') ? '&' : '?';
    // Send both param names for compatibility with various backends, plus role if available
    const roleParam = role ? `&role=${encodeURIComponent(role)}` : '';
    wsUrlWithToken = `${wsUrl}${sep}token=${encodeURIComponent(token)}&access_token=${encodeURIComponent(token)}${roleParam}`;
  }
  try { console.log('[WS] connecting', { wsUrlWithToken, transportPref: transportPref || 'sockjs' }); } catch {}
  // Prefer native WebSocket when requested, otherwise SockJS with sensible fallbacks
  const socketLike: any = (() => {
    if (transportPref === 'native') {
      try {
        let nativeUrl = wsUrlWithToken;
        // Convert http/https -> ws/wss if needed
        if (/^https?:/i.test(nativeUrl)) {
          nativeUrl = nativeUrl.replace(/^http:/i, 'ws:').replace(/^https:/i, 'wss:');
        }
        // If the path looks like SockJS base '/ws' without explicit '/websocket', append it to match server
        if (!/\/websocket(\?|$)/i.test(nativeUrl) && /\/ws(\?|$)/i.test(nativeUrl)) {
          nativeUrl = nativeUrl.replace(/\/ws(\?|$)/i, '/ws/websocket$1');
        }
        try { console.log('[WS] using native WebSocket', { nativeUrl }); } catch {}
        return new (window as any).WebSocket(nativeUrl);
      } catch (e) {
        try { console.warn('[WS] native WebSocket failed, falling back to SockJS', e); } catch {}
      }
    }
    const options: any = {
      transports: ['websocket', 'xhr-streaming', 'xhr-polling'],
      transportOptions: {
        'xhr-streaming': { withCredentials: true },
        'xhr-polling': { withCredentials: true },
      },
      timeout: 10000,
    };
    return new SockJS(wsUrlWithToken, undefined as any, options);
  })();
    const client = new Client({
      webSocketFactory: () => socketLike as any,
      debug: (str: string) => { if (process.env.NODE_ENV !== 'production') console.log('[STOMP]', str); },
      reconnectDelay: 3000,
  connectHeaders: token ? ({ Authorization: `Bearer ${token}`, ...(role ? { 'X-User-Role': role } : {}) } as any) : (role ? ({ 'X-User-Role': role } as any) : undefined),
    });
    clientRef.current = client;

    client.onConnect = () => {
      try {
        console.log('[WS] connected');
        console.log('ĐÃ KẾT NỐI TỚI WEBSOCKET ✅', { at: new Date().toISOString(), url: wsUrlWithToken });
      } catch {}
  // No local notification for WS connect to avoid confusion in the UI
  // Subscribe to user notifications queue
      client.subscribe('/user/queue/notifications', (message: IMessage) => {
        try { console.log('[WS] /user/queue/notifications message', { body: message?.body?.slice?.(0, 200) }); } catch {}
        const now = new Date();
        let parsed: any = undefined;
        try { parsed = message?.body ? JSON.parse(message.body) : undefined; } catch {}
        const bodyStr = (typeof message?.body === 'string') ? message.body : '';
        const extractActor = (s: string): string | undefined => {
          try {
            // Vietnamese patterns sent by backend
            let m = s.match(/Người dùng\s+([^:\n]+?)\s+(?:mới đăng|đã đăng)/i);
            if (m && m[1]) return m[1].trim();
            m = s.match(/^\s*([^:\n]+?)\s+đã đăng/i);
            if (m && m[1]) return m[1].trim();
          } catch {}
          return undefined;
        };
        // Build a clear message for admins: "<username> đã đăng một bài mới ..."
        const typeRaw = (parsed?.type || parsed?.event || '').toString().toLowerCase();
        const isPostEvent = ['post', 'post_created', 'new_post', 'create_post'].includes(typeRaw);
        const actor = parsed?.userName || parsed?.username || parsed?.authorName || parsed?.createdByName || parsed?.createdBy || parsed?.displayName || parsed?.email || parsed?.userId || extractActor(bodyStr);
  const postTitle = parsed?.postTitle || parsed?.title;
  const community = parsed?.communityName || parsed?.community || parsed?.groupName || parsed?.group;
  const adminMessage = `${actor || 'Người dùng'} đã đăng một bài mới${community ? ` trong nhóm ${community}` : ''}${postTitle ? `: "${postTitle}"` : ''}`;
        const body = (role === 'admin' && isPostEvent) ? adminMessage : (parsed?.message || message?.body || '');
        // Debug log to ensure correct mapping for user queue
        try {
          const logForDebug = {
            src: '/user/queue/notifications',
            rawBodyFirst200: bodyStr.slice(0, 200),
            parsedKeys: parsed ? Object.keys(parsed).slice(0, 10) : [],
            typeRaw,
            isPostEvent,
            actor,
            finalMessage: body,
          };
          console.log('[WS][MAP] user-queue mapped =>', logForDebug);
        } catch {}
        const n: Notification = {
          id: `${now.getTime()}_${Math.random().toString(36).slice(2)}`,
          type: parsed?.type || 'post',
          message: body,
          userId: (actor as any) || parsed?.userId || '',
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
          const bodyStr = (typeof message?.body === 'string') ? message.body : '';
          const extractActor = (s: string): string | undefined => {
            try {
              let m = s.match(/Người dùng\s+([^:\n]+?)\s+(?:mới đăng|đã đăng)/i);
              if (m && m[1]) return m[1].trim();
              m = s.match(/^\s*([^:\n]+?)\s+đã đăng/i);
              if (m && m[1]) return m[1].trim();
            } catch {}
            return undefined;
          };
          // Build a clear message for admins: "<username> đã đăng một bài mới ..."
          const typeRaw = (parsed?.type || parsed?.event || '').toString().toLowerCase();
          const isPostEvent = ['post', 'post_created', 'new_post', 'create_post'].includes(typeRaw);
          const actor = parsed?.userName || parsed?.username || parsed?.authorName || parsed?.createdByName || parsed?.createdBy || parsed?.displayName || parsed?.email || parsed?.userId || extractActor(bodyStr);
          const postTitle = parsed?.postTitle || parsed?.title;
          const community = parsed?.communityName || parsed?.community || parsed?.groupName || parsed?.group;
          const adminMessage = `${actor || 'Người dùng'} đã đăng một bài mới${community ? ` trong nhóm ${community}` : ''}${postTitle ? `: "${postTitle}"` : ''}`;
          const body = isPostEvent ? adminMessage : (parsed?.message || message?.body || '');
          // Debug log to ensure correct mapping for admin topic
          try {
            console.log('[WS][MAP] admin-topic mapped =>', {
              rawBodyFirst200: bodyStr.slice(0, 200),
              parsedType: parsed?.type,
              event: parsed?.event,
              actor,
              isPostEvent,
              finalMessage: body,
            });
          } catch {}
          const n: Notification = {
            id: `${now.getTime()}_${Math.random().toString(36).slice(2)}`,
            type: parsed?.type || 'post',
            message: body,
            userId: (actor as any) || parsed?.userId || '',
            targetUserId: parsed?.targetUserId || '',
            postId: parsed?.postId,
            postTitle: parsed?.postTitle,
            communityName: parsed?.communityName,
            pending: Boolean(parsed?.pending), // hoặc parsed?.pending ?? false
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
      try { console.error('[WS] stomp error', { message: frame?.headers?.message, body: frame?.body }); } catch {}
    };
    (client as any).onWebSocketError = (evt: any) => {
      try { console.error('[WS] socket error', evt); } catch {}
    };
    (client as any).onWebSocketClose = (evt: any) => {
      try { console.warn('[WS] socket closed', { code: evt?.code, reason: evt?.reason }); } catch {}
    };

    client.activate();
    (window as any).__wsActive = true;

    // Admin polling fallback: periodically fetch notifications from REST and merge
    let poller: any = null;
    const startPolling = () => {
      if (poller || role !== 'admin') return;
      const intervalMs = 20000; // 20s
      const fetchAndMerge = async () => {
        try {
          const { NotificationsService } = await import('../services');
          const data: any[] = await NotificationsService.getUserNotifications('me' as any);
          const mapped = (Array.isArray(data) ? data : []).map((n: any) => {
            const when = n.createdAt ? new Date(n.createdAt) : new Date();
            return {
              id: n.id?.toString?.() || String(n.id || Math.random()),
              type: (n.type || 'post') as any,
              message: n.content || n.message || n.title || '',
              userId: n.userId || n.actorId || '',
              targetUserId: n.targetUserId || n.userId || '',
              postId: n.postId,
              commentId: n.commentId,
              postTitle: n.postTitle,
              communityName: n.communityName,
              pending: !!n.pending,
              timestamp: { toDate: () => when } as any,
              read: !!n.isRead,
            } as Notification;
          });
          setNotifState(prev => {
            // Merge by id and keep newest first
            const byId = new Map<string, Notification>();
            [...prev.notifications, ...mapped].forEach(item => { if (item?.id) byId.set(item.id, item); });
            const merged = Array.from(byId.values()).sort((a, b) => b.timestamp.toDate().getTime() - a.timestamp.toDate().getTime());
            const unreadCount = merged.filter(x => !x.read).length;
            return { ...prev, notifications: merged, unreadCount };
          });
        } catch (e) {
          // Silent fail; keep polling
        }
      };
      // Kick off immediately then interval
      fetchAndMerge();
      poller = setInterval(fetchAndMerge, intervalMs);
      try { console.log('[WS] admin polling fallback started'); } catch {}
    };
    startPolling();
    return () => {
      try { console.log('[WS] deactivate'); } catch {}
      client.deactivate();
      clientRef.current = null;
      (window as any).__wsActive = false;
      if (poller) {
        try { clearInterval(poller); } catch {}
        poller = null;
      }
    };
  }, [enabled]);
}
export default useStompNotifications;