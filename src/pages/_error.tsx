import React from 'react';
import { Box, Heading, Text, Button, Stack, useColorModeValue } from '@chakra-ui/react';
import NextLink from 'next/link';
import { NextPageContext } from 'next';

interface ErrorProps { statusCode?: number }

function ErrorPage({ statusCode }: ErrorProps) {
  const border = useColorModeValue('gray.200','gray.700');
  const subtle = useColorModeValue('gray.600','gray.400');
  return (
    <Box minH="60vh" display="flex" alignItems="center" justifyContent="center" px={4}>
      <Stack spacing={6} textAlign="center" borderWidth="1px" borderColor={border} p={10} borderRadius="xl" maxW="560px" bg={useColorModeValue('white','gray.800')}
        boxShadow="sm">
        <Heading size="lg">{statusCode || 404} – Có lỗi xảy ra</Heading>
        <Text fontSize="md" color={subtle}>Trang bạn truy cập không tồn tại hoặc đã xảy ra lỗi bất ngờ.</Text>
        <Stack direction={{base:'column', sm:'row'}} spacing={4} justify="center">
          <Button as={NextLink} href="/" colorScheme="blue">Về trang chủ</Button>
          <Button variant="outline" onClick={()=> location.reload()}>Tải lại</Button>
        </Stack>
      </Stack>
    </Box>
  );
}

ErrorPage.getInitialProps = ({ res, err }: NextPageContext) => {
  const statusCode = res?.statusCode || err?.statusCode || 404;
  return { statusCode };
};

export default ErrorPage;
