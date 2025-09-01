import React from "react";
import {
  Box,
  Flex,
  Icon,
  Stack,
  Text,
  Divider,
} from "@chakra-ui/react";
import { FaGavel } from "react-icons/fa";
import { HiOutlineDotsHorizontal } from "react-icons/hi";
import { Community, CommunityRule } from "../../atoms/communitiesAtom";

interface CommunityRulesProps {
  communityData: Community;
  loading?: boolean;
}

const CommunityRules: React.FC<CommunityRulesProps> = ({ communityData, loading }) => {
  if (loading) {
    return (
      <Box pt={0} position="sticky" top="14px">
        <Flex justify="space-between" align="center" p={3} color="white" bg="blue.400" borderRadius="4px 4px 0px 0px">
          <Box height="16px" width="160px" bg="whiteAlpha.700" borderRadius="md" />
        </Flex>
        <Flex direction="column" p={3} bg="white" borderRadius="0px 0px 4px 4px">
          <Stack spacing={2}>
            <Box height="12px" bg="gray.200" borderRadius="md" />
            <Box height="12px" bg="gray.200" borderRadius="md" />
            <Box height="12px" bg="gray.200" borderRadius="md" />
          </Stack>
        </Flex>
      </Box>
    );
  }

  if (!communityData.rules || communityData.rules.length === 0) {
    return null;
  }

  return (
    <Box pt={0} position="sticky" top="14px">
      <Flex
        justify="space-between"
        align="center"
        p={3}
        color="white"
        bg="blue.400"
        borderRadius="4px 4px 0px 0px"
      >
        <Text fontSize="10pt" fontWeight={700}>
          Community Rules
        </Text>
        <Icon as={HiOutlineDotsHorizontal} cursor="pointer" />
      </Flex>
      
      <Flex direction="column" p={3} bg="white" borderRadius="0px 0px 4px 4px">
        <Stack spacing={3}>
          {communityData.rules
            .sort((a, b) => a.order - b.order)
            .map((rule, index) => (
              <Box key={rule.id}>
                <Flex align="center" mb={1}>
                  <Text fontSize="10pt" fontWeight={600} color="gray.700">
                    {index + 1}. {rule.title}
                  </Text>
                </Flex>
                <Text fontSize="9pt" color="gray.600" lineHeight="1.4">
                  {rule.description}
                </Text>
                {index < communityData.rules!.length - 1 && <Divider mt={2} />}
              </Box>
            ))}
        </Stack>
      </Flex>
    </Box>
  );
};

export default CommunityRules;
