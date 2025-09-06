import React from "react";
import { Flex, Icon, MenuDivider, MenuItem } from "@chakra-ui/react";
// Firebase removed
import { CgProfile } from "react-icons/cg";
import { MdOutlineLogin } from "react-icons/md";
import { useResetRecoilState, useSetRecoilState } from "recoil";
import { communityState } from "../../../../atoms/communitiesAtom";
import { useRouter } from "next/router";
import { updateRequestToken } from "../../../../services/request"; // still used in extra just in case
import { clearGroupsCache } from "../../../../services/groups.service";
import { performLogout } from "../../../../helpers/logout";
import { userState } from "../../../../atoms/userAtom";

type UserListProps = {};

const UserList: React.FC<UserListProps> = () => {
  const resetCommunityState = useResetRecoilState(communityState);
  const router = useRouter();

  const setCurrentUser = useSetRecoilState(userState);

  const logout = async () => {
    await performLogout({
      redirect: (p) => router.push(p),
      targetPath: "/app",
      extra: async () => {
        try { updateRequestToken(""); } catch {}
        try { localStorage.removeItem("access_token"); } catch {}
        try { localStorage.removeItem("refresh_token"); } catch {}
        try { sessionStorage.removeItem("access_token"); } catch {}

        // Recoil resets
        try { resetCommunityState(); } catch {}
        try { setCurrentUser(null); } catch {}

        // Clear groups cache
        try { clearGroupsCache(); } catch {}

        // Placeholder: clear other states if exist (notifications, posts, etc.)
        // try { resetNotificationsState(); } catch {}
        // try { resetPostsState(); } catch {}

        // Placeholder: deactivate websocket/stomp if integrated
        // try { await stompClient?.deactivate(); } catch {}

        // Clear Cache Storage (Service Worker) & optional IndexedDB
        if (typeof window !== 'undefined' && 'caches' in window) {
          try {
            const keys = await caches.keys();
            await Promise.all(keys.map(k => caches.delete(k)));
          } catch {}
        }
        // Optional IndexedDB clear example:
        // try { indexedDB.deleteDatabase('app-db'); } catch {}

        // Analytics/monitoring placeholder
        // posthog?.reset?.();
        // Sentry?.setUser?.(null);
      }
    });
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