import request from './request';

export interface AnswerPayload { id?: number | string; content: string }
export interface QuestionPayload {
  id?: number | string;
  content: string;
  type?: string; // e.g., 'single' | 'multiple' | 'text'
  answers?: AnswerPayload[];
}

export async function getQuestions(params?: Record<string, any>) {
  const { data } = await request.get('/quiz/get', { params });
  return data;
}

export async function createQuestion(payload: QuestionPayload) {
  const { data } = await request.post('/quiz/create', payload);
  return data;
}

export async function updateQuestion(payload: QuestionPayload) {
  const { data } = await request.put('/quiz/update', payload);
  return data;
}

export async function deleteQuestion(id: number | string) {
  const { data } = await request.post('/quiz/delete', { id });
  return data;
}

export default { getQuestions, createQuestion, updateQuestion, deleteQuestion };
