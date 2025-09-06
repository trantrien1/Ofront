import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Avatar,
  Badge,
  Box,
  Button,
  Flex,
  Heading,
  HStack,
  Input,
  InputGroup,
  InputLeftElement,
  Kbd,
  Spinner,
  Stack,
  Tag,
  Text,
  VStack,
  useColorModeValue,
  useToast,
  VisuallyHidden,
} from "@chakra-ui/react";
import { SearchIcon } from "@chakra-ui/icons";
import NextLink from "next/link";
import { joinGroup, getAllGroups, type Group } from "../../services/groups.service";
import { useRecoilValue, useSetRecoilState } from "recoil";
import { communityState } from "../../atoms/communitiesAtom";

const ROW_HEIGHT = 72;

const FindCommunitiesPage: React.FC = () => {
  // ---------- theme ----------
  const cardBg = useColorModeValue("white", "gray.800");
  const hoverBg = useColorModeValue("gray.50", "gray.700");
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const subtle = useColorModeValue("gray.600", "gray.400");

  // ---------- state ----------
  const [all, setAll] = useState<Group[]>([]);       // trending dataset
  const [results, setResults] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const [joiningIds, setJoiningIds] = useState<Set<string | number>>(new Set());

  // cache kết quả cho các query đã tìm
  const cacheRef = useRef<Map<string, Group[]>>(new Map());
  const abortRef = useRef<AbortController | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const rowsRef = useRef<(HTMLDivElement | null)[]>([]);

  // recoil: kiểm tra đã tham gia từ mySnippets để hiển thị “Đã tham gia”
  const cs = useRecoilValue(communityState);
  const setCommunityStateValue = useSetRecoilState(communityState);
  const myJoinedIds = useMemo(
    () => new Set((cs?.mySnippets ?? []).map(s => s.communityId)),
    [cs?.mySnippets]
  );

  const toast = useToast();

  // ---------- initial load: trending ----------
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const list = await getAllGroups();
        if (!active) return;
        const sorted = (Array.isArray(list) ? list : [])
          .slice()
          .sort((a, b) => (b.numberOfMembers || 0) - (a.numberOfMembers || 0));
        setAll(sorted);
        setResults(sorted);
        cacheRef.current.set("", sorted);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  // ---------- debounce ----------
  useEffect(() => {
    const h = setTimeout(() => setDebounced(q.trim()), 300);
    return () => clearTimeout(h);
  }, [q]);

  // ---------- search run ----------
  useEffect(() => {
    const query = debounced;
    // nếu rỗng: hiển thị trending từ cache
    if (!query) {
      setResults(cacheRef.current.get("") || all);
      setSearching(false);
      setActiveIndex(-1);
      return;
    }
    // cache hit
    if (cacheRef.current.has(query)) {
      setResults(cacheRef.current.get(query)!);
      setSearching(false);
      return;
    }
    // abort request cũ
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setSearching(true);
    setActiveIndex(-1);

    (async () => {
      try {
        const list = await getAllGroups(query);
        if (controller.signal.aborted) return;
        const arr = Array.isArray(list) ? list.slice() : [];
        // sắp theo member count (giảm dần) để ổn định
        arr.sort((a, b) => (b.numberOfMembers || 0) - (a.numberOfMembers || 0));
        cacheRef.current.set(query, arr);
        setResults(arr);
      } catch {
        // giữ kết quả cũ, không crash UI
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    })();

    return () => controller.abort();
  }, [debounced, all]);

  // ---------- highlight ----------
  const highlight = useCallback(
    (name: string) => {
      const query = debounced;
      if (!query) return name;
      const idx = name.toLowerCase().indexOf(query.toLowerCase());
      if (idx === -1) return name;
      return (
        <>
          {name.slice(0, idx)}
          <Box as="mark" bg="transparent" color="blue.500" fontWeight="semibold">
            {name.slice(idx, idx + query.length)}
          </Box>
          {name.slice(idx + query.length)}
        </>
      );
    },
    [debounced]
  );

  // ---------- keyboard nav ----------
  const moveFocus = (dir: 1 | -1) => {
    if (!results.length) return;
    setActiveIndex(i => {
      const next = (i + dir + results.length) % results.length;
      // ensure visible
      const row = rowsRef.current[next];
      if (row && listRef.current) {
        const rTop = row.offsetTop;
        const rBottom = rTop + ROW_HEIGHT;
        const vTop = listRef.current.scrollTop;
        const vBottom = vTop + listRef.current.clientHeight;
        if (rTop < vTop) listRef.current.scrollTop = rTop - 8;
        else if (rBottom > vBottom) listRef.current.scrollTop = rBottom - listRef.current.clientHeight + 8;
      }
      return next;
    });
  };

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!results.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      moveFocus(1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      moveFocus(-1);
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      const g = results[activeIndex];
      if (g) window.location.href = `/community/${encodeURIComponent(String(g.id))}`;
    } else if (e.key === "Escape") {
      setQ("");
      setActiveIndex(-1);
    }
  };

  // ---------- join ----------
  const markJoining = (id: string | number, on: boolean) =>
    setJoiningIds(prev => {
      const n = new Set(prev);
      if (on) n.add(id);
      else n.delete(id);
      return n;
    });

  const handleJoin = async (g: Group) => {
    const id = g.id as any;
    // đã là member?
    const joined =
      g.userRole !== undefined || myJoinedIds.has(String(g.id));
    if (joined || joiningIds.has(id)) return;

    // Optimistic: set userRole local & recoil snippets
    markJoining(id, true);
    try {
      await joinGroup(g.id);
      // cập nhật recoil
      setCommunityStateValue(prev => ({
        ...prev,
        mySnippets: [
          ...(prev.mySnippets ?? []),
          { communityId: String(g.id), imageURL: g.imageURL || "", role: "member" as const },
        ],
      }));
      // cập nhật results/all để nút đổi trạng thái
      setResults(prev =>
        prev.map(it => (String(it.id) === String(id) ? { ...it, userRole: "member" as any } : it))
      );
      setAll(prev =>
        prev.map(it => (String(it.id) === String(id) ? { ...it, userRole: "member" as any } : it))
      );
      toast({ status: "success", title: `Đã tham gia cộng đồng ${g.name}` });
    } catch (e: any) {
      toast({ status: "error", title: "Tham gia thất bại", description: e?.message || String(e) });
    } finally {
      markJoining(id, false);
    }
  };

  // ---------- UI ----------
  const helpText = q
    ? "Nhập để tìm theo tên. ↑/↓ để di chuyển, Enter để mở, Esc để xoá."
    : "Hiển thị cộng đồng thịnh hành. Nhập để tìm kiếm.";

  return (
    <Box maxW="960px" mx="auto" px={{ base: 4, md: 6 }} py={{ base: 6, md: 8 }}>
      <Heading size="lg" mb={2}>Tìm cộng đồng</Heading>
      <Text mb={3} color={subtle}>{helpText}</Text>

      <InputGroup mb={4}>
        <InputLeftElement pointerEvents="none">
          <SearchIcon color="gray.400" />
        </InputLeftElement>
        <Input
          placeholder="Tìm theo tên cộng đồng…"
          value={q}
          onChange={(e) => { setQ(e.target.value); setActiveIndex(-1); }}
          onKeyDown={onKey}
          bg={cardBg}
          aria-autocomplete="list"
          aria-controls="community-listbox"
          aria-activedescendant={activeIndex >= 0 ? `opt-${activeIndex}` : undefined}
        />
      </InputGroup>

      {/* Result meta */}
      {!loading && (
        <Flex justify="space-between" align="center" mb={3} fontSize="sm" color={subtle}>
          <Text>
            {debounced
              ? `Tìm thấy ${results.length} cộng đồng cho “${debounced}”`
              : `Top ${Math.min(results.length, all.length)} cộng đồng thịnh hành`}
          </Text>
          {searching && (
            <Flex align="center" gap={2}><Spinner size="xs" /> <Text>Đang tìm…</Text></Flex>
          )}
        </Flex>
      )}

      {/* Live region cho screen reader */}
      <VisuallyHidden aria-live="polite">
        {debounced
          ? `Có ${results.length} kết quả cho ${debounced}`
          : `Hiển thị cộng đồng thịnh hành`}
      </VisuallyHidden>

      {loading ? (
        <Flex align="center" justify="center" py={10}><Spinner /></Flex>
      ) : (
        <Box
          ref={listRef}
          role="listbox"
          id="community-listbox"
          maxH="70vh"
          overflowY="auto"
          borderRadius="md"
        >
          <VStack spacing={3} align="stretch">
            {results.map((g, idx) => {
              // joined: từ API (userRole) hoặc từ recoil snippets
              const joined = g.userRole !== undefined || myJoinedIds.has(String(g.id));
              const isActive = idx === activeIndex;
              const busy = joiningIds.has(g.id as any);

              return (
                <Flex
                  key={String(g.id)}
                  ref={el => { rowsRef.current[idx] = el; }}
                  id={`opt-${idx}`}
                  role="option"
                  aria-selected={isActive}
                  align="center"
                  minH={`${ROW_HEIGHT}px`}
                  p={3}
                  borderRadius="md"
                  borderWidth="1px"
                  borderColor={isActive ? "blue.400" : borderColor}
                  bg={isActive ? hoverBg : cardBg}
                  _hover={{ bg: hoverBg }}
                  position="relative"
                  transition="background 0.15s, border-color 0.15s"
                  justify="space-between"
                >
                  <NextLink href={`/community/${encodeURIComponent(String(g.id))}`} passHref>
                    <Flex as="a" align="center" flex={1} minW={0} gap={3}>
                      <Avatar name={g.name} src={g.imageURL || undefined} size="sm" />
                      <Box minW={0}>
                        <HStack spacing={2} align="baseline">
                          <Text fontWeight="semibold" noOfLines={1}>
                            {highlight(String(g.name))}
                          </Text>
                          {(g.numberOfMembers ?? 0) > 0 && (
                            <Badge colorScheme="gray" variant="subtle">
                              {g.numberOfMembers} thành viên
                            </Badge>
                          )}
                        </HStack>
                        {g.description && (
                          <Text fontSize="sm" color={subtle} noOfLines={1}>
                            {g.description}
                          </Text>
                        )}
                      </Box>
                    </Flex>
                  </NextLink>

                  <Button
                    size="sm"
                    colorScheme={joined ? "gray" : "blue"}
                    variant={joined ? "outline" : "solid"}
                    onClick={() => handleJoin(g)}
                    isDisabled={joined || busy}
                    ml={3}
                    minW="92px"
                  >
                    {busy ? <Spinner size="xs" /> : joined ? "Đã tham gia" : "Tham gia"}
                  </Button>
                </Flex>
              );
            })}

            {results.length === 0 && (
              <Box
                p={6}
                borderWidth="1px"
                borderColor={borderColor}
                borderRadius="md"
                bg={cardBg}
                textAlign="center"
              >
                <Text fontWeight="semibold" mb={1}>Không tìm thấy cộng đồng phù hợp</Text>
                <Text fontSize="sm" color={subtle}>
                  Thử từ khoá khác ngắn hơn, hoặc kiểm tra chính tả.
                </Text>
              </Box>
            )}
          </VStack>
        </Box>
      )}

    </Box>
  );
};

export default FindCommunitiesPage;
