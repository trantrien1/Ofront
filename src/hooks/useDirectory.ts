import { useRouter } from "next/router";
import React, { useEffect } from "react";
import { useRecoilState, useRecoilValue } from "recoil";
import { communityState } from "../atoms/communitiesAtom";
import {
  defaultMenuItem,
  DirectoryMenuItem,
  directoryMenuState,
} from "../atoms/directoryMenuAtom";
import { FaReddit } from "react-icons/fa";

const useDirectory = () => {
  const [directoryState, setDirectoryState] =
    useRecoilState(directoryMenuState);
  const router = useRouter();

  const communityStateValue = useRecoilValue(communityState);

  const onSelectMenuItem = (menuItem: DirectoryMenuItem) => {
    setDirectoryState((prev) => ({
      ...prev,
      selectedMenuItem: menuItem,
    }));

    router?.push(menuItem.link);
    if (directoryState.isOpen) {
      toggleMenuOpen();
    }
  };

  const toggleMenuOpen = () => {
    setDirectoryState((prev) => ({
      ...prev,
      isOpen: !directoryState.isOpen,
    }));
  };

  useEffect(() => {
    const existingCommunity = communityStateValue.currentCommunity;

    // Nếu chưa có community thì chọn default menu
    if (!existingCommunity || !existingCommunity.id) {
      setDirectoryState((prev) => ({
        ...prev,
        selectedMenuItem: defaultMenuItem,
      }));
      return;
    }

    // Nếu có community thì chọn nó
    setDirectoryState((prev) => ({
      ...prev,
      selectedMenuItem: {
        displayText: `r/${existingCommunity.displayName || existingCommunity.id}`,
        link: `/r/${existingCommunity.id}`, // thêm dấu "/" để router push đúng
        icon: FaReddit,
        iconColor: "blue.500",
        imageURL: existingCommunity.imageURL,
      },
    }));
  }, [communityStateValue.currentCommunity, setDirectoryState]);

  return { directoryState, onSelectMenuItem, toggleMenuOpen };
};

export default useDirectory;
