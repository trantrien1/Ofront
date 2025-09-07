import React from "react";
import {
  Accordion, AccordionButton, AccordionIcon, AccordionItem, AccordionPanel,
  Badge, Box, Button, Container, Divider, Flex, Heading, HStack, Icon, Image,
  Link as ChakraLink, SimpleGrid, Stack, Text, useColorModeValue, usePrefersReducedMotion
} from "@chakra-ui/react";
import { keyframes } from "@emotion/react";
import Link from "next/link";
import { FiArrowRight, FiZap, FiFeather, FiBell, FiShield, FiStar } from "react-icons/fi";
import { motion } from "framer-motion";
import Footer from "./Footer";

const MotionBox = motion(Box);
const MotionStack = motion(Stack);

// Variants (tối ưu: chỉ transform + opacity, duration ngắn hơn)
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.45, delay: 0.06 * i, ease: "easeOut" } }),
};
const fadeIn = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: 0.45, ease: "easeOut" } } };

// Keyframes gradient nhẹ
const pulseGrad = keyframes`
  0%{ transform: translateY(0px) scale(1); opacity:.22;}
  50%{ transform: translateY(-8px) scale(1.02); opacity:.28;}
  100%{ transform: translateY(0px) scale(1); opacity:.22;}
`;
// Marquee
const marquee = keyframes`
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
`;

