import React from "react";
import { Box, Heading, HStack, Text, Switch, useColorMode } from "@chakra-ui/react";

const SettingsPage: React.FC = () => {
  const { colorMode, toggleColorMode } = useColorMode();
  return (
    <Box maxW="700px" mx="auto" p={6}>
      <Heading size="lg" mb={6}>Cài đặt</Heading>
      <HStack justify="space-between" p={4} borderWidth="1px" borderRadius="md">
        <Box>
          <Text fontWeight="bold">Chủ đề</Text>
          <Text color="gray.500">Chuyển chế độ sáng/tối</Text>
        </Box>
        <Switch isChecked={colorMode === 'dark'} onChange={toggleColorMode} />
      </HStack>
    </Box>
  );
};

export default SettingsPage;
