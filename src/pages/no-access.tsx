import React from 'react';
import { Container, VStack, Heading, Text, Button } from '@chakra-ui/react';
import NextLink from 'next/link';

const NoAccessPage: React.FC = () => {
  return (
    <Container maxW="xl" py={20}>
      <VStack spacing={4} textAlign="center">
        <Heading size="lg">Access Denied</Heading>
        <Text color="gray.600">You don't have permission to view this page.</Text>
        <Button as={NextLink} href="/" colorScheme="blue">Go Home</Button>
      </VStack>
    </Container>
  );
};

export default NoAccessPage;
