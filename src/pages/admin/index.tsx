import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import {
  Container,
  Text,
  VStack,
  Spinner,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
} from '@chakra-ui/react';
import AdminDashboard from './dashboard';
import nookies from 'nookies';

const AdminIndex: React.FC = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const checkAuth = () => {
      // Client-side role check using token cookie (JWT)
      try {
        const decodeJwt = (token: string) => {
          try {
            const parts = token.split('.')
            if (parts.length < 2) return null;
            const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
            const decoded = typeof window !== 'undefined' && typeof window.atob === 'function' ? window.atob(b64) : Buffer.from(b64, 'base64').toString('binary');
            return JSON.parse(decoded);
          } catch { return null; }
        };
        const cookies = nookies.get(undefined);
        const cookieRole = (cookies?.role as string | undefined) || (cookies?.ROLE as string | undefined);
        if (cookieRole && String(cookieRole).toLowerCase() === 'admin') {
          setIsAuthorized(true);
          setLoading(false);
          return;
        }
        const token = cookies?.token as string | undefined;
        if (token) {
          const payload: any = decodeJwt(token);
          const role = payload?.role || (Array.isArray(payload?.roles) ? payload.roles[0] : undefined) || (payload?.isAdmin ? 'admin' : undefined);
          if (String(role || '').toLowerCase() === 'admin') {
            setIsAuthorized(true);
            setLoading(false);
            return;
          }
        }
        // Block non-admins early
        router.replace('/no-access');
        return;
      } catch {
        router.replace('/no-access');
      }
    };

    const timer = setTimeout(checkAuth, 100);
    return () => clearTimeout(timer);
  }, [router]);

  if (loading) {
    return (
      <Container maxW="7xl" py={8}>
        <VStack spacing={4} justify="center" minH="50vh">
          <Spinner size="xl" color="blue.500" />
          <Text>Loading admin panel...</Text>
        </VStack>
      </Container>
    );
  }

  if (!isAuthorized) {
    return (
      <Container maxW="7xl" py={8}>
        <Alert status="error">
          <AlertIcon />
          <AlertTitle>Access Denied!</AlertTitle>
          <AlertDescription>
            You don&apos;t have permission to access this area.
          </AlertDescription>
        </Alert>
      </Container>
    );
  }

  return <AdminDashboard />;
};

export default AdminIndex;
