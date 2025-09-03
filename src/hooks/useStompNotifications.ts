import { useEffect, useMemo, useRef, useState } from "react";
import { Client, IMessage } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { useRecoilState } from "recoil";
import { notificationsState, Notification } from "../atoms/notificationsAtom";
import { getGroupsByUser, type Group } from "../services/groups.service";

/**
 * useStompNotifications — STOMP/SockJS bridge for Spring Boot
 *
 * ✅ SockJS (default) & native WS with fallback
 * ✅ Không nhét token vào URL khi dùng SockJS (tránh 400)
 * ✅ Gửi Authorization header + X-User-Role
 * ✅ Guard StrictMode/HMR, auto-reconnect, heartbeat
 * ✅ Subscribe queue cá nhân + topic admin + topic nhóm quản trị
 * ✅ Trạng thái kết nối (status/error/transport)
 *
 * ENV (tuỳ chọn):
 *  - NEXT_PUBLIC_WS_URL:      https://api.example.com/ws (KHÔNG /websocket)
 *  - NEXT_PUBLIC_WS_TRANSPORT: "auto" | "sockjs" | "native"  (mặc định auto)
 *  - NEXT_PUBLIC_WS_GROUP_TOPIC_TEMPLATES: 
 *      "/topic/group/{id}/admin-notifications,/topic/group/{id}/notifications"
 *  - NEXT_PUBLIC_WS_DEBUG:    "1" để bật log debug ở dev
 */

export type WsTransport = "auto" | "sockjs" | "native";
export type WsStatus = "idle" | "connecting" | "connected" | "disconnected" | "error";

export interface UseStompNotificationsOptions {
  enabled?: boolean;
  userQueue?: string;  // mặc định "/user/queue/notifications"
  adminTopic?: string; // mặc định "/topic/admin-notifications"
}

export interface UseStompNotificationsState {
  status: WsStatus;
  connected: boolean;
  error?: string | null;
  transportInUse: "sockjs" | "native" | null;
  client: Client | null; // advanced
}

// ---------------- utils ----------------
const isDev = process.env.NODE_ENV !== "production";
const debugOn = isDev && process.env.NEXT_PUBLIC_WS_DEBUG === "1";
const dlog = (...a: any[]) => debugOn && console.log("[WS]", ...a); // eslint-disable-line no-console
const dwarn = (...a: any[]) => console.warn("[WS]", ...a); // eslint-disable-line no-console
const derr = (...a: any[]) => console.error("[WS]", ...a); // eslint-disable-line no-console

function readCookie(name: string): string | undefined {
  try {
    const m = (document.cookie || "").match(new RegExp(`(?:^|; )${name}=([^;]+)`));
    if (!m) return undefined;
    const v = decodeURIComponent(m[1]);
    try { const p = JSON.parse(v); if (p?.token) return String(p.token); } catch {}
    return v;
  } catch { return undefined; }
}
function readLS(key: string): string | undefined {
  try {
    const v = window.localStorage.getItem(key);
    if (!v) return undefined;
    try { const p = JSON.parse(v); if (p?.token) return String(p.token); } catch {}
    return v;
  } catch { return undefined; }
}
function getToken(): string | undefined { return readCookie("token") || readLS("authToken"); }
function decodeRoleFromJwt(t?: string): string | "" {
  if (!t) return "";
  try {
    const mid = t.split(".")[1]; if (!mid) return "";
    const json = atob(mid.replace(/-/g, "+").replace(/_/g, "/"));
    const payload = JSON.parse(json);
    const r = payload?.role || (Array.isArray(payload?.roles) ? payload.roles[0] : undefined) || (payload?.isAdmin ? "admin" : undefined);
    return r ? String(r).toLowerCase() : "";
  } catch { return ""; }
}
function getRole(token?: string): string {
  const persisted = (typeof window !== "undefined" ? String(window.localStorage.getItem("role") || "") : "").toLowerCase();
  return persisted || decodeRoleFromJwt(token) || "";
}
function ensureWss(url: string): string { return url.replace(/^http:/i, "ws:").replace(/^https:/i, "wss:"); }
function normalizeWsUrl(baseUrl?: string): { base: string; sockBase: string } {
  const envUrl = baseUrl || "https://rehearten-production.up.railway.app/ws"; // không /websocket
  return { base: envUrl, sockBase: envUrl.replace(/\/?websocket$/i, "") };
}
function appendAuthQuery(url: string, token?: string, role?: string): string {
  if (!token && !role) return url;
  const sep = url.includes("?") ? "&" : "?";
  const tokenPart = token ? `token=${encodeURIComponent(token)}&access_token=${encodeURIComponent(token)}` : "";
  const rolePart = role ? `${token ? "&" : ""}role=${encodeURIComponent(role)}` : "";
  return `${url}${sep}${tokenPart}${rolePart}`;
}

