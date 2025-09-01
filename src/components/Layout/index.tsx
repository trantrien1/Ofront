import React, { useState } from "react";
import { Box, Flex, useColorModeValue } from "@chakra-ui/react";
import { useRecoilValue } from "recoil";
// Firebase removed
import { createCommunityModalState } from "../../atoms/communitiesAtom";
import useAuth from "../../hooks/useAuth";
import { useSetRecoilState } from "recoil";
import Navbar from "../Navbar";
import Sidebar from "./Sidebar";
import AuthModal from "../Modal/Auth";
import CreateCommunityModal from "../Modal/CreateCommunity";
import ClientOnlyWrapper from "./ClientOnlyWrapper";
import { SidebarContext } from "./SidebarContext";

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Always call hooks; useAuth internally guards side-effects and returns the current user
  const { user } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const createCommunityModalStateValue = useRecoilValue(createCommunityModalState);
  const setCreateCommunityModal = useSetRecoilState(createCommunityModalState);

  return (
    <SidebarContext.Provider value={{ isCollapsed, setIsCollapsed }}>
      <ClientOnlyWrapper>
        <Box>
          {/* Top Header/Navbar */}
          <Box
            position="fixed"
            top={0}
            left={0}
            right={0}
            zIndex={1600}
            bg={{ base: "white", _dark: "gray.800" }}
            borderBottom="1px solid"
            borderColor={useColorModeValue("gray.300", "whiteAlpha.400")} // thanh duoi header
          >
            <Navbar />
          </Box>

      {/* Main Layout: content scrolls below the 44px Header */}
      <Flex minH="100vh" pt="44px">
            <Sidebar />
            <Box 
              zIndex={900}
              flex={1} 
              ml={isCollapsed ? "80px" : "280px"} 
              bg={{ base: "gray.50", _dark: "gray.900" }}
        transition="margin-left 0.3s ease"
        position="relative"
        h="calc(100vh - 44px)"
        overflowY="auto"
            >
              {children}
            </Box>
          </Flex>
          
          <AuthModal />
          {user && (
            <CreateCommunityModal
              isOpen={createCommunityModalStateValue.open}
              handleClose={() => setCreateCommunityModal({ open: false })}
              userId={user.uid}
            />
          )}
        </Box>
      </ClientOnlyWrapper>
    </SidebarContext.Provider>
  );
};

export default Layout;
