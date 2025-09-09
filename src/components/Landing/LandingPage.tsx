import React from "react";
import {
  Accordion, AccordionButton, AccordionIcon, AccordionItem, AccordionPanel,
  Badge, Box, Button, Container, Divider, Flex, Heading, HStack, Icon, Image,
  Link as ChakraLink, SimpleGrid, Stack, Text, useColorModeValue, usePrefersReducedMotion
} from "@chakra-ui/react";
import { keyframes } from "@emotion/react";
import Link from "next/link";
import { FiArrowRight, FiZap, FiFeather, FiBell, FiShield, FiStar, FiHeart, FiMessageCircle, FiVideo, FiUsers } from "react-icons/fi";
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
  const bg = useColorModeValue("blue.100", "gray.900");
  const surface = useColorModeValue("white", "gray.800");
  const glass = useColorModeValue("whiteAlpha.800", "whiteAlpha.100");
  const border = useColorModeValue("blackAlpha.200", "whiteAlpha.200");
  const subtle = useColorModeValue("gray.600", "gray.400");
  const primary = useColorModeValue("black", "white");
  const accent = useColorModeValue("blue.700", "blue.400");
  const accentSoft = useColorModeValue("blue.100", "whiteAlpha.100");

  // Pre-compute any color mode values that were previously (incorrectly) used inside callbacks
  const featuresHoverBg = useColorModeValue("blue.100","whiteAlpha.100");
  const faqExpandedBg = useColorModeValue("gray.50", "whiteAlpha.100");

  return (
    <Box bg={bg}>
      {/* Top slogan banner */}
   
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
                "radial(circle at 30% 20%, rgba(37,99,235,0.22), transparent 42%), radial(circle at 70% 80%, rgba(29,78,216,0.22), transparent 42%)",
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
            bgGradient="conic-gradient(from 180deg at 50% 50%, rgba(59,130,246,0.32), rgba(37,99,235,0.28), rgba(147,51,234,0.22), transparent)"
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
                  Riêng tư • An toàn • Tự động hóa
                </Badge>
              </MotionBox>

              <MotionBox custom={1} variants={fadeUp}>
                <Heading
                  as="h1"
                  fontWeight="extrabold"
                  lineHeight={1.05}
                  fontSize={{ base: "2.4rem", md: "3.6rem" }}
                  letterSpacing="-0.02em"
                  color={primary}
                >
                  <Text as="span" bgClip="text" bgGradient="linear(to-r, blue.600, blue.500, purple.500)" display="inline-block">
                    MindAi
                  </Text>
                  {" — đồng hành cùng bạn "}
                  <Text as="span" bgClip="text" bgGradient="linear(to-r, blue.600, cyan.500)">chăm sóc tinh thần, nuôi dưỡng tương lai</Text>.
                </Heading>
              </MotionBox>

              <MotionBox custom={2} variants={fadeUp}>
                <Text fontSize={{ base: "md", md: "lg" }} color={subtle} maxW="xl">
                  Nền tảng AI chăm sóc tinh thần được thiết kế riêng cho sinh viên Việt Nam, tích hợp các module rèn luyện kỹ năng, trợ lý cảm xúc thông minh và cộng đồng hỗ trợ an toàn. Hệ thống giúp sinh viên nhận diện, can thiệp kịp thời các vấn đề lo âu, căng thẳng, bế tắc tâm lý, đồng thời khích lệ và phát huy thế mạnh cá nhân. Từ đó, sinh viên có thể học tập hiệu quả hơn và nâng cao chất lượng cuộc sống
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
                      Bắt đầu
                    </Button>
                  </Link>
                  <Link href="/quiz" passHref>
                    <Button
                      as={ChakraLink}
                      size="lg"
                      variant="outline"
                      borderColor={border}
                      _hover={{ transform: "translateY(-2px)", bg: featuresHoverBg }}
                      transition="all .25s ease"
                    >
                      Làm trắc nghiệm DASS‑21
                    </Button>
                  </Link>
                  <Link href="/anime" passHref>
                    <Button
                      as={ChakraLink}
                      size="lg"
                      variant="outline"
                      borderColor={border}
                      _hover={{ transform: "translateY(-2px)", bg: featuresHoverBg }}
                      transition="all .25s ease"
                    >
                      Trò chuyện với Ami
                    </Button>
                  </Link>
                </HStack>
              </MotionBox>

              <MotionBox custom={4} variants={fadeUp}>
                <HStack spacing={8} pt={2} color={subtle} flexWrap="wrap">
                  <Stack spacing={0}><Heading size="lg">100%</Heading><Text>Riêng tư & ẩn danh</Text></Stack>
                  <Stack spacing={0}><Heading size="lg">24/7</Heading><Text>Lắng nghe và phản hồi</Text></Stack>
                  <Stack spacing={0}><Heading size="lg">AI + Tâm lý</Heading><Text>Nền tảng kết hợp</Text></Stack>
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
                <Badge colorScheme="blue" variant="subtle">Ami AI</Badge>
                <Badge colorScheme="purple" variant="subtle">DASS‑21</Badge>
                <Badge colorScheme="green" variant="subtle">Riêng tư</Badge>
              </HStack>
            </MotionBox>
          </SimpleGrid>

          
        </Container>
      </Box>

      {/* ================= FEATURES (reveal on scroll) ================= */}
      <Box as="section" id="features" py={{ base: 16, md: 24 }}>
        <Container maxW="7xl">
          <Stack spacing={3} mb={12} textAlign="center">
            <Heading size="xl" letterSpacing="-0.02em">Ami đồng hành cùng bạn</Heading>
            <Text color={subtle} fontSize={{ base: "md", md: "lg" }}>
              Trợ lý ảo Ami dịu dàng, thấu cảm; công cụ DASS‑21 và thư viện video giúp bạn hiểu mình hơn.
            </Text>
          </Stack>

          <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6}>
            {[
              { icon: FiHeart, title: "Lắng nghe 24/7", body: "Ami luôn sẵn sàng khi bạn cần trút bầu tâm sự" },
              { icon: FiMessageCircle, title: "Phong cách trị liệu tích cực", body: "Gợi mở, dịu dàng, định hướng giải quyết vấn đề." },
              { icon: FiFeather, title: "DASS‑21 chuẩn lâm sàng", body: "Tự đánh giá trầm cảm, lo âu, căng thẳng – kết quả tức thì." },
              { icon: FiVideo, title: "Thư viện video trị liệu", body: "Nội dung chọn lọc từ Psych2Go, The School of Life…" },
              { icon: FiShield, title: "Riêng tư & đạo đức", body: "Ẩn danh, không thu thập trái phép; khuyến khích gặp chuyên gia khi cần." },
              { icon: FiUsers, title: "Cộng đồng an toàn & ẩn danh", body: "Chia sẻ không bị phán xét, có giám sát nhẹ bởi AI để hạn chế nội dung gây hại." },
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
          <Stack align="center" mt={10} spacing={4}>
            <HStack spacing={4} flexWrap="wrap" justify="center">
              <Link href="/anime" passHref>
                <Button as={ChakraLink} colorScheme="blue" rightIcon={<FiArrowRight />}>Trò chuyện với Ami</Button>
              </Link>
              <Link href="/quiz" passHref>
                <Button as={ChakraLink} variant="outline" borderColor={border}>Làm DASS‑21</Button>
              </Link>
              <Link href="/courses/videos" passHref>
                <Button as={ChakraLink} variant="ghost">Xem video trị liệu</Button>
              </Link>
              <Link href="/community" passHref>
                <Button as={ChakraLink} variant="ghost">Tham gia Cộng đồng</Button>
              </Link>
            </HStack>
          </Stack>
        </Container>
      </Box>

      {/* ================= HOW IT WORKS ================= */}
      <Box as="section" py={{ base: 16, md: 24 }}>
        <Container maxW="7xl">
          <Stack spacing={3} mb={10} textAlign="center">
            <Heading size="xl" letterSpacing="-0.02em">Bạn bắt đầu như thế nào?</Heading>
            <Text color={subtle}>3 bước nhẹ nhàng để hiểu mình hơn và được đồng hành.</Text>
          </Stack>
          <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6}>
            {[
              { step: "01", title: "Chọn cách đồng hành", body: "Trò chuyện với Ami hoặc tham gia Cộng đồng an toàn." },
              { step: "02", title: "Làm DASS‑21", body: "Tự đánh giá mức độ cảm xúc – kết quả tức thì, ẩn danh." },
              { step: "03", title: "Nhận gợi ý phù hợp", body: "Video, bài viết, và lời khuyên dịu dàng từ Ami." },
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
              <Link href="/anime" passHref>
                <Button as={ChakraLink} colorScheme="blue" size="md" rightIcon={<FiArrowRight />}>
                  Bắt đầu với Ami
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
                “Ami rất dịu dàng và tôn trọng ranh giới của mình.”
              </Heading>
              <Text color={subtle}>
                “Mỗi khi quá tải, mình nhắn Ami là thấy nhẹ lòng hơn. Bài test DASS‑21 cũng giúp mình hiểu cảm xúc rõ ràng.”
              </Text>
              <HStack spacing={4} color={subtle} pt={1}>
                <Box boxSize="34px" rounded="full" overflow="hidden" border="1px solid" borderColor={border}>
                  <Image alt="avatar" src="/images/avatar-placeholder.png" />
                </Box>
                <Stack spacing={0}>
                  <Text fontWeight="medium">Lan Anh</Text>
                  <Text fontSize="sm" color={subtle}>Người dùng chia sẻ</Text>
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
            <Text color={subtle}>Một vài điều bạn có thể quan tâm trước khi bắt đầu.</Text>
          </Stack>
          <Accordion allowMultiple bg={surface} border="1px solid" borderColor={border} rounded="2xl">
            {[
              { q: "Dữ liệu của tôi có an toàn không?", a: "Có. Chúng tôi cam kết ẩn danh, không thu thập trái phép và chỉ lưu khi bạn đồng ý." },
              { q: "Ami có thay thế chuyên gia trị liệu?", a: "Không. Ami là trợ lý ảo hỗ trợ tinh thần. Trường hợp nghiêm trọng, Ami sẽ khuyến khích bạn tìm đến chuyên gia." },
              { q: "DASS‑21 có chính xác không?", a: "DASS‑21 là công cụ lâm sàng đáng tin cậy để sàng lọc. Kết quả mang tính tham khảo để hiểu bản thân tốt hơn." },
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
            <Heading size="lg" letterSpacing="-0.02em">Sẵn sàng lắng nghe chính mình?</Heading>
            <Text color={subtle} maxW="2xl">
              Trò chuyện ẩn danh với Ami, làm DASS‑21 và khám phá video trị liệu để chữa lành mỗi ngày.
            </Text>
            <HStack spacing={4}>
              <MotionBox whileHover={!reducedMotion ? { scale: 1.02 } : undefined} whileTap={!reducedMotion ? { scale: 0.98 } : undefined} style={{ willChange: 'transform' }}>
                <Link href="/anime" passHref>
                  <Button as={ChakraLink} colorScheme="blue" size="lg" rightIcon={<FiArrowRight />}>
                    Trò chuyện với Ami
                  </Button>
                </Link>
              </MotionBox>
              <MotionBox whileHover={!reducedMotion ? { y: -2 } : undefined} style={{ willChange: 'transform' }}>
                <Link href="/quiz" passHref>
                  <Button as={ChakraLink} variant="outline" size="lg" borderColor={border}>
                    Làm DASS‑21
                  </Button>
                </Link>
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
