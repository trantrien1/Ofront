// pages/quiz/index.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Badge, Box, Button, Checkbox, CheckboxGroup, Container, Divider, Flex,
  Heading, HStack, Icon, IconButton, Progress, Radio, RadioGroup, SimpleGrid,
  Skeleton, Spacer, Stack, Text, Tooltip, useBoolean, useColorModeValue,
  useDisclosure, useToast, Spinner, Alert, AlertIcon, Kbd, useBreakpointValue,
} from "@chakra-ui/react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { FaUserGraduate, FaUserTie, FaChalkboardTeacher, FaUsers, FaRandom, FaListOl, FaTrash, FaChevronLeft, FaChevronRight, FaFlagCheckered, FaInfoCircle, FaSyncAlt } from "react-icons/fa";
import { MdOutlineManageSearch, MdOutlineRestartAlt } from "react-icons/md";
import {
  AlertDialog,
  AlertDialogOverlay,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogBody,
  AlertDialogFooter,
} from "@chakra-ui/react";
// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------
type Answer = { id?: string | number; content: string };
type Question = {
  id: string | number;
  content?: string;
  text?: string;
  type?: string; // 'student' | 'worker' | 'teacher' | 'other' | custom
  answers?: Answer[];
  multi?: boolean; // optional override
};
type AnswersSingle = Record<string | number, string | number | string[]>;

type DassScore = {
  raw: number;
  score: number;
  level: "Bình thường" | "Nhẹ" | "Vừa" | "Nặng" | "Rất nặng";
};

type DassPartial = {
  raw: number;
  answered: number;
  zeros: number;
  scaled: number;
};

type DassResult =
  | null
  | {
      depression: DassScore;
      anxiety: DassScore;
      stress: DassScore;
    };

type DassPartialResult =
  | null
  | {
      depression: DassPartial;
      anxiety: DassPartial;
      stress: DassPartial;
      totalAnswered: number;
    };

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------
const STORAGE_KEY = "ofront_quiz_answers_dyn_v2";
const STORAGE_AUDIENCE_KEY = "ofront_quiz_audience_v2";
const STORAGE_SHUFFLE_KEY = "ofront_quiz_shuffle_v2";

// DASS-21 index groups (1-based)
const D_IDX = [3, 5, 10, 13, 16, 17, 21];
const A_IDX = [2, 4, 7, 9, 15, 19, 20];
const S_IDX = [1, 6, 8, 11, 12, 14, 18];

const AUDIENCES = [
  { id: "student", label: "Sinh viên", icon: FaUserGraduate, desc: "Đang theo học", gradient: "linear(to-br, teal.500, green.400)" },
  { id: "worker",  label: "Người đi làm", icon: FaUserTie,     desc: "Đang/đã đi làm", gradient: "linear(to-br, blue.500, cyan.400)" },
  { id: "teacher", label: "Giảng viên", icon: FaChalkboardTeacher, desc: "Đứng lớp / hướng dẫn", gradient: "linear(to-br, purple.500, pink.400)" },
  { id: "other",   label: "Khác", icon: FaUsers, desc: "Nhóm khác", gradient: "linear(to-br, orange.500, yellow.400)" },
];

const MotionBox = motion(Box);

// -----------------------------------------------------------------------------
// Utils
// -----------------------------------------------------------------------------
const normalize = (s: string) => s?.normalize?.("NFD").toLowerCase().trim();

const phraseToScore = (raw: string): number | null => {
  const l = normalize(raw);
  if (!l) return null;
  if (l.includes("khong bao gio") || (l.includes("khong dung") && (l.includes("chut nao") || !l.includes("phan nao")))) return 0;
  if (l.includes("thinh thoang") || (l.includes("dung") && l.includes("phan nao")) || l.includes("doi khi")) return 1;
  if (l.includes("thuong xuyen") || l.includes("kha dung") || l.includes("phan lon thoi gian")) return 2;
  if (l.includes("hau nhu luon luon") || l.includes("rat dung") || l.includes("hau het thoi gian")) return 3;
  return null;
};