const LandingPage: React.FC = () => {
  const reducedMotion = usePrefersReducedMotion();
  const bg = useColorModeValue("gray.50", "gray.900");
  const surface = useColorModeValue("white", "gray.800");
  const glass = useColorModeValue("whiteAlpha.800", "whiteAlpha.100");
  const border = useColorModeValue("blackAlpha.200", "whiteAlpha.200");
  const subtle = useColorModeValue("gray.600", "gray.400");
  const primary = useColorModeValue("black", "white");
  const accent = useColorModeValue("blue.600", "blue.300");
  const accentSoft = useColorModeValue("blue.50", "whiteAlpha.100");

  // Pre-compute any color mode values that were previously (incorrectly) used inside callbacks
  const featuresHoverBg = useColorModeValue("gray.100","whiteAlpha.100");
  const faqExpandedBg = useColorModeValue("gray.50", "whiteAlpha.100");

  return (
    <Box bg={bg}>
      {/* ================= HERO ================= */}
      <Box
        as="section"
        position="relative"
        overflow="hidden"
        minH={{ base: "90vh", md: "100vh" }}
        display="flex"
        alignItems="center"
        py={{ base: 12, md: 16 }}
      >
        {/* BG gradients */}
        {!reducedMotion && (
          <Box
            aria-hidden
            position="absolute"
            inset={0}
            _before={{
              content: '""',
              position: "absolute",
              inset: "-15%",
              bgGradient:
                "radial(circle at 30% 20%, rgba(56,189,248,0.20), transparent 42%), radial(circle at 70% 80%, rgba(168,85,247,0.20), transparent 42%)",
              filter: "blur(40px)",
              willChange: "transform"
            }}
          />
        )}
        {!reducedMotion && (
          <Box
            aria-hidden
            position="absolute"
            top="-25%"
            left="-10%"
            w="70vmin"
            h="70vmin"
            bgGradient="conic-gradient(from 180deg at 50% 50%, rgba(59,130,246,0.30), rgba(168,85,247,0.30), transparent)"
            rounded="full"
            animation={`${pulseGrad} 10s ease-in-out infinite`}
            willChange="transform"
          />
        )}

        <Container maxW="7xl" position="relative">
          <SimpleGrid columns={{ base: 1, md: 12 }} spacing={{ base: 10, md: 6 }} alignItems="center">
            {/* Left text */}
            <MotionStack
              spacing={6}
              gridColumn={{ md: "span 7" }}
              initial="hidden"
              animate="show"
              variants={fadeIn}
              style={{ willChange: 'transform' }}
            >
              <MotionBox custom={0} variants={fadeUp}>
                <Badge px={3} py={1} rounded="full" bg={accentSoft} color={accent} border="1px solid" borderColor={border}>
                  Realtime • Minimal • Fast
                </Badge>
              </MotionBox>

              <MotionBox custom={1} variants={fadeUp}>
                <Heading
                  as="h1"
                  fontWeight="extrabold"
                  lineHeight={1.05}
                  fontSize={{ base: "2.4rem", md: "3.4rem" }}
                  letterSpacing="-0.02em"
                  color={primary}
                >
                  Xây dựng cộng đồng{" "}
                  <Text as="span" bgClip="text" bgGradient="linear(to-r, blue.400, purple.300)">nhanh & mượt</Text>.
                </Heading>
              </MotionBox>

              <MotionBox custom={2} variants={fadeUp}>
                <Text fontSize={{ base: "md", md: "lg" }} color={subtle} maxW="xl">
                  Đăng bài, thảo luận và thông báo thời gian thực. Tối giản, mượt và tập trung trải nghiệm.
                </Text>
              </MotionBox>

              <MotionBox custom={3} variants={fadeUp}>
                <HStack spacing={4} flexWrap="wrap">
                  <Link href="/app" passHref>
                    <Button
                      as={ChakraLink}
                      size="lg"
                      colorScheme="blue"
                      rightIcon={<FiArrowRight />}
                      px={6}
                      _hover={{ transform: "translateY(-2px)" }}
                      transition="all .25s ease"
                    >
                      Bắt đầu miễn phí
                    </Button>
                  </Link>
                  <Button
                    as="a"
                    href="#features"
                    size="lg"
                    variant="outline"
                    borderColor={border}
                    _hover={{ transform: "translateY(-2px)", bg: featuresHoverBg }}
                    transition="all .25s ease"
                  >
                    Xem tính năng
                  </Button>
                </HStack>
              </MotionBox>

              <MotionBox custom={4} variants={fadeUp}>
                <HStack spacing={8} pt={2} color={subtle} flexWrap="wrap">
                  <Stack spacing={0}><Heading size="lg">1,200+</Heading><Text>Nhóm hoạt động</Text></Stack>
                  <Stack spacing={0}><Heading size="lg">99.9%</Heading><Text>Uptime</Text></Stack>
                  <Stack spacing={0}><Heading size="lg">~120ms</Heading><Text>Độ trễ thông báo</Text></Stack>
                </HStack>
              </MotionBox>
            </MotionStack>

            {/* Right preview (slide/scale) */}
            <MotionBox
              gridColumn={{ md: "span 5" }}
              border="1px solid"
              borderColor={border}
              bg={glass}
              backdropFilter={reducedMotion ? "saturate(120%)" : "saturate(140%) blur(4px)"}
              rounded="2xl"
              overflow="hidden"
              shadow="xl"
              initial={{ opacity: 0, x: 40, scale: 0.98 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ duration: 0.55, ease: "easeOut" }}
              whileHover={!reducedMotion ? { y: -4 } : undefined}
              style={{ willChange: 'transform' }}
            >
              <Image alt="App preview" src="/images/A2.png" />
              <HStack p={4} spacing={3} borderTop="1px solid" borderColor={border}>
                <Badge colorScheme="blue" variant="subtle">Realtime</Badge>
                <Badge colorScheme="purple" variant="subtle">Tối giản</Badge>
                <Badge colorScheme="green" variant="subtle">Hiệu năng</Badge>
              </HStack>
            </MotionBox>
          </SimpleGrid>

          {/* Logo marquee (auto scroll) */}
      <Box mt={{ base: 10, md: 14 }} overflow="hidden" position="relative">
            <Box
              display="flex"
              whiteSpace="nowrap"
        animation={!reducedMotion ? `${marquee} 28s linear infinite` : undefined}
        style={{ willChange: 'transform' }}
            >
              <HStack color={subtle} spacing={10} px={4}>
                <Text fontSize="sm">Được tin dùng bởi</Text>
                <Text fontWeight="semibold">MathX</Text>
                <Text fontWeight="semibold">Bonilla</Text>
                <Text fontWeight="semibold">Vạn An Lộc</Text>
                {/* lặp lại để seamless */}
                <Text fontSize="sm" ml={12}>Được tin dùng bởi</Text>
                <Text fontWeight="semibold">MathX</Text>
                <Text fontWeight="semibold">Bonilla</Text>
                <Text fontWeight="semibold">Vạn An Lộc</Text>
              </HStack>
            </Box>
          </Box>
        </Container>
      </Box>

      {/* ================= FEATURES (reveal on scroll) ================= */}
      <Box as="section" id="features" py={{ base: 16, md: 24 }}>
        <Container maxW="7xl">
          <Stack spacing={3} mb={12} textAlign="center">
            <Heading size="xl" letterSpacing="-0.02em">Tại sao chọn chúng tôi?</Heading>
            <Text color={subtle} fontSize={{ base: "md", md: "lg" }}>
              Thiết kế tối giản, công nghệ tối ưu — tập trung vào nội dung và kết nối.
            </Text>
          </Stack>

          <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6}>
            {[
              { icon: FiFeather, title: "Tối giản & hiện đại", body: "UI sạch, border tinh tế, tập trung giá trị cốt lõi." },
              { icon: FiBell,    title: "Thông báo thời gian thực", body: "Push ngay khi có tương tác mới trên mọi thiết bị." },
              { icon: FiZap,     title: "Hiệu năng cao", body: "Tối ưu tải và tương tác mượt ở quy mô lớn." },
            ].map((f, i) => (
              <MotionStack
                key={f.title}
                p={6}
                bg={surface}
                border="1px solid"
                borderColor={border}
                rounded="xl"
                spacing={4}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, margin: "-80px" }}
                custom={i}
                variants={fadeUp}
                whileHover={!reducedMotion ? { y: -4, boxShadow: "lg" } : undefined}
                transition={{ type: "spring", stiffness: 220, damping: 24 }}
                style={{ willChange: 'transform' }}
              >
                <HStack spacing={3}>
                  <Icon as={f.icon} color={accent} boxSize={6} />
                  <Heading size="md">{f.title}</Heading>
                </HStack>
                <Text color={subtle}>{f.body}</Text>
              </MotionStack>
            ))}
          </SimpleGrid>
        </Container>
      </Box>

      {/* ================= HOW IT WORKS ================= */}
      <Box as="section" py={{ base: 16, md: 24 }}>
        <Container maxW="7xl">
          <Stack spacing={3} mb={10} textAlign="center">
            <Heading size="xl" letterSpacing="-0.02em">Bắt đầu trong 3 bước</Heading>
            <Text color={subtle}>Không cần hướng dẫn dài — trải nghiệm dẫn đường.</Text>
          </Stack>
          <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6}>
            {[
              { step: "01", title: "Đăng nhập", body: "Tạo tài khoản hoặc SSO trong vài giây." },
              { step: "02", title: "Khám phá", body: "Theo dõi nhóm, xem bài nổi bật và bình luận." },
              { step: "03", title: "Chia sẻ", body: "Đăng bài, tương tác và phát triển cộng đồng." },
            ].map((s, i) => (
              <MotionStack
                key={s.step}
                p={6}
                bg={surface}
                border="1px solid"
                borderColor={border}
                rounded="xl"
                spacing={3}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, margin: "-60px" }}
                custom={i}
                variants={fadeUp}
                whileHover={!reducedMotion ? { y: -4 } : undefined}
                style={{ willChange: 'transform' }}
              >
                <Text fontWeight="bold" color={accent}>{s.step}</Text>
                <Heading size="md">{s.title}</Heading>
                <Text color={subtle}>{s.body}</Text>
              </MotionStack>
            ))}
          </SimpleGrid>

          <Stack align="center" mt={10}>
            <MotionBox whileHover={!reducedMotion ? { y: -2 } : undefined} transition={{ duration: .18 }} style={{ willChange: 'transform' }}>
              <Link href="/app" passHref>
                <Button as={ChakraLink} colorScheme="blue" size="md" rightIcon={<FiArrowRight />}>
                  Bắt đầu ngay
                </Button>
              </Link>
            </MotionBox>
          </Stack>
        </Container>
      </Box>

      {/* ================= TESTIMONIAL ================= */}
      <Box as="section" py={{ base: 16, md: 24 }}>
        <Container maxW="7xl">
          <MotionStack
            direction={{ base: "column", md: "row" }}
            spacing={8}
            align="center"
            bg={surface}
            border="1px solid"
            borderColor={border}
            rounded="2xl"
            p={{ base: 6, md: 10 }}
            initial={{ opacity: 0, scale: 0.98 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: .45 }}
            style={{ willChange: 'transform' }}
          >
            <Icon as={FiStar} color={accent} boxSize={8} />
            <Stack spacing={2} flex={1}>
              <Heading size="md" letterSpacing="-0.01em">
                “Di chuyển toàn bộ cộng đồng trong 1 tuần – mượt hơn 3×.”
              </Heading>
              <Text color={subtle}>
                “Thông báo realtime chuẩn, UI tối giản. Đội mình tập trung nội dung thay vì lo config.”
              </Text>
              <HStack spacing={4} color={subtle} pt={1}>
                <Box boxSize="34px" rounded="full" overflow="hidden" border="1px solid" borderColor={border}>
                  <Image alt="avatar" src="/images/avatar-placeholder.png" />
                </Box>
                <Stack spacing={0}>
                  <Text fontWeight="medium">Tran Huyen</Text>
                  <Text fontSize="sm" color={subtle}>Creator tại MathX</Text>
                </Stack>
              </HStack>
            </Stack>
          </MotionStack>
        </Container>
      </Box>

      {/* ================= FAQ ================= */}
      <Box as="section" py={{ base: 16, md: 24 }}>
        <Container maxW="7xl">
          <Stack spacing={3} mb={6} textAlign="center">
            <Heading size="xl" letterSpacing="-0.02em">Câu hỏi thường gặp</Heading>
            <Text color={subtle}>Một vài thắc mắc phổ biến trước khi bạn bắt đầu.</Text>
          </Stack>
          <Accordion allowMultiple bg={surface} border="1px solid" borderColor={border} rounded="2xl">
            {[
              { q: "Có miễn phí không?", a: "Có. Bắt đầu miễn phí; gói nâng cao có thêm phân tích & quản trị nhiều nhóm." },
              { q: "Realtime hoạt động thế nào?", a: "WebSocket/STOMP (fallback phù hợp) — đẩy sự kiện ngay khi có tương tác." },
              { q: "Có API tích hợp không?", a: "Có, hỗ trợ đồng bộ user/bài viết và webhook." },
            ].map(({ q, a }) => (
              <AccordionItem key={q} border="none">
                <h2>
                  <AccordionButton _expanded={{ bg: faqExpandedBg }}>
                    <Box as="span" flex="1" textAlign="left" fontWeight="semibold">{q}</Box>
                    <AccordionIcon />
                  </AccordionButton>
                </h2>
                <AccordionPanel pt={4} color={subtle}>{a}</AccordionPanel>
              </AccordionItem>
            ))}
          </Accordion>
        </Container>
      </Box>

      {/* ================= FINAL CTA ================= */}
      <Box as="section" py={{ base: 16, md: 24 }}>
        <Container maxW="7xl">
          <MotionStack
            align="center"
            spacing={6}
            bg={surface}
            border="1px solid"
            borderColor={border}
            rounded="3xl"
            p={{ base: 8, md: 12 }}
            textAlign="center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: .5 }}
            style={{ willChange: 'transform' }}
          >
            <Heading size="lg" letterSpacing="-0.02em">Sẵn sàng khởi động?</Heading>
            <Text color={subtle} maxW="2xl">
              Tạo nhóm, mời thành viên và phát triển cộng đồng ngay hôm nay.
            </Text>
            <HStack spacing={4}>
              <MotionBox whileHover={!reducedMotion ? { scale: 1.02 } : undefined} whileTap={!reducedMotion ? { scale: 0.98 } : undefined} style={{ willChange: 'transform' }}>
                <Link href="/app" passHref>
                  <Button as={ChakraLink} colorScheme="blue" size="lg" rightIcon={<FiArrowRight />}>
                    Dùng miễn phí
                  </Button>
                </Link>
              </MotionBox>
              <MotionBox whileHover={!reducedMotion ? { y: -2 } : undefined} style={{ willChange: 'transform' }}>
                <Button as="a" href="#features" variant="outline" size="lg" borderColor={border}>
                  Xem tính năng
                </Button>
              </MotionBox>
            </HStack>
          </MotionStack>

          <Divider my={12} borderColor={border} />
          <Footer />
        </Container>
      </Box>
    </Box>
  );
};

export default LandingPage;
