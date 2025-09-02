import React from "react";
import { Box, Flex, Image, Text, useColorModeValue } from "@chakra-ui/react";
type NavUser = { uid: string; email?: string | null };
import { useSetRecoilState, useRecoilValue } from "recoil";
import { userState } from "../../atoms/userAtom";
import {
  defaultMenuItem,
  directoryMenuState,
} from "../../atoms/directoryMenuAtom";
import RightContent from "./RightContent";
import SearchInput from "./SearchInput";
import router from "next/router";
import useDirectory from "../../hooks/useDirectory";

const Navbar: React.FC = () => {
  const user = useRecoilValue(userState) as any;

  // Use <Link> for initial build; implement directory logic near end
  const { onSelectMenuItem } = useDirectory();

  return (
    <Flex
      bg="transparent" // inherit from parent header Box, which is color-mode aware
      height="44px"
      padding="6px 12px"
      position="sticky"
      justifyContent={{ md: "space-between" }}
    >
      <Flex
        align="center"
        width={{ base: "auto", md: "auto" }}
        mr={{ base: 0, md: 2 }}
        cursor="pointer"
        onClick={() => onSelectMenuItem(defaultMenuItem)}
      >
        <Image
          src="/images/logo.png"
          alt="Brand Logo"
          boxSize="36px"
          borderRadius="full"
          objectFit="cover"
          //border="2px solid"
          borderColor={useColorModeValue("blackAlpha.100", "whiteAlpha.300")}
        />
        <Text
          ml={2}
          fontWeight="extrabold"
          letterSpacing="wide"
          color={useColorModeValue("gray.800", "gray.100")}
        >
          PTIT
        </Text>
      </Flex>

      <SearchInput user={user as unknown as NavUser} />
      <RightContent user={user as unknown as NavUser} />
    </Flex>
  );
};
export default Navbar;
