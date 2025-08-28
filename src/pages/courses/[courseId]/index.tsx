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
import { courseVideos, courseTitles } from "../../../data/courses";

// Helpers for localStorage
function getCompleted(courseId: string) {
  const data = typeof window !== "undefined" ? localStorage.getItem(`completed_${courseId}`) : null;
  return data ? JSON.parse(data) : [];
}

export default function CourseDetailPage() {
  const router = useRouter();
  const { courseId } = router.query as { courseId: string };
  const title = courseTitles[courseId] || "Khoá học";
  const list = courseVideos[courseId] || [];

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
