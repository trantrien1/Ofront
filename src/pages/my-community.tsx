import React, { useEffect, useMemo, useState } from "react";
import {
  Avatar,
  Badge,
  Box,
  Button,
  Flex,
  Heading,
  HStack,
  Icon,
  Input,
  InputGroup,
  InputLeftElement,
  SimpleGrid,
  Skeleton,
  Stack,
  Tag,
  Text,
  useColorModeValue,
  useToast,
  Link as CLink,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
} from "@chakra-ui/react";
import NextLink from "next/link";
import { getGroupsByUser, Group } from "../services/groups.service";
import { useRecoilValue, useSetRecoilState } from "recoil";
import { userState } from "../atoms/userAtom";
import { communityState, CommunitySnippet } from "../atoms/communitiesAtom";
import { SearchIcon } from "@chakra-ui/icons";
import { BsPeople } from "react-icons/bs";

const MyCommunityPage: React.FC = () => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const toast = useToast();
  const user = useRecoilValue(userState);
  const community = useRecoilValue(communityState);
  const setCommunityState = useSetRecoilState(communityState);

  const load = async () => {
    setLoading(true);
    try {
      const list = await getGroupsByUser();
      setGroups(Array.isArray(list) ? list : []);
    } catch (e: any) {
      toast({ status: "error", title: "Thất bại khi tải nhóm", description: e?.message || "" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // Mirror loaded groups into global mySnippets so other pages know join state immediately
  useEffect(() => {
    if (!Array.isArray(groups) || groups.length === 0) return;
    try {
      const uid = user?.uid?.toString?.() || "";
      const incoming: CommunitySnippet[] = groups
        .map((g) => {
          const ownerMatch = uid && (g.ownerId != null && String(g.ownerId) === uid);
          const role = (g.userRole || (ownerMatch ? "owner" : "member")).toLowerCase();
          return {
            communityId: String(g.id),
            imageURL: g.imageURL || undefined,
            role: (role as any),
          } as CommunitySnippet;
        })
        .filter((s) => !!s.communityId);
      setCommunityState((prev) => {
        const existing = new Map(prev.mySnippets.map((s) => [s.communityId, s] as const));
        for (const s of incoming) {
          if (!existing.has(s.communityId)) existing.set(s.communityId, s);
          else {
            // Update role if we now have a stronger (non-member) role
            const cur = existing.get(s.communityId)!;
            const curRole = (cur.role || "member").toLowerCase();
            const newRole = (s.role || "member").toLowerCase();
            const rank = (r: string) => (r === "owner" ? 3 : r === "admin" ? 2 : r === "moderator" ? 1 : 0);
            if (rank(newRole) > rank(curRole)) existing.set(s.communityId, s);
          }
        }
        return { ...prev, mySnippets: Array.from(existing.values()), initSnippetsFetched: true };
      });
    } catch {}
  }, [groups, setCommunityState, user]);

  const { managed, joined } = useMemo(() => {
    const uid = user?.uid?.toString?.() || user?.displayName || user?.email || "";
    // Build a set of communityIds where user has elevated role via snippets (fallback)
    const elevated = new Set<string>();
    (community?.mySnippets || []).forEach((s: any) => {
      const role = (s?.role || (s?.isModerator ? "moderator" : "member")).toLowerCase();
      if (role === "owner" || role === "admin") elevated.add(String(s.communityId));
    });
    // Also include groups the user just created (stored locally)
    try {
      if (typeof window !== 'undefined') {
        const raw = window.localStorage.getItem('managedGroups');
        if (raw) {
          const ids = JSON.parse(raw);
          if (Array.isArray(ids)) ids.forEach((id: any) => elevated.add(String(id)));
        }
      }
    } catch {}

    const managed: Group[] = [];
    const joined: Group[] = [];
    groups.forEach((g) => {
      const isOwnerMatch = g.ownerId != null && String(g.ownerId) === uid;
      const role = (g.userRole || '').toLowerCase();
      const isAdminLike = role === 'owner' || role === 'admin';
      const isElevated = elevated.has(String(g.id));
      if (isOwnerMatch || isAdminLike || isElevated) managed.push(g);
      else joined.push(g);
    });
    const q = query.trim().toLowerCase();
    const filter = (arr: Group[]) =>
      !q
        ? arr
        : arr.filter((g) =>
            (g.name || "").toString().toLowerCase().includes(q) ||
            (g.description || "").toString().toLowerCase().includes(q)
          );
    return { managed: filter(managed), joined: filter(joined) };
  }, [groups, user, community?.mySnippets, query]);

  const cardBg = useColorModeValue("white", "gray.800");
  const borderCol = useColorModeValue("gray.200", "whiteAlpha.300");
  const metaCol = useColorModeValue("gray.600", "gray.400");

  const CommunityCard: React.FC<{ g: Group; managed?: boolean }> = ({ g, managed }) => (
    <Flex
      key={String(g.id)}
      p={4}
      borderWidth="1px"
      borderColor={borderCol}
      borderRadius="lg"
      align="center"
      bg={cardBg}
      gap={4}
    >
      <Avatar name={g.name} src={g.imageURL || undefined} size="md" />
      <Box flex={1} minW={0}>
        <HStack align="center" spacing={2} wrap="wrap">
          <CLink as={NextLink} href={`/community/${encodeURIComponent(String(g.id))}`} fontWeight="bold" noOfLines={1}>
            {g.name}
          </CLink>
          {managed ? (
            <Tag colorScheme="blue" size="sm">Managed</Tag>
          ) : (
            <Tag colorScheme="gray" size="sm">Joined</Tag>
          )}
        </HStack>
        {g.description && (
          <Text mt={1} fontSize="sm" color={metaCol} noOfLines={2}>
            {g.description}
          </Text>
        )}
      </Box>
      <HStack>
  <Button as={NextLink} href={`/community/${encodeURIComponent(String(g.id))}`} variant="solid" size="sm" colorScheme="blue">Open</Button>
        {managed && (
          <Button size="sm" variant="outline" onClick={async()=>{
            const name = prompt("New group name", g.name);
            
          }}>Rename</Button>
        )}
      </HStack>
    </Flex>
  );

  return (
    <Box maxW="900px" mx="auto" p={6}>
      <Flex align="center" justify="space-between" mb={4}>
        <HStack>
          <Icon as={BsPeople} boxSize={6} color="blue.500" />
          <Heading size="lg">Cộng đồng của tôi</Heading>
        </HStack>
      </Flex>

      <InputGroup mb={4} maxW="420px">
        <InputLeftElement pointerEvents="none">
          <SearchIcon color="gray.400" />
        </InputLeftElement>
        <Input
          placeholder="Tìm kiếm cộng đồng"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          bg={cardBg}
        />
      </InputGroup>

      <Tabs colorScheme="blue" isLazy>
        <TabList>
          <Tab>Quản lý <Badge ml={2}>{managed.length}</Badge></Tab>
          <Tab>Tham gia <Badge ml={2}>{joined.length}</Badge></Tab>
        </TabList>
        <TabPanels>
          <TabPanel px={0} pt={4}>
            {loading ? (
              <Stack>
                {[...Array(3)].map((_,i)=> (
                  <Skeleton key={i} height="76px" borderRadius="lg" />
                ))}
              </Stack>
            ) : managed.length === 0 ? (
              <Text color={metaCol}>Chưa có nhóm nào bạn quản lý.</Text>
            ) : (
              <Stack spacing={3}>
                {managed.map((g) => (
                  <CommunityCard key={String(g.id)} g={g} managed />
                ))}
              </Stack>
            )}
          </TabPanel>
          <TabPanel px={0} pt={4}>
            {loading ? (
              <Stack>
                {[...Array(3)].map((_,i)=> (
                  <Skeleton key={i} height="76px" borderRadius="lg" />
                ))}
              </Stack>
            ) : joined.length === 0 ? (
              <Text color={metaCol}>Chưa tham gia nhóm nào.</Text>
            ) : (
              <Stack spacing={3}>
                {joined.map((g) => (
                  <CommunityCard key={String(g.id)} g={g} />
                ))}
              </Stack>
            )}
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Box>
  );
};

export default MyCommunityPage;
