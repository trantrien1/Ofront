import React from "react";
import { Box, Button, Flex, Image, Text, Badge, HStack, useColorModeValue, Stack } from "@chakra-ui/react";
import { Community } from "../../atoms/communitiesAtom";
import useCommunityData from "../../hooks/useCommunityData";
import dynamic from "next/dynamic";
import { useCommunityPermissions } from "../../hooks/useCommunityPermissions";

// Disable SSR for this component to prevent hydration issues
const Header = dynamic(() => Promise.resolve(HeaderComponent), {
  ssr: false,
  loading: () => <HeaderSkeleton />
});

const HeaderSkeleton = () => (
  <Flex direction="column" width="100%" boxShadow="sm">
    <Box h="120px" bgGradient="linear(to-r, blue.500, cyan.400)" />
    <Flex justify="center" bg={useColorModeValue("white", "gray.800")} py={4}>
      <Flex w="95%" maxW="1060px" align="center">
        <Image src="/images/logo.png" alt="logo" boxSize="72px" mt={-12} border="4px solid white" borderRadius="full" boxShadow="lg" />
        <Flex pl={4} pr={2} align="center" justify="space-between" w="full">
          <Stack spacing={0} mr={6}>
            <Box h="18px" w="160px" bg={useColorModeValue("gray.200", "whiteAlpha.300")} borderRadius="md" />
            <Box mt={1} h="12px" w="120px" bg={useColorModeValue("gray.100", "whiteAlpha.200")} borderRadius="md" />
          </Stack>
          <Button variant="solid" colorScheme="blue" height="32px" isLoading />
        </Flex>
      </Flex>
    </Flex>
  </Flex>
);

type HeaderProps = {
  communityData: Community;
};

const HeaderComponent: React.FC<HeaderProps> = ({ communityData }) => {
  /**
   * !!!Don't pass communityData boolean until the end
   * It's a small optimization!!!
   */
  const { communityStateValue, loading, error, onJoinLeaveCommunity } =
    useCommunityData(!!communityData);
  const { getUserRole } = useCommunityPermissions();
  const role = getUserRole(communityData.id);
  const privileged = role === 'owner' || role === 'admin' || role === 'moderator';
  const snippetJoined = !!communityStateValue.mySnippets.find(
    (item) => item.communityId === communityData.id
  );
  const isJoined = privileged || snippetJoined;
  const name = communityStateValue.currentCommunity.displayName || communityData.displayName || communityData.id;
  const cardBg = useColorModeValue("white", "gray.800");
  const subText = useColorModeValue("gray.500", "gray.400");
  const badgeColor = role === 'owner' ? 'yellow' : role === 'admin' ? 'red' : role === 'moderator' ? 'blue' : 'gray';
  const members = (communityStateValue.currentCommunity.numberOfMembers ?? communityData.numberOfMembers ?? 0);

  return (
    <Flex direction="column" width="100%" boxShadow="sm">
      <Box h={{ base: "96px", md: "120px" }} bgGradient="linear(to-r, blue.500, cyan.400)" />
      <Flex justify="center" bg={cardBg} py={4}>
        <Flex w="95%" maxW="1060px" align="center">
          {communityStateValue.currentCommunity.imageURL ? (
            <Image
              borderRadius="full"
              boxSize={{ base: "64px", md: "72px" }}
              src={communityStateValue.currentCommunity.imageURL}
              alt={name}
              mt={-12}
              border="4px solid white"
              boxShadow="lg"
            />
          ) : (
            <Image
              src="/images/logo.png"
              alt="logo"
              boxSize={{ base: "64px", md: "72px" }}
              mt={-12}
              border="4px solid white"
              borderRadius="full"
              boxShadow="lg"
            />
          )}
          <Flex pl={4} pr={2} align="center" justify="space-between" w="full">
            <Stack spacing={1} mr={6} minW={0}>
              <HStack spacing={2} align="center" flexWrap="wrap">
                <Text fontWeight={800} fontSize={{ base: "lg", md: "xl" }} noOfLines={1}>
                  {name}
                </Text>
                <Badge colorScheme={badgeColor} textTransform="capitalize" borderRadius="md" px={2}>
                  {role}
                </Badge>
              </HStack>
              <HStack spacing={3} color={subText} fontSize="sm">
                <HStack spacing={1}>
                  <Box as="span" fontWeight="semibold">{members.toLocaleString()}</Box>
                  <Box as="span">Members</Box>
                </HStack>
                <Box>•</Box>
                <Text noOfLines={1}>{communityData.id}</Text>
              </HStack>
            </Stack>
            {!privileged && (
              <Button
                variant={isJoined ? "outline" : "solid"}
                colorScheme="blue"
                height="32px"
                px={6}
                onClick={() => onJoinLeaveCommunity(communityData, isJoined)}
                isLoading={loading}
              >
                {isJoined ? "Joined" : "Join"}
              </Button>
            )}
          </Flex>
        </Flex>
      </Flex>
    </Flex>
  );
};
export default Header;
