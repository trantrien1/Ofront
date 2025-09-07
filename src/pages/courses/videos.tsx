import React, { useEffect, useRef, useState } from "react";
import PageContentLayout from "../../components/Layout/PageContent";
import { Box, Button, Flex, Heading, HStack, IconButton, Image, Input, Stack, Text, Textarea, useToast, Tooltip, Badge, Spinner, useColorModeValue } from "@chakra-ui/react";
import { markVideoCompleted, getVideosByCourse } from "../../services/videos.service";
import { useRouter } from "next/router";
import { DeleteIcon, EditIcon } from "@chakra-ui/icons";

interface VideoItem {
  id: string;
  title: string;
  description?: string;
  duration?: string;
  thumb?: string;
  url?: string;
  createdAt?: string;
  isCompleted?: boolean; // mới thêm: trạng thái đã xem
}

const VideosPage: React.FC = () => {
  const toast = useToast();
  const router = useRouter();
  const courseId = (router.query.courseId as string) || "";
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const watchIntervalRef = useRef<any>(null);
  const watchedSecondsRef = useRef<number>(0);
  const lastStartedVideoRef = useRef<string | null>(null);

  const markCompletedOnce = async (id: string) => {
    setVideos(prev => prev.map(v => v.id === id ? { ...v, __marking: true } as any : v));
    try {
      if (/^\d+$/.test(id)) await markVideoCompleted(Number(id));
      else await new Promise(r => setTimeout(r, 250)); // fallback mock path
      setVideos(prev => prev.map(v => v.id === id ? { ...v, isCompleted: true, __marking: false } : v));
      toast({ status: "success", title: "Đã hoàn thành sau 1 phút xem" });
    } catch (e: any) {
      setVideos(prev => prev.map(v => v.id === id ? { ...v, __marking: false } : v));
      toast({ status: "error", title: "Không thể cập nhật", description: e?.message });
    }
  };

  useEffect(() => {
    if (!courseId) return;
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const raw = await getVideosByCourse(courseId);
        // Expect raw to be array; normalize a bit
        const arr: any[] = Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : []);
        const mapped: VideoItem[] = arr.map((r: any) => ({
          id: String(r.id ?? r.videoId ?? r.uuid ?? Math.random()),
            title: r.title || r.name || "Untitled",
            description: r.description || r.desc || "",
            url: r.url || r.link || r.source || "",
            createdAt: r.createdAt,
            isCompleted: !!(r.isCompleted || r.completed || r.done),
            duration: r.duration ? String(r.duration) : undefined,
            thumb: r.thumbnail || r.thumb || r.imageURL || undefined,
        }));
        if (active) {
          setVideos(mapped);
          // Auto select first video
          if (mapped.length) setSelectedId(mapped[0].id);
        }
      } catch (e: any) {
        toast({ status: "error", title: "Tải video thất bại", description: e?.message });
      } finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, [courseId, toast]);

  const onUpload = async () => {
    // Upload logic giữ nguyên TODO nếu cần sau này
    toast({ status: "info", title: "Tính năng upload sẽ được triển khai" });
  };

  const onDelete = (_id: string) => {
    toast({ status: "info", title: "Xóa chưa được bật" });
  };

  const markCompleted = markCompletedOnce; // alias cho nút thủ công (nếu muốn tái sử dụng)

  const activeBg = useColorModeValue('blue.50','blue.900');

  // ===== Watch tracking logic =====
  useEffect(() => {
    const el = videoRef.current;
    if (!el || !selectedId) return;
    // Reset counters when switching video
    watchedSecondsRef.current = 0;
    lastStartedVideoRef.current = selectedId;
    const clearTimer = () => { if (watchIntervalRef.current) { clearInterval(watchIntervalRef.current); watchIntervalRef.current = null; } };
    const handlePlay = () => {
      clearTimer();
      // nếu đã completed thì không cần đếm
      const vid = videos.find(v => v.id === selectedId);
      if (vid?.isCompleted) return;
      watchIntervalRef.current = setInterval(() => {
        watchedSecondsRef.current += 1;
        if (watchedSecondsRef.current >= 60) {
          clearTimer();
          // Đánh dấu hoàn thành
          markCompletedOnce(selectedId);
        }
      }, 1000);
    };
    const handlePause = () => clearTimer();
    const handleEnded = () => {
      clearTimer();
      const vid = videos.find(v => v.id === selectedId);
      if (!vid?.isCompleted) {
        // Nếu video ngắn (<60s) và đã xem hết thì vẫn đánh dấu
        if (watchedSecondsRef.current >= 60 || (el.duration && el.duration < 60)) {
          markCompletedOnce(selectedId);
        }
      }
    };
    el.addEventListener('play', handlePlay);
    el.addEventListener('pause', handlePause);
    el.addEventListener('ended', handleEnded);
    return () => {
      el.removeEventListener('play', handlePlay);
      el.removeEventListener('pause', handlePause);
      el.removeEventListener('ended', handleEnded);
      clearTimer();
    };
  }, [selectedId, videos]);

  const onEdit = (id: string, title: string, description?: string) => {
    setVideos(prev => prev.map(v => v.id === id ? { ...v, title, description } : v));
    toast({ status: "success", title: "Đã lưu" });
  };

  return (
    <PageContentLayout>
      <Flex gap={6} align="flex-start" flexDir={{ base: 'column', md: 'row' }}>
        {/* Danh sách video */}
        <Box flexBasis={{ base: '100%', md: '40%' }} w={{ base: '100%', md: '40%' }}>
          <Heading size="md" mb={3}>Danh sách video</Heading>
          {loading ? (
            <Flex justify="center" py={6}><Spinner /></Flex>
          ) : videos.length === 0 ? (
            <Text fontSize="sm" color="gray.500">Chưa có video.</Text>
          ) : (
            <Stack spacing={3}>
              {videos.map(v => {
                const active = v.id === selectedId;
                return (
                  <Flex key={v.id}
                    p={3}
                    borderWidth="1px"
                    borderRadius="md"
                    bg={active ? activeBg : 'white'}
                    borderColor={active ? 'blue.400' : 'gray.200'}
                    align="center"
                    gap={3}
                    cursor="pointer"
                    onClick={() => setSelectedId(v.id)}
                    transition="background 0.15s"
                  >
                    {v.thumb && <Image src={v.thumb} alt={v.title} boxSize="56px" objectFit="cover" borderRadius="md" />}
                    <Box flex={1} minW={0}>
                      <HStack spacing={2} align="center">
                        <Text fontWeight="semibold" noOfLines={1}>{v.title}</Text>
                        {v.isCompleted && <Badge colorScheme="green">Done</Badge>}
                        {(v as any).__marking && <Badge colorScheme="blue" variant="subtle">...</Badge>}
                      </HStack>
                      {v.description && <Text fontSize="xs" color="gray.600" noOfLines={2}>{v.description}</Text>}
                    </Box>
                  </Flex>
                );
              })}
            </Stack>
          )}
        </Box>
        {/* Player */}
        <Box flex={1} w={{ base: '100%', md: '60%' }}>
          <Heading size="md" mb={3}>Trình phát</Heading>
          {!selectedId ? (
            <Text fontSize="sm" color="gray.500">Chọn một video để bắt đầu.</Text>
          ) : (
            (() => {
              const vid = videos.find(v => v.id === selectedId);
              if (!vid) return <Text>Video không tồn tại.</Text>;
              return (
                <Box>
                  <Box position="relative" mb={3}>
                    {vid.url ? (
                      <video
                        key={vid.id}
                        ref={videoRef}
                        src={vid.url}
                        controls
                        style={{ width: '100%', borderRadius: '8px', background: '#000' }}
                      />
                    ) : (
                      <Box p={8} textAlign="center" borderWidth="1px" borderRadius="md">Không có URL video.</Box>
                    )}
                  </Box>
                  <Heading size="sm" mb={2}>{vid.title}</Heading>
                  {vid.description && <Text mb={2} fontSize="sm" color="gray.600">{vid.description}</Text>}
                  <HStack spacing={4} fontSize="xs" color="gray.500" mb={2}>
                    <Text>Trạng thái: {vid.isCompleted ? 'Đã hoàn thành' : 'Đang học'}</Text>
                    <Text>Đã xem: {Math.min(watchedSecondsRef.current, 60)}s / 60s</Text>
                  </HStack>
                  {!vid.isCompleted && (
                    <Button size="sm" onClick={() => markCompletedOnce(vid.id)} isLoading={(vid as any).__marking}>
                      Đánh dấu hoàn thành thủ công
                    </Button>
                  )}
                </Box>
              );
            })()
          )}
        </Box>
  </Flex>
  <Box />
    </PageContentLayout>
  );
};

export default VideosPage;
