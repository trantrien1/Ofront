import React, { createContext, useContext, useState } from "react";
import { Box, Flex } from "@chakra-ui/react";
// import { useAuthState } from "react-firebase-hooks/auth";
import { useRecoilValue } from "recoil";
// Firebase removed
import { createCommunityModalState } from "../../atoms/communitiesAtom";
import useAuth from "../../hooks/useAuth";
import Navbar from "../Navbar";
import Sidebar from "./Sidebar";
import AuthModal from "../Modal/Auth";
import CreateCommunityModal from "../Modal/CreateCommunity";
import ClientOnlyWrapper from "./ClientOnlyWrapper";

// Create context for sidebar state
const SidebarContext = createContext<{
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
}>({
  isCollapsed: false,
  setIsCollapsed: () => {},
});

export const useSidebar = () => useContext(SidebarContext);

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // useAuth(); // will implement later at end of tutorial
  const [isCollapsed, setIsCollapsed] = useState(false);
  const user = null as any;
  const createCommunityModalStateValue = useRecoilValue(createCommunityModalState);

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
            zIndex={1001}
            bg="white"
            borderBottom="1px solid"
            borderColor="gray.200"
          >
            <Navbar />
          </Box>

          {/* Main Layout */}
          <Flex minH="100vh" pt="44px"> {/* Add top padding for fixed header */}
            <Sidebar />
            <Box 
              flex={1} 
              ml={isCollapsed ? "80px" : "280px"} 
              bg="gray.50"
              transition="margin-left 0.3s ease"
            >
              {children}
            </Box>
          </Flex>
          
          <AuthModal />
          {user && (
            <CreateCommunityModal
              isOpen={createCommunityModalStateValue.open}
              handleClose={() => {}}
              userId={user.uid}
            />
          )}
        </Box>
      </ClientOnlyWrapper>
    </SidebarContext.Provider>
  );
};

export default Layout;
