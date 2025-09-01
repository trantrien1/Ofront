import React, { useEffect, useState } from "react";
import { Box, Button, Checkbox, CheckboxGroup, Flex, Heading, HStack, Radio, RadioGroup, Spacer, Stack, Text, useColorModeValue, useToast } from "@chakra-ui/react";
import Link from "next/link";
import { getClientRole, isAdminRole } from "../../helpers/role";
import { QuizService } from "../../services";

type Answer = { id?: string | number; content: string };
type Question = { id: string | number; content?: string; text?: string; type?: string; answers?: Answer[] };

type AnswersSingle = Record<string | number, string | number | string[]>;

const STORAGE_KEY = "ofront_quiz_answers_dyn_v1";

export default function QuizPage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [audience, setAudience] = useState<string>(''); // 'student' | 'worker' | 'teacher' | 'other'
  const [answers, setAnswers] = useState<AnswersSingle>({});
  const [submitted, setSubmitted] = useState(false);
  const toast = useToast();

  const cardBg = useColorModeValue("white", "gray.800");
  const borderCol = useColorModeValue("gray.200", "gray.700");

  useEffect(() => { const r = getClientRole(); setIsAdmin(isAdminRole(r)); }, []);

  useEffect(() => { (async () => {
    try {
      const data = await QuizService.getQuestions();
      const arr:any[] = Array.isArray(data) ? data : (Array.isArray((data as any)?.data) ? (data as any).data : (Array.isArray((data as any)?.content) ? (data as any).content : []));
      setQuestions(arr as Question[]);
    } catch (e:any) {
      toast({ status:"error", title:"Không tải được câu hỏi", description: e?.message || String(e) });
    }
  })(); }, [toast]);

  useEffect(() => { try { const raw = localStorage.getItem(STORAGE_KEY); if (raw) setAnswers(JSON.parse(raw)); } catch {} }, []);
  useEffect(() => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(answers)); } catch {} }, [answers]);

  const handleChangeSingle = (qid: string | number, v: string) => setAnswers((a) => ({ ...a, [qid]: v }));
  const handleChangeMulti = (qid: string | number, vals: string[]) => setAnswers((a) => ({ ...a, [qid]: vals }));

  const handleSubmit = () => setSubmitted(true);
  const handleReset = () => { setAnswers({}); setSubmitted(false); };

  const selectedCount = Object.keys(answers).length;

  return (
    <Box w="100%" px={{ base: 3, md: 6 }} py={6}>
      <Flex align="center" gap={3} mb={2}>
        <Heading size="lg">Trắc nghiệm</Heading>
        <Spacer />
        {isAdmin && (
          <Button as={Link} href="/admin/quiz" size="sm" colorScheme="blue" variant="outline">Quản lý câu hỏi</Button>
        )}
      </Flex>
      <Text color="gray.500" mb={4}>Chọn đối tượng phù hợp để hiển thị bộ câu hỏi.</Text>

      {/* Audience selector */}
      <HStack mb={6} spacing={3}>
        <Button variant={audience==='student'?'solid':'outline'} colorScheme="teal" size="sm" onClick={()=>setAudience('student')}>Sinh viên</Button>
        <Button variant={audience==='worker'?'solid':'outline'} colorScheme="teal" size="sm" onClick={()=>setAudience('worker')}>Người đi làm</Button>
        <Button variant={audience==='teacher'?'solid':'outline'} colorScheme="teal" size="sm" onClick={()=>setAudience('teacher')}>Giảng viên</Button>
        <Button variant={audience==='other'?'solid':'outline'} colorScheme="teal" size="sm" onClick={()=>setAudience('other')}>Khác</Button>
      </HStack>

      <Flex gap={6} align="start" flexDir={{ base: "column", lg: "row" }}>
        <Box flex={1}>
          {(!audience) ? (
            <Text color="gray.500">Hãy chọn đối tượng trước.</Text>
          ) : questions.filter(q => (q.type || 'student') === audience).length === 0 ? (
            <Text color="gray.500">Chưa có câu hỏi.</Text>
          ) : (
            <Stack spacing={4}>
              {questions.filter(q => (q.type || 'student') === audience).map((q, idx) => {
                const id = q.id; const label = q.content || q.text || `Câu hỏi #${idx+1}`; const type = (q.type || 'single').toLowerCase(); const options = Array.isArray(q.answers) ? q.answers : [];
                return (
                  <Box key={String(id)} bg={cardBg} border="1px solid" borderColor={borderCol} borderRadius="md" p={4}>
                    <Text fontWeight="600" mb={3}>{idx + 1}. {label}</Text>
                    {/* Question options are still single-choice UI by default */}
                    {false ? (
                      <CheckboxGroup value={(answers[id] as string[]) || []} onChange={(vals)=>handleChangeMulti(id, vals as string[])}>
                        <Stack>
                          {options.map((opt) => (<Checkbox key={String(opt.id ?? opt.content)} value={String(opt.id ?? opt.content)}>{opt.content}</Checkbox>))}
                        </Stack>
                      </CheckboxGroup>
                    ) : (
                      <RadioGroup value={String(answers[id] ?? "")} onChange={(v)=>handleChangeSingle(id, v)}>
                        <Stack>
                          {options.map((opt) => (<Radio key={String(opt.id ?? opt.content)} value={String(opt.id ?? opt.content)}>{opt.content}</Radio>))}
                        </Stack>
                      </RadioGroup>
                    )}
                  </Box>
                );
              })}
            </Stack>
          )}

          <HStack mt={6} spacing={3}>
            <Button colorScheme="blue" onClick={handleSubmit}>Nộp bài</Button>
            <Button variant="ghost" onClick={handleReset}>Làm lại</Button>
            <Text color="gray.500">Đã chọn: {selectedCount}/{questions.length}</Text>
          </HStack>
        </Box>

  <Box w={{ base: "100%", lg: "360px" }} position="sticky" top="44px" zIndex={1000}>
          <Box bg={cardBg} border="1px solid" borderColor={borderCol} borderRadius="md" p={4}>
            <Heading size="md" mb={2}>Tóm tắt</Heading>
            <Text color="gray.600">Bạn đã chọn {selectedCount} trên {questions.length} câu.</Text>
            {submitted && (
              <Box mt={3} fontSize="sm" color="gray.500">
                <Text>Đã lưu lựa chọn của bạn trong trình duyệt. Tính điểm sẽ phụ thuộc vào quy tắc của hệ thống nếu có.</Text>
              </Box>
            )}
          </Box>
        </Box>
      </Flex>
    </Box>
  );
}
