import React from "react";
import PageContentLayout from "../../components/Layout/PageContent";
import { Box, Button, Heading, Stack, Text } from "@chakra-ui/react";
import { useRouter } from "next/router";
import Link from "next/link";

const CourseDetailPage: React.FC = () => {
  const router = useRouter();
  const { id } = router.query as { id?: string };
  const courseId = id || "course";

  return (
    <PageContentLayout>
      <Stack spacing={4}>
        <Heading size="md">Course: {courseId}</Heading>
        <Text color="gray.600">This is a placeholder course page. Content will include syllabus, progress, and lessons.</Text>
        <Link href={`/courses/videos?courseId=${courseId}`}>
          <Button colorScheme="blue" width="fit-content">Manage Videos</Button>
        </Link>
      </Stack>
      <Box />
    </PageContentLayout>
  );
};

export default CourseDetailPage;
