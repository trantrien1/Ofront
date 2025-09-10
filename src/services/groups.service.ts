import request from "./request";
import nookies from 'nookies';

export type Group = {
  id: number | string;
  name: string;
  description?: string;
  imageURL?: string | null;
  createdAt?: string;
  ownerId?: string | number;
  privacyType?: string;
  userRole?: string; // backend-provided role for current user when using get/by-user
  numberOfMembers?: number; // mapped from various backend keys
};

function normalizeGroup(item: any): Group | null {
  if (!item || typeof item !== "object") return null;
  const id = item.id ?? item.groupId ?? item.communityId ?? item.categoryId ?? item._id ?? item.code ?? item.uuid;
  const name = item.name ?? item.groupName ?? item.communityName ?? item.title ?? item.displayName ?? item.label;
  if (id == null || !name) return null;
  // Derive member count from common keys
  const countKeys = [
  'numberOfMembers','memberCount','membersCount','numMembers','totalMembers','participantsCount','followersCount','subscriberCount','quantityMember','numberOfMember','countUserJoin'
  ] as const;
  let membersCount: number | undefined = undefined;
  for (const k of countKeys) {
    const v = (item as any)[k];
    if (typeof v === 'number') { membersCount = v; break; }
    if (typeof v === 'string' && v.trim() !== '' && !isNaN(Number(v))) { membersCount = Number(v); break; }
  }
  // Fallback to array lengths if present
  if (membersCount == null) {
    const maybeArrays = ['members','users','participants','followers'];
    for (const k of maybeArrays) {
      const v = (item as any)[k];
      if (Array.isArray(v)) { membersCount = v.length; break; }
    }
  }
  return {
    id,
    name,
    description: item.description ?? item.desc ?? item.bio ?? item.about ?? item.summary ?? item.note ?? undefined,
    imageURL: item.imageURL ?? item.imageUrl ?? item.image ?? item.thumbnail ?? item.avatar ?? null,
    createdAt: item.createdAt ?? item.createAt ?? item.created_date ?? undefined,
    ownerId: item.ownerId ?? item.owner ?? item.userId ?? undefined,
  privacyType: (item.privacyType || item.communityType || item.visibility || '').toLowerCase() || undefined,
  userRole: (item.userRole || item.role || '').toLowerCase() || undefined,
  numberOfMembers: typeof membersCount === 'number' ? membersCount : undefined,
  };
}

function extractList(raw: any): any[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  // common wrappers
  if (Array.isArray(raw.data)) return raw.data;
  if (Array.isArray(raw.groups)) return raw.groups;
  if (raw.data && Array.isArray(raw.data.groups)) return raw.data.groups;
  if (raw.data && Array.isArray(raw.data.list)) return raw.data.list;
  if (raw.data && Array.isArray(raw.data.content)) return raw.data.content;
  if (Array.isArray(raw.content)) return raw.content;
  if (Array.isArray(raw.items)) return raw.items;
  // other known shapes
  if (raw.page && Array.isArray(raw.page.content)) return raw.page.content;
  if (raw.result && Array.isArray(raw.result.items)) return raw.result.items;
  if (raw.data && raw.data.page && Array.isArray(raw.data.page.content)) return raw.data.page.content;
  if (raw.payload && Array.isArray(raw.payload)) return raw.payload;

  // Robust BFS with depth tracking
  const visited = new Set<any>();
  type Q = { node: any; depth: number };
  const queue: Q[] = [];
  const push = (n: any, d: number) => {
    if (!n || typeof n !== 'object') return;
    if (visited.has(n)) return;
    visited.add(n);
    queue.push({ node: n, depth: d });
  };
  push(raw, 0);
  const maxDepth = 6; // allow reasonably deep wrappers
  while (queue.length) {
    const { node, depth } = queue.shift() as Q;
    if (Array.isArray(node)) {
      const arr = node as any[];
      if (arr.length === 0) return arr;
      if (arr.every((e) => typeof e === 'object')) return arr;
      continue;
    }
    if (node && typeof node === 'object') {
      // If this is an object-map of objects, convert to array
      const vals = Object.values(node);
      if (vals.length && vals.every((v) => v && typeof v === 'object' && !Array.isArray(v))) {
        return vals as any[];
      }
      for (const key of Object.keys(node)) {
        const val = (node as any)[key];
        if (Array.isArray(val)) {
          const arr = val as any[];
          if (arr.length === 0) return arr;
          if (arr.every((e) => typeof e === 'object')) return arr;
        } else if (val && typeof val === 'object' && depth < maxDepth) {
          push(val, depth + 1);
        }
      }
    }
  }
  return [];
}

// Simple in-memory cache to prevent duplicate calls in quick succession
let __groupsByUserCache: { ts: number; data: Group[] } | null = null;
let __groupsByUserInflight: Promise<Group[]> | null = null;

// Expose a way to clear caches (useful on logout or account switch)
export const clearGroupsCache = () => {
  __groupsByUserCache = null;
  __groupsByUserInflight = null as any;
};