function mapMessageToNotification(message: IMessage, role: string): Notification {
  const now = new Date();
  let parsed: any = undefined;
  try { parsed = message?.body ? JSON.parse(message.body) : undefined; } catch {}
  const typeRaw = (parsed?.type || parsed?.event || "").toString().toLowerCase();
  const isPostEvent = ["post", "post_created", "new_post", "create_post"].includes(typeRaw);
  const actor = parsed?.userName || parsed?.username || parsed?.authorName || parsed?.createdByName || parsed?.createdBy || parsed?.displayName || parsed?.email || parsed?.userId;
  const postTitle = parsed?.postTitle || parsed?.title;
  const community = parsed?.communityName || parsed?.community || parsed?.groupName || parsed?.group;
  const inGroupSuffix = community ? ` trong nhóm ${community}` : "";
  const adminMessage = `${actor || "Người dùng"} đã đăng một bài mới${inGroupSuffix}${postTitle ? `: "${postTitle}"` : ""}`;
  const body = (role === "admin" && isPostEvent) ? adminMessage : (parsed?.message || message?.body || "");
  const n: Notification = {
    id: `${now.getTime()}_${Math.random().toString(36).slice(2)}`,
    type: parsed?.type || (isPostEvent ? "post" : "post"),
    message: body,
    userId: parsed?.userId || "",
    targetUserId: parsed?.targetUserId || "",
    postId: parsed?.postId,
    postTitle: parsed?.postTitle || parsed?.title,
    communityName: community,
    pending: parsed?.pending ?? true,
    timestamp: { toDate: () => now } as any,
    read: false,
  } as Notification;
  return n;
}

