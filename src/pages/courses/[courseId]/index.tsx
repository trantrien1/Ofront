import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";
import {
  Box,
  Badge,
  Flex,
  Heading,
  Icon,
  Text,
  VStack,
  useColorModeValue,
} from "@chakra-ui/react";
import Link from "next/link";
import { FaYoutube, FaLock, FaRegCheckCircle } from "react-icons/fa";
import { CoursesService } from "../../../services";

// Helpers for localStorage
function getCompleted(courseId: string) {
  const data = typeof window !== "undefined" ? localStorage.getItem(`completed_${courseId}`) : null;
  return data ? JSON.parse(data) : [];
}

type Lesson = { id: string; title: string; date?: string; locked?: boolean };

export default function CourseDetailPage() {
  const router = useRouter();
  const { courseId } = router.query as { courseId: string };
  const [title, setTitle] = useState<string>("Khoá học");
  const [description, setDescription] = useState<string>("");
  const [list, setList] = useState<Lesson[]>([]);
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
          // If backend provides lessons array, map it; else leave empty and keep page scaffolding
          const lessons = Array.isArray(course?.lessons) ? course.lessons : [];
          const mapped = lessons.map((l: any, idx: number) => ({
            id: String(l.id ?? l.videoId ?? idx),
            title: String(l.title ?? l.name ?? `Bài ${idx + 1}`),
            date: l.date ? String(l.date) : undefined,
            locked: !!l.locked,
          }));
          setList(mapped);
        }
      } catch (e) {
        // keep defaults
      }
    })();
    return () => { mounted = false; };
  }, [courseId]);

  const cardBg = useColorModeValue("white", "gray.800");
  const borderCol = useColorModeValue("gray.200", "gray.700");
  const rowHover = useColorModeValue("gray.50", "gray.700");

  // State for completed videos
  const [completed, setCompleted] = useState<string[]>([]);

  useEffect(() => {
    if (courseId) {
      setCompleted(getCompleted(courseId));
    }
  }, [courseId]);

  const percent = list.length ? Math.round((completed.length / list.length) * 100) : 0;
  const allDone = percent === 100;

  return (
    <Box maxW="1280px" mx={0} px={{ base: 2, md: 4 }} py={4}>
      <Heading size="lg" mb={4}>{title}</Heading>
      {description ? (
        <Text mb={4} color={useColorModeValue('gray.700','gray.300')}>{description}</Text>
      ) : null}
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
        <Box h="10px" bg={useColorModeValue("#051d2d", "gray.900")} />
        <VStack align="stretch" spacing={0}>
          {list.map((v) => {
            const isDone = completed.includes(v.id);
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
