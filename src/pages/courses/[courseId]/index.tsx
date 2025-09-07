import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";
import {
  Box,
  Badge,
  Flex,
  Heading,
  Icon,
  Input,
  Textarea,
  Button,
  Text,
  VStack,
  useColorModeValue,
} from "@chakra-ui/react";
import { useToast } from "@chakra-ui/react";
import Link from "next/link";
import { FaYoutube, FaLock, FaRegCheckCircle } from "react-icons/fa";
import { CoursesService, VideosService } from "../../../services";
import { getClientRole, isAdminRole } from "../../../helpers/role";

type Lesson = { id: string; title: string; date?: string; locked?: boolean; isCompleted?: boolean };

export default function CourseDetailPage() {
  const router = useRouter();
  const { courseId } = router.query as { courseId: string };
  const [title, setTitle] = useState<string>("Khoá học");
  const [description, setDescription] = useState<string>("");
  const [list, setList] = useState<Lesson[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const toast = useToast();
  const [newTitle, setNewTitle] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newDesc, setNewDesc] = useState("");
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!courseId) return;
      try {
        const data = await CoursesService.getCourses({ id: courseId });
        const arr =
          (data && Array.isArray(data) && data) ||
          (data?.data && Array.isArray(data.data) && data.data) ||
          (data?.content && Array.isArray(data.content) && data.content) ||
          (data?.data?.content && Array.isArray(data.data.content) && data.data.content) ||
          [];
        const course = arr.find((c: any) => String(c.id ?? c.courseId ?? c._id) === String(courseId)) || arr[0];
        if (mounted && course) {
          setTitle(String(course.title ?? course.name ?? 'Khoá học'));
          setDescription(String(course.description ?? course.desc ?? ''));
          // Prefer fetching videos via upstream endpoint to be accurate
          let lessons: any[] = [];
          try {
            const vidsResp = await VideosService.getVideosByCourse(courseId);
            const vidsArr = (Array.isArray(vidsResp) && vidsResp)
              || (Array.isArray(vidsResp?.data) && vidsResp.data)
              || (Array.isArray(vidsResp?.content) && vidsResp.content)
              || (Array.isArray(vidsResp?.data?.content) && vidsResp.data.content)
              || [];
            lessons = vidsArr;
          } catch {
            lessons = Array.isArray(course?.lessons) ? course.lessons : [];
          }
          const mapped = lessons.map((l: any, idx: number) => ({
            id: String(l.id ?? l.videoId ?? idx),
            title: String(l.title ?? l.name ?? `Bài ${idx + 1}`),
            date: l.date ? String(l.date) : undefined,
            locked: !!l.locked,
            isCompleted: !!(l.isCompleted || l.completed || l.done),
          }));
          setList(mapped);
        }
      } catch (e) {
        // keep defaults
      }
    })();
    return () => { mounted = false; };
  }, [courseId]);

  // Theme tokens
  const cardBg = useColorModeValue("white", "gray.800");
  const borderCol = useColorModeValue("gray.200", "gray.700");
  const rowHover = useColorModeValue("gray.50", "gray.700");
  const descCol = useColorModeValue('gray.700','gray.300');
  const headBar = useColorModeValue('#051d2d','gray.900');

  // robust role check (cookie/localStorage/JWT)
  useEffect(() => {
    try {
      const r = getClientRole();
      setIsAdmin(isAdminRole(r));
    } catch {}
  }, [courseId]);
  const doneCount = list.filter(l => l.isCompleted).length;
  const percent = list.length ? Math.round((doneCount / list.length) * 100) : 0;
  const allDone = percent === 100;

  return (
    <Box maxW="1280px" mx={0} px={{ base: 2, md: 4 }} py={4}>
      <Flex align="center" justify="space-between" mb={4}>
        <Heading size="lg">{title}</Heading>
        {isAdmin && (
          <Flex gap={2}>
            <Link href={`/courses/update/${courseId}`}>
              <Button size="sm" colorScheme="blue">Sửa</Button>
            </Link>
            <Button colorScheme="red" size="sm" onClick={()=>{
              router.push(`/courses/delete/${courseId}`);
            }}>Xóa khóa học</Button>
          </Flex>
        )}
      </Flex>
      {description ? (
        <Text mb={4} color={descCol}>{description}</Text>
      ) : null}

      {isAdmin && (
        <Box mb={6} p={4} border="1px solid" borderColor={borderCol} borderRadius="md">
          <Heading size="sm" mb={3}>Thêm video cho khóa học</Heading>
          <VStack align="stretch" spacing={3}>
            <Input placeholder="Tiêu đề video" value={newTitle} onChange={(e)=>setNewTitle(e.target.value)} />
            <Input placeholder="YouTube URL" value={newUrl} onChange={(e)=>setNewUrl(e.target.value)} />
            <Textarea placeholder="Mô tả (tuỳ chọn)" value={newDesc} onChange={(e)=>setNewDesc(e.target.value)} />
            <Button colorScheme="blue" onClick={async ()=>{
              if (!newTitle || !newUrl) return;
              try {
                await VideosService.createVideo({ title: newTitle, url: newUrl, description: newDesc, coureId: Number(courseId) });
                setNewTitle(""); setNewUrl(""); setNewDesc("");
                // Refresh list
                try {
                  const vidsResp = await VideosService.getVideosByCourse(courseId);
                  const vidsArr = (Array.isArray(vidsResp) && vidsResp)
                    || (Array.isArray(vidsResp?.data) && vidsResp.data)
                    || (Array.isArray(vidsResp?.content) && vidsResp.content)
                    || (Array.isArray(vidsResp?.data?.content) && vidsResp.data.content)
                    || [];
                  const mapped = vidsArr.map((l: any, idx: number) => ({ id: String(l.id ?? l.videoId ?? idx), title: String(l.title ?? l.name ?? `Bài ${idx + 1}`), date: l.date ? String(l.date) : undefined, locked: !!l.locked }));
                  setList(mapped);
                } catch {}
              } catch (e) {
                console.error('create video failed', e);
              }
            }}>Thêm video</Button>
          </VStack>
        </Box>
      )}
      {/* Progress bar & status */}
      <Flex align="center" mb={3} gap={3}>
        <Box minW="120px">
          <Text fontWeight={500} color={allDone ? "green.500" : "yellow.500"}>
            {allDone ? "Đã hoàn thành" : `Hoàn thành ${percent}%`}
          </Text>
        </Box>
        <Box flex={1} h="8px" bg={borderCol} borderRadius="full" overflow="hidden">
          <Box h="100%" bg={allDone ? "green.400" : "yellow.400"} w={`${percent}%`} transition="width 0.3s" />
        </Box>
      </Flex>
      <Box bg={cardBg} border="1px solid" borderColor={borderCol} borderRadius="md" overflow="hidden">
        <Box h="10px" bg={headBar} />
        <VStack align="stretch" spacing={0}>
          {list.map((v) => {
            const isDone = !!v.isCompleted;
            return (
              <Link key={v.id} href={`/courses/${courseId}/watch/${v.id}`}>
                <Flex align="center" px={4} py={4} borderBottom="1px solid" borderColor={borderCol} _hover={{ bg: rowHover }}>
                  <Icon as={FaYoutube} color="red.500" boxSize={5} mr={3} />
                  <Text flex={1} fontWeight={500}>{v.title}</Text>
                  <Badge colorScheme="cyan" px={3} py={1} borderRadius="md">{v.date}</Badge>
                  <Icon as={v.locked ? FaLock : FaRegCheckCircle} color={v.locked ? "cyan.700" : (isDone ? "green.500" : "gray.400")} boxSize={5} ml={3} />
                </Flex>
              </Link>
            );
          })}
        </VStack>
      </Box>
    </Box>
  );
}
