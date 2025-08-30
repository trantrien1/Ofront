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
} from "@chakra-ui/react";
import Link from "next/link";
import { CoursesService } from "../../../services";
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
    </Box>
  );
}
