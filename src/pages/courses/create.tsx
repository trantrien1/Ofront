import React, { useState } from "react";
import PageContentLayout from "../../components/Layout/PageContent";
import { Box, Button, FormControl, FormLabel, Heading, Input, Stack, Textarea, useToast } from "@chakra-ui/react";
import { useRouter } from "next/router";
import { CoursesService } from "../../services";

const CreateCoursePage: React.FC = () => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
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
      toast({ status: "success", title: "Khóa học đã được tạo" });
      router.push("/courses");
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
          <Button type="submit" colorScheme="blue" isLoading={loading}>Tạo</Button>
        </Stack>
      </Box>
      <Box />
    </PageContentLayout>
  );
};

export default CreateCoursePage;
