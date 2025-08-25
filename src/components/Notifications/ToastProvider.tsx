import { useEffect } from 'react';
import { useToast } from '@chakra-ui/react';

// Mount-time NOP to ensure toast system initializes with ChakraProvider
export default function ToastProvider() {
  const toast = useToast();
  useEffect(() => {
    // No-op; ensures hook runs once so Chakra creates a manager on first use
  }, [toast]);
  return null;
}
