import React from 'react';
import { Box, Heading, Text, Button, Stack, useColorModeValue } from '@chakra-ui/react';
import NextLink from 'next/link';

/**
 * Custom 404 page.
 * Having this alongside a custom _error restores proper 404 handling
 * and lets Next.js statically optimize this page.
 */
export default function NotFoundPage() {
  const border = useColorModeValue('gray.200','gray.700');
  const subtle = useColorModeValue('gray.600','gray.400');
  return (
    <Box minH="60vh" display="flex" alignItems="center" justifyContent="center" px={4}>
      <Stack spacing={6} textAlign="center" borderWidth="1px" borderColor={border} p={10} borderRadius="xl" maxW="560px" bg={useColorModeValue('white','gray.800')} boxShadow="sm">
        <Heading size="lg">404 – Không tìm thấy trang</Heading>
        <Text fontSize="md" color={subtle}>Trang bạn yêu cầu có thể đã bị xóa, đổi tên hoặc tạm thời không khả dụng.</Text>
        <Stack direction={{base:'column', sm:'row'}} spacing={4} justify="center">
          <Button as={NextLink} href="/" colorScheme="blue">Về trang chủ</Button>
          <Button variant="outline" onClick={()=> history.back()}>Quay lại</Button>
        </Stack>
      </Stack>
    </Box>
  );
}
