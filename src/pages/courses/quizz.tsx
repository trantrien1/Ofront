import React, { useEffect, useMemo, useState } from "react";
import {
  Box, Button, Checkbox, CheckboxGroup, Flex, Heading, HStack,
  Radio, RadioGroup, Spacer, Stack, Text, useColorModeValue,
  useToast, Spinner
} from "@chakra-ui/react";
import Link from "next/link";
import { getClientRole, isAdminRole } from "../../helpers/role";
import { QuizService } from "../../services";

type Answer = { id?: string | number; content: string };
type Question = { id: string | number; content?: string; text?: string; type?: string; answers?: Answer[] };

type AnswersSingle = Record<string | number, string | number | string[]>;

const STORAGE_KEY = "ofront_quiz_answers_dyn_v1";

// DASS-21 index groups (1-based order)
const D_IDX = [3, 5, 10, 13, 16, 17, 21];
const A_IDX = [2, 4, 7, 9, 15, 19, 20];
const S_IDX = [1, 6, 8, 11, 12, 14, 18];

// ------- Utilities -------

// bỏ dấu + thường hóa để so cụm từ tiếng Việt robust hơn
const normalize = (s: string) =>
  s
    .normalize?.("NFD")
    .toLowerCase()
    .trim();

// map cụm từ → điểm (không phân biệt hoa/thường, có thể bỏ dấu)
const phraseToScore = (raw: string): number | null => {
  const l = normalize(raw);

  // Nhóm 0
  if (
    l.includes("khong bao gio") ||
    l.includes("khong dung") && (l.includes("chut nao") || !l.includes("phan nao")) // "không đúng (chút nào)"
  ) return 0;

  // Nhóm 1
  if (
    l.includes("thinh thoang") ||
    (l.includes("dung") && l.includes("phan nao")) || // "đúng phần nào"
    l.includes("doi khi")
  ) return 1;

  // Nhóm 2
  if (
    l.includes("thuong xuyen") ||
    (l.includes("kha dung") || l.includes("phan lon thoi gian"))
  ) return 2;

  // Nhóm 3
  if (
    l.includes("hau nhu luon luon") ||
    (l.includes("rat dung") || l.includes("hau het thoi gian"))
  ) return 3;

  return null;
};

// cố gắng lấy số 0..3 nếu chuỗi có chứa con số độc lập
const extractDigit03 = (raw: string): number | null => {
  // ưu tiên dạng "[0-3]" độc lập hoặc trước dấu cách/ký tự không chữ-số
  const m = raw.match(/(?:^|\D)([0-3])(?:\D|$)/);
  if (m) return parseInt(m[1], 10);
  return null;
};

// parse chuỗi/number thành 0..3 nếu có thể
const parseNumeric03 = (v: any): number | null => {
  if (v == null) return null;
  const s = String(v).trim();
  if (/^\d+$/.test(s)) {
    const n = parseInt(s, 10);
    if (n >= 0 && n <= 3) return n;
    // nếu dùng thang 1..4 → quy về 0..3
    if (n >= 1 && n <= 4) return n - 1;
    return null;
  }
  return null;
};

// Tính điểm 0..3 cho một câu hỏi dựa trên giá trị chọn
const scoreAnswer = (q: Question, val: any): number => {
  if (!q || val == null) return 0;
  const options = Array.isArray(q.answers) ? q.answers : [];

  // 1) Nếu value là số 0..3 / hoặc 1..4
  const numeric = parseNumeric03(val);
  if (numeric != null) return numeric;

  const vStr = String(val);

  // 2) Nếu value trùng id của option → dùng vị trí option (index 0..3)
  const idxById = options.findIndex(opt => String(opt.id ?? opt.content) === vStr);
  if (idxById >= 0) {
    // ưu tiên map index nếu danh sách có 4 lựa chọn chuẩn
    if (options.length === 4) return Math.max(0, Math.min(3, idxById));

    // nếu không đủ 4, thử đọc nội dung của option
    const content = options[idxById]?.content ?? "";
    const byPhrase = phraseToScore(content);
    if (byPhrase != null) return byPhrase;

    const byDigit = extractDigit03(content);
    if (byDigit != null) return byDigit;

    // fallback index
    return Math.max(0, Math.min(3, idxById));
  }

  // 3) Nếu value chính là content (một số form gửi thẳng content)
  const byPhrase = phraseToScore(vStr);
  if (byPhrase != null) return byPhrase;

  const byDigit = extractDigit03(vStr);
  if (byDigit != null) return byDigit;

  // 4) Bất khả kháng → 0
  return 0;
};

