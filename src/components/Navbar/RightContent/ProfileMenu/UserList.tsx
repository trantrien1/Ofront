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
import { updateRequestToken } from "../../../../services/request";
import { clearGroupsCache } from "../../../../services/groups.service";
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
      nookies.destroy(undefined, "role", { path: "/" });
      // Also try to clear with different path options to be sure
      nookies.set(undefined, "token", "", { 
        path: "/", 
        maxAge: -1, // immediately expire
        sameSite: "lax"
      });
      nookies.set(undefined, "role", "", { 
        path: "/", 
        maxAge: -1, // immediately expire
        sameSite: "lax"
      });
      // remove any NextAuth-like or fallback storage
      if (typeof window !== "undefined") {
        try { window.localStorage.removeItem("authToken"); } catch {}
        try { window.localStorage.removeItem("userState"); } catch {}
        try { window.localStorage.removeItem("managedGroups"); } catch {}
      }
    } catch (e) {
      // ignore
    }

    // Remove default Authorization header
    try {
      updateRequestToken("");
    } catch (e) {}

    // Invalidate any in-memory caches that depend on the user
    try { clearGroupsCache(); } catch {}

    // Reset application state and user
    resetCommunityState();
    setCurrentUser(null);
    // Navigate and force a soft reload to ensure all hooks/components re-evaluate quickly
    router.push("/");
  };

  const handleProfileClick = () => {
    router.push("/profile");
  };
  const handleSettingsClick = () => {
    router.push("/settings");
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
          Hồ sơ
        </Flex>
      </MenuItem>
      <MenuDivider />
      <MenuItem
        fontSize="10pt"
        fontWeight={700}
        _hover={{ bg: "blue.500", color: "white" }}
        onClick={handleSettingsClick}
      >
        <Flex alignItems="center">
          <Icon fontSize={20} mr={2} as={CgProfile} />
          Cài đặt
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
          Đăng xuất
        </Flex>
      </MenuItem>
    </>
  );
};
export default UserList;
