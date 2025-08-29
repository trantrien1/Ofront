import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Badge,
  Flex,
  HStack,
  Image,
  Input,
  InputGroup,
  InputLeftElement,
  Progress,
  SimpleGrid,
  Text,
  useColorModeValue,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Button,
  Skeleton,
  Center,
  VStack,
} from "@chakra-ui/react";
import { useRouter } from "next/router";
import { SearchIcon, CheckIcon } from "@chakra-ui/icons";

import { CoursesService } from "../../services";
type CourseItem = {
  id: string;
  title: string;
  thumbnail: string;
  durationMinutes: number;
  progressPercent: number;
  completed?: boolean;
  description?: string;
};

// Removed mock data and replaced with API-driven data
const useCoursesFromApi = () => {
  const [items, setItems] = useState<CourseItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const updateItem = (id: string, patch: Partial<CourseItem>) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  };
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const resp = await CoursesService.getCourses({ page: 0, size: 50 });
        // Normalize various response envelopes
        const maybeArray =
          (resp && Array.isArray(resp) && resp) ||
          (resp?.data && Array.isArray(resp.data) && resp.data) ||
          (resp?.content && Array.isArray(resp.content) && resp.content) ||
          (resp?.data?.content && Array.isArray(resp.data.content) && resp.data.content) ||
          [];
        const mapped: CourseItem[] = (maybeArray as any[]).map((c: any) => ({
          id: String(c.id ?? c.courseId ?? c._id ?? c.slug ?? Math.random().toString(36).slice(2)),
          title: String(c.title ?? c.name ?? "Khoá học"),
          thumbnail: String(c.imageUrl ?? "/images/recCommsArt.png"),
          durationMinutes: Number(c.durationMinutes ?? 0),
          progressPercent: 0,
          completed: false,
          description: c?.description ?? c?.desc ?? "",
        }));
        if (mounted) setItems(mapped);
      } catch (e) {
        // fallback: empty list
        if (mounted) {
          setItems([]);
          setError("fetch_failed");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);
  return { items, updateItem, loading, error };
};
const fmtDuration = (mins: number) => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h <= 0) return `${m} phút`;
  return `${h} giờ ${m} phút`;
};

// No local mock/progress; progress can be filled when backend supports it.

const CourseCard: React.FC<{ item: CourseItem; onToggleDone: (id: string) => void; onClick: () => void }>
  = ({ item, onToggleDone, onClick }) => {
  const cardBg = useColorModeValue("white", "gray.800");
  const cardBorder = useColorModeValue("gray.200", "gray.700");
  const subtitle = useColorModeValue("gray.600", "gray.300");
  return (
  <Box
      bg={cardBg}
      border="1px solid"
      borderColor={cardBorder}
      borderRadius="xl"
      boxShadow="sm"
      overflow="hidden"
  cursor="pointer"
  onClick={onClick}
      _hover={{ boxShadow: "md", transform: "translateY(-2px)" }}
      transition="all 0.2s"
    >
      <Image src={item.thumbnail} alt={item.title} w="100%" h="170px" objectFit="cover" borderTopRadius="xl" />
      <Box p={4}>
        <Text fontWeight="bold" fontSize="lg" mb={2}>{item.title}</Text>
        {item.description ? (
          <Text fontSize="sm" color={subtitle} noOfLines={2} mb={2}>
            {item.description}
          </Text>
        ) : null}
        <Box h="1px" bg={useColorModeValue("gray.100", "whiteAlpha.200")} mb={3} />
        <Flex justify="space-between" align="center">
          {item.durationMinutes > 0 && (
            <Text fontSize="sm" color={subtitle}>{fmtDuration(item.durationMinutes)}</Text>
          )}
          {item.completed ? (
            <HStack spacing={2}>
              <Badge colorScheme="green" borderRadius="full" px={3} py={1} display="flex" alignItems="center">
                <HStack spacing={1}>
                  <CheckIcon boxSize={3} />
                  <Text fontSize="xs">Đã hoàn thành</Text>
                </HStack>
              </Badge>
            </HStack>
          ) : (
            <Box w="120px">
              <Progress value={item.progressPercent} size="sm" colorScheme="blue" borderRadius="full" />
            </Box>
          )}
        </Flex>
        <Flex mt={3} justify="flex-end">
          <Button size="xs" variant="ghost" onClick={(e) => { e.stopPropagation(); onToggleDone(item.id); }}>
            {item.completed ? "Đánh dấu chưa xong" : "Đánh dấu hoàn thành"}
          </Button>
        </Flex>
      </Box>
    </Box>
  );
};