const extractDigit03 = (raw: string): number | null => {
  const m = raw?.match?.(/(?:^|\D)([0-3])(?:\D|$)/);
  return m ? parseInt(m[1], 10) : null;
};

const parseNumeric03 = (v: any): number | null => {
  if (v == null) return null;
  const s = String(v).trim();
  if (/^\d+$/.test(s)) {
    const n = parseInt(s, 10);
    if (n >= 0 && n <= 3) return n;
    if (n >= 1 && n <= 4) return n - 1; // allow 1..4 scale
  }
  return null;
};

const scoreAnswer = (q: Question, val: any): number => {
  if (!q || val == null) return 0;
  const options = Array.isArray(q.answers) ? q.answers : [];
  const numeric = parseNumeric03(val);
  if (numeric != null) return numeric;

  const vStr = String(val);

  const idxById = options.findIndex(opt => String(opt.id ?? opt.content) === vStr);
  if (idxById >= 0) {
    if (options.length === 4) return Math.max(0, Math.min(3, idxById));
    const content = options[idxById]?.content ?? "";
    const byPhrase = phraseToScore(content);
    if (byPhrase != null) return byPhrase;
    const byDigit = extractDigit03(content);
    if (byDigit != null) return byDigit;
    return Math.max(0, Math.min(3, idxById));
  }

  const byPhrase = phraseToScore(vStr);
  if (byPhrase != null) return byPhrase;
  const byDigit = extractDigit03(vStr);
  if (byDigit != null) return byDigit;
  return 0;
};

const classifyDepression = (score: number) =>
  score <= 9 ? "Bình thường" : score <= 13 ? "Nhẹ" : score <= 20 ? "Vừa" : score <= 27 ? "Nặng" : "Rất nặng";
const classifyAnxiety = (score: number) =>
  score <= 7 ? "Bình thường" : score <= 9 ? "Nhẹ" : score <= 14 ? "Vừa" : score <= 19 ? "Nặng" : "Rất nặng";
const classifyStress = (score: number) =>
  score <= 14 ? "Bình thường" : score <= 18 ? "Nhẹ" : score <= 25 ? "Vừa" : score <= 33 ? "Nặng" : "Rất nặng";

const levelColor = (level: string) => {
  switch (level) {
    case "Bình thường": return "green";
    case "Nhẹ":         return "yellow";
    case "Vừa":         return "orange";
    case "Nặng":        return "red";
    case "Rất nặng":    return "purple";
    default:            return "gray";
  }
};
const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
const percent = (n: number) => Math.round(clamp01(n) * 100);
const progressPercent = (score: number) => Math.min(100, Math.round((score / 42) * 100));

const pickAnswerLabel = (q: Question, val: any) => {
  const v = String(val);
  const opts = Array.isArray(q.answers) ? q.answers : [];
  const found = opts.find((opt) => String(opt.id ?? opt.content) === v);
  return found?.content ?? v;
};

const shuffle = <T,>(arr: T[]) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// Dùng dịch vụ thật
import { QuizService } from "../../services";

