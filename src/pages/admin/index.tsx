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
import { useRecoilValue } from 'recoil';
import { userState, UserData } from '../../atoms/userAtom';

// List of admin emails - replace with your actual admin emails
const ADMIN_EMAILS = [
  'admin@example.com',
  'administrator@example.com',
  'admin@rehearten.com',
  // Add your admin emails here
];

const AdminIndex: React.FC = () => {
  const user = useRecoilValue(userState);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    // Simulate loading check
    const checkAuth = () => {
      if (!user) {
        // Redirect to login if not authenticated
        router.push('/');
        return;
      }

      // Check if user is admin by email
      const isAdmin = user.email && ADMIN_EMAILS.includes(user.email);

      if (!isAdmin) {
        // Redirect non-admin users
        router.push('/');
        return;
      }

      setIsAuthorized(true);
      setLoading(false);
    };

    // Add a small delay to prevent flash
    const timer = setTimeout(checkAuth, 500);
    return () => clearTimeout(timer);
  }, [user, router]);

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

  if (!user) {
    return (
      <Container maxW="7xl" py={8}>
        <Alert status="warning">
          <AlertIcon />
          <AlertTitle>Access Denied!</AlertTitle>
          <AlertDescription>
            You need to be logged in to access the admin panel.
          </AlertDescription>
        </Alert>
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
            You don't have permission to access the admin panel. Only administrators can access this area.
            <br />
            Current user: {(user as UserData)?.email || (user as UserData)?.displayName || 'Unknown'}
          </AlertDescription>
        </Alert>
      </Container>
    );
  }

  return <AdminDashboard />;
};

export default AdminIndex;
