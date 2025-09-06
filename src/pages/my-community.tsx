import React, { useEffect, useMemo, useRef, useState } from "react";
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
import { useRouter } from "next/router";

const MyCommunityPage: React.FC = () => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const toast = useToast();
  const user = useRecoilValue(userState);
  const community = useRecoilValue(communityState);
  const setCommunityState = useSetRecoilState(communityState);

  const router = useRouter();

  const load = async (force?: boolean) => {
    setLoading(true);
    try {
  const list = await getGroupsByUser(force ? { force: true, ttlMs: 0 } : undefined as any);
      setGroups(Array.isArray(list) ? list : []);
    } catch (e: any) {
      toast({ status: "error", title: "Thất bại khi tải nhóm", description: e?.message || "" });
    } finally {
      setLoading(false);
    }
  };

  // Handle refresh=1: clear current groups + remove param to keep URL clean
  useEffect(() => {
    if (!router.isReady) return;
    const q = router.query || {};
    if (q.refresh === '1') {
      setGroups([]);
      // Optionally could also clear any managedGroups localStorage (already cleared on logout elsewhere)
      try {
        router.replace({ pathname: router.pathname, query: {} }, undefined, { shallow: true });
      } catch {}
      // Force reload groups (user might have switched or state stale)
      load(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady, router.query?.refresh]);

  // Listen for manual refresh event triggered by re-clicking menu item
  useEffect(() => {
    const handler = () => {
      setGroups([]);
      load(true);
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('myCommunity:refresh', handler);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('myCommunity:refresh', handler);
      }
    };
  }, []);

  // Reload groups whenever user changes (login switch) or first mount
  useEffect(() => {
    if (!user) {
      setGroups([]);
      return;
    }
    load(true);
  }, [user?.uid]);

  // Previous user tracking to detect account switch for hard replace
  const prevUserRef = useRef<string | undefined>(undefined);

  // Mirror loaded groups into global mySnippets – now ALWAYS replace to avoid ghost roles
  useEffect(() => {
    if (!user) return; // do not carry over previous data
    if (!Array.isArray(groups)) return;
    try {
      const uid = user?.uid?.toString?.() || "";
      const incoming: CommunitySnippet[] = groups
        .map((g) => {
          const ownerMatch = uid && (g.ownerId != null && String(g.ownerId) === uid);
          const roleRaw = (g.userRole || (ownerMatch ? "owner" : "member")).toLowerCase();
          const role = (roleRaw === 'owner' ? 'admin' : roleRaw) as any; // normalize owner->admin for UI consistency
          return {
            communityId: String(g.id),
            imageURL: g.imageURL || undefined,
            role,
          } as CommunitySnippet;
        })
        .filter((s) => !!s.communityId);
      setCommunityState((prev) => ({
        ...prev,
        mySnippets: incoming,
        initSnippetsFetched: true,
      }));
    } catch {}
    prevUserRef.current = user?.uid ? String(user.uid) : undefined;
  }, [groups, setCommunityState, user]);

  // When mySnippets change (join/leave/create) ensure groups list reflects it without infinite refetch loops
  useEffect(() => {
    if (!user) return;
    const snippets = community.mySnippets || [];
    const snippetIds = new Set(snippets.map(s => s.communityId));
    const groupIds = new Set(groups.map(g => String(g.id)));
    const missingIds: string[] = [];
    snippetIds.forEach(id => { if (!groupIds.has(id)) missingIds.push(id); });

    // Track attempts for each missing set key to avoid endless refetch if backend not yet updated
    const attemptsRef = (attemptsMapRef.current ||= new Map<string, number>());
    const key = missingIds.sort().join(',');
    const now = Date.now();

    // Throttle: only attempt refetch if (a) there are missing ids, (b) not loading, (c) attempts < 2 in 8s window
    if (missingIds.length > 0 && !loading) {
      const prev = attemptsRef.get(key) || 0;
      if (prev < 2) {
        attemptsRef.set(key, prev + 1);
        load(true);
        return; // avoid extra logic this cycle
      }
    }

    // Detect possible leave: groups contains ids not in snippets (excluding ones we might still be processing)
    const extraIds = groups.filter(g => !snippetIds.has(String(g.id))).map(g => String(g.id));
    if (extraIds.length > 0 && !loading) {
      const leaveKey = 'leave:' + extraIds.sort().join(',');
      const prev = attemptsRef.get(leaveKey) || 0;
      if (prev < 1) { // one corrective fetch is enough
        attemptsRef.set(leaveKey, prev + 1);
        load(true);
      }
    }
  }, [community.mySnippets, user, groups, loading]);

  // Ref to store attempts map
  const attemptsMapRef = useRef<Map<string, number>>();
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