// --------------- hook -------------------
export function useStompNotifications({ enabled = true, userQueue = "/user/queue/notifications", adminTopic = "/topic/admin-notifications" }: UseStompNotificationsOptions = {}): UseStompNotificationsState {
  const [notifState, setNotifState] = useRecoilState(notificationsState);
  const clientRef = useRef<Client | null>(null);
  const subsRef = useRef<{ [dest: string]: { unsubscribe: () => void } } >({});
  const startedRef = useRef(false); // guard StrictMode

  const [status, setStatus] = useState<WsStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [transportInUse, setTransportInUse] = useState<"sockjs" | "native" | null>(null);

  const env = useMemo(() => {
    const transportEnv = (process.env.NEXT_PUBLIC_WS_TRANSPORT || "auto").toLowerCase() as WsTransport;
    const { base, sockBase } = normalizeWsUrl(process.env.NEXT_PUBLIC_WS_URL);
  const sockTokenMode = (process.env.NEXT_PUBLIC_WS_SOCKJS_TOKEN_MODE || "none").toLowerCase(); // "none" | "query"
    const token = getToken();
    const role = getRole(token);
  return { transportEnv, base, sockBase, sockTokenMode, token, role };
  }, []);

  useEffect(() => {
    if (!enabled) return;
    if (typeof window === "undefined") return;
    if (startedRef.current) { dlog("already active, skip init"); return; }

  const { transportEnv, base, sockBase, sockTokenMode, token, role } = env;

    setStatus("connecting"); setError(null);

    // IMPORTANT: không append token vào URL khi dùng SockJS
  // SockJS URL: optionally include token via query when server requires it
  const urlSockJsBase = sockTokenMode === "query" ? appendAuthQuery(sockBase, token, role) : sockBase;
    const urlNative = ensureWss(appendAuthQuery(base, token, role));

    dlog("init", { transportEnv, urlNative, urlSockJsBase, hasToken: !!token, tokenLen: token?.length || 0, role });

    // chọn transport
    let socketLike: any; let transport: "sockjs" | "native" = "sockjs";
    if (transportEnv === "native") {
      try {
        socketLike = new (window as any).WebSocket(urlNative);
        transport = "native";
      } catch (e) {
        dwarn("native WS failed, fallback SockJS", e);
      }
    }
    if (!socketLike) {
      socketLike = new SockJS(urlSockJsBase, undefined as any, {
        transports: ["websocket", "xhr-streaming", "xhr-polling"],
        transportOptions: {
          "xhr-streaming": { withCredentials: true },
          "xhr-polling": { withCredentials: true },
        },
        timeout: 10000,
      });
      transport = "sockjs";
    }
    setTransportInUse(transport);

  const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    if (role)  headers["X-User-Role"] = role;

    const client = new Client({
      webSocketFactory: () => socketLike,
      reconnectDelay: 3000,
      heartbeatIncoming: 15000,
      heartbeatOutgoing: 15000,
      debug: (str: string) => { if (debugOn) console.log("[STOMP]", str); },
      connectHeaders: headers,
    });

    clientRef.current = client;

    const subscribeOnce = (dest: string, cb: (m: IMessage) => void) => {
      if (!dest || subsRef.current[dest]) return;
      dlog("subscribing", dest);
      subsRef.current[dest] = client.subscribe(dest, cb);
    };

    client.onConnect = async () => {
      dlog("connected", { transport });
      setStatus("connected"); setError(null);

      // thông báo local cho admin một lần trong session
      try {
        if (role === "admin" && !(window as any).__wsAdminConnectNotified) {
          const now = new Date();
          const n: Notification = {
            id: `ws_connected_${now.getTime()}`,
            type: "system" as any,
            message: "ĐÃ KẾT NỐI TỚI WEBSOCKET ✅",
            userId: "", targetUserId: "", pending: false,
            timestamp: { toDate: () => now } as any,
            read: false,
          } as Notification;
          setNotifState(prev => {
            const notifications = [n, ...prev.notifications];
            const unreadCount = notifications.filter(x => !x.read).length;
            return { ...prev, notifications, unreadCount };
          });
          (window as any).__wsAdminConnectNotified = true;
        }
      } catch {}

      // queue cá nhân
      subscribeOnce(userQueue, (message: IMessage) => {
        dlog("msg", userQueue, message?.body?.slice?.(0, 200));
        const n = mapMessageToNotification(message, role);
        setNotifState(prev => {
          const notifications = [n, ...prev.notifications];
          const unreadCount = notifications.filter(x => !x.read).length;
          return { ...prev, notifications, unreadCount };
        });
      });

      // topic admin + topic nhóm được quản trị
      if (role === "admin") {
        subscribeOnce(adminTopic, (message: IMessage) => {
          dlog("msg", adminTopic, message?.body?.slice?.(0, 200));
          const n = mapMessageToNotification(message, role);
          setNotifState(prev => {
            const notifications = [n, ...prev.notifications];
            const unreadCount = notifications.filter(x => !x.read).length;
            return { ...prev, notifications, unreadCount };
          });
        });

        try {
          const list = await getGroupsByUser({ ttlMs: 30000 } as any);
          const managed = (Array.isArray(list) ? list : []).filter((g: Group) => {
            const r = String(g?.userRole || "").toLowerCase();
            return r.includes("admin") || r.includes("owner") || r.includes("moderator") || r.includes("mod");
          });
          const tmplRaw = (process.env.NEXT_PUBLIC_WS_GROUP_TOPIC_TEMPLATES || "/topic/group/{id}/admin-notifications,/topic/group/{id}/notifications").split(",");
          const templates = tmplRaw.map(s => s.trim()).filter(Boolean);
          for (const g of managed) {
            const gid = String((g as any).id);
            for (const t of templates) {
              const dest = t.replace("{id}", gid);
              subscribeOnce(dest, (message: IMessage) => {
                dlog("group msg", { dest, body: message?.body?.slice?.(0, 200) });
                const n = mapMessageToNotification(message, role);
                if (!n.communityName && (g as any)?.name) (n as any).communityName = (g as any).name;
                setNotifState(prev => {
                  const notifications = [n, ...prev.notifications];
                  const unreadCount = notifications.filter(x => !x.read).length;
                  return { ...prev, notifications, unreadCount };
                });
              });
            }
          }
        } catch (e) { dwarn("subscribe group topics failed", e); }
      }
    };

    client.onStompError = (frame: any) => {
      const msg = frame?.headers?.message || frame?.body || "STOMP error";
      derr("stomp error", msg);
      setStatus("error"); setError(String(msg));
    };
    (client as any).onWebSocketError = (evt: any) => {
      derr("socket error", evt); setStatus("error"); setError(evt?.message || "WebSocket error");
    };
    (client as any).onWebSocketClose = (evt: any) => {
      dwarn("socket closed", { code: evt?.code, reason: evt?.reason });
      setStatus("disconnected"); // @stomp/stompjs sẽ tự reconnect nếu reconnectDelay > 0
    };

    client.activate();
    startedRef.current = true;

    return () => {
      try {
        dlog("teardown: unsubscribe & deactivate");
        Object.values(subsRef.current).forEach(s => { try { s.unsubscribe(); } catch {} });
        subsRef.current = {};
        client.deactivate();
      } catch (e) { dwarn("teardown error", e); }
      finally {
        clientRef.current = null;
        startedRef.current = false;
        setTransportInUse(null);
        setStatus("idle"); setError(null);
      }
    };
  }, [enabled, env, setNotifState]);

  return {
    status,
    connected: status === "connected",
    error,
    transportInUse,
    client: clientRef.current,
  };
}

export default useStompNotifications;
