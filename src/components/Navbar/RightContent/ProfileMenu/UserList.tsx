import React from "react";
import { Flex, Icon, MenuDivider, MenuItem } from "@chakra-ui/react";
// Firebase removed
import { CgProfile } from "react-icons/cg";
import { MdOutlineLogin } from "react-icons/md";
import { useResetRecoilState } from "recoil";
import { communityState } from "../../../../atoms/communitiesAtom";
import { useRouter } from "next/router";

type UserListProps = {};

const UserList: React.FC<UserListProps> = () => {
  const resetCommunityState = useResetRecoilState(communityState);
  const router = useRouter();

  const logout = async () => {
    // TODO: Implement your own logout; for now reset state and go home
    resetCommunityState();
    router.push("/");
  };

  const handleProfileClick = () => {
    router.push("/profile");
  };

  return (
    <>
      <MenuItem
        fontSize="10pt"
        fontWeight={700}
        _hover={{ bg: "blue.500", color: "white" }}
        onClick={handleProfileClick}
      >
        <Flex alignItems="center">
          <Icon fontSize={20} mr={2} as={CgProfile} />
          Profile
        </Flex>
      </MenuItem>
      <MenuDivider />
      <MenuItem
        fontSize="10pt"
        fontWeight={700}
        _hover={{ bg: "blue.500", color: "white" }}
        onClick={logout}
      >
        <Flex alignItems="center">
          <Icon fontSize={20} mr={2} as={MdOutlineLogin} />
          Log Out
        </Flex>
      </MenuItem>
    </>
  );
};
export default UserList;
