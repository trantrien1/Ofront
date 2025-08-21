import React from "react";
import { Box, Flex, Image } from "@chakra-ui/react";
type NavUser = { uid: string; email?: string | null };
// Firebase removed
import { useSetRecoilState, useRecoilValue } from "recoil";
import { userState } from "../../atoms/userAtom";
import {
  defaultMenuItem,
  directoryMenuState,
} from "../../atoms/directoryMenuAtom";
// Firebase removed

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
      bg="white"
      height="44px"
      padding="6px 12px"
      justifyContent={{ md: "space-between" }}
    >
      <Flex
        align="center"
        width={{ base: "40px", md: "auto" }}
        mr={{ base: 0, md: 2 }}
        cursor="pointer"
        onClick={() => onSelectMenuItem(defaultMenuItem)}
      >
        <Image src="/images/redditFace.svg" height="30px" />
        <Image
          display={{ base: "none", md: "unset" }}
          src="/images/redditText.svg"
          height="46px"
        />
      </Flex>

      <SearchInput user={user as unknown as NavUser} />
      <RightContent user={user as unknown as NavUser} />
    </Flex>
  );
};
export default Navbar;
