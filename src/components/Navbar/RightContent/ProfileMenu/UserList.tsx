import React from "react";
import { Flex, Icon, MenuDivider, MenuItem } from "@chakra-ui/react";
// Firebase removed
import { CgProfile } from "react-icons/cg";
import { MdOutlineLogin } from "react-icons/md";
import { useResetRecoilState, useSetRecoilState } from "recoil";
import { communityState } from "../../../../atoms/communitiesAtom";
import { useRouter } from "next/router";
import nookies from "nookies";
import { request } from "../../../../services";
import { userState } from "../../../../atoms/userAtom";

type UserListProps = {};

const UserList: React.FC<UserListProps> = () => {
  const resetCommunityState = useResetRecoilState(communityState);
  const router = useRouter();

  const setCurrentUser = useSetRecoilState(userState);

  const logout = async () => {
    // Clear token cookie with proper options
    try {
      nookies.destroy(undefined, "token", { path: "/" });
      // Also try to clear with different path options to be sure
      nookies.set(undefined, "token", "", { 
        path: "/", 
        maxAge: -1, // immediately expire
        sameSite: "lax"
      });
    } catch (e) {
      // ignore
    }

    // Remove default Authorization header
    try {
      if (request && request.defaults && request.defaults.headers) {
        delete request.defaults.headers.common["Authorization"];
      }
    } catch (e) {}

    // Reset application state and user
    resetCommunityState();
    setCurrentUser(null);

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
