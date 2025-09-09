import request from './request';

export interface VideoPayload {
  id?: number | string;
  title: string;
  description?: string;
  url: string;
  coureId: number | string; // per backend naming
}

export async function createVideo(payload: VideoPayload) {
  const { data } = await request.post('/course/video/create', payload);
  return data;
}

export async function getVideosByCourse(courseId: number | string) {
  const { data } = await request.get('/course/video/get-by-course', { params: { courseId } });
  return data;
}

// Đánh dấu video đã hoàn thành xem cho user hiện tại
export async function markVideoCompleted(videoId: number | string) {
  // Backend: POST /user-video/create/{videoId}
  await request.post(`/user-video/create/${encodeURIComponent(String(videoId))}`);
  return true;
}

export async function updateVideo(payload: Partial<VideoPayload> & { id: number | string }) {
  const body: any = { id: payload.id };
  if (payload.title != null) body.title = payload.title;
  if (payload.url != null) body.url = payload.url as any;
  if (payload.description != null) body.description = payload.description;
  if (payload.coureId != null) body.coureId = payload.coureId;
  const { data } = await request.put('/video/update', body);
  return data;
}

export async function deleteVideo(id: number | string) {
  const { data } = await request.delete('/video/delete', { params: { id } } as any).catch(async (e) => {
    // Some servers may expect id in path; fallback to body
    try { const r = await request.delete('/video/delete', { data: { id } } as any); return r; } catch (err) { throw e; }
  });
  return data;
}

export default { createVideo, getVideosByCourse, markVideoCompleted, updateVideo, deleteVideo };
