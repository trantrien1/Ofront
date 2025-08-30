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

export default { createVideo, getVideosByCourse };
