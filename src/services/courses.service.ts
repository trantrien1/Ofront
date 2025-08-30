import request from './request';

export interface CoursePayload {
  courseId?: string | number;
  id?: string | number;
  title?: string;
  name?: string;
  description?: string;
  imageUrl?: string;
  // add more fields as backend expects
}

export async function createCourse(payload: CoursePayload) {
  const { data } = await request.post('/course/create', payload);
  return data;
}

export async function updateCourse(payload: CoursePayload) {
  const { data } = await request.put('/course/update', payload);
  return data;
}

export async function deleteCourse(courseId: string | number, extra?: Record<string, any>) {
  // Use POST to call local API proxy (which will use DELETE upstream). Allow extra flags like cascade.
  const payload = { courseId, ...(extra || {}) };
  const { data } = await request.post('/course/delete', payload);
  return data;
}

export async function getCourses(params?: Record<string, any>) {
  const { data } = await request.get('/course/get', { params });
  return data;
}

export default {
  createCourse,
  updateCourse,
  deleteCourse,
  getCourses,
};
