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
} from "@chakra-ui/react";
import { useRouter } from "next/router";
import { SearchIcon, CheckIcon } from "@chakra-ui/icons";

type CourseItem = {
  id: string;
  title: string;
  thumbnail: string;
  durationMinutes: number;
  progressPercent: number;
  completed?: boolean;
};

const initialCourses: CourseItem[] = [
  {
    id: "ls-dang-cs",
    title: "Tâm lý học",
    thumbnail: "/images/redditPersonalHome.png",
    durationMinutes: 208,
    progressPercent: 45,
  },
  {
    id: "tu-tuong-hcm",
    title: "Tư tưởng Hồ Chí Minh",
    thumbnail: "/images/recCommsArt.png",
    durationMinutes: 274,
    progressPercent: 100,
    completed: true,
  },
  {
    id: "lap-trinh-web",
    title: "Quản lí mã nguồn dự án Web",
    thumbnail: "/images/ptit_logo.png",
    durationMinutes: 125,
    progressPercent: 70,
  },
];

const fmtDuration = (mins: number) => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h <= 0) return `${m} phút`;
  return `${h} giờ ${m} phút`;
};

const useLocalStatus = (items: CourseItem[]) => {
  const [state, setState] = useState<CourseItem[]>(items);
  useEffect(() => {
    try {
      const raw = localStorage.getItem("coursesStatus");
      if (raw) {
        const map: Record<string, { progressPercent: number; completed?: boolean }> = JSON.parse(raw);
        setState((prev) => prev.map((it) => ({ ...it, ...(map[it.id] || {}) })));
      }
    } catch {}
  }, []);
  const save = (list: CourseItem[]) => {
    try {
      const out: Record<string, { progressPercent: number; completed?: boolean }> = {};
      list.forEach((it) => (out[it.id] = { progressPercent: it.progressPercent, completed: it.completed }));
      localStorage.setItem("coursesStatus", JSON.stringify(out));
    } catch {}
  };
  const updateItem = (id: string, patch: Partial<CourseItem>) => {
    setState((prev) => {
      const next = prev.map((it) => (it.id === id ? { ...it, ...patch } : it));
      save(next);
      return next;
    });
  };
  return { items: state, updateItem };
};

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
        <Box h="1px" bg={useColorModeValue("gray.100", "whiteAlpha.200")} mb={3} />
        <Flex justify="space-between" align="center">
          <Text fontSize="sm" color={subtitle}>{fmtDuration(item.durationMinutes)}</Text>
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
  const { items, updateItem } = useLocalStatus(initialCourses);
  const [q, setQ] = useState("");
  const [tab, setTab] = useState(0);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    let list = items.filter((x) => !term || x.title.toLowerCase().includes(term));
    if (tab === 1) list = list.filter((x) => !x.completed);
    if (tab === 2) list = list.filter((x) => x.completed);
    return list;
  }, [items, q, tab]);

  // All course video metadata now lives in src/data/courses.ts

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

  {/* Modal removed. We navigate to /courses/[courseId] with a full list */}
    </Box>
  );
};

export default CoursesPage;
 
