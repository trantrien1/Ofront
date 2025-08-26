import React, { useEffect, useState } from "react";
import PageContentLayout from "../../components/Layout/PageContent";
import { Box, Button, Flex, Heading, Stack, Text, Image, HStack, Tag } from "@chakra-ui/react";
import Link from "next/link";

interface CourseCardProps {
  id: string;
  title: string;
  description: string;
  thumb?: string;
  videoCount?: number;
}

const CourseCard: React.FC<CourseCardProps> = ({ id, title, description, thumb, videoCount = 0 }) => (
  <Box borderWidth="1px" borderRadius="md" p={4} bg="white">
    <Flex>
      {thumb && <Image src={thumb} alt={title} boxSize="80px" mr={4} objectFit="cover" borderRadius="md" />}
      <Box flex={1}>
        <HStack justify="space-between" mb={1}>
          <Heading size="sm">{title}</Heading>
          <Tag colorScheme="blue">{videoCount} videos</Tag>
        </HStack>
        <Text fontSize="sm" color="gray.600" noOfLines={2}>{description}</Text>
        <HStack mt={3} spacing={3}>
          <Link href={`/courses/${id}`}><Button size="sm" colorScheme="blue">Open</Button></Link>
          <Link href={`/courses/videos?courseId=${id}`}><Button size="sm" variant="outline">Manage</Button></Link>
        </HStack>
      </Box>
    </Flex>
  </Box>
);

const MyCoursesPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [courses, setCourses] = useState<CourseCardProps[]>([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        // TODO: Replace with real service once backend exists
        setCourses([
          { id: "c1", title: "React for Beginners", description: "Learn React step by step.", thumb: "/images/redditlogo.png", videoCount: 12 },
          { id: "c2", title: "Web3 Fundamentals", description: "Intro to blockchain and smart contracts.", thumb: "/images/redditlogo.png", videoCount: 8 },
        ]);
      } finally { setLoading(false); }
    };
    load();
  }, []);

  return (
    <PageContentLayout>
      <Stack spacing={3}>
        <Flex justify="space-between" align="center">
          <Heading size="md">My Courses</Heading>
          <Link href="/courses/create"><Button colorScheme="blue">Create Course</Button></Link>
        </Flex>
        {courses.map(c => <CourseCard key={c.id} {...c} />)}
        {!loading && courses.length === 0 && (
          <Box p={6} borderWidth="1px" borderRadius="md" textAlign="center" bg="white">No courses yet</Box>
        )}
      </Stack>
      <Box />
    </PageContentLayout>
  );
};

export default MyCoursesPage;
