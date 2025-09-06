import React from "react";
import {
  Box,
  Button,
  Container,
  Flex,
  Heading,
  Icon,
  Image,
  SimpleGrid,
  Stack,
  Text,
  useColorModeValue,
  Link as ChakraLink,
  HStack,
} from "@chakra-ui/react";
import Link from "next/link";
import { FiArrowRight, FiCheckCircle } from "react-icons/fi";
import Footer from "./Footer";

/**
 * Minimal, modern one-page landing section component.
 * - Large whitespace, readable typography
 * - Clear CTA: Get started (navigates into main site)
 * - Bold hero section with key benefits
 * - Single-page layout with scroll-down sections
 */
const LandingPage: React.FC = () => {
  const bg = useColorModeValue("white", "gray.900");
  const cardBg = useColorModeValue("gray.50", "gray.800");
  const subtle = useColorModeValue("gray.600", "gray.400");
  const borderCol = useColorModeValue("gray.200", "gray.700");
  const accent = useColorModeValue("blue.600", "blue.400");

  return (
    <Box bg={bg}>
            <Box
            as="section"
            position="relative"
            overflow="hidden"
            minH="100vh"
            display="flex"
            alignItems="center"
            justifyContent="center"
            py={{ base: 10, md: 16 }}
            >
            {/* Full background gradient */}
            <Box
                aria-hidden
                position="absolute"
                top={0}
                left={0}
                w="100vw"
                h="100vh"
                filter="blur(120px)"
                bgGradient="linear(to-br, blue.400, purple.400)"
                opacity={0.25}
                zIndex={-1}
            />

        <Container maxW="6xl" position="relative">
          <Flex direction={{ base: "column", md: "row" }} align="center" gap={10}>
            <Stack spacing={6} flex={1}>
              <HStack spacing={3} color={accent}>
                <Icon as={FiCheckCircle} />
                <Text fontWeight="semibold">Nhanh, gọn, dễ dùng</Text>
              </HStack>
              <Heading as="h1" size={{ base: "2xl", md: "3xl" }} lineHeight={1.1}>
                Kết nối, chia sẻ và phát triển cộng đồng của bạn
              </Heading>
              <Text fontSize={{ base: "md", md: "lg" }} color={subtle} maxW="ch">
                Một nền tảng hiện đại giúp bạn đăng bài, thảo luận và theo dõi thông báo theo thời gian thực. Thiết kế tối giản, tốc độ nhanh, tập trung vào trải nghiệm của bạn.
              </Text>
              <Stack direction={{ base: "column", sm: "row" }} spacing={4}>
                <Link href="/app" passHref>
                  <Button as={ChakraLink} colorScheme="blue" size="lg" rightIcon={<FiArrowRight />}>
                    Get started
                  </Button>
                </Link>
                <a href="#features">
                  <Button variant="outline" size="lg">Tìm hiểu thêm</Button>
                </a>
              </Stack>
            </Stack>
            <Box flex={1}>
              <Image
                alt="App preview"
                src="/images/redditPersonalHome.png"
                borderRadius="lg"
                border="1px solid"
                borderColor={borderCol}
                shadow="xl"
              />
            </Box>
          </Flex>
        </Container>
      </Box>

      {/* Features */}
      <Box as="section" id="features" py={{ base: 16, md: 24 }}>
        <Container maxW="6xl">
          <Stack spacing={3} mb={10} textAlign="center">
            <Heading size="xl">Vì sao chọn chúng tôi?</Heading>
            <Text color={subtle} fontSize={{ base: "md", md: "lg" }}>
              Tập trung vào những điều quan trọng: nội dung, cộng đồng và tốc độ.
            </Text>
          </Stack>
          <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6}>
            {[
              {
                title: "Tối giản & hiện đại",
                body: "Giao diện sạch, nhiều khoảng trắng, dễ đọc. Tập trung vào nội dung và người dùng.",
              },
              {
                title: "Thời gian thực",
                body: "Thông báo, bài viết và bình luận cập nhật nhanh chóng để bạn không bỏ lỡ điều gì.",
              },
              {
                title: "Hiệu năng cao",
                body: "Kiến trúc tối ưu giúp tải nhanh, thao tác mượt mà trên mọi thiết bị.",
              },
            ].map((f) => (
              <Stack key={f.title} p={6} bg={cardBg} border="1px solid" borderColor={borderCol} borderRadius="lg" spacing={3}>
                <Heading size="md">{f.title}</Heading>
                <Text color={subtle}>{f.body}</Text>
              </Stack>
            ))}
          </SimpleGrid>
        </Container>
      </Box>

      {/* How it works */}
      <Box as="section" py={{ base: 16, md: 24 }}>
        <Container maxW="6xl">
          <Stack spacing={3} mb={10} textAlign="center">
            <Heading size="xl">Bắt đầu thật đơn giản</Heading>
            <Text color={subtle}>Chỉ vài bước là bạn đã sẵn sàng.</Text>
          </Stack>
          <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6}>
            {[
              { step: "01", title: "Đăng nhập", body: "Tạo tài khoản hoặc đăng nhập nhanh chóng." },
              { step: "02", title: "Khám phá", body: "Theo dõi nhóm, xem bài viết nổi bật, bình luận." },
              { step: "03", title: "Chia sẻ", body: "Đăng bài, kết nối và xây dựng cộng đồng của bạn." },
            ].map((s) => (
              <Stack key={s.step} p={6} bg={cardBg} border="1px solid" borderColor={borderCol} borderRadius="lg" spacing={3}>
                <Text fontWeight="bold" color={accent}>{s.step}</Text>
                <Heading size="md">{s.title}</Heading>
                <Text color={subtle}>{s.body}</Text>
              </Stack>
            ))}
          </SimpleGrid>
          <Stack align="center" mt={10}>
            <Link href="/app" passHref>
              <Button as={ChakraLink} colorScheme="blue" size="md" rightIcon={<FiArrowRight />}>Get started</Button>
            </Link>
          </Stack>
        </Container>
      </Box>

  <Footer />
    </Box>
  );
};

export default LandingPage;
