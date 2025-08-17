import React, { useEffect, useState } from "react";
import { Box } from "@chakra-ui/react";

interface ClientOnlyWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

const ClientOnlyWrapper: React.FC<ClientOnlyWrapperProps> = ({ 
  children, 
  fallback = <Box /> 
}) => {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

export default ClientOnlyWrapper;
