import React, { useEffect, useMemo, useState } from 'react';
import { Box, Button, Flex, Heading, HStack, IconButton, Input, Select, Stack, Table, Tbody, Td, Th, Thead, Tr, Textarea, useToast } from '@chakra-ui/react';
import { AddIcon, DeleteIcon, EditIcon } from '@chakra-ui/icons';
import { getClientRole, isAdminRole } from '../../../helpers/role';
import { QuizService } from '../../../services';

interface AnswerForm { id?: number | string; content: string }
interface QuestionForm { id?: number | string; content: string; type: string; answers: AnswerForm[] }

export default function AdminQuizPage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<QuestionForm | null>(null);
  const toast = useToast();

  useEffect(() => { const r = getClientRole(); setIsAdmin(isAdminRole(r)); }, []);

  const load = async () => {
    try {
      setLoading(true);
      const data = await QuizService.getQuestions();
      const arr = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : (Array.isArray(data?.content) ? data.content : []));
      setList(arr);
    } catch (e: any) {
      toast({ status: 'error', title: 'Tải danh sách thất bại', description: e?.message || String(e) });
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const resetForm = () => setEditing({ content: '', type: 'student', answers: [{ content: '' }, { content: '' }] });

  const onCreate = async () => {
    if (!editing) return; 
    try {
      const payload = { content: editing.content, type: editing.type, answers: editing.answers };
      await QuizService.createQuestion(payload);
      toast({ status: 'success', title: 'Đã tạo câu hỏi' });
      setEditing(null); await load();
    } catch (e: any) { toast({ status: 'error', title: 'Tạo thất bại', description: e?.message || String(e) }); }
  };

  const onUpdate = async () => {
    if (!editing?.id) return; 
    try {
      const payload = { id: editing.id, content: editing.content, type: editing.type, answers: editing.answers };
      await QuizService.updateQuestion(payload);
      toast({ status: 'success', title: 'Đã cập nhật câu hỏi' });
      setEditing(null); await load();
    } catch (e: any) { toast({ status: 'error', title: 'Cập nhật thất bại', description: e?.message || String(e) }); }
  };

  const onDelete = async (id: number | string) => {
    if (!confirm('Xóa câu hỏi này?')) return;
    try { await QuizService.deleteQuestion(id); toast({ status: 'success', title: 'Đã xóa' }); await load(); }
    catch (e: any) { toast({ status: 'error', title: 'Xóa thất bại', description: e?.message || String(e) }); }
  };

  if (!isAdmin) return <Box p={6}>Trang này chỉ dành cho admin.</Box>;

  return (
    <Box p={6}>
      <Flex align="center" justify="space-between" mb={4}>
        <Heading size="md">Quản lý câu hỏi trắc nghiệm</Heading>
        <Button leftIcon={<AddIcon />} colorScheme="blue" onClick={resetForm}>Tạo câu hỏi</Button>
      </Flex>

      {/* Form */}
      {editing && (
        <Box borderWidth="1px" borderRadius="md" p={4} mb={6}>
          <Stack spacing={3}>
            <Textarea placeholder="Nội dung câu hỏi" value={editing.content} onChange={(e) => setEditing({ ...(editing as any), content: e.target.value })} />
            <Select value={editing.type} onChange={(e) => setEditing({ ...(editing as any), type: e.target.value })}>
              <option value="student">Sinh viên</option>
              <option value="worker">Người đi làm</option>
              <option value="teacher">Giảng viên</option>
              <option value="other">Khác</option>
            </Select>
            <Heading size="sm">Đáp án</Heading>
            <Stack>
              {editing.answers.map((a, idx) => (
                <HStack key={idx}>
                  <Input placeholder={`Đáp án #${idx + 1}`} value={a.content} onChange={(e) => {
                    const answers = editing.answers.slice(); answers[idx] = { ...a, content: e.target.value }; setEditing({ ...(editing as any), answers });
                  }} />
                  <IconButton aria-label="delete" icon={<DeleteIcon />} size="sm" onClick={() => { const answers = editing.answers.slice(); answers.splice(idx,1); setEditing({ ...(editing as any), answers }); }} />
                </HStack>
              ))}
              <Button size="sm" onClick={() => setEditing({ ...(editing as any), answers: [...editing.answers, { content: '' }] })}>Thêm đáp án</Button>
            </Stack>
            <HStack>
              {editing.id ? (
                <Button colorScheme="green" onClick={onUpdate}>Cập nhật</Button>
              ) : (
                <Button colorScheme="blue" onClick={onCreate}>Tạo</Button>
              )}
              <Button variant="ghost" onClick={() => setEditing(null)}>Hủy</Button>
            </HStack>
          </Stack>
        </Box>
      )}

      {/* List */}
      <Table size="sm" variant="simple">
        <Thead><Tr><Th>ID</Th><Th>Nội dung</Th><Th>Loại</Th><Th>Hành động</Th></Tr></Thead>
        <Tbody>
          {list.map((q:any) => (
            <Tr key={q.id}>
              <Td>{q.id}</Td>
              <Td>{q.content || q.text}</Td>
              <Td>{(q.type || 'student')
                .replace('student','Sinh viên')
                .replace('worker','Người đi làm')
                .replace('teacher','Giảng viên')
                .replace('other','Khác')}
              </Td>
              <Td>
                <HStack>
                  <IconButton aria-label="edit" icon={<EditIcon />} size="sm" onClick={() => setEditing({ id: q.id, content: q.content || q.text, type: q.type || 'student', answers: Array.isArray(q.answers) ? q.answers.map((a:any)=>({ id:a.id, content: a.content || a.text })) : [] })} />
                  <IconButton aria-label="delete" icon={<DeleteIcon />} size="sm" onClick={() => onDelete(q.id)} />
                </HStack>
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </Box>
  );
}
