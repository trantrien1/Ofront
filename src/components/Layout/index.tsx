import React, { createContext, useContext, useState } from "react";
import { Box, Flex } from "@chakra-ui/react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../../firebase/clientApp";
import useAuth from "../../hooks/useAuth";
import Sidebar from "./Sidebar";
import AuthModal from "../Modal/Auth";

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

  return (
    <SidebarContext.Provider value={{ isCollapsed, setIsCollapsed }}>
      <Flex minH="100vh">
        <Sidebar />
        <Box 
          flex={1} 
          ml={isCollapsed ? "80px" : "280px"} 
          bg="gray.50"
          transition="margin-left 0.3s ease"
        >
          {children}
        </Box>
        <AuthModal />
      </Flex>
    </SidebarContext.Provider>
  );
};

export default Layout;
