import React, { useState } from "react";
import PageContentLayout from "../../components/Layout/PageContent";
import { Box, Button, FormControl, FormLabel, Heading, Input, Stack, Textarea, useToast } from "@chakra-ui/react";
import { useRouter } from "next/router";

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
      // TODO: call course service to create
      toast({ status: "success", title: "Course created" });
      router.push("/courses");
    } catch (e) {
      toast({ status: "error", title: "Create failed" });
    } finally { setLoading(false); }
  };

  return (
    <PageContentLayout>
      <Box as="form" onSubmit={onSubmit} borderWidth="1px" borderRadius="md" p={4} bg="white">
        <Heading size="md" mb={4}>Create Course</Heading>
        <Stack spacing={3}>
          <FormControl isRequired>
            <FormLabel>Title</FormLabel>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </FormControl>
          <FormControl>
            <FormLabel>Description</FormLabel>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
          </FormControl>
          <Button type="submit" colorScheme="blue" isLoading={loading}>Create</Button>
        </Stack>
      </Box>
      <Box />
    </PageContentLayout>
  );
};

export default CreateCoursePage;
