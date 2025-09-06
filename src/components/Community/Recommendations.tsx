import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  Flex,
  Icon,
  Image,
  Stack,
  Text,
} from "@chakra-ui/react";

import { Community } from "../../atoms/communitiesAtom";
import { FaReddit } from "react-icons/fa";
import useCommunityData from "../../hooks/useCommunityData";
import Link from "next/link";
import dynamic from "next/dynamic";

// Disable SSR for this component to prevent hydration issues
const Recommendations = dynamic(() => Promise.resolve(RecommendationsComponent), {
  ssr: false,
  loading: () => <RecommendationsBox />
});

const RecommendationsBox = () => (
  <Flex
    direction="column"
    bg="white"
    borderRadius={4}
    cursor="pointer"
    border="1px solid"
    borderColor="gray.300"
  >
    <Flex
      align="flex-end"
      color="white"
      p="6px 10px"
      bg="blue.500"
      height="70px"
      borderRadius="4px 4px 0px 0px"
      fontWeight={600}
      bgImage="url(/images/ptit.png)"
      backgroundSize="cover"
      bgGradient="linear-gradient(to bottom, rgba(0, 0, 0, 0), rgba(0, 0, 0, 0.75)),
      url('images/ptit.png')"
    >
      Cộng đồng hàng đầu
    </Flex>
    <Stack mt={2} p={3}>
      <Flex justify="space-between" align="center">
        <Box width="40px" height="40px" bg="gray.200" borderRadius="full" />
        <Box height="10px" width="70%" bg="gray.200" borderRadius="md" />
      </Flex>
      <Flex justify="space-between" align="center">
        <Box width="40px" height="40px" bg="gray.200" borderRadius="full" />
        <Box height="10px" width="70%" bg="gray.200" borderRadius="md" />
      </Flex>
      <Flex justify="space-between" align="center">
        <Box width="40px" height="40px" bg="gray.200" borderRadius="full" />
        <Box height="10px" width="70%" bg="gray.200" borderRadius="md" />
      </Flex>
    </Stack>
  </Flex>
);

type RecommendationsProps = {};

const RecommendationsComponent: React.FC<RecommendationsProps> = () => {
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(false);
  const { communityStateValue, onJoinLeaveCommunity } = useCommunityData();

  const getCommunityRecommendations = async () => {
    setLoading(true);
    try {
      // TODO: Replace with communities API
      setCommunities([]);
    } catch (error: any) {
  console.error("getCommunityRecommendations error", error?.message || error);
    }
    setLoading(false);
  };

  useEffect(() => {
    getCommunityRecommendations();
  }, []);

  return (
    <Flex
      direction="column"
      bg="white"
      borderRadius={4}
      cursor="pointer"
      border="1px solid"
      borderColor="gray.300"
    >
      <Flex
        align="flex-end"
        color="white"
        p="6px 10px"
        bg="blue.500"
        height="70px"
        borderRadius="4px 4px 0px 0px"
        fontWeight={600}
        bgImage="url(/images/ptit.png)"
        backgroundSize="cover"
        bgGradient="linear-gradient(to bottom, rgba(0, 0, 0, 0), rgba(0, 0, 0, 0.75)),
        url('images/ptit.png')"
      >
        Cộng đồng hàng đầu
      </Flex>
      <Flex direction="column">
        {loading ? (
          <Stack mt={2} p={3}>
            <Flex justify="space-between" align="center">
              <Box width="40px" height="40px" bg="gray.200" borderRadius="full" />
              <Box height="10px" width="70%" bg="gray.200" borderRadius="md" />
            </Flex>
            <Flex justify="space-between" align="center">
              <Box width="40px" height="40px" bg="gray.200" borderRadius="full" />
              <Box height="10px" width="70%" bg="gray.200" borderRadius="md" />
            </Flex>
            <Flex justify="space-between" align="center">
              <Box width="40px" height="40px" bg="gray.200" borderRadius="full" />
              <Box height="10px" width="70%" bg="gray.200" borderRadius="md" />
            </Flex>
          </Stack>
        ) : (
          <>
            {communities.map((item, index) => {
              // Simple join check after mounting
              const isJoined = (communityStateValue.mySnippets as any[]).find(
                (snippet: any) => snippet.communityId === item.id
              );
              return (
                <Link key={item.id} href={`/community/${item.id}`}>
                  <Flex
                    position="relative"
                    align="center"
                    fontSize="10pt"
                    borderBottom="1px solid"
                    borderColor="gray.200"
                    p="10px 12px"
                    fontWeight={600}
                  >
                    <Flex width="80%" align="center">
                      <Flex width="15%">
                        <Text mr={2}>{index + 1}</Text>
                      </Flex>
                      <Flex align="center" width="80%">
                        <Image
                          borderRadius="full"
                          boxSize="28px"
                          src={item.imageURL || "/images/logo.png"}
                          mr={2}
                          alt={`${item.id} community icon`}
                        />
                        <span
                          style={{
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >{`r/${item.id}`}</span>
                      </Flex>
                    </Flex>
                    <Box position="absolute" right="10px">
                      <Button
                        height="22px"
                        fontSize="8pt"
                        onClick={(event) => {
                          event.stopPropagation();
                          onJoinLeaveCommunity(item, !!isJoined);
                        }}
                        variant={isJoined ? "outline" : "solid"}
                      >
                        {isJoined ? "Joined" : "Join"}
                      </Button>
                    </Box>
                  </Flex>
                </Link>
              );
            })}
            <Box p="10px 20px">
              <Button height="30px" width="100%">
                Xem tất cả
              </Button>
            </Box>
          </>
        )}
      </Flex>
    </Flex>
  );
};

export default Recommendations;