const CoursesPage: React.FC = () => {
  const router = useRouter();
  const { items, updateItem, loading } = useCoursesFromApi();
  const [q, setQ] = useState("");
  const [tab, setTab] = useState(0);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    let list = items.filter((x) => !term || x.title.toLowerCase().includes(term));
    if (tab === 1) list = list.filter((x) => !x.completed);
    if (tab === 2) list = list.filter((x) => x.completed);
    return list;
  }, [items, q, tab]);

  // Dữ liệu khoá học lấy từ API; không còn mock trong repo

  const handleCourseClick = (course: CourseItem) => {
    // SPA navigation to the course list page
    router.push(`/courses/${course.id}`);
  };

  const onToggleDone = (id: string) => {
    const it = items.find((x) => x.id === id);
    if (!it) return;
    updateItem(id, { completed: !it.completed, progressPercent: !it.completed ? 100 : Math.min(it.progressPercent, 95) });
  };

  const dividerCol = useColorModeValue("gray.100", "whiteAlpha.200");

  return (
    <Box maxW="1100px" mx="auto" px={{ base: 4, md: 6 }} py={6}>
      <Text fontSize="2xl" fontWeight="bold" mb={2}>Courses</Text>
      <Text fontSize="sm" color={useColorModeValue("gray.600", "gray.400")} mb={4}>
        Khóa học giúp bạn giảm strees
      </Text>

      <Flex justify="space-between" align="center" mb={4} gap={4} wrap="wrap">
        <InputGroup maxW="360px">
          <InputLeftElement pointerEvents="none">
            <SearchIcon color={useColorModeValue("gray.400", "gray.300")} />
          </InputLeftElement>
          <Input
            placeholder="Tìm kiếm..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            bg={useColorModeValue("white", "gray.800")}
            borderColor={useColorModeValue("gray.200", "gray.700")}
            _hover={{ borderColor: useColorModeValue("blue.300", "blue.400") }}
            _focus={{ borderColor: useColorModeValue("blue.400", "blue.300"), boxShadow: "none" }}
            borderRadius="full"
          />
        </InputGroup>

        <Tabs index={tab} onChange={setTab} colorScheme="blue" variant="soft-rounded">
          <TabList>
            <Tab>Tất cả</Tab>
            <Tab>Đang học</Tab>
            <Tab>Hoàn thành</Tab>
          </TabList>
        </Tabs>
      </Flex>

      <Box h="1px" bg={dividerCol} mb={4} />

      {loading ? (
        <SimpleGrid columns={{ base: 1, sm: 2, md: 3 }} spacing={5}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Box key={i} borderRadius="xl" overflow="hidden">
              <Skeleton height="170px" />
              <Box p={4}>
                <Skeleton height="16px" mb={3} />
                <Skeleton height="12px" width="60%" />
              </Box>
            </Box>
          ))}
        </SimpleGrid>
      ) : items.length === 0 ? (
        <Center py={16}>
          <VStack spacing={2}>
            <Text>Chưa có khóa học nào.</Text>
            <Text fontSize="sm" color={useColorModeValue("gray.600","gray.400")}>Hãy tạo một khóa học trong trang admin.</Text>
          </VStack>
        </Center>
      ) : (
        <SimpleGrid columns={{ base: 1, sm: 2, md: 3 }} spacing={5}>
          {filtered.map((item) => (
            <CourseCard
              key={item.id}
              item={item}
              onToggleDone={onToggleDone}
              onClick={() => handleCourseClick(item)}
            />
          ))}
        </SimpleGrid>
      )}

  {/* Modal removed. We navigate to /courses/[courseId] with a full list */}
    </Box>
  );
};

export default CoursesPage;
 
