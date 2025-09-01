import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Flex,
  Heading,
  Input,
  InputGroup,
  InputLeftElement,
  Text,
  Avatar,
  VStack,
  Spinner,
  useColorModeValue,
} from "@chakra-ui/react";
import { SearchIcon } from "@chakra-ui/icons";
import NextLink from "next/link";
import { Button, useToast } from "@chakra-ui/react";
import { joinGroup } from "../../services/groups.service";
import { useRecoilValue, useSetRecoilState } from "recoil";
import { communityState } from "../../atoms/communitiesAtom";
import { getAllGroups, type Group } from "../../services/groups.service";

const FindCommunitiesPage: React.FC = () => {
  const [all, setAll] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [joinedLocal, setJoinedLocal] = useState<Record<string, boolean>>({});
  const [joining, setJoining] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const list = await getAllGroups();
        if (active) setAll(Array.isArray(list) ? list : []);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const h = setTimeout(() => setDebounced(q.trim().toLowerCase()), 200);
    return () => clearTimeout(h);
  }, [q]);

  const filtered = useMemo(() => {
    if (!debounced) return all;
    return all.filter(g => String(g.name).toLowerCase().includes(debounced));
  }, [all, debounced]);

  const cardBg = useColorModeValue("white", "gray.800");
  const hoverBg = useColorModeValue("gray.50", "gray.700");
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const toast = useToast();
  const communityStateValue = useRecoilValue(communityState);
  const setCommunityStateValue = useSetRecoilState(communityState);



  //handle join group
  const handleJoin = async (g: Group) => {
    try {
      // prevent double-click for this item
      setJoining((prev) => ({ ...prev, [String(g.id)]: true }));
      await joinGroup(g.id);
      // Avoid pushing duplicate snippets if already present
      setCommunityStateValue((prev) => {
        const exists = prev.mySnippets?.some((s) => s.communityId === String(g.id));
        if (exists) return prev;
        return {
          ...prev,
          mySnippets: [
            ...(prev.mySnippets || []),
            { communityId: String(g.id), imageURL: g.imageURL || "", role: "member" },
          ],
        };
      });
      // Mark as joined locally so the button disables immediately
      setJoinedLocal((prev) => ({ ...prev, [String(g.id)]: true }));
      toast({ status: "success", title: `Đã tham gia cộng đồng ${g.name}` });
    } catch (e: any) {
      toast({ status: "error", title: "Tham gia thất bại", description: e?.message || String(e) });
    }
    finally {
      setJoining((prev) => ({ ...prev, [String(g.id)]: false }));
    }
  };



  return (
    <Box maxW="960px" mx="auto" px={{ base: 4, md: 6 }} py={{ base: 6, md: 8 }}>
      <Heading size="lg" mb={4}>Tìm cộng đồng</Heading>
      <Text mb={4} color={useColorModeValue("gray.600", "gray.300")}>Hiển thị tất cả cộng đồng. Gõ để lọc theo tên.</Text>
      <InputGroup mb={6}>
        <InputLeftElement pointerEvents="none">
          <SearchIcon color="gray.400" />
        </InputLeftElement>
        <Input
          placeholder="Tìm theo tên cộng đồng..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          bg={cardBg}
        />
      </InputGroup>
      {loading ? (
        <Flex align="center" justify="center" py={10}>
          <Spinner />
        </Flex>
      ) : (
<VStack spacing={3} align="stretch">
  {filtered.map((g) => {
  // Nếu userRole khác null/undefined hoặc đã join local => user đã tham gia
  const alreadyJoined = g.userRole != null || !!joinedLocal[String(g.id)];
    console.log("Rendering group:", g.name, "Already joined:", alreadyJoined);
    return (
      <Flex
        key={String(g.id)}
        align="center"
        p={3}
        borderRadius="md"
        borderWidth="1px"
        borderColor={borderColor}
        bg={cardBg}
        _hover={{ bg: hoverBg }}
        transition="background 0.2s"
        justify="space-between"
      >
        <NextLink
          href={`/community/${encodeURIComponent(String(g.id))}`}
          passHref
        >
          <Flex as="a" align="center" flex={1} minW={0}>
            <Avatar
              name={g.name}
              src={g.imageURL || undefined}
              size="sm"
              mr={3}
            />
            <Box minW={0}>
              <Text fontWeight="semibold" isTruncated>
                {g.name}
              </Text>
              {g.description && (
                <Text fontSize="sm" color="gray.500" noOfLines={1}>
                  {g.description}
                </Text>
              )}
            </Box>
          </Flex>
        </NextLink>

        {/* Chỉ hiển thị nút "Tham gia" nếu userRole == null */}
        <Button
          size="sm"
          colorScheme={alreadyJoined ? "gray" : "blue"}
          variant={alreadyJoined ? "outline" : "solid"}
          onClick={() => handleJoin(g)}
          isDisabled={alreadyJoined || !!joining[String(g.id)]}
          isLoading={!!joining[String(g.id)]}
          ml={3}
        >
          {alreadyJoined ? "Đã tham gia" : "Tham gia"}
        </Button>
      </Flex>
    );
  })}

  {filtered.length === 0 && (
    <Text color="gray.500">Không tìm thấy cộng đồng phù hợp.</Text>
  )}
</VStack>

      )}
    </Box>
  );
};

export default FindCommunitiesPage;