// Phân loại theo DASS-21 (điểm đã nhân đôi)
const classifyDepression = (score: number) =>
  score <= 9 ? "Bình thường" : score <= 13 ? "Nhẹ" : score <= 20 ? "Vừa" : score <= 27 ? "Nặng" : "Rất nặng";
const classifyAnxiety = (score: number) =>
  score <= 7 ? "Bình thường" : score <= 9 ? "Nhẹ" : score <= 14 ? "Vừa" : score <= 19 ? "Nặng" : "Rất nặng";
const classifyStress = (score: number) =>
  score <= 14 ? "Bình thường" : score <= 18 ? "Nhẹ" : score <= 25 ? "Vừa" : score <= 33 ? "Nặng" : "Rất nặng";

export default function QuizPage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [audience, setAudience] = useState<string>(""); // 'student' | 'worker' | 'teacher' | 'other'
  const [answers, setAnswers] = useState<AnswersSingle>({});
  const [submitted, setSubmitted] = useState(false);
  const [advice, setAdvice] = useState<string>("");
  const [adviceLoading, setAdviceLoading] = useState(false);
  const toast = useToast();

  const cardBg = useColorModeValue("white", "gray.800");
  const borderCol = useColorModeValue("gray.200", "gray.700");
  const adviceColor = useColorModeValue("gray.700", "gray.200");

  useEffect(() => {
    const r = getClientRole();
    setIsAdmin(isAdminRole(r));
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const data = await QuizService.getQuestions();
        const arr: any[] = Array.isArray(data)
          ? data
          : Array.isArray((data as any)?.data)
          ? (data as any).data
          : Array.isArray((data as any)?.content)
          ? (data as any).content
          : [];
        setQuestions(arr as Question[]);
      } catch (e: any) {
        toast({ status: "error", title: "Không tải được câu hỏi", description: e?.message || String(e) });
      }
    })();
  }, [toast]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setAnswers(JSON.parse(raw));
    } catch {}
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(answers));
    } catch {}
  }, [answers]);

  const handleChangeSingle = (qid: string | number, v: string) =>
    setAnswers((a) => ({ ...a, [qid]: v }));
  const handleChangeMulti = (qid: string | number, vals: string[]) =>
    setAnswers((a) => ({ ...a, [qid]: vals }));

  const filteredQuestions = useMemo(
    () => questions.filter((q) => (q.type || "student") === audience),
    [questions, audience]
  );

  // Tính DASS-21 khi đủ 21 câu
  const dass = useMemo(() => {
    if (filteredQuestions.length !== 21) return null as null | any;

    const sumFor = (idxArr: number[]) =>
      idxArr.reduce((acc, idx) => {
        const q = filteredQuestions[idx - 1];
        if (!q) return acc;
        const v = answers[q.id as any];
        const n = scoreAnswer(q, v);
        return acc + n;
        }, 0);

    const dRaw = sumFor(D_IDX);
    const aRaw = sumFor(A_IDX);
    const sRaw = sumFor(S_IDX);

    const d = dRaw * 2, a = aRaw * 2, s = sRaw * 2;

    return {
      depression: { raw: dRaw, score: d, level: classifyDepression(d) },
      anxiety:    { raw: aRaw, score: a, level: classifyAnxiety(a) },
      stress:     { raw: sRaw, score: s, level: classifyStress(s) },
    };
  }, [filteredQuestions, answers]);

  // Tính tạm khi chưa đủ câu
  const partialDass = useMemo(() => {
    if (filteredQuestions.length === 0) return null as null | any;

    const calc = (idxArr: number[]) =>
      idxArr.reduce(
        (acc, idx) => {
          const q = filteredQuestions[idx - 1];
          if (!q) return acc;
          const has = Object.prototype.hasOwnProperty.call(answers, q.id as any);
          if (!has) return acc;
          const n = scoreAnswer(q, answers[q.id as any]);
          return {
            sum: acc.sum + n,
            count: acc.count + 1,
            zeros: acc.zeros + (n === 0 ? 1 : 0),
          };
        },
        { sum: 0, count: 0, zeros: 0 }
      );

    const D = calc(D_IDX), A = calc(A_IDX), S = calc(S_IDX);
    const anyAnswered = D.count + A.count + S.count > 0;
    if (!anyAnswered) return null;

    return {
      depression: { raw: D.sum, answered: D.count, zeros: D.zeros, scaled: D.sum * 2 },
      anxiety:    { raw: A.sum, answered: A.count, zeros: A.zeros, scaled: A.sum * 2 },
      stress:     { raw: S.sum, answered: S.count, zeros: S.zeros, scaled: S.sum * 2 },
      totalAnswered: D.count + A.count + S.count,
    };
  }, [filteredQuestions, answers]);

  const handleSubmit = async () => {
    setSubmitted(true);
    setAdvice("");
    setAdviceLoading(true);
    try {
      const itemsBase = filteredQuestions;
      const answeredCountLocal = itemsBase.filter((q) => answers[q.id as any] !== undefined).length;
      if (answeredCountLocal === 0) {
        setSubmitted(false);
        setAdviceLoading(false);
        toast({ status: "warning", title: "Hãy trả lời ít nhất 1 câu trước khi nộp." });
        return;
      }
      if (filteredQuestions.length === 21) {
        const allAnswered = itemsBase.every((q) => answers[q.id as any] !== undefined);
        if (!allAnswered) {
          setSubmitted(false);
          setAdviceLoading(false);
          toast({ status: "warning", title: "Hãy trả lời đầy đủ 21 câu để tính điểm DASS-21." });
          return;
        }
      }

      // Lấy label hiển thị của lựa chọn
      const getAnswerLabel = (q: Question, val: any) => {
        const v = String(val);
        const opts = Array.isArray(q.answers) ? q.answers : [];
        const found = opts.find((opt) => String(opt.id ?? opt.content) === v);
        return found?.content ?? v;
      };

      const items = filteredQuestions.map((q, idx) => {
        const val = answers[q.id as any];
        const score = scoreAnswer(q, val);
        const answerText = val !== undefined ? getAnswerLabel(q, val) : "";
        return {
          order: idx + 1,
          id: q.id,
          question: q.content || q.text || String(q.id),
          answer: val ?? "",
          answerText,
          score,
        };
      });

      const r = await fetch("/api/quiz/advice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audience,
          items,
          dass,
          partialDass,
          totalQuestions: filteredQuestions.length,
          answeredCount: answeredCountLocal,
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || `HTTP ${r.status}`);
      setAdvice(String(data?.advice || ""));
    } catch (e: any) {
      setAdvice("");
      toast({ status: "error", title: "Không tạo được lời khuyên", description: e?.message || "Failed" });
    } finally {
      setAdviceLoading(false);
    }
  };

  const handleReset = () => {
    setAnswers({});
    setSubmitted(false);
    setAdvice("");
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  };

  // Đếm số câu đã trả lời trong bộ đang hiển thị (đúng hơn là đếm toàn bộ keys)
  const selectedCount = useMemo(
    () => filteredQuestions.filter((q) => answers[q.id as any] !== undefined).length,
    [filteredQuestions, answers]
  );

  

  return (
    <Box w="100%" px={{ base: 3, md: 6 }} py={6}>
      <Flex align="center" gap={3} mb={2}>
        <Heading size="lg">Trắc nghiệm</Heading>
        <Spacer />
        {isAdmin && (
          <Button as={Link} href="/admin/quiz" size="sm" colorScheme="blue" variant="outline">
            Quản lý câu hỏi
          </Button>
        )}
      </Flex>
      <Text color="gray.500" mb={4}>
        Chọn đối tượng phù hợp để hiển thị bộ câu hỏi.
      </Text>

      {/* Audience selector */}
      <HStack mb={6} spacing={3}>
        <Button variant={audience === "student" ? "solid" : "outline"} colorScheme="teal" size="sm" onClick={() => setAudience("student")}>
          Sinh viên
        </Button>
        <Button variant={audience === "worker" ? "solid" : "outline"} colorScheme="teal" size="sm" onClick={() => setAudience("worker")}>
          Người đi làm
        </Button>
        <Button variant={audience === "teacher" ? "solid" : "outline"} colorScheme="teal" size="sm" onClick={() => setAudience("teacher")}>
          Giảng viên
        </Button>
        <Button variant={audience === "other" ? "solid" : "outline"} colorScheme="teal" size="sm" onClick={() => setAudience("other")}>
          Khác
        </Button>
      </HStack>

      <Flex gap={6} align="start" flexDir={{ base: "column", lg: "row" }}>
        <Box flex={1}>
          {!audience ? (
            <Text color="gray.500">Hãy chọn đối tượng trước.</Text>
          ) : filteredQuestions.length === 0 ? (
            <Text color="gray.500">Chưa có câu hỏi.</Text>
          ) : (
            <Stack spacing={4}>
              {filteredQuestions.map((q, idx) => {
                const id = q.id;
                const label = q.content || q.text || `Câu hỏi #${idx + 1}`;
                const isMulti = false; // giữ mặc định single-choice
                const options = Array.isArray(q.answers) ? q.answers : [];

                return (
                  <Box key={String(id)} bg={cardBg} border="1px solid" borderColor={borderCol} borderRadius="md" p={4}>
                    <Text fontWeight="600" mb={3}>
                      {idx + 1}. {label}
                    </Text>

                    {isMulti ? (
                      <CheckboxGroup value={(answers[id] as string[]) || []} onChange={(vals) => handleChangeMulti(id, vals as string[])}>
                        <Stack>
                          {options.map((opt) => (
                            <Checkbox key={String(opt.id ?? opt.content)} value={String(opt.id ?? opt.content)}>
                              {opt.content}
                            </Checkbox>
                          ))}
                        </Stack>
                      </CheckboxGroup>
                    ) : (
                      <RadioGroup value={String(answers[id] ?? "")} onChange={(v) => handleChangeSingle(id, v)}>
                        <Stack>
                          {options.map((opt) => (
                            <Radio key={String(opt.id ?? opt.content)} value={String(opt.id ?? opt.content)}>
                              {opt.content}
                            </Radio>
                          ))}
                        </Stack>
                      </RadioGroup>
                    )}
                  </Box>
                );
              })}
            </Stack>
          )}

          <HStack mt={6} spacing={3}>
            <Button colorScheme="blue" onClick={handleSubmit} isDisabled={!audience || filteredQuestions.length === 0}>
              Nộp bài
            </Button>
            <Button variant="ghost" onClick={handleReset}>Làm lại</Button>
            <Text color="gray.500">
              Đã chọn: {selectedCount}/{filteredQuestions.length}
            </Text>
          </HStack>
        </Box>

        <Box w={{ base: "100%", lg: "360px" }} position="sticky" top="44px">
          <Box bg={cardBg} border="1px solid" borderColor={borderCol} borderRadius="md" p={4}>
            <Heading size="md" mb={2}>Tóm tắt</Heading>
            <Text color="gray.600">Bạn đã chọn {selectedCount} trên {filteredQuestions.length} câu.</Text>

            {dass && (
              <Box mt={3}>
                <Heading size="sm" mb={2}>Kết quả DASS-21</Heading>
                <Stack fontSize="sm" spacing={1}>
                  <Text>Trầm cảm: <b>{dass.depression.score}</b> — {dass.depression.level}</Text>
                  <Text>Lo âu: <b>{dass.anxiety.score}</b> — {dass.anxiety.level}</Text>
                  <Text>Stress: <b>{dass.stress.score}</b> — {dass.stress.level}</Text>
                </Stack>
                <Text mt={2} color="gray.500">Điểm đã nhân đôi theo chuẩn DASS-42.</Text>
              </Box>
            )}

            {!dass && partialDass && (
              <Box mt={3}>
                <Heading size="sm" mb={2}>Điểm tạm tính (chưa đủ 21 câu)</Heading>
                <Stack fontSize="sm" spacing={1}>
                  <Text>Trầm cảm: <b>{partialDass.depression.scaled}</b> (điểm tạm, đã nhân đôi) — đã trả lời {partialDass.depression.answered}/7 câu nhóm</Text>
                  <Text>Lo âu: <b>{partialDass.anxiety.scaled}</b> (điểm tạm, đã nhân đôi) — đã trả lời {partialDass.anxiety.answered}/7 câu nhóm</Text>
                  <Text>Stress: <b>{partialDass.stress.scaled}</b> (điểm tạm, đã nhân đôi) — đã trả lời {partialDass.stress.answered}/7 câu nhóm</Text>
                </Stack>
                <Text mt={2} color="gray.500">Điểm trên chỉ mang tính tham khảo khi chưa trả lời đủ 21 câu.</Text>
              </Box>
            )}

            {submitted && (
              <Box mt={3} fontSize="sm" color="gray.500">
                <Text mb={2}>Đã lưu lựa chọn của bạn. Dưới đây là lời khuyên tham khảo dành cho bạn.</Text>
                {adviceLoading ? (
                  <HStack color="gray.500" spacing={2}>
                    <Spinner size="sm" />
                    <Text>Đang tạo lời khuyên…</Text>
                  </HStack>
                ) : advice ? (
                  <Box whiteSpace="pre-wrap" color={adviceColor}>
                    {advice}
                  </Box>
                ) : (
                  <Text color="gray.500">Chưa có lời khuyên.</Text>
                )}
              </Box>
            )}
          </Box>
        </Box>
      </Flex>
    </Box>
  );
}
