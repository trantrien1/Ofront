import React from "react";
import { Box, Heading, HStack, Text, Switch, useColorMode } from "@chakra-ui/react";

const SettingsPage: React.FC = () => {
  const { colorMode, toggleColorMode } = useColorMode();
  return (
    <Box maxW="700px" mx="auto" p={6}>
      <Heading size="lg" mb={6}>Settings</Heading>
      <HStack justify="space-between" p={4} borderWidth="1px" borderRadius="md">
        <Box>
          <Text fontWeight="bold">Theme</Text>
          <Text color="gray.500">Toggle light/dark mode</Text>
        </Box>
        <Switch isChecked={colorMode === 'dark'} onChange={toggleColorMode} />
      </HStack>
    </Box>
  );
};

export default SettingsPage;
