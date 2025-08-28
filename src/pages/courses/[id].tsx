import React from "react";
import { useRouter } from "next/router";
import Link from "next/link";
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
import { FaYoutube, FaLock, FaRegCheckCircle } from "react-icons/fa";
import { courseVideos, courseTitles } from "../../data/courses";

const CourseDetailPage: React.FC = () => {
  const router = useRouter();
  const { id } = router.query as { id?: string };
  const courseId = id || "course";

  const title = courseTitles[courseId] || "Khoá học";
  const list = courseVideos[courseId] || [];

  const cardBg = useColorModeValue("white", "gray.800");
  const borderCol = useColorModeValue("gray.200", "gray.700");
  const rowHover = useColorModeValue("gray.50", "gray.700");

  return (
    <Box maxW="1100px" mx="auto" px={{ base: 4, md: 6 }} py={6}>
      <Heading size="lg" mb={4}>{title}</Heading>
      <Box bg={cardBg} border="1px solid" borderColor={borderCol} borderRadius="md" overflow="hidden">
        <Box h="10px" bg={useColorModeValue("#051d2d", "gray.900")} />
        <VStack align="stretch" spacing={0}>
          {list.map((v) => (
            <Flex
              key={v.id}
              align="center"
              px={4}
              py={4}
              borderBottom="1px solid"
              borderColor={borderCol}
              _hover={{ bg: rowHover }}
              cursor="pointer"
              onClick={() => router.push(`/courses/${courseId}/watch/${v.id}`, undefined, { shallow: true })}
            >
              <Icon as={FaYoutube} color="red.500" boxSize={5} mr={3} />
              <Text flex={1} fontWeight={500}>{v.title}</Text>
              <Badge colorScheme="cyan" px={3} py={1} borderRadius="md">{v.date}</Badge>
              <Icon as={v.locked ? FaLock : FaRegCheckCircle} color={v.locked ? "cyan.700" : "green.500"} boxSize={5} ml={3} />
            </Flex>
          ))}
        </VStack>
      </Box>
    </Box>
  );
};

export default CourseDetailPage;
