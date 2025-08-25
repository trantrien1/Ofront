import React from "react";
import { Box, Button, Flex, Heading, Icon, useColorModeValue } from "@chakra-ui/react";
import { useRouter } from "next/router";
import { ArrowBackIcon } from "@chakra-ui/icons";

const AnimePage: React.FC & { noLayout?: boolean } = () => {
  const router = useRouter();
  const bg = useColorModeValue("white", "gray.800");
  return (
    <Flex direction="column" w="100vw" h="100vh" bg={bg}>
      <Flex p={2} align="center" gap={3} borderBottom="1px solid" borderColor="gray.200">
        <Button leftIcon={<ArrowBackIcon />} variant="ghost" onClick={() => router.back()}>
          Trở về
        </Button>
        <Heading as="h2" size="md">Trợ lí ảo Anime</Heading>
      </Flex>
      <Box flex={1} overflow="hidden">
        <iframe src="https://waifu-ai-dev-beta.vercel.app"
        allow="microphone"
        width="100%"
        height="100%"
        style={{ borderRadius: "12px", boxShadow: "0 10px 25px rgba(0,0,0,0.1)" }}>
        </iframe>
      </Box>
    </Flex>
  );
};


AnimePage.noLayout = true;

export default AnimePage;
