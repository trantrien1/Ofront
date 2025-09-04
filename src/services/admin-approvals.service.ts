import request from "./request";

export type PendingPost = {
  id: number | string;
  title?: string;
  content?: string;
  userOfPost?: any;
  group?: any;
  status?: number;
  createdAt?: string;
};

export const getPendingPosts = async (): Promise<PendingPost[]> => {
  try {
    const res = await request.get("admin/pending-posts");
    const data = res.data;
    // Normalize to array of posts
    if (Array.isArray(data)) return data as PendingPost[];
    if (data && Array.isArray(data.data)) return data.data as PendingPost[];
    // If not an array, throw to let UI show upstream error
    throw new Error(typeof data === 'string' ? data : JSON.stringify(data));
  } catch (e) {
    // Rethrow so caller can surface error details
    throw e;
  }
};

export const approvePostById = async (id: number | string) => {
  const res = await request.put(`admin/approve-post`, null, { params: { id } });
  return res.data;
};

export default { getPendingPosts, approvePostById };
