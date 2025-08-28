import { useRouter } from "next/router";
import React, { useMemo } from "react";
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
import { courseVideos, courseTitles, youtubeWatchToEmbed } from "../../../../data/courses";

export default function WatchVideoPage() {
  const router = useRouter();
  const { courseId, videoId } = router.query as { courseId: string; videoId: string };

  const list = courseVideos[courseId] || [];
  const current = useMemo(() => list.find((v) => v.id === videoId), [list, videoId]);
  const embed = youtubeWatchToEmbed(current?.link) || "";

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
            <Heading size="sm" mb={2}>{courseTitles[courseId] || "Bài học"}</Heading>
            <Tag size="sm" colorScheme="green" variant="solid" borderRadius="full">
              <TagLeftIcon as={FaRegCheckCircle} />
              <TagLabel>Đã hoàn thành</TagLabel>
            </Tag>
          </Box>
          <VStack align="stretch" spacing={0} flex={1} overflowY="auto">
            {list.map((v) => {
              const href = `/courses/${courseId}/watch/${v.id}`;
              const isActive = v.id === videoId;
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
                    <Icon as={FaRegCheckCircle} color="green.500" boxSize={4} mr={2} />
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
