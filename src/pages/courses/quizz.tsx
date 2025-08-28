import React, { useEffect, useMemo, useState } from "react";
import { Box, Button, Flex, Heading, HStack, Radio, RadioGroup, Stack, Text, useColorModeValue, Badge, Divider } from "@chakra-ui/react";
import { likertOptions, quizQuestions, scoreQuiz } from "../../data/quizz";
import { useSidebar } from "../../components/Layout";

type Answers = Record<string, number>;

const STORAGE_KEY = "ofront_quiz_answers_v1";

export default function QuizPage() {
  const [answers, setAnswers] = useState<Answers>({});
  const [submitted, setSubmitted] = useState(false);
  const result = useMemo(() => scoreQuiz(answers), [answers]);
  const cardBg = useColorModeValue("white", "gray.800");
  const borderCol = useColorModeValue("gray.200", "gray.700");

  // load/save
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

  const handleChange = (qid: string, v: string) => {
    setAnswers((a) => ({ ...a, [qid]: Number(v) }));
  };

  const handleSubmit = () => setSubmitted(true);
  const handleReset = () => {
    setAnswers({});
    setSubmitted(false);
  };

  return (
    <Box w="100%" px={{ base: 3, md: 6 }} py={6}>
      <Heading size="lg" mb={2}>Trắc nghiệm kiểm tra tâm lí</Heading>
      <Text color="gray.500" mb={6}>Chọn mức độ phù hợp nhất với bạn trong 2 tuần gần đây.</Text>

      <Flex gap={6} align="start" flexDir={{ base: "column", lg: "row" }}>
        {/* Questions */}
        <Box flex={1}>
          <Stack spacing={4}>
            {quizQuestions.map((q, idx) => (
              <Box key={q.id} bg={cardBg} border="1px solid" borderColor={borderCol} borderRadius="md" p={4}>
                <Text fontWeight="600" mb={3}>{idx + 1}. {q.text}</Text>
                <RadioGroup value={String(answers[q.id] ?? "")} onChange={(v) => handleChange(q.id, v)}>
                  <HStack spacing={4} wrap="wrap">
                    {likertOptions.map((opt) => (
                      <Radio key={opt.key} value={opt.key}>{opt.label}</Radio>
                    ))}
                  </HStack>
                </RadioGroup>
              </Box>
            ))}
          </Stack>

          <HStack mt={6} spacing={3}>
            <Button colorScheme="blue" onClick={handleSubmit}>Nộp bài</Button>
            <Button variant="ghost" onClick={handleReset}>Làm lại</Button>
          </HStack>
        </Box>

        {/* Result */}
        <Box w={{ base: "100%", lg: "360px" }} position="sticky" top="64px">
          <Box bg={cardBg} border="1px solid" borderColor={borderCol} borderRadius="md" p={4}>
            <Heading size="md" mb={2}>Kết quả</Heading>
            <Divider my={3} />
            <Text mb={1}>Tổng điểm: <Text as="span" fontWeight="bold">{result.total}</Text> / 40</Text>
            <HStack>
              <Text>Mức độ:</Text>
              <Badge colorScheme={result.color as any}>{result.label}</Badge>
            </HStack>
            {submitted && (
              <Box mt={3} fontSize="sm" color="gray.500">
                <Text>
                  Gợi ý: Nếu mức độ ở ngưỡng cao, bạn nên cân nhắc nghỉ ngơi, giảm tải và
                  trao đổi với người thân hoặc chuyên gia tâm lí.
                </Text>
              </Box>
            )}
          </Box>
        </Box>
      </Flex>
    </Box>
  );
}
