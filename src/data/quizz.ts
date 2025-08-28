//dữ liệu trắc nghiệm tâm lí
export type QuizOption = {
  key: string;
  label: string;
  value: number;
};

export type QuizQuestion = {
  id: string;
  text: string;
};

export const likertOptions: QuizOption[] = [
  { key: "0", label: "Không bao giờ", value: 0 },
  { key: "1", label: "Hiếm khi", value: 1 },
  { key: "2", label: "Thỉnh thoảng", value: 2 },
  { key: "3", label: "Thường xuyên", value: 3 },
  { key: "4", label: "Luôn luôn", value: 4 },
];

export const quizQuestions: QuizQuestion[] = [
  { id: "q1", text: "Trong 2 tuần qua, bạn có cảm thấy lo lắng hoặc căng thẳng vô cớ?" },
  { id: "q2", text: "Bạn có khó tập trung vào công việc hoặc học tập?" },
  { id: "q3", text: "Bạn có khó ngủ, ngủ không sâu giấc hoặc thức dậy mệt mỏi?" },
  { id: "q4", text: "Bạn có cảm thấy dễ cáu gắt, khó chịu với người khác?" },
  { id: "q5", text: "Bạn có cảm giác buồn bã, chán nản hoặc thiếu động lực?" },
  { id: "q6", text: "Bạn có cảm thấy mệt mỏi, kiệt sức dù không hoạt động nặng?" },
  { id: "q7", text: "Bạn có suy nghĩ quá nhiều về một vấn đề và khó dừng lại?" },
  { id: "q8", text: "Bạn có cảm thấy bị áp lực bởi công việc/học tập/cuộc sống?" },
  { id: "q9", text: "Bạn có né tránh giao tiếp xã hội hoặc hoạt động thường ngày?" },
  { id: "q10", text: "Bạn có cảm thấy thiếu tự tin vào bản thân?" },
];

export function scoreQuiz(answers: Record<string, number>): { total: number; level: "low" | "medium" | "high"; label: string; color: string } {
  const total = Object.values(answers).reduce((s, v) => s + (Number.isFinite(v) ? v : 0), 0);
  // Max = 10 * 4 = 40
  let level: "low" | "medium" | "high" = "low";
  if (total >= 26) level = "high";
  else if (total >= 11) level = "medium";

  const label = level === "low" ? "Mức độ thấp" : level === "medium" ? "Mức độ trung bình" : "Mức độ cao";
  const color = level === "low" ? "green" : level === "medium" ? "yellow" : "red";
  return { total, level, label, color };
}
