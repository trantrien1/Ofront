import { useRouter } from "next/router";
import React, { useMemo, useEffect, useState, useRef } from "react";
import {
  Box,
  Flex,
  Heading,
  Icon,
  Text,
  VStack,
  useColorModeValue,
} from "@chakra-ui/react";
import { Tag, TagLeftIcon, TagLabel } from "@chakra-ui/react";
import Link from "next/link";
import { FaRegCheckCircle, FaYoutube } from "react-icons/fa";
import { CoursesService, VideosService } from "../../../../services";
import { markVideoCompleted } from "../../../../services/videos.service";

function youtubeWatchToEmbed(url?: string) {
  if (!url) return "";
  try {
    if (url.includes("/embed/")) return url;
    const u = new URL(url, "https://youtube.com");
    if (u.hostname.includes("youtube.com") && u.searchParams.get("v")) {
      return `https://www.youtube.com/embed/${u.searchParams.get("v")}`;
    }
    if (u.hostname === "youtu.be") {
      const id = u.pathname.replace(/\//g, "");
      if (id) return `https://www.youtube.com/embed/${id}`;
    }
  } catch {}
  return "";
}

type Lesson = { id: string; title: string; link?: string; isCompleted?: boolean };

export default function WatchVideoPage() {
  const router = useRouter();
  const { courseId, videoId } = router.query as { courseId: string; videoId: string };
  const [title, setTitle] = useState<string>("Bài học");
  const [list, setList] = useState<Lesson[]>([]);
  const current = useMemo(() => list.find((v) => v.id === videoId), [list, videoId]);
  const embed = youtubeWatchToEmbed(current?.link) || "";

  // Use backend isCompleted flags
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Load course lessons when courseId changes
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!courseId) return;
      try {
        // Get course title for header
        const data = await CoursesService.getCourses({ id: courseId });
        const arr = (Array.isArray(data) && data)
          || (Array.isArray(data?.data) && data.data)
          || (Array.isArray(data?.content) && data.content)
          || (Array.isArray(data?.data?.content) && data.data.content)
          || [];
        const course = arr.find((c: any) => String(c.id ?? c.courseId ?? c._id) === String(courseId)) || arr[0];
        if (mounted && course) setTitle(String(course.title ?? course.name ?? 'Bài học'));
        // Fetch videos by course via upstream proxy
        const vidsResp = await VideosService.getVideosByCourse(courseId);
        const vidsArr = (Array.isArray(vidsResp) && vidsResp)
          || (Array.isArray(vidsResp?.data) && vidsResp.data)
          || (Array.isArray(vidsResp?.content) && vidsResp.content)
          || (Array.isArray(vidsResp?.data?.content) && vidsResp.data.content)
          || [];
        const mapped: Lesson[] = vidsArr.map((l: any, idx: number) => ({
          id: String(l.id ?? l.videoId ?? idx),
          title: String(l.title ?? l.name ?? `Bài ${idx + 1}`),
          link: l.link || l.url || l.youtubeUrl,
          isCompleted: !!(l.isCompleted || l.completed || l.done),
        }));
        if (mounted) setList(mapped);
      } catch {
        // keep empty
      }
    })();
    return () => { mounted = false; };
  }, [courseId]);

  // Mark video as completed after 1 minute via backend
  useEffect(() => {
    if (!current) return;
    if (current.isCompleted) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      try {
        if (/^\d+$/.test(current.id)) await markVideoCompleted(Number(current.id));
      } catch {}
      setList(prev => prev.map(v => v.id === current.id ? { ...v, isCompleted: true } : v));
    }, 60000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [current]);

  // Tính phần trăm hoàn thành
  const doneCount = list.filter(v => v.isCompleted).length;
  const percent = list.length ? Math.round((doneCount / list.length) * 100) : 0;
  const allDone = percent === 100;

  const leftBg = useColorModeValue("white", "gray.800");
  const rowHover = useColorModeValue("gray.50", "gray.700");
  const borderCol = useColorModeValue("gray.200", "gray.700");
  const activeBg = useColorModeValue("gray.100", "gray.700");

  return (
    // Full-width container aligned with Layout content; no auto-centering
    <Box w="100%" mx={0} px={0} py={4}>
      <Flex gap={4}>
        {/* Left list */}
        <Box
          w={{ base: "280px", md: "320px" }}
          bg={leftBg}
          border="1px solid"
          borderColor={borderCol}
          borderRadius="md"
          overflow="hidden"
          h="calc(100vh - 70px)"
          position="sticky"
          top="70px"
          display="flex"
          flexDir="column"
        >
          {/* Header with completion pill */}
          <Box p={3} borderBottom="1px solid" borderColor={borderCol}>
            <Heading size="sm" mb={2}>{title}</Heading>
            <Tag size="sm" colorScheme={allDone ? "green" : "yellow"} variant="solid" borderRadius="full">
              <TagLeftIcon as={FaRegCheckCircle} />
              <TagLabel>
                {allDone ? "Đã hoàn thành" : `Hoàn thành ${percent}%`}
              </TagLabel>
            </Tag>
          </Box>
          <VStack align="stretch" spacing={0} flex={1} overflowY="auto">
            {list.map((v) => {
              const href = `/courses/${courseId}/watch/${v.id}`;
              const isActive = v.id === videoId;
              const isDone = !!v.isCompleted;
              return (
                <Link key={v.id} href={href} shallow>
                  <Flex
                    align="center"
                    px={3}
                    py={3}
                    borderTop="1px solid"
                    borderColor={borderCol}
                    _hover={{ bg: rowHover }}
                    bg={isActive ? activeBg : undefined}
                    position="relative"
                  >
                    <Box position="absolute" left={0} top={0} bottom={0} w="3px" bg={isActive ? "green.500" : "transparent"} />
                    <Icon as={FaRegCheckCircle} color={isDone ? "green.500" : "gray.400"} boxSize={4} mr={2} />
                    <Text noOfLines={1}>{v.title}</Text>
                  </Flex>
                </Link>
              );
            })}
          </VStack>
        </Box>

        {/* Player */}
        <Box flex={1}>
          <Heading size="md" mb={3}>{current?.title || "Video"}</Heading>
          <Box position="relative" w="100%" pb="56.25%" bg="black" borderRadius="md" overflow="hidden">
            {embed ? (
              <Box as="iframe" src={embed} title={current?.title} position="absolute" top={0} left={0} w="100%" h="100%" allowFullScreen border={0} />
            ) : (
              <Flex position="absolute" top={0} left={0} w="100%" h="100%" align="center" justify="center" color="white">
                <Icon as={FaYoutube} color="red.400" boxSize={12} />
                <Text ml={3}>Không có link YouTube</Text>
              </Flex>
            )}
          </Box>
        </Box>
      </Flex>
    </Box>
  );
}
