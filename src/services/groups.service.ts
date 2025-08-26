import request from "./request";

export type Group = {
  id: number | string;
  name: string;
  description?: string;
  imageURL?: string | null;
  createdAt?: string;
  ownerId?: string | number;
};

function normalizeGroup(item: any): Group | null {
  if (!item || typeof item !== "object") return null;
  const id = item.id ?? item.groupId ?? item._id ?? item.code ?? item.uuid;
  const name = item.name ?? item.groupName ?? item.title ?? item.displayName;
  if (id == null || !name) return null;
  return {
    id,
    name,
    description: item.description ?? item.desc ?? item.bio ?? item.about ?? item.summary ?? undefined,
    imageURL: item.imageURL ?? item.imageUrl ?? item.avatar ?? null,
    createdAt: item.createdAt ?? item.createAt ?? item.created_date ?? undefined,
    ownerId: item.ownerId ?? item.owner ?? item.userId ?? undefined,
  };
}

function extractList(raw: any): any[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw.data)) return raw.data;
  if (Array.isArray(raw.groups)) return raw.groups;
  if (raw.data && Array.isArray(raw.data.groups)) return raw.data.groups;
  if (raw.data && Array.isArray(raw.data.list)) return raw.data.list;
  if (raw.data && Array.isArray(raw.data.content)) return raw.data.content;
  if (Array.isArray(raw.content)) return raw.content;
  if (Array.isArray(raw.items)) return raw.items;
  return [];
}

export const getGroupsByUser = async () => {
  const res = await request.get("group/get/by-user");
  const raw = res.data;
  const list = extractList(raw);
  const mapped = list
    .map((g) => normalizeGroup(g))
    .filter(Boolean) as Group[];
  // If mapping falls through but backend returned a single object
  if (mapped.length === 0 && raw && typeof raw === "object" && !Array.isArray(raw)) {
    const single = normalizeGroup(raw) || normalizeGroup(raw.data);
    if (single) return [single];
  }
  return mapped;
};

export const createGroup = async (payload: { name: string; description?: string }) => {
  const res = await request.post("group/create", payload);
  const raw = res.data;
  // Some backends return the created entity directly, others wrap under data
  const obj = (raw && typeof raw === "object") ? (raw.data ?? raw.group ?? raw) : raw;
  const normalized = normalizeGroup(obj);
  return normalized || (obj as Group);
};

export const joinGroup = async (communityId: string | number) => {
  const res = await request.post("group/join", { communityId });
  return res.data;
};

export const renameGroup = async (communityId: string | number, name: string) => {
  const res = await request.post("group/rename", { communityId, name });
  return res.data;
};

export const addAdmin = async (communityId: string | number, userId: string | number, role: 'admin' | 'moderator' = 'admin') => {
  const res = await request.post("group/add-admin", { communityId, userId, role });
  return res.data;
};

export default { getGroupsByUser, createGroup, joinGroup, renameGroup, addAdmin };
