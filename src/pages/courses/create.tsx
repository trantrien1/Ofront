import React, { useState } from "react";
import PageContentLayout from "../../components/Layout/PageContent";
import { Box, Button, FormControl, FormLabel, Heading, Input, Stack, Textarea, useToast, HStack, IconButton, Divider, Text } from "@chakra-ui/react";
import { useRouter } from "next/router";
import { CoursesService, VideosService } from "../../services";
import { CloseIcon } from "@chakra-ui/icons";

const CreateCoursePage: React.FC = () => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [videos, setVideos] = useState<Array<{ title: string; url: string; description?: string }>>([
    { title: "", url: "", description: "" },
  ]);
  const toast = useToast();
  const router = useRouter();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (!title.trim()) {
        toast({ status: "warning", title: "Vui lòng nhập tiêu đề" });
        return;
      }
      const payload = { title: title.trim(), description: description.trim() };
      const resp = await CoursesService.createCourse(payload);
      console.debug("createCourse resp:", resp);

      // Try to extract created course id from various envelope shapes
      const courseId = (resp && (resp.id || resp.courseId || resp._id))
        || (resp?.data && (resp.data.id || resp.data.courseId))
        || (resp?.result && (resp.result.id || resp.result.courseId))
        || undefined;

      // Create videos (sections) if any rows have title + url
      const validVids = videos.filter(v => v.title.trim() && v.url.trim());
      if (courseId && validVids.length) {
        const results = await Promise.allSettled(
          validVids.map(v => VideosService.createVideo({ title: v.title.trim(), url: v.url.trim(), description: (v.description || "").trim(), coureId: Number(courseId) }))
        );
        const ok = results.filter(r => r.status === 'fulfilled').length;
        const fail = results.length - ok;
        if (ok) toast({ status: 'success', title: `Đã tạo ${ok} video` });
        if (fail) toast({ status: 'warning', title: `${fail} video tạo thất bại` });
      }

      toast({ status: "success", title: "Khóa học đã được tạo" });
      if (courseId) router.push(`/courses/${courseId}`);
      else router.push("/courses");
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.response?.data?.error || e?.message || "Tạo thất bại";
      toast({ status: "error", title: msg });
    } finally { setLoading(false); }
  };

  return (
    <PageContentLayout>
      <Box as="form" onSubmit={onSubmit} borderWidth="1px" borderRadius="md" p={4} bg="white">
        <Heading size="md" mb={4}>Tạo khóa học</Heading>
        <Stack spacing={3}>
          <FormControl isRequired>
            <FormLabel>Tiêu đề</FormLabel>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </FormControl>
          <FormControl>
            <FormLabel>Mô tả</FormLabel>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
          </FormControl>

          <Divider my={2} />
          <Heading size="sm">Sections (tiêu đề video)</Heading>
          <Text fontSize="sm" color="gray.600">Mỗi section là một video. Điền tiêu đề và link YouTube.</Text>
          {videos.map((v, idx) => (
            <Box key={idx} p={3} borderWidth="1px" borderRadius="md">
              <HStack align="start" justify="space-between" mb={2}>
                <FormLabel m={0}>Video #{idx + 1}</FormLabel>
                {videos.length > 1 && (
                  <IconButton
                    aria-label="remove"
                    icon={<CloseIcon boxSize={3} />}
                    size="xs"
                    variant="ghost"
                    onClick={() => setVideos(prev => prev.filter((_, i) => i !== idx))}
                  />
                )}
              </HStack>
              <Stack spacing={2}>
                <Input placeholder="Tiêu đề video" value={v.title} onChange={(e)=>{
                  const val = e.target.value; setVideos(prev => prev.map((it,i)=> i===idx? { ...it, title: val }: it));
                }} />
                <Input placeholder="YouTube URL" value={v.url} onChange={(e)=>{
                  const val = e.target.value; setVideos(prev => prev.map((it,i)=> i===idx? { ...it, url: val }: it));
                }} />
                <Textarea placeholder="Mô tả (tuỳ chọn)" value={v.description || ''} onChange={(e)=>{
                  const val = e.target.value; setVideos(prev => prev.map((it,i)=> i===idx? { ...it, description: val }: it));
                }} />
              </Stack>
            </Box>
          ))}
          <Button onClick={()=> setVideos(prev => [...prev, { title: "", url: "", description: "" }])} variant="outline" size="sm">+ Thêm section</Button>

          <Button type="submit" colorScheme="blue" isLoading={loading}>Tạo</Button>
        </Stack>
      </Box>
      <Box />
    </PageContentLayout>
  );
};

export default CreateCoursePage;
