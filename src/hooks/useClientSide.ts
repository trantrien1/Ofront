import { useEffect, useState } from "react";

/**
 * Hook to check if component is mounted on client-side
 * Helps prevent hydration mismatch errors
 */
export const useClientSide = () => {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return isClient;
};

export default useClientSide;
