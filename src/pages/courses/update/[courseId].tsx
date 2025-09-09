import { useRouter } from "next/router";
import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Heading,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  Button,
  Flex,
  Spacer,
  useToast,
  useColorModeValue,
  Text,
  Stack,
  HStack,
} from "@chakra-ui/react";
import Link from "next/link";
import { CoursesService, VideosService } from "../../../services";
import { getClientRole, isAdminRole } from "../../../helpers/role";

export default function CourseUpdatePage() {
  const router = useRouter();
  const toast = useToast();
  const { courseId } = router.query as { courseId?: string };

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [initial, setInitial] = useState<any>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  // Videos state
  type Vid = { id: string; title: string; url?: string; description?: string; editTitle: string; editUrl: string; saving?: boolean; deleting?: boolean };
  const [videos, setVideos] = useState<Vid[]>([]);
  const [loadingVideos, setLoadingVideos] = useState<boolean>(false);

  useEffect(() => {
    // detect admin role robustly
    try {
      const r = getClientRole();
      setIsAdmin(isAdminRole(r));
    } catch {}
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!courseId) return;
      try {
        const data = await CoursesService.getCourses({ id: courseId });
        const arr =
          (Array.isArray(data) && data) ||
          (Array.isArray(data?.data) && data.data) ||
          (Array.isArray(data?.content) && data.content) ||
          (Array.isArray(data?.data?.content) && data.data.content) ||
          [];
        const course = arr.find((c: any) => String(c.id ?? c.courseId ?? c._id) === String(courseId)) || arr[0];
        if (mounted && course) {
          setInitial(course);
          setTitle(String(course.title ?? course.name ?? ""));
          setDescription(String(course.description ?? course.desc ?? ""));
          setImageUrl(String(course.imageUrl ?? course.image ?? ""));
        }
      } catch (e) {
        // ignore, show empty form
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [courseId]);

  // Load videos belonging to this course
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!courseId) return;
      setLoadingVideos(true);
      try {
        const data = await VideosService.getVideosByCourse(courseId);
        const arr: any[] = (Array.isArray(data) && data)
          || (Array.isArray(data?.data) && data.data)
          || (Array.isArray(data?.content) && data.content)
          || (Array.isArray(data?.data?.content) && data.data.content)
          || [];
        const mapped: Vid[] = arr.map((r: any) => ({
          id: String(r.id ?? r.videoId ?? Math.random()),
          title: String(r.title ?? r.name ?? 'Untitled'),
          url: r.url || r.link || r.youtubeUrl || '',
          description: r.description || r.desc || '',
          editTitle: String(r.title ?? r.name ?? ''),
          editUrl: String(r.url || r.link || r.youtubeUrl || ''),
        }));
        if (mounted) setVideos(mapped);
      } catch (e) {
        // ignore
      } finally {
        if (mounted) setLoadingVideos(false);
      }
    })();
    return () => { mounted = false; };
  }, [courseId]);

  const cardBg = useColorModeValue("white", "gray.800");
  const borderCol = useColorModeValue("gray.200", "gray.700");

  const canSave = useMemo(() => {
    return !!title && isAdmin && !!courseId && !saving;
  }, [title, isAdmin, courseId, saving]);

  const onSubmit = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const idNum = Number(courseId);
      const payload: any = {
        id: isFinite(idNum) ? idNum : courseId,
        courseId: isFinite(idNum) ? idNum : courseId, // include both keys for upstream compatibility
        title,
        description,
      };
      if (imageUrl) payload.imageUrl = imageUrl;

      await CoursesService.updateCourse(payload);
      toast({ status: "success", title: "Đã cập nhật khóa học" });
      router.replace(`/courses/${courseId}`);
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.response?.data?.error || e?.message || "Cập nhật thất bại";
      toast({ status: "error", title: msg });
    } finally {
      setSaving(false);
    }
  };

  // Handlers: video update/delete
  const saveVideo = async (id: string) => {
    if (!isAdmin) return;
    setVideos(prev => prev.map(v => v.id === id ? { ...v, saving: true } : v));
    try {
      const v = videos.find(x => x.id === id);
      if (!v) return;
      const title = (v.editTitle || '').trim();
      const url = (v.editUrl || '').trim();
      if (!title || !url) throw new Error('Thiếu tiêu đề hoặc link');
  const cid = courseId ? (Number(courseId) && Number.isFinite(Number(courseId)) ? Number(courseId) : courseId) : undefined as any;
  await VideosService.updateVideo({ id, title, url, coureId: cid as any });
      setVideos(prev => prev.map(x => x.id === id ? { ...x, title, url, saving: false } : x));
      toast({ status: 'success', title: 'Đã cập nhật video' });
    } catch (e: any) {
      setVideos(prev => prev.map(x => x.id === id ? { ...x, saving: false } : x));
      toast({ status: 'error', title: 'Cập nhật video thất bại', description: e?.message });
    }
  };

  const removeVideo = async (id: string) => {
    if (!isAdmin) return;
    setVideos(prev => prev.map(v => v.id === id ? { ...v, deleting: true } : v));
    try {
      await VideosService.deleteVideo(id);
      setVideos(prev => prev.filter(v => v.id !== id));
      toast({ status: 'success', title: 'Đã xóa video' });
    } catch (e: any) {
      setVideos(prev => prev.map(x => x.id === id ? { ...x, deleting: false } : x));
      toast({ status: 'error', title: 'Xóa video thất bại', description: e?.message });
    }
  };

  return (
    <Box maxW="800px" mx="auto" px={4} py={6}>
      <Flex align="center" mb={4}>
        <Heading size="lg">Cập nhật khóa học</Heading>
        <Spacer />
        <Link href={courseId ? `/courses/${courseId}` : "/courses"}>
          <Button variant="ghost">Quay lại</Button>
        </Link>
      </Flex>

      {!isAdmin && (
        <Box mb={4} p={3} border="1px solid" borderColor={borderCol} borderRadius="md" bg={cardBg}>
          <Text>Bạn không có quyền cập nhật. Vui lòng đăng nhập với quyền admin.</Text>
        </Box>
      )}

      <Box p={4} border="1px solid" borderColor={borderCol} bg={cardBg} borderRadius="md">
        {loading ? (
          <Text>Đang tải...</Text>
        ) : (
          <>
            <FormControl mb={4}>
              <FormLabel>Tiêu đề</FormLabel>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Nhập tiêu đề khóa học" />
            </FormControl>
            <FormControl mb={4}>
              <FormLabel>Mô tả</FormLabel>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Mô tả khóa học" rows={6} />
            </FormControl>
            <FormControl mb={6}>
              <FormLabel>Ảnh (URL)</FormLabel>
              <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." />
            </FormControl>
            <Flex gap={3}>
              <Button onClick={onSubmit} colorScheme="blue" isDisabled={!canSave} isLoading={saving}>
                Lưu thay đổi
              </Button>
              <Link href={courseId ? `/courses/${courseId}` : "/courses"}>
                <Button variant="outline">Hủy</Button>
              </Link>
            </Flex>
          </>
        )}
      </Box>

      {/* Video management */}
      <Box mt={6} p={4} border="1px solid" borderColor={borderCol} bg={cardBg} borderRadius="md">
        <Heading size="md" mb={3}>Quản lý video</Heading>
        {loadingVideos ? (
          <Text>Đang tải video...</Text>
        ) : videos.length === 0 ? (
          <Text fontSize="sm" color="gray.500">Chưa có video cho khóa học này.</Text>
        ) : (
          <Stack spacing={4}>
            {videos.map(v => (
              <Box key={v.id} p={3} borderWidth="1px" borderRadius="md">
                <Stack spacing={3}>
                  <FormControl>
                    <FormLabel>Tiêu đề</FormLabel>
                    <Input value={v.editTitle} onChange={e => setVideos(prev => prev.map(x => x.id === v.id ? { ...x, editTitle: e.target.value } : x))} />
                  </FormControl>
                  <FormControl>
                    <FormLabel>Link video</FormLabel>
                    <Input value={v.editUrl} onChange={e => setVideos(prev => prev.map(x => x.id === v.id ? { ...x, editUrl: e.target.value } : x))} placeholder="https://..." />
                  </FormControl>
                  <HStack>
                    <Button size="sm" colorScheme="blue" onClick={() => saveVideo(v.id)} isDisabled={!isAdmin} isLoading={!!v.saving}>Lưu</Button>
                    <Button size="sm" colorScheme="red" variant="outline" onClick={() => removeVideo(v.id)} isDisabled={!isAdmin} isLoading={!!v.deleting}>Xóa</Button>
                  </HStack>
                </Stack>
              </Box>
            ))}
          </Stack>
        )}
      </Box>
    </Box>
  );
}