// -----------------------------------------------------------------------------
// Main Component
// -----------------------------------------------------------------------------
export default function QuizPage() {
  const toast = useToast();
  const [audience, setAudience] = useState<string>("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<AnswersSingle>({});
  const [loading, setLoading] = useBoolean(true);
  const [error, setError] = useState<string>("");

  const [submitted, setSubmitted] = useState(false);
  const [advice, setAdvice] = useState<string>("");
  const [adviceLoading, setAdviceLoading] = useBoolean(false);

  const [shuffleOn, setShuffleOn] = useState<boolean>(true);
  const [qIndex, setQIndex] = useState<number>(0); // navigator focus
  const confirmSubmit = useDisclosure();
  const cancelRef = useRef<HTMLButtonElement>(null);

  const cardBg = useColorModeValue("white", "gray.800");
  const borderCol = useColorModeValue("gray.200", "gray.700");
  const adviceColor = useColorModeValue("gray.700", "gray.200");
  const accent = useColorModeValue("teal.500", "teal.300");
  const muted = useColorModeValue("gray.500", "gray.400");

  const isDesktop = useBreakpointValue({ base: false, lg: true });

  // Load questions
  useEffect(() => {
    (async () => {
      try {
        setLoading.on();
        setError("");
        const data = await QuizService.getQuestions();
        const arr = Array.isArray(data)
          ? data
          : Array.isArray((data as any)?.data)
            ? (data as any).data
            : Array.isArray((data as any)?.content)
              ? (data as any).content
              : [];
        setQuestions(arr as Question[]);
      } catch (e: any) {
        setError(e?.message || "Không tải được câu hỏi");
      } finally {
        setLoading.off();
      }
    })();
  }, [setLoading]);

  // Restore persisted audience/answers/shuffle
  useEffect(() => {
    try {
      const a = localStorage.getItem(STORAGE_AUDIENCE_KEY);
      if (a) setAudience(a);
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setAnswers(JSON.parse(raw));
      const sh = localStorage.getItem(STORAGE_SHUFFLE_KEY);
      if (sh) setShuffleOn(sh === "1");
    } catch {}
  }, []);

  // Autosave
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(answers));
    } catch {}
  }, [answers]);
  useEffect(() => {
    try {
      if (audience) localStorage.setItem(STORAGE_AUDIENCE_KEY, audience);
    } catch {}
  }, [audience]);
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_SHUFFLE_KEY, shuffleOn ? "1" : "0");
    } catch {}
  }, [shuffleOn]);

  // Derived: filtered & (optionally) shuffled list
  const filteredQuestions = useMemo(() => {
    const base = questions.filter((q) => (q.type || "student") === audience);
    return shuffleOn ? shuffle(base) : base;
  }, [questions, audience, shuffleOn]);

  // Count answered in current set
  const selectedCount = useMemo(
    () => filteredQuestions.filter((q) => answers[q.id as any] !== undefined).length,
    [filteredQuestions, answers]
  );

  // DASS result (only when exactly 21)
  const dass: DassResult = useMemo(() => {
    if (filteredQuestions.length !== 21) return null;
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

  // Partial DASS if not 21 but some answered
  const partialDass: DassPartialResult = useMemo(() => {
    if (filteredQuestions.length === 0) return null;
    const calc = (idxArr: number[]) =>
      idxArr.reduce(
        (acc, idx) => {
          const q = filteredQuestions[idx - 1];
          if (!q) return acc;
          const has = Object.prototype.hasOwnProperty.call(answers, q.id as any);
          if (!has) return acc;
          const n = scoreAnswer(q, answers[q.id as any]);
          return { sum: acc.sum + n, count: acc.count + 1, zeros: acc.zeros + (n === 0 ? 1 : 0) };
        },
        { sum: 0, count: 0, zeros: 0 }
      );

    const D = calc(D_IDX), A = calc(A_IDX), S = calc(S_IDX);
    const any = D.count + A.count + S.count > 0;
    if (!any) return null;
    return {
      depression: { raw: D.sum, answered: D.count, zeros: D.zeros, scaled: D.sum * 2 },
      anxiety:    { raw: A.sum, answered: A.count, zeros: A.zeros, scaled: A.sum * 2 },
      stress:     { raw: S.sum, answered: S.count, zeros: S.zeros, scaled: S.sum * 2 },
      totalAnswered: D.count + A.count + S.count,
    };
  }, [filteredQuestions, answers]);

  // Handlers
  const changeSingle = useCallback((qid: string | number, v: string) => {
    setAnswers((a) => ({ ...a, [qid]: v }));
  }, []);
  const changeMulti = useCallback((qid: string | number, vals: string[]) => {
    setAnswers((a) => ({ ...a, [qid]: vals }));
  }, []);

  const handleReset = useCallback(() => {
    setAnswers({});
    setSubmitted(false);
    setAdvice("");
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    toast({ status: "info", title: "Đã xóa lựa chọn" });
  }, [toast]);

  const handleSubmit = useCallback(async () => {
    setSubmitted(true);
    setAdvice("");
    setAdviceLoading.on();
    try {
      const itemsBase = filteredQuestions;
      const answeredCountLocal = itemsBase.filter((q) => answers[q.id as any] !== undefined).length;

      if (answeredCountLocal === 0) {
        setSubmitted(false);
        setAdviceLoading.off();
        toast({ status: "warning", title: "Hãy trả lời ít nhất 1 câu trước khi nộp." });
        return;
      }

      if (filteredQuestions.length === 21) {
        const allAnswered = itemsBase.every((q) => answers[q.id as any] !== undefined);
        if (!allAnswered) {
          setSubmitted(false);
          setAdviceLoading.off();
          toast({ status: "warning", title: "Hãy trả lời đầy đủ 21 câu để tính điểm DASS-21." });
          return;
        }
      }

      const items = filteredQuestions.map((q, idx) => {
        const val = answers[q.id as any];
        const score = scoreAnswer(q, val);
        const answerText = val !== undefined ? pickAnswerLabel(q, val) : "";
        return { order: idx + 1, id: q.id, question: q.content || q.text || String(q.id), answer: val ?? "", answerText, score };
      });

      const res = await fetch('/api/quiz/advice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audience,
          items,
          dass,
          partialDass,
          totalQuestions: filteredQuestions.length,
          answeredCount: answeredCountLocal,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Gemini error');
      setAdvice(String(data?.advice || '').trim());
    } catch (e: any) {
      setAdvice("");
      toast({ status: "error", title: "Không tạo được lời khuyên", description: e?.message || "Failed" });
    } finally {
      setAdviceLoading.off();
    }
  }, [answers, filteredQuestions, setAdviceLoading, toast, setAdvice]);

  // Navigator focus helpers
  const goto = (i: number) => setQIndex(Math.max(0, Math.min(filteredQuestions.length - 1, i)));
  const prev = () => goto(qIndex - 1);
  const next = () => goto(qIndex + 1);

  // Keyboard shortcuts (← → to navigate)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!filteredQuestions.length) return;
      if (e.key === "ArrowLeft") { e.preventDefault(); prev(); }
      else if (e.key === "ArrowRight") { e.preventDefault(); next(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [filteredQuestions.length, qIndex]);

  // UI helpers
  const headerRight = (
    <HStack spacing={2}>
      <Tooltip label={shuffleOn ? "Đang xáo trộn câu hỏi" : "Giữ nguyên thứ tự"}>
        <IconButton aria-label="Shuffle" size="sm" icon={<Icon as={FaRandom} />} onClick={() => setShuffleOn(s => !s)} variant={shuffleOn ? "solid" : "outline"} colorScheme="teal"/>
      </Tooltip>
      <Tooltip label="Xóa lựa chọn">
        <IconButton aria-label="Reset" size="sm" icon={<Icon as={MdOutlineRestartAlt} />} onClick={handleReset} variant="outline"/>
      </Tooltip>
      <Button as={Link} href="/admin/quiz" size="sm" leftIcon={<MdOutlineManageSearch/>} variant="outline">
        Quản lý câu hỏi
      </Button>
    </HStack>
  );

  // Render
  return (
    <Container maxW="container.xl" py={6}>
      <Flex align="center" gap={3} mb={2}>
        <Heading size="lg">Trắc nghiệm</Heading>
        <Spacer />
        {headerRight}
      </Flex>

      {loading && (
        <Stack spacing={4}>
          <Skeleton height="28px" />
          <Skeleton height="160px" />
          <Skeleton height="160px" />
        </Stack>
      )}

      {!loading && error && (
        <Alert status="error" borderRadius="md" mb={6}>
          <AlertIcon />
          {error}
        </Alert>
      )}

      {!loading && !error && (
        <>
          <AnimatePresence mode="wait">
            {!audience && (
              <MotionBox
                key="audience-select"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.35 }}
                mb={8}
              >
                <Text color={muted} mb={4} fontSize={{ base: "sm", md: "md" }}>
                  Chọn nhóm đối tượng phù hợp để bắt đầu. Mỗi nhóm có bộ câu hỏi riêng.
                </Text>
                <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4}>
                  {AUDIENCES.map(a => {
                    const ActiveIcon = a.icon;
                    return (
                      <MotionBox
                        key={a.id}
                        role="button"
                        whileHover={{ y: -4 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => { setAudience(a.id); setQIndex(0); }}
                        cursor="pointer"
                        position="relative"
                        p={4}
                        borderRadius="lg"
                        bg={cardBg}
                        borderWidth="2px"
                        borderColor={borderCol}
                        shadow="sm"
                        _hover={{ borderColor: accent }}
                        overflow="hidden"
                      >
                        <Box position="absolute" inset={0} opacity={0.08} bgGradient={a.gradient} />
                        <Flex direction="column" gap={2} position="relative">
                          <Flex w={12} h={12} align="center" justify="center" borderRadius="full" bgGradient={a.gradient} color="white" shadow="md">
                            <ActiveIcon />
                          </Flex>
                          <Text fontWeight="600" fontSize="sm">{a.label}</Text>
                          <Text fontSize="xs" color={muted}>{a.desc}</Text>
                        </Flex>
                      </MotionBox>
                    );
                  })}
                </SimpleGrid>
              </MotionBox>
            )}
          </AnimatePresence>

          {audience && (
            <MotionBox
              key="questions"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              mb={6}
            >
              <Flex align="center" mb={4} wrap="wrap" gap={3}>
                <Badge colorScheme="teal" px={3} py={1} borderRadius="full" fontSize="0.75rem" textTransform="none">
                  Đối tượng: {AUDIENCES.find(a=>a.id===audience)?.label}
                </Badge>
                <Button size="xs" variant="ghost" onClick={() => { setAudience(""); setSubmitted(false); setAdvice(""); }}>
                  Đổi đối tượng
                </Button>
                <Spacer />
                <HStack color={muted} fontSize="sm">
                  <Text>Đã chọn {selectedCount}/{filteredQuestions.length}</Text>
                  <Text>• Tiến độ</Text>
                </HStack>
              </Flex>

              <Progress value={percent(filteredQuestions.length ? selectedCount / filteredQuestions.length : 0)} size="sm" colorScheme="teal" borderRadius="full" mb={4}/>
            </MotionBox>
          )}

          {audience && filteredQuestions.length === 0 && (
            <Text color={muted}>Chưa có câu hỏi cho nhóm này.</Text>
          )}

          {audience && filteredQuestions.length > 0 && (
            <Flex gap={6} align="start" direction={{ base: "column", lg: "row" }}>
              {/* LEFT: questions */}
              <Box flex="1 1 0">
                <Stack spacing={5}>
                  {filteredQuestions.map((q, idx) => {
                    const id = q.id;
                    const label = q.content || q.text || `Câu hỏi #${idx + 1}`;
                    const isMulti = !!q.multi; // default single
                    const options = Array.isArray(q.answers) ? q.answers : [];

                    return (
                      <MotionBox
                        key={String(id)}
                        id={`q-${idx}`}
                        bg={cardBg}
                        border="1px solid"
                        borderColor={idx === qIndex ? accent : borderCol}
                        borderRadius="lg"
                        p={5}
                        shadow="sm"
                        whileHover={{ scale: 1.01 }}
                        transition={{ type: "spring", stiffness: 260, damping: 24 }}
                      >
                        <Flex mb={3} align="flex-start" gap={3}>
                          <Box mt={1} w={6} h={6} flexShrink={0} borderRadius="full" bg={accent} color="white" fontSize="xs" display="flex" alignItems="center" justifyContent="center" fontWeight="600">
                            {idx + 1}
                          </Box>
                          <Text fontWeight="600">{label}</Text>
                        </Flex>

                        {isMulti ? (
                          <CheckboxGroup
                            value={(answers[id] as string[]) || []}
                            onChange={(vals) => changeMulti(id, vals as string[])}
                          >
                            <Stack>
                              {options.map((opt) => (
                                <Checkbox key={String(opt.id ?? opt.content)} value={String(opt.id ?? opt.content)}>
                                  {opt.content}
                                </Checkbox>
                              ))}
                            </Stack>
                          </CheckboxGroup>
                        ) : (
                          <RadioGroup
                            value={String(answers[id] ?? "")}
                            onChange={(v) => changeSingle(id, v)}
                          >
                            <Stack>
                              {options.map((opt) => (
                                <Radio key={String(opt.id ?? opt.content)} value={String(opt.id ?? opt.content)} colorScheme="teal">
                                  {opt.content}
                                </Radio>
                              ))}
                            </Stack>
                          </RadioGroup>
                        )}
                      </MotionBox>
                    );
                  })}
                </Stack>

                <HStack mt={8} spacing={3} flexWrap="wrap">
                  <Tooltip label="Nộp bài (kiểm tra thiếu trước khi tính điểm)">
                    <Button colorScheme="teal" onClick={confirmSubmit.onOpen} leftIcon={<FaFlagCheckered/>}>
                      Nộp bài
                    </Button>
                  </Tooltip>
                  <Button variant="ghost" onClick={handleReset} leftIcon={<FaTrash/>}>
                    Làm lại
                  </Button>
                  <HStack fontSize="sm" color={muted}>
                    <Text>Đã chọn: {selectedCount}/{filteredQuestions.length}</Text>
                    <Text>• Phím tắt: <Kbd>←</Kbd>/<Kbd>→</Kbd></Text>
                  </HStack>
                </HStack>
              </Box>

              {/* RIGHT: summary & advice */}
              <Box w={{ base: "100%", lg: "380px" }} position="sticky" top="44px" flexShrink={0}>
                <Box bg={cardBg} border="1px solid" borderColor={borderCol} borderRadius="md" p={4}>
                  <Heading size="md" mb={2}>Tóm tắt</Heading>
                  <Text color={muted}>Bạn đã chọn {selectedCount} trên {filteredQuestions.length} câu.</Text>

                  {/* Navigator */}
                  <Box mt={4}>
                    <HStack justify="space-between" mb={2}>
                      <Heading size="sm">Điều hướng</Heading>
                      <HStack>
                        <IconButton aria-label="Prev" icon={<FaChevronLeft/>} size="sm" variant="ghost" onClick={prev} isDisabled={qIndex<=0}/>
                        <IconButton aria-label="Next" icon={<FaChevronRight/>} size="sm" variant="ghost" onClick={next} isDisabled={qIndex>=filteredQuestions.length-1}/>
                      </HStack>
                    </HStack>
                    <SimpleGrid columns={isDesktop ? 8 : 6} spacing={2}>
                      {filteredQuestions.map((q, idx) => {
                        const done = answers[q.id as any] !== undefined;
                        const active = idx === qIndex;
                        return (
                          <Tooltip key={String(q.id)} label={`Câu ${idx+1}${done ? " • đã chọn" : ""}`}>
                            <Button
                              size="xs"
                              variant={active ? "solid" : done ? "outline" : "ghost"}
                              colorScheme={active ? "teal" : done ? "teal" : undefined}
                              onClick={() => goto(idx)}
                            >
                              {idx + 1}
                            </Button>
                          </Tooltip>
                        );
                      })}
                    </SimpleGrid>
                  </Box>

                  {dass && (
                    <Box mt={5}>
                      <Heading size="sm" mb={2}>Kết quả DASS-21</Heading>
                      <Stack spacing={4} fontSize="sm">
                        {([
                          ['Trầm cảm', dass.depression],
                          ['Lo âu', dass.anxiety],
                          ['Stress', dass.stress],
                        ] as const).map(([label, obj]) => (
                          <Box key={label}>
                            <Flex justify="space-between" mb={1} fontWeight="500">
                              <Text>{label}</Text>
                              <HStack spacing={2} fontSize="xs">
                                <Badge colorScheme={levelColor(obj.level)}>{obj.level}</Badge>
                                <Text>{obj.score}</Text>
                              </HStack>
                            </Flex>
                            <Progress value={progressPercent(obj.score)} size="xs" colorScheme={levelColor(obj.level)} borderRadius="full" />
                          </Box>
                        ))}
                      </Stack>
                      <HStack mt={3} color={muted} fontSize="xs">
                        <Icon as={FaInfoCircle}/>
                        <Text>Điểm đã nhân đôi theo chuẩn DASS-42. Chỉ mang tính tham khảo, không thay thế tư vấn chuyên môn.</Text>
                      </HStack>
                    </Box>
                  )}

                  {!dass && partialDass && (
                    <Box mt={5}>
                      <Heading size="sm" mb={2}>Điểm tạm tính</Heading>
                      <Stack spacing={4} fontSize="sm">
                        {([
                          ['Trầm cảm', partialDass.depression],
                          ['Lo âu', partialDass.anxiety],
                          ['Stress', partialDass.stress],
                        ] as const).map(([label, obj]) => (
                          <Box key={label}>
                            <Flex justify="space-between" mb={1} fontWeight="500">
                              <Text>{label}</Text>
                              <Text fontSize="xs">{obj.answered}/7 câu</Text>
                            </Flex>
                            <Progress value={progressPercent(obj.scaled)} size="xs" colorScheme="teal" borderRadius="full" />
                          </Box>
                        ))}
                      </Stack>
                      <HStack mt={3} color={muted} fontSize="xs">
                        <Icon as={FaInfoCircle}/>
                        <Text>Điểm tham khảo khi chưa trả lời đủ 21 câu.</Text>
                      </HStack>
                    </Box>
                  )}

                  {submitted && (
                    <Box mt={5} fontSize="sm">
                      <Heading size="sm" mb={2}>Lời khuyên</Heading>
                      {adviceLoading ? (
                        <HStack color={muted} spacing={2}><Spinner size="sm"/><Text>Đang tạo lời khuyên…</Text></HStack>
                      ) : advice ? (
                        <Box whiteSpace="pre-wrap" color={adviceColor}>{advice}</Box>
                      ) : (
                        <Text color={muted}>Chưa có lời khuyên.</Text>
                      )}
                    </Box>
                  )}
                </Box>
              </Box>
            </Flex>
          )}

          {/* Confirm submit modal */}
          <AlertDialog
            isOpen={confirmSubmit.isOpen}
            leastDestructiveRef={cancelRef}
            onClose={confirmSubmit.onClose}
            isCentered
          >
            <AlertDialogOverlay bg="blackAlpha.600">
              <AlertDialogContent>
                <AlertDialogHeader fontSize="lg" fontWeight="bold">
                  Xác nhận nộp bài
                </AlertDialogHeader>
                <AlertDialogBody>
                  Bạn đã trả lời {selectedCount}/{filteredQuestions.length} câu.
                  {filteredQuestions.length === 21 ? " Với bài DASS-21, cần trả lời đủ để tính điểm chuẩn." : ""}
                </AlertDialogBody>
                <AlertDialogFooter>
                  <Button ref={cancelRef} onClick={confirmSubmit.onClose} variant="ghost">
                    Huỷ
                  </Button>
                  <Button
                    colorScheme="teal"
                    ml={3}
                    onClick={() => {
                      confirmSubmit.onClose();
                      handleSubmit();
                    }}
                  >
                    Nộp bài
                  </Button>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialogOverlay>
          </AlertDialog>
        </>
      )}
    </Container>
  );
}
