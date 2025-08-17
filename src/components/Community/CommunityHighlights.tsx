import React, { useCallback } from "react";
import {
  Box,
  Flex,
  Text,
  Image,
  Icon,
  useColorModeValue,
} from "@chakra-ui/react";
import { MdPushPin } from "react-icons/md";
import { Post } from "../../atoms/postsAtom";
import { Community } from "../../atoms/communitiesAtom";
import { useRouter } from "next/router";
import { normalizeTimestamp } from "../../helpers/timestampHelpers";

interface CommunityHighlightsProps {
  pinnedPosts: Post[];
  communityData: Community;
}

const CommunityHighlights: React.FC<CommunityHighlightsProps> = ({ pinnedPosts, communityData }) => {
  const router = useRouter();
  
  const cardBg = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.600");
  const textColor = useColorModeValue("gray.800", "white");
  const subtitleColor = useColorModeValue("gray.600", "gray.300");

  if (!pinnedPosts || pinnedPosts.length === 0) {
    return null;
  }



  const formatDate = (timestamp: any) => {
    if (!timestamp) return '';
    const date = normalizeTimestamp(timestamp);
    return new Date(date).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <Box mb={6}>
      {/* Header */}
      <Flex align="center" mb={4}>
        <Icon as={MdPushPin} color="orange.500" mr={2} boxSize={5} />
        <Text fontSize="lg" fontWeight="bold" color={textColor}>
          Community Highlights
        </Text>
      </Flex>

      {/* Highlights Cards - horizontal scroll */}
      <Flex
        gap={4}
        overflowX="auto"
        pb={2}
        css={{
          "&::-webkit-scrollbar": {
            height: "6px",
          },
          "&::-webkit-scrollbar-thumb": {
            background: "#cfcfcf",
            borderRadius: "4px",
          },
        }}
      >
        {pinnedPosts.map((post) => {
          const handleThisPostClick = () => {
            router.push(`/r/${communityData.id}/comments/${post.id}`);
          };

          return (
            <Box
              key={post.id}
              minW="250px"
              maxW="250px"
              flexShrink={0}
              bg={cardBg}
              border="1px solid"
              borderColor={borderColor}
              borderRadius="md"
              overflow="hidden"
              cursor="pointer"
              transition="all 0.2s ease"
              _hover={{
                transform: "translateY(-2px)",
                boxShadow: "lg",
                borderColor: "blue.500",
              }}
              onClick={handleThisPostClick}
            >
            {/* Image */}
            {post.imageURL && (
              <Image
                src={post.imageURL}
                alt={post.title}
                width="100%"
                height="120px"
                objectFit="cover"
              />
            )}

            {/* Content */}
            <Box p={3}>
              <Text
                fontSize="md"
                fontWeight="semibold"
                color={textColor}
                noOfLines={2}
                mb={2}
              >
                {post.title}
              </Text>
              <Text
                fontSize="xs"
                color={subtitleColor}
                noOfLines={2}
              >
                {post.body || "No description available."}
              </Text>
              <Text fontSize="xs" mt={2} color={subtitleColor}>
                {formatDate(post.createdAt)}
              </Text>
            </Box>
          </Box>
          );
        })}
      </Flex>
    </Box>
  );
};

export default CommunityHighlights;
