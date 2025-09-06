import React from "react";
import {
  Box,
  Container,
  Flex,
  Grid,
  GridItem,
  HStack,
  Image,
  Text,
  VStack,
  IconButton,
  Stack,
  useBreakpointValue,
  useColorModeValue,
  Link as ChakraLink,
} from "@chakra-ui/react";
import { FaFacebookF, FaYoutube } from "react-icons/fa";

/**
 * PTIT styled footer (as per provided screenshot).
 * - Dark background, multi-column layout
 * - Top section: logo + institute name + social icons
 * - Contact + addresses (Hà Nội / TP.HCM)
 * - Useful links / units listing
 * - Copyright bar
 */
const Footer: React.FC = () => {
  const colTemplate = useBreakpointValue({ base: "1fr", md: "repeat(3, 1fr)" });
  // The site uses light body with potential dark mode; keep footer dark but allow subtle theming.
  const bg = useColorModeValue("gray.900", "gray.900");
  const borderColor = useColorModeValue("whiteAlpha.300", "whiteAlpha.300");
  const labelColor = "brand.100"; // use configured brand accent (#FF3C00)
  const socialHover = useColorModeValue("orange.400", "orange.300");

  return (
  <Box as="footer" bg={bg} color="white" pt={16} pb={6} fontSize={{ base: "sm", md: "md" }}>
      <Container maxW="7xl">
        {/* Top brand row */}
        <Flex direction={{ base: "column", md: "row" }} justify="space-between" gap={8} mb={12}>
          <HStack align="flex-start" spacing={4} flex={1}>
            <Image src="/images/logo.png" alt="PTIT" boxSize={{ base: "60px", md: "72px" }} objectFit="contain" filter="drop-shadow(0 0 4px rgba(255,60,0,0.35))" />
            <VStack align="flex-start" spacing={1} maxW={{ base: "full", md: "lg" }}>
              <Text fontWeight="semibold" fontSize={{ base: "lg", md: "xl" }} lineHeight={1.25}>
                HỌC VIỆN CÔNG NGHỆ BƯU CHÍNH VIỄN THÔNG
              </Text>
              <Text opacity={0.85} fontSize={{ base: "xs", md: "sm" }}>
                Posts and Telecommunications Institute of Technology
              </Text>
            </VStack>
          </HStack>
          <HStack spacing={4}>
            <IconButton
              aria-label="Facebook"
              as={ChakraLink}
              href="https://www.facebook.com/HocvienPTIT" // can be adjusted
              target="_blank"
              rel="noopener noreferrer"
              icon={<FaFacebookF />}
              rounded="full"
              bg="brand.100"
              color="white"
              _hover={{ bg: socialHover }}
              _focusVisible={{ boxShadow: "0 0 0 3px rgba(255,60,0,0.5)" }}
            />
            <IconButton
              aria-label="Youtube"
              as={ChakraLink}
              href="https://www.youtube.com" // placeholder
              target="_blank"
              rel="noopener noreferrer"
              icon={<FaYoutube />}
              rounded="full"
              bg="brand.100"
              color="white"
              _hover={{ bg: socialHover }}
              _focusVisible={{ boxShadow: "0 0 0 3px rgba(255,60,0,0.5)" }}
            />
          </HStack>
        </Flex>

        {/* Contact & Addresses */}
        <Grid templateColumns={colTemplate} gap={10} mb={14}>
          <GridItem>
            <VStack align="flex-start" spacing={5}>
              <VStack align="flex-start" spacing={2}>
                <Text fontWeight="semibold" color={labelColor}>Số điện thoại liên hệ</Text>
                <Text>024 3756 2186</Text>
              </VStack>
              <VStack align="flex-start" spacing={2}>
                <Text fontWeight="semibold" color={labelColor}>Email</Text>
                <Text>ctsv@ptit.edu.vn</Text>
              </VStack>
            </VStack>
          </GridItem>
          <GridItem>
            <VStack align="flex-start" spacing={5}>
              <VStack align="flex-start" spacing={2}>
                <Text fontWeight="semibold" color={labelColor}>Trụ sở chính</Text>
                <Text>122 Hoàng Quốc Việt, Q. Cầu Giấy, Hà Nội</Text>
              </VStack>
              <VStack align="flex-start" spacing={2}>
                <Text fontWeight="semibold" color={labelColor}>Cơ sở đào tạo tại Hà Nội</Text>
                <Text>Km10, Đường Nguyễn Trãi, Q. Hà Đông, Hà Nội</Text>
              </VStack>
            </VStack>
          </GridItem>
          <GridItem>
            <VStack align="flex-start" spacing={5}>
              <VStack align="flex-start" spacing={2}>
                <Text fontWeight="semibold" color={labelColor}>Học viện cơ sở tại TP. Hồ Chí Minh</Text>
                <Text>11 Nguyễn Đình Chiểu, P. Đa Kao, Q.1 TP Hồ Chí Minh</Text>
              </VStack>
              <VStack align="flex-start" spacing={2}>
                <Text fontWeight="semibold" color={labelColor}>Cơ sở đào tạo tại TP Hồ Chí Minh</Text>
                <Text>Đường Man Thiện, P. Hiệp Phú, Q.9 TP Hồ Chí Minh</Text>
              </VStack>
            </VStack>
          </GridItem>
        </Grid>

        {/* Units / Links rows */}
        <Grid templateColumns={colTemplate} gap={10} mb={10} fontSize={{ base: "sm", md: "sm" }}>
          <GridItem>
            <Stack spacing={3}>
              <Text>Bộ Thông tin và Truyền thông</Text>
              <Text>Viện Khoa học Kỹ thuật Bưu điện</Text>
              <Text>Viện Kinh tế Bưu điện</Text>
              <Text>Viện Công nghệ Thông tin và Truyền thông CDIT</Text>
            </Stack>
          </GridItem>
          <GridItem>
            <Stack spacing={3}>
              <Text>Học viện Cơ sở TP. Hồ Chí Minh</Text>
              <Text>Trung tâm Đào tạo Bưu chính Viễn thông 1</Text>
              <Text>Trung tâm Đào tạo Bưu chính Viễn thông 2</Text>
              <Text>Trung tâm Đào tạo quốc tế</Text>
            </Stack>
          </GridItem>
            <GridItem>
              <Stack spacing={3}>
                <Text>Cổng thông tin Đào tạo</Text>
                <Text>Cổng thông tin Khoa học Công nghệ</Text>
                <Text>Cổng thông tin Hợp tác quốc tế</Text>
              </Stack>
            </GridItem>
        </Grid>

  <Box borderTop="1px solid" borderColor={borderColor} pt={6} mt={2}>
          <Text textAlign="center" fontSize="xs" opacity={0.8}>
            © Copyright {new Date().getFullYear()} HocVienCongNgheBuuChinhVienThong. All rights reserved ® Học viện Công nghệ Bưu chính Viễn thông giữ bản quyền nội dung trên website này
          </Text>
        </Box>
      </Container>
    </Box>
  );
};

export default Footer;