export const getGroupsByUser = async (
  opts?: { force?: boolean; ttlMs?: number }
): Promise<Group[]> => {
  const ttl = Math.max(0, opts?.ttlMs ?? 30_000); // default 30s TTL
  const now = Date.now();
  if (!opts?.force && __groupsByUserCache && (now - __groupsByUserCache.ts) < ttl) {
    return __groupsByUserCache.data;
  }
  if (__groupsByUserInflight) return __groupsByUserInflight;

  __groupsByUserInflight = (async () => {
    const res = await request.get("group/get/by-user");
    const raw = res.data;
    const list = extractList(raw);
    const mapped = list
      .map((g) => normalizeGroup(g))
      .filter(Boolean) as Group[];
    // If mapping falls through but backend returned a single object
    let result = mapped;
    if (result.length === 0 && raw && typeof raw === "object" && !Array.isArray(raw)) {
      const single = normalizeGroup(raw) || normalizeGroup((raw as any).data);
      if (single) result = [single];
    }
    __groupsByUserCache = { ts: Date.now(), data: result };
    return result;
  })()
    .finally(() => { __groupsByUserInflight = null; });

  return __groupsByUserInflight;
};

export const getGroupById = async (id: string | number): Promise<Group | null> => {
  // 0) Try direct by-id endpoint if available
  try {
    const res = await request.get(`group/get/${encodeURIComponent(String(id))}`);
    const obj = (res.data && typeof res.data === 'object') ? (res.data.data ?? res.data.group ?? res.data) : res.data;
    const norm = normalizeGroup(obj);
    if (norm) return norm;
  } catch (_) {}
  // Strategy aligned to backend: search via by-user and get/all
  // 1) by-user list then find
  try {
    const res = await request.get(`group/get/by-user`);
    const list = extractList(res.data);
    const found = list.find((g: any) => String(g.id ?? g.groupId ?? g.code ?? g._id) === String(id));
    const norm = normalizeGroup(found);
    if (norm) return norm;
  } catch (_) {}

  // 2) get/all?name and get/all search
  try {
    const byName = await request.get(`group/get/all`, { params: { name: String(id) } as any });
    const list = extractList(byName.data);
    const found = list.find((g: any) => String(g.id ?? g.groupId ?? g.code ?? g._id) === String(id) || String(g.name ?? g.displayName ?? '') === String(id));
    const norm = normalizeGroup(found);
    if (norm) return norm;
  } catch (_) {}
  try {
    const all = await request.get(`group/get/all`);
    const list = extractList(all.data);
    const found = list.find((g: any) => String(g.id ?? g.groupId ?? g.code ?? g._id) === String(id));
    const norm = normalizeGroup(found);
    if (norm) return norm;
  } catch (_) {}
  return null;
};

export const createGroup = async (payload: { name: string; description?: string } & Record<string, any>) => {
  const res = await request.post("group/create", payload);
  const raw = res.data;
  // Some backends return the created entity directly, others wrap under data
  const obj = (raw && typeof raw === "object") ? (raw.data ?? raw.group ?? raw) : raw;
  const normalized = normalizeGroup(obj);
  return normalized || (obj as Group);
};

export const joinGroup = async (communityId: string | number) => {
  // Use local API: POST /api/group/join with { id }
  const id = communityId;
  const res = await request.post("group/join", { id });
  return res.data;
};

export const updateGroup = async (payload: { communityId: string | number; name?: string; description?: string } & Record<string, any>) => {
  const res = await request.post("group/update", payload);
  return res.data;
};

export const deleteGroup = async (id: string | number) => {
  // Upstream expects DELETE /group/delete/{id}
  const res = await request.delete(`group/delete/${encodeURIComponent(String(id))}`);
  return res.data;
};

export const leaveGroup = async (id: string | number, username?: string) => {
  // Call local API route which proxies to upstream and ensures token/cookies
  const payload: any = { id: String(id) };
  if (username) payload.username = username;
  const res = await request.delete(`group-member/delete`, { data: payload });
  return res.data;
};

export const updateGroupStatus = async (id: string | number, status: boolean) => {
  const res = await request.put("group/update-status", { id, status });
  return res.data;
};

export const getAllGroups = async (name?: string) => {
  try {
    const res = await request.get("group/get/all", { params: name ? { name } : undefined } as any);
    const raw = res.data;
    console.log('getAllGroups: API response raw=', raw);
    const list = extractList(raw);
    const mapped = list.map((g) => normalizeGroup(g)).filter(Boolean) as Group[];
    console.log('getAllGroups: extracted list length=', list.length, 'mapped length=', mapped.length);
    try { console.debug('GroupsService.getAllGroups: raw keys=', raw && typeof raw === 'object' ? Object.keys(raw) : typeof raw, 'count=', mapped.length); } catch {}
    if (mapped.length === 0 && raw && typeof raw === 'object' && !Array.isArray(raw)) {
      // Try normalize a single object response
      const single = normalizeGroup(raw) || normalizeGroup((raw as any).data);
      if (single) return [single];
    }
    return mapped;
  } catch (e: any) {
    console.log('getAllGroups: error=', e?.message || e);
    try { console.debug('GroupsService.getAllGroups: fallback [] due to', e?.message || e); } catch {}
    return [];
  }
};

export default { getGroupsByUser, getGroupById, getAllGroups, createGroup, joinGroup, updateGroup, deleteGroup, updateGroupStatus, leaveGroup };
