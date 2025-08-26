import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import {
  Container,
  VStack,
  Heading,
  Text,
  Box,
  Badge,
  Button,
  Alert,
  AlertIcon,
  Spinner,
  Flex,
  HStack,
  Avatar,
  Divider,
  useToast,
  Textarea,
  FormControl,
  FormLabel,
} from '@chakra-ui/react';
import nookies from 'nookies';

const ReportDetailPage: React.FC = () => {
  const router = useRouter();
  const { id } = router.query;
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<any>(null);
  const [actionNote, setActionNote] = useState('');

  // Check if user is admin via token cookie (JWT)
  const isAdmin = (() => {
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
      if (cookieRole && String(cookieRole).toLowerCase() === 'admin') return true;
      const token = cookies?.token as string | undefined;
      if (!token) return false;
      const payload: any = decodeJwt(token);
      const role = payload?.role || (Array.isArray(payload?.roles) ? payload.roles[0] : undefined) || (payload?.isAdmin ? 'admin' : undefined);
      return String(role || '').toLowerCase() === 'admin';
    } catch { return false; }
  })();

  useEffect(() => {
    if (!isAdmin) {
      router.replace('/no-access');
      return;
    }

    // Mock report data - replace with actual API call
    const mockReport = {
      id: id,
      type: 'inappropriate_content',
      postId: 123,
      postTitle: 'Controversial topic discussion',
      postContent: 'This is the content of the reported post. It might contain inappropriate content that needs to be reviewed.',
      reportedBy: 'user123',
      reportedByEmail: 'user123@example.com',
      reason: 'Spam content',
      description: 'This post contains spam links and is not relevant to the community.',
      createdAt: '2024-08-22T12:00:00Z',
      status: 'pending',
      priority: 'medium',
      category: 'content_violation',
      postAuthor: 'author123',
      postAuthorEmail: 'author123@example.com',
      postCreatedAt: '2024-08-20T10:30:00Z',
      communityId: 'r/programming',
    };

    setTimeout(() => {
      setReport(mockReport);
      setLoading(false);
    }, 1000);
  }, [id, isAdmin, router]);

  const handleAction = async (action: 'approve' | 'dismiss' | 'escalate') => {
    try {
      // TODO: Replace with actual API call
      // await updateReportStatus(Number(id), action);
      
      setReport({ ...report, status: action === 'approve' ? 'resolved' : action === 'dismiss' ? 'dismissed' : 'escalated' });
      
      toast({
        title: `Report ${action}d`,
        description: `The report has been ${action}d successfully.`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update report status.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'resolved': return 'green';
      case 'pending': return 'yellow';
      case 'dismissed': return 'red';
      case 'escalated': return 'orange';
      default: return 'gray';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'red';
      case 'medium': return 'orange';
      case 'low': return 'green';
      default: return 'gray';
    }
  };

  if (!isAdmin) {
    return (
      <Container maxW="7xl" py={8}>
        <Alert status="error">
          <AlertIcon />
          Access denied. Admin privileges required.
        </Alert>
      </Container>
    );
  }

  if (loading) {
    return (
      <Container maxW="7xl" py={8}>
        <VStack spacing={4} justify="center" minH="50vh">
          <Spinner size="xl" color="blue.500" />
          <Text>Loading report details...</Text>
        </VStack>
      </Container>
    );
  }

  if (!report) {
    return (
      <Container maxW="7xl" py={8}>
        <Alert status="warning">
          <AlertIcon />
          Report not found.
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxW="6xl" py={8}>
      <VStack spacing={6} align="stretch">
        {/* Header */}
        <Box>
          <Button
            variant="ghost"
            onClick={() => router.push('/admin')}
            mb={4}
          >
            ← Back to Admin Dashboard
          </Button>
          <Heading size="xl">Report Details</Heading>
          <Text color="gray.600">Report ID: {report.id}</Text>
        </Box>

        {/* Report Overview */}
        <Box
          border="1px"
          borderColor="gray.200"
          borderRadius="md"
          bg="white"
          shadow="sm"
        >
          <Box p={4} borderBottom="1px" borderColor="gray.200">
            <Heading size="md">Report Overview</Heading>
          </Box>
          <Box p={4}>
            <VStack align="stretch" spacing={4}>
              <Flex justify="space-between" wrap="wrap" gap={4}>
                <Box>
                  <Text fontWeight="bold">Status</Text>
                  <Badge colorScheme={getStatusColor(report.status)} fontSize="sm">
                    {report.status.toUpperCase()}
                  </Badge>
                </Box>
                <Box>
                  <Text fontWeight="bold">Priority</Text>
                  <Badge colorScheme={getPriorityColor(report.priority)} fontSize="sm">
                    {report.priority.toUpperCase()}
                  </Badge>
                </Box>
                <Box>
                  <Text fontWeight="bold">Type</Text>
                  <Badge colorScheme="blue" fontSize="sm">
                    {report.type.replace('_', ' ').toUpperCase()}
                  </Badge>
                </Box>
                <Box>
                  <Text fontWeight="bold">Category</Text>
                  <Badge colorScheme="purple" fontSize="sm">
                    {report.category.replace('_', ' ').toUpperCase()}
                  </Badge>
                </Box>
              </Flex>
              
              <Divider />
              
              <Box>
                <Text fontWeight="bold" mb={2}>Report Reason</Text>
                <Text>{report.reason}</Text>
              </Box>
              
              <Box>
                <Text fontWeight="bold" mb={2}>Detailed Description</Text>
                <Text>{report.description}</Text>
              </Box>

              <Box>
                <Text fontWeight="bold" mb={2}>Reported At</Text>
                <Text>{new Date(report.createdAt).toLocaleString()}</Text>
              </Box>
            </VStack>
          </Box>
        </Box>

        {/* Reporter Information */}
        <Box
          border="1px"
          borderColor="gray.200"
          borderRadius="md"
          bg="white"
          shadow="sm"
        >
          <Box p={4} borderBottom="1px" borderColor="gray.200">
            <Heading size="md">Reporter Information</Heading>
          </Box>
          <Box p={4}>
            <HStack spacing={4}>
              <Avatar name={report.reportedBy} />
              <VStack align="start" spacing={1}>
                <Text fontWeight="bold">{report.reportedBy}</Text>
                <Text color="gray.600">{report.reportedByEmail}</Text>
              </VStack>
            </HStack>
          </Box>
        </Box>

        {/* Reported Content */}
        <Box
          border="1px"
          borderColor="gray.200"
          borderRadius="md"
          bg="white"
          shadow="sm"
        >
          <Box p={4} borderBottom="1px" borderColor="gray.200">
            <Heading size="md">Reported Content</Heading>
          </Box>
          <Box p={4}>
            <VStack align="stretch" spacing={4}>
              <Box>
                <Text fontWeight="bold" mb={2}>Post Title</Text>
                <Text fontSize="lg">{report.postTitle}</Text>
              </Box>
              
              <Box>
                <Text fontWeight="bold" mb={2}>Post Content</Text>
                <Box
                  p={4}
                  bg="gray.50"
                  borderRadius="md"
                  border="1px"
                  borderColor="gray.200"
                >
                  <Text>{report.postContent}</Text>
                </Box>
              </Box>

              <Flex justify="space-between" wrap="wrap" gap={4}>
                <Box>
                  <Text fontWeight="bold">Author</Text>
                  <HStack spacing={2}>
                    <Avatar size="sm" name={report.postAuthor} />
                    <VStack align="start" spacing={0}>
                      <Text fontSize="sm">{report.postAuthor}</Text>
                      <Text fontSize="xs" color="gray.600">{report.postAuthorEmail}</Text>
                    </VStack>
                  </HStack>
                </Box>
                <Box>
                  <Text fontWeight="bold">Community</Text>
                  <Text>{report.communityId}</Text>
                </Box>
                <Box>
                  <Text fontWeight="bold">Post Created</Text>
                  <Text fontSize="sm">{new Date(report.postCreatedAt).toLocaleString()}</Text>
                </Box>
              </Flex>
            </VStack>
          </Box>
        </Box>

        {/* Admin Actions */}
        {report.status === 'pending' && (
          <Box
            border="1px"
            borderColor="gray.200"
            borderRadius="md"
            bg="white"
            shadow="sm"
          >
            <Box p={4} borderBottom="1px" borderColor="gray.200">
              <Heading size="md">Admin Actions</Heading>
            </Box>
            <Box p={4}>
              <VStack spacing={4}>
                <FormControl>
                  <FormLabel>Action Notes (Optional)</FormLabel>
                  <Textarea
                    value={actionNote}
                    onChange={(e) => setActionNote(e.target.value)}
                    placeholder="Add notes about your decision..."
                    rows={3}
                  />
                </FormControl>
                
                <HStack spacing={4} justify="center">
                  <Button
                    colorScheme="green"
                    onClick={() => handleAction('approve')}
                  >
                    Approve Report
                  </Button>
                  <Button
                    colorScheme="red"
                    onClick={() => handleAction('dismiss')}
                  >
                    Dismiss Report
                  </Button>
                  <Button
                    colorScheme="orange"
                    onClick={() => handleAction('escalate')}
                  >
                    Escalate
                  </Button>
                </HStack>
              </VStack>
            </Box>
          </Box>
        )}
      </VStack>
    </Container>
  );
};

export default ReportDetailPage;
