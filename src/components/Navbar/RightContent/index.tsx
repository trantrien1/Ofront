import React from "react";
import { Flex } from "@chakra-ui/react";
type User = { uid: string; email?: string | null };
import AuthModal from "../../Modal/Auth";
import AuthButtons from "./AuthButtons";
import Icons from "./Icons";
import MenuWrapper from "./ProfileMenu/MenuWrapper";

type RightContentProps = {
  user: User;
};

const RightContent: React.FC<RightContentProps> = ({ user }) => {
  return (
    <>
      <AuthModal />
      <Flex justifyContent="space-between" alignItems="center">
        {user ? <Icons /> : <AuthButtons />}
        <MenuWrapper />
      </Flex>
    </>
  );
};
export default RightContent;
