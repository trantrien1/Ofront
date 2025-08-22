import React from "react";
import { Flex } from "@chakra-ui/react";
type User = { uid: string; email?: string | null };
import AuthModal from "../../Modal/Auth";
import AuthButtons from "./AuthButtons";
import Icons from "./Icons";
import MenuWrapper from "./ProfileMenu/MenuWrapper";
import ChatDrawer, { useChatDrawer } from "./Chat/ChatDrawer";

type RightContentProps = {
  user: User;
};

const RightContent: React.FC<RightContentProps> = ({ user }) => {
  const chatDisclosure = useChatDrawer();
  return (
    <>
      <AuthModal />
      <Flex justifyContent="space-between" alignItems="center" gap={2}>
        {user ? <Icons onOpenChat={chatDisclosure.onOpen} /> : <AuthButtons />}        
        <MenuWrapper />
      </Flex>
      <ChatDrawer isOpen={chatDisclosure.isOpen} onClose={chatDisclosure.onClose} userId={user?.uid} />
    </>
  );
};
export default RightContent;
