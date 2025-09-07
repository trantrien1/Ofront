import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  Select,
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
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  MenuDivider,
  Portal,
  Tooltip,
  chakra,
} from "@chakra-ui/react";
import NextLink from "next/link";
import { getGroupsByUser, Group, updateGroup } from "../services/groups.service";
import { useRecoilValue, useSetRecoilState } from "recoil";
import { userState } from "../atoms/userAtom";
import { communityState, CommunitySnippet } from "../atoms/communitiesAtom";
import { SearchIcon } from "@chakra-ui/icons";
import { BsPeople } from "react-icons/bs";
import { useRouter } from "next/router";

// Extended shape with derived UI data
interface ExtendedGroup extends Group {
  coverUrl?: string | null;
  avatarUrl?: string | null;
  lastActiveAt?: Date; // derived or simulated
  postsPerWeek?: number; // simulated for now
  privacyLabel?: string;
  isPending?: boolean;
  isInvited?: boolean;
  shortDescription?: string;
}

type SubFilter = 'all' | 'recent' | 'pending' | 'invited';
type SortOption = 'recent' | 'name' | 'members';

const PAGE_SIZE = 12;

const MyCommunityPage: React.FC = () => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [subFilter, setSubFilter] = useState<SubFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [privacyFilter, setPrivacyFilter] = useState<'all' | 'public' | 'private'>('all');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const observerRef = useRef<HTMLDivElement | null>(null);
  const searching = query.trim().length > 0;
  const toast = useToast();
  const user = useRecoilValue(userState);
  const community = useRecoilValue(communityState);
  const setCommunityState = useSetRecoilState(communityState);

  const router = useRouter();

  const load = useCallback(async (force?: boolean) => {
    setLoading(true);
    try {
      const list = await getGroupsByUser(force ? { force: true, ttlMs: 0 } : undefined as any);
      setGroups(Array.isArray(list) ? list : []);
    } catch (e: any) {
      toast({ status: "error", title: "Thất bại khi tải nhóm", description: e?.message || "" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

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
  }, [router.isReady, router.query?.refresh, load, router]);

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
  }, [load]);

  // Reload groups whenever user changes (login switch) or first mount
  useEffect(() => {
    if (!user) {
      setGroups([]);
      return;
    }
    load(true);
  }, [user?.uid, load, user]);

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
  }, [community.mySnippets, user, groups, loading, load]);

  // Ref to store attempts map
  const attemptsMapRef = useRef<Map<string, number>>();
  const enrich = useCallback((raw: Group[]): ExtendedGroup[] => {
    const now = Date.now();
    return raw.map(g => {
      // Derive / simulate lastActiveAt & posts/week deterministically
      const hashSeed = Number(String(g.id).split('').reduce((a,c)=> a + c.charCodeAt(0), 0));
      const minutesAgo = (hashSeed % 720) + 1; // up to 12h
      const lastActiveAt = new Date(now - minutesAgo * 60 * 1000);
      const postsPerWeek = (hashSeed % 40) + 1; // 1..40
      const privacyRaw = (g.privacyType || '').toLowerCase();
      const privacyLabel = privacyRaw === 'private' ? 'Riêng tư' : 'Công khai';
      const isPending = (g.userRole || '').toLowerCase() === 'pending';
      const isInvited = (g.userRole || '').toLowerCase() === 'invited';
      const coverUrl = g.imageURL || null; // could differ later
      const avatarUrl = g.imageURL || null;
      return {
        ...g,
        lastActiveAt,
        postsPerWeek,
        privacyLabel,
        isPending,
        isInvited,
        coverUrl,
        avatarUrl,
        shortDescription: g.description || '',
      } as ExtendedGroup;
    });
  }, []);

  const formatRelative = (d?: Date) => {
    if (!d) return '';
    const diffMs = Date.now() - d.getTime();
    const mins = Math.max(1, Math.floor(diffMs / 60000));
    if (mins < 60) return `hoạt động ${mins} phút trước`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `hoạt động ${hrs} giờ trước`;
    const days = Math.floor(hrs / 24);
    return `hoạt động ${days} ngày trước`;
  };

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

    const managedRaw: Group[] = [];
    const joinedRaw: Group[] = [];
    groups.forEach((g) => {
      const isOwnerMatch = g.ownerId != null && String(g.ownerId) === uid;
      const role = (g.userRole || '').toLowerCase();
      const isAdminLike = role === 'owner' || role === 'admin';
      const isElevated = elevated.has(String(g.id));
      if (isOwnerMatch || isAdminLike || isElevated) managedRaw.push(g);
      else joinedRaw.push(g);
    });
    const q = query.trim().toLowerCase();
    const applySearch = (arr: Group[]) => !q ? arr : arr.filter(g => (g.name||'').toLowerCase().includes(q) || (g.description||'').toLowerCase().includes(q));
    const applyPrivacy = (arr: Group[]) => privacyFilter === 'all' ? arr : arr.filter(g => (g.privacyType||'').toLowerCase() === privacyFilter);
    const managedFiltered = applyPrivacy(applySearch(managedRaw));
    const joinedFiltered = applyPrivacy(applySearch(joinedRaw));
    return { managed: managedFiltered, joined: joinedFiltered };
  }, [groups, user, community?.mySnippets, query, privacyFilter]);

  // Combine for active tab context (we'll derive inside render too)
  const managedExt = useMemo(()=> enrich(managed), [managed, enrich]);
  const joinedExt = useMemo(()=> enrich(joined), [joined, enrich]);

  const cardBg = useColorModeValue("white", "gray.800");
  const cardHover = useColorModeValue("gray.50", "whiteAlpha.100");
  const borderCol = useColorModeValue("gray.200", "whiteAlpha.300");
  const metaCol = useColorModeValue("gray.600", "gray.400");
  const headerBg = useColorModeValue("whiteAlpha.800", "blackAlpha.500");
  const privacyPublicCol = 'blue';
  const privacyPrivateCol = 'gray';

  // Infinite scroll observer
  useEffect(() => {
    const el = observerRef.current;
    if (!el) return;
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          setVisibleCount(v => v + PAGE_SIZE);
        }
      });
    }, { rootMargin: '200px 0px' });
    io.observe(el);
    return () => { io.disconnect(); };
  }, []);

  // Reset visibleCount when core filters change
  useEffect(()=> { setVisibleCount(PAGE_SIZE); }, [subFilter, query, sortBy, privacyFilter]);

  const applySubFilter = (arr: ExtendedGroup[]) => {
    switch (subFilter) {
      case 'recent':
        return [...arr].sort((a,b)=> (b.lastActiveAt?.getTime()||0) - (a.lastActiveAt?.getTime()||0));
      case 'pending':
        return arr.filter(g => g.isPending);
      case 'invited':
        return arr.filter(g => g.isInvited);
      default:
        return arr;
    }
  };
  const applySort = (arr: ExtendedGroup[]) => {
    switch (sortBy) {
      case 'name': return [...arr].sort((a,b)=> (a.name||'').localeCompare(b.name||''));
      case 'members': return [...arr].sort((a,b)=> (b.numberOfMembers||0) - (a.numberOfMembers||0));
      case 'recent':
      default:
        return [...arr].sort((a,b)=> (b.lastActiveAt?.getTime()||0) - (a.lastActiveAt?.getTime()||0));
    }
  };

  const buildVisible = (arr: ExtendedGroup[]) => applySort(applySubFilter(arr)).slice(0, visibleCount);

  const CommunityCard: React.FC<{ g: ExtendedGroup; managed?: boolean }> = ({ g, managed }) => {
    const privacy = (g.privacyType || '').toLowerCase() === 'private' ? 'Riêng tư' : 'Công khai';
    const privacyScheme = (g.privacyType || '').toLowerCase() === 'private' ? privacyPrivateCol : privacyPublicCol;
    const lastActiveText = formatRelative(g.lastActiveAt);
    const isPending = g.isPending;
    const isInvited = g.isInvited;
    return (
      <Box
        key={String(g.id)}
        position="relative"
        borderWidth="1px"
        borderColor={borderCol}
        borderRadius="xl"
        overflow="visible" /* allow menus to overflow; cover handles its own radius */
        bg={cardBg}
        _hover={{ shadow: 'md', transform: 'translateY(-2px)', bg: cardHover }}
        transition="all .18s ease"
        role="group"
      >
        {/* Cover */}
        <Box position="relative" h={0} pb="52.25%" bg={useColorModeValue('gray.100','gray.700')} borderTopRadius="xl"> {/* 1.91:1 ~ 52.25% */}
          <chakra.img src={g.coverUrl || '/images/avatar-placeholder.png'} alt={g.name || 'community'} style={{objectFit:'cover', position:'absolute', inset:0, width:'100%', height:'100%', borderTopLeftRadius:'var(--chakra-radii-xl)', borderTopRightRadius:'var(--chakra-radii-xl)'}} />
          <Avatar
            src={g.avatarUrl || undefined}
            name={g.name}
            size="lg"
            position="absolute"
            left={4}
            bottom={-6}
            borderWidth="3px"
            borderColor={cardBg}
            shadow="sm"
            zIndex={3}
          />
          {isPending && (
            <Badge position="absolute" top={2} right={2} colorScheme="yellow" fontSize="0.65rem" px={2} py={1} borderRadius="md">Pending</Badge>
          )}
          {isInvited && !isPending && (
            <Badge position="absolute" top={2} right={2} colorScheme="purple" fontSize="0.65rem" px={2} py={1} borderRadius="md">Invited</Badge>
          )}
        </Box>
        <Box pt={8} px={4} pb={4}>
          <HStack align="start" spacing={3} mb={1} pr={2}>
            <CLink as={NextLink} href={`/community/${encodeURIComponent(String(g.id))}`} fontWeight="bold" fontSize="md" noOfLines={1} flex={1} _groupHover={{ textDecoration:'underline' }}>
              {g.name}
            </CLink>
            <Tag size="sm" colorScheme={privacyScheme} variant="subtle">{privacy}</Tag>
            {managed && (
              <Tooltip label="Bạn là quản trị viên" openDelay={300}>
                <Tag size="sm" colorScheme="orange">Quản trị viên</Tag>
              </Tooltip>
            )}
          </HStack>
          {!!g.shortDescription && (
            <Text fontSize="sm" color={metaCol} noOfLines={2}>{g.shortDescription}</Text>
          )}
          <HStack mt={2} spacing={4} fontSize="xs" color={metaCol}>
            <HStack spacing={1}><Icon as={BsPeople} /><Text>{g.numberOfMembers || 0} thành viên</Text></HStack>
            <Text>{g.postsPerWeek} bài/tuần</Text>
            <Text>{lastActiveText}</Text>
          </HStack>
          <HStack mt={3} spacing={2}>
            <Button as={NextLink} href={`/community/${encodeURIComponent(String(g.id))}`} size="sm" colorScheme="blue" flexShrink={0}>Mở</Button>
            <Button size="sm" variant="outline" flexShrink={0}>Mời</Button>
      <Menu placement="bottom-end" isLazy>
              <MenuButton as={Button} size="sm" variant="ghost" px={2}>…</MenuButton>
              <Portal>
        <MenuList fontSize="sm" zIndex={2000}>
                  <MenuItem onClick={async()=>{
                    const name = prompt('Tên mới', g.name);
                    if (name && name.trim() && name !== g.name) {
                      try { await updateGroup({ communityId: g.id, name }); load(true); toast({status:'success', title:'Đã đổi tên'});} catch(e:any){toast({status:'error', title:'Đổi tên thất bại', description: e?.message});}}
                  }}>Đổi tên</MenuItem>
                  <MenuItem as={CLink} href={`/community/${encodeURIComponent(String(g.id))}?admin=1`}>Quản trị viên</MenuItem>
                  <MenuDivider />
                  <MenuItem color="red.400" onClick={()=> toast({status:'info', title:'Tính năng sắp có'})}>Rời nhóm</MenuItem>
                  <MenuItem onClick={()=> toast({status:'info', title:'Tính năng sắp có'})}>Lưu trữ</MenuItem>
                </MenuList>
              </Portal>
            </Menu>
          </HStack>
        </Box>
        {/* Hover overlay */}
        {g.shortDescription && (
          <Box position="absolute" inset={0} opacity={0} _groupHover={{ opacity:1 }} transition="opacity .2s" bgGradient="linear(to-b, blackAlpha.600, blackAlpha.700)" color="white" display="flex" flexDir="column" justifyContent="flex-end" p={4} fontSize="sm" zIndex={1}>
            <Text noOfLines={3}>{g.shortDescription}</Text>
            <HStack mt={3} spacing={2}>
              <Button size="xs" colorScheme="blue">Mời</Button>
              <Button as={NextLink} href={`/community/${encodeURIComponent(String(g.id))}`} size="xs" variant="outline" colorScheme="whiteAlpha">Mở</Button>
            </HStack>
          </Box>
        )}
      </Box>
    );
  };

  return (
    <>
    <Box maxW="1260px" mx="auto" px={{ base:4, md:8 }} py={6}>
      {/* Header */}
      <Flex direction={{ base:'column', md:'row' }} gap={4} align={{base:'stretch', md:'center'}} justify="space-between" mb={6}>
        <HStack spacing={3} align="center">
          <Icon as={BsPeople} boxSize={7} color="blue.500" />
          <Heading size="lg">Cộng đồng của tôi</Heading>
        </HStack>
        <Flex gap={3} align="center" flex={1} justify={{ base:'stretch', md:'flex-end' }}>
          <InputGroup maxW={{ base:'100%', md:'380px' }}>
            <InputLeftElement pointerEvents="none"><SearchIcon color="gray.400" /></InputLeftElement>
            <Input value={query} onChange={(e)=> setQuery(e.target.value)} placeholder="Tìm kiếm cộng đồng" bg={cardBg} />
          </InputGroup>
         
        </Flex>
      </Flex>

      {/* Tabs Managed / Joined */}
      <Tabs colorScheme="blue" isLazy variant="enclosed" bg={headerBg} borderRadius="xl" p={3}>
        <TabList>
          <Tab fontWeight={600}>Quản lý <Badge ml={2}>{managed.length}</Badge></Tab>
          <Tab fontWeight={600}>Tham gia <Badge ml={2}>{joined.length}</Badge></Tab>
        </TabList>
        <TabPanels mt={3}>
          {[{kind:'managed', data: managedExt, managed:true}, {kind:'joined', data: joinedExt, managed:false}].map(t => {
            const list = t.data;
            const visible = buildVisible(list);
            return (
              <TabPanel key={t.kind} px={0} pt={2}>
                {/* Sub filters */}
                <Flex wrap="wrap" gap={3} mb={4} align="center" borderBottom="1px solid" borderColor={borderCol} pb={2}>
                  <HStack spacing={1}>
                    {([
                      {k:'all', label:'Tất cả'},
                      {k:'recent', label:'Hoạt động gần đây'},
                      {k:'pending', label:'Đang chờ duyệt'},
                      {k:'invited', label:'Được mời'}
                    ] as {k:SubFilter; label:string}[]).map(f => (
                      <Button key={f.k} size="xs" variant={subFilter===f.k? 'solid':'outline'} colorScheme={subFilter===f.k? 'blue':'gray'} onClick={()=> setSubFilter(f.k)}>{f.label}</Button>
                    ))}
                  </HStack>
                  <Flex ml="auto" gap={2} align="center">
                    <Select size="sm" value={privacyFilter} onChange={(e)=> setPrivacyFilter(e.target.value as any)} maxW="140px">
                      <option value="all">Tất cả</option>
                      <option value="public">Công khai</option>
                      <option value="private">Riêng tư</option>
                    </Select>
                    <Select size="sm" value={sortBy} onChange={(e)=> setSortBy(e.target.value as SortOption)} maxW="170px">
                      <option value="recent">Hoạt động gần đây</option>
                      <option value="name">Tên A–Z</option>
                      <option value="members">Số thành viên</option>
                    </Select>
                  </Flex>
                </Flex>

                {loading && list.length === 0 ? (
                  <SimpleGrid columns={{ base:1, sm:2, lg:3 }} spacing={4}>
                    {Array.from({ length: 6 }).map((_,i)=>(
                      <Skeleton key={i} h="220px" borderRadius="xl" />
                    ))}
                  </SimpleGrid>
                ) : list.length === 0 ? (
                  <Text color={metaCol}>{t.managed? 'Chưa có nhóm nào bạn quản lý.' : 'Chưa tham gia nhóm nào.'}</Text>
                ) : (
                  <>
                    <SimpleGrid columns={{ base:1, sm:2, lg:3 }} spacing={5}>
                      {visible.map(g => (
                        <CommunityCard key={String(g.id)} g={g} managed={t.managed} />
                      ))}
                      {loading && visible.length < list.length && (
                        <Skeleton h="220px" borderRadius="xl" />
                      )}
                    </SimpleGrid>
                    {visible.length < list.length && (
                      <Box ref={observerRef} h="1px" />
                    )}
                    {!loading && visible.length >= list.length && list.length > PAGE_SIZE && (
                      <Text mt={6} textAlign="center" fontSize="sm" color={metaCol}>Đã hiển thị tất cả</Text>
                    )}
                  </>
                )}
              </TabPanel>
            );
          })}
        </TabPanels>
      </Tabs>
  </Box>
    </>
  );
};

export default MyCommunityPage;
