import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Heading,
  Grid,
  GridItem,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Button,
  useToast,
  Flex,
  Text,
  Icon,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  VStack,
  HStack,
  Avatar,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  IconButton,
  Spinner,
} from '@chakra-ui/react';
import {
  FiUsers,
  FiFileText,
  FiMessageSquare,
  FiTrendingUp,
  FiMoreVertical,
  FiEdit,
  FiTrash2,
  FiEye,
  FiFlag,
} from 'react-icons/fi';
import { useRouter } from 'next/router';
import nookies from 'nookies';
import { getPendingPosts, approvePostById, type PendingPost } from '../../services/admin-approvals.service';

// Mock data - replace with real API calls
const mockStats = {
  totalUsers: 1250,
  totalPosts: 5430,
  totalComments: 12870,
  activeUsers: 340,
  usersGrowth: 12.5,
  postsGrowth: 8.3,
  commentsGrowth: 15.2,
  activeGrowth: 5.7,
};

const mockRecentPosts = [
  {
    id: 1,
    title: "Introduction to Web3 Development",
    author: "john_doe",
    community: "r/programming",
    likes: 125,
    comments: 23,
    createdAt: "2024-08-22T10:30:00Z",
    status: "published",
  },
  {
    id: 2,
    title: "Best practices for React hooks",
    author: "jane_smith",
    community: "r/reactjs",
    likes: 89,
    comments: 15,
    createdAt: "2024-08-22T09:15:00Z",
    status: "published",
  },
  {
    id: 3,
    title: "Understanding blockchain consensus",
    author: "crypto_guru",
    community: "r/blockchain",
    likes: 234,
    comments: 45,
    createdAt: "2024-08-22T08:45:00Z",
    status: "flagged",
  },
];

const mockRecentUsers = [
  {
    id: 1,
    username: "alex_developer",
    email: "alex@example.com",
    joinedAt: "2024-08-20T14:30:00Z",
    postsCount: 5,
    status: "active",
  },
  {
    id: 2,
    username: "sarah_designer",
    email: "sarah@example.com",
    joinedAt: "2024-08-21T16:20:00Z",
    postsCount: 2,
    status: "active",
  },
  {
    id: 3,
    username: "mike_student",
    email: "mike@example.com",
    joinedAt: "2024-08-22T11:10:00Z",
    postsCount: 0,
    status: "pending",
  },
];

const mockReports = [
  {
    id: 1,
    type: "inappropriate_content",
    postId: 123,
    postTitle: "Controversial topic discussion",
    reportedBy: "user123",
    reason: "Spam content",
    createdAt: "2024-08-22T12:00:00Z",
    status: "pending",
  },
  {
    id: 2,
    type: "harassment",
    postId: 456,
    postTitle: "Comment thread issue",
    reportedBy: "user456",
    reason: "Harassment in comments",
    createdAt: "2024-08-22T11:30:00Z",
    status: "reviewing",
  },
];

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState(mockStats);
  const [recentPosts, setRecentPosts] = useState(mockRecentPosts);
  const [recentUsers, setRecentUsers] = useState(mockRecentUsers);
  const [reports, setReports] = useState(mockReports);
  const [pendingPosts, setPendingPosts] = useState<PendingPost[]>([]);
  const [loadingPending, setLoadingPending] = useState(false);
  const [pendingError, setPendingError] = useState<any>(null);
  const toast = useToast();
  const router = useRouter();
  const [loadingGuard, setLoadingGuard] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  // Client-side guard: allow only admin from token cookie (JWT)
  useEffect(() => {
    const decodeJwt = (token: string) => {
      try {
        const parts = token.split('.')
        if (parts.length < 2) return null;
        const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const decoded = typeof window !== 'undefined' && typeof window.atob === 'function' ? window.atob(b64) : Buffer.from(b64, 'base64').toString('binary');
        return JSON.parse(decoded);
      } catch { return null; }
    };
    try {
      const cookies = nookies.get(undefined);
      const cookieRole = (cookies?.role as string | undefined) || (cookies?.ROLE as string | undefined);
      if (cookieRole && String(cookieRole).toLowerCase() === 'admin') {
        setIsAuthorized(true);
        setLoadingGuard(false);
        return;
      }
      const token = cookies?.token as string | undefined;
      if (token) {
        const payload: any = decodeJwt(token);
        const role = payload?.role || (Array.isArray(payload?.roles) ? payload.roles[0] : undefined) || (payload?.isAdmin ? 'admin' : undefined);
        if (String(role || '').toLowerCase() === 'admin') {
          setIsAuthorized(true);
          setLoadingGuard(false);
          return;
        }
      }
      router.replace('/no-access');
    } finally {
      setLoadingGuard(false);
    }
  }, [router]);

  useEffect(() => {
    // TODO: Fetch real data from APIs
    // fetchDashboardStats();
    // fetchRecentPosts();
    // fetchRecentUsers();
    // fetchReports();
    // Load pending posts when authorized
    const load = async () => {
      if (!isAuthorized) return;
      setLoadingPending(true);
      setPendingError(null);
      try {
        const list = await getPendingPosts();
        setPendingPosts(Array.isArray(list) ? list : []);
      } catch (e: any) {
        setPendingError(e?.response?.data || e?.message || String(e));
      } finally {
        setLoadingPending(false);
      }
    };
    load();
  }, [isAuthorized]);

  if (loadingGuard) {
    return (
      <Container maxW="7xl" py={8}>
        <VStack spacing={4} justify="center" minH="50vh">
          <Text>Checking access...</Text>
        </VStack>
      </Container>
    );
  }
  if (!isAuthorized) return null;

  const handlePostAction = (action: string, postId: number) => {
    toast({
      title: `Post ${action}`,
      description: `Post ${postId} has been ${action}`,
      status: "success",
      duration: 3000,
      isClosable: true,
    });
  };

  const handleUserAction = (action: string, userId: number) => {
    toast({
      title: `User ${action}`,
      description: `User ${userId} has been ${action}`,
      status: "success",
      duration: 3000,
      isClosable: true,
    });
  };

  const handleReportAction = (action: string, reportId: number) => {
    setReports(reports.map(report => 
      report.id === reportId 
        ? { ...report, status: action === 'approve' ? 'resolved' : 'dismissed' }
        : report
    ));
    
    toast({
      title: `Report ${action}d`,
      description: `Report ${reportId} has been ${action}d`,
      status: "success",
      duration: 3000,
      isClosable: true,
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published':
      case 'active':
      case 'resolved':
        return 'green';
      case 'flagged':
      case 'pending':
        return 'yellow';
      case 'reviewing':
        return 'blue';
      case 'dismissed':
        return 'red';
      default:
        return 'gray';
    }
  };

  return (
    <Container maxW="7xl" py={8}>
      <VStack spacing={8} align="stretch">
        {/* Header */}
        <Box>
          <Heading size="xl" mb={2}>Admin Dashboard</Heading>
          <Text color="gray.600">Manage your community platform</Text>
        </Box>

        {/* Stats Overview */}
        <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)", lg: "repeat(4, 1fr)" }} gap={6}>
          <Box
            border="1px"
            borderColor="gray.200"
            borderRadius="md"
            bg="white"
            shadow="sm"
            p={4}
          >
            <Stat>
              <Flex justify="space-between" align="center">
                <Box>
                  <StatLabel>Total Users</StatLabel>
                  <StatNumber>{stats.totalUsers.toLocaleString()}</StatNumber>
                  <StatHelpText>
                    <StatArrow type="increase" />
                    {stats.usersGrowth}%
                  </StatHelpText>
                </Box>
                <Icon as={FiUsers} boxSize={8} color="blue.500" />
              </Flex>
            </Stat>
          </Box>

          <Box
            border="1px"
            borderColor="gray.200"
            borderRadius="md"
            bg="white"
            shadow="sm"
            p={4}
          >
            <Stat>
              <Flex justify="space-between" align="center">
                <Box>
                  <StatLabel>Total Posts</StatLabel>
                  <StatNumber>{stats.totalPosts.toLocaleString()}</StatNumber>
                  <StatHelpText>
                    <StatArrow type="increase" />
                    {stats.postsGrowth}%
                  </StatHelpText>
                </Box>
                <Icon as={FiFileText} boxSize={8} color="green.500" />
              </Flex>
            </Stat>
          </Box>

          <Box
            border="1px"
            borderColor="gray.200"
            borderRadius="md"
            bg="white"
            shadow="sm"
            p={4}
          >
            <Stat>
              <Flex justify="space-between" align="center">
                <Box>
                  <StatLabel>Total Comments</StatLabel>
                  <StatNumber>{stats.totalComments.toLocaleString()}</StatNumber>
                  <StatHelpText>
                    <StatArrow type="increase" />
                    {stats.commentsGrowth}%
                  </StatHelpText>
                </Box>
                <Icon as={FiMessageSquare} boxSize={8} color="purple.500" />
              </Flex>
            </Stat>
          </Box>

          <Box
            border="1px"
            borderColor="gray.200"
            borderRadius="md"
            bg="white"
            shadow="sm"
            p={4}
          >
            <Stat>
              <Flex justify="space-between" align="center">
                <Box>
                  <StatLabel>Active Users</StatLabel>
                  <StatNumber>{stats.activeUsers}</StatNumber>
                  <StatHelpText>
                    <StatArrow type="increase" />
                    {stats.activeGrowth}%
                  </StatHelpText>
                </Box>
                <Icon as={FiTrendingUp} boxSize={8} color="orange.500" />
              </Flex>
            </Stat>
          </Box>
        </Grid>

        {/* Main Content Tabs */}
        <Tabs variant="enclosed">
          <TabList>
            <Tab>Recent Posts</Tab>
            <Tab>Recent Users</Tab>
            <Tab>Reports</Tab>
            <Tab>Duyệt bài</Tab>
          </TabList>

          <TabPanels>
            {/* Recent Posts Tab */}
            <TabPanel px={0}>
              <Box
                border="1px"
                borderColor="gray.200"
                borderRadius="md"
                bg="white"
                shadow="sm"
              >
                <Box p={4} borderBottom="1px" borderColor="gray.200">
                  <Heading size="md">Recent Posts</Heading>
                </Box>
                <Box>
                  <Table variant="simple">
                    <Thead>
                      <Tr>
                        <Th>Title</Th>
                        <Th>Author</Th>
                        <Th>Community</Th>
                        <Th>Engagement</Th>
                        <Th>Status</Th>
                        <Th>Actions</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {recentPosts.map((post) => (
                        <Tr key={post.id}>
                          <Td>
                            <Text fontWeight="medium" noOfLines={1}>
                              {post.title}
                            </Text>
                            <Text fontSize="sm" color="gray.500">
                              {new Date(post.createdAt).toLocaleDateString()}
                            </Text>
                          </Td>
                          <Td>{post.author}</Td>
                          <Td>{post.community}</Td>
                          <Td>
                            <VStack align="start" spacing={0}>
                              <Text fontSize="sm">{post.likes} likes</Text>
                              <Text fontSize="sm">{post.comments} comments</Text>
                            </VStack>
                          </Td>
                          <Td>
                            <Badge colorScheme={getStatusColor(post.status)}>
                              {post.status}
                            </Badge>
                          </Td>
                          <Td>
                            <Menu>
                              <MenuButton
                                as={IconButton}
                                icon={<FiMoreVertical />}
                                variant="ghost"
                                size="sm"
                              />
                              <MenuList>
                                <MenuItem icon={<FiEye />} onClick={() => handlePostAction('viewed', post.id)}>
                                  View Details
                                </MenuItem>
                                <MenuItem icon={<FiEdit />} onClick={() => handlePostAction('edited', post.id)}>
                                  Edit Post
                                </MenuItem>
                                <MenuItem icon={<FiFlag />} onClick={() => handlePostAction('flagged', post.id)}>
                                  Flag Post
                                </MenuItem>
                                <MenuItem icon={<FiTrash2 />} color="red.500" onClick={() => handlePostAction('deleted', post.id)}>
                                  Delete Post
                                </MenuItem>
                              </MenuList>
                            </Menu>
                          </Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                </Box>
              </Box>
            </TabPanel>

            {/* Recent Users Tab */}
            <TabPanel px={0}>
              <Box
                border="1px"
                borderColor="gray.200"
                borderRadius="md"
                bg="white"
                shadow="sm"
              >
                <Box p={4} borderBottom="1px" borderColor="gray.200">
                  <Heading size="md">Recent Users</Heading>
                </Box>
                <Box>
                  <Table variant="simple">
                    <Thead>
                      <Tr>
                        <Th>User</Th>
                        <Th>Email</Th>
                        <Th>Joined</Th>
                        <Th>Posts</Th>
                        <Th>Status</Th>
                        <Th>Actions</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {recentUsers.map((user) => (
                        <Tr key={user.id}>
                          <Td>
                            <HStack>
                              <Avatar size="sm" name={user.username} />
                              <Text fontWeight="medium">{user.username}</Text>
                            </HStack>
                          </Td>
                          <Td>{user.email}</Td>
                          <Td>{new Date(user.joinedAt).toLocaleDateString()}</Td>
                          <Td>{user.postsCount}</Td>
                          <Td>
                            <Badge colorScheme={getStatusColor(user.status)}>
                              {user.status}
                            </Badge>
                          </Td>
                          <Td>
                            <Menu>
                              <MenuButton
                                as={IconButton}
                                icon={<FiMoreVertical />}
                                variant="ghost"
                                size="sm"
                              />
                              <MenuList>
                                <MenuItem icon={<FiEye />} onClick={() => handleUserAction('viewed', user.id)}>
                                  View Profile
                                </MenuItem>
                                <MenuItem icon={<FiEdit />} onClick={() => handleUserAction('edited', user.id)}>
                                  Edit User
                                </MenuItem>
                                <MenuItem icon={<FiFlag />} onClick={() => handleUserAction('suspended', user.id)}>
                                  Suspend User
                                </MenuItem>
                                <MenuItem icon={<FiTrash2 />} color="red.500" onClick={() => handleUserAction('deleted', user.id)}>
                                  Delete User
                                </MenuItem>
                              </MenuList>
                            </Menu>
                          </Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                </Box>
              </Box>
            </TabPanel>

            {/* Reports Tab */}
            <TabPanel px={0}>
              <Box
                border="1px"
                borderColor="gray.200"
                borderRadius="md"
                bg="white"
                shadow="sm"
              >
                <Box p={4} borderBottom="1px" borderColor="gray.200">
                  <Heading size="md">Recent Reports</Heading>
                </Box>
                <Box>
                  <Table variant="simple">
                    <Thead>
                      <Tr>
                        <Th>Type</Th>
                        <Th>Post</Th>
                        <Th>Reported By</Th>
                        <Th>Reason</Th>
                        <Th>Date</Th>
                        <Th>Status</Th>
                        <Th>Actions</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {reports.map((report) => (
                        <Tr key={report.id}>
                          <Td>
                            <Badge colorScheme="orange">
                              {report.type.replace('_', ' ')}
                            </Badge>
                          </Td>
                          <Td>
                            <Text fontWeight="medium" noOfLines={1}>
                              {report.postTitle}
                            </Text>
                            <Text fontSize="sm" color="gray.500">
                              ID: {report.postId}
                            </Text>
                          </Td>
                          <Td>{report.reportedBy}</Td>
                          <Td>{report.reason}</Td>
                          <Td>{new Date(report.createdAt).toLocaleDateString()}</Td>
                          <Td>
                            <Badge colorScheme={getStatusColor(report.status)}>
                              {report.status}
                            </Badge>
                          </Td>
                          <Td>
                            <HStack spacing={2}>
                              {report.status === 'pending' && (
                                <>
                                  <Button
                                    size="sm"
                                    colorScheme="green"
                                    onClick={() => handleReportAction('approve', report.id)}
                                  >
                                    Approve
                                  </Button>
                                  <Button
                                    size="sm"
                                    colorScheme="red"
                                    onClick={() => handleReportAction('dismiss', report.id)}
                                  >
                                    Dismiss
                                  </Button>
                                </>
                              )}
                              <IconButton
                                icon={<FiEye />}
                                size="sm"
                                variant="ghost"
                                aria-label="View details"
                                onClick={() => router.push(`/admin/reports/${report.id}`)}
                              />
                            </HStack>
                          </Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                </Box>
              </Box>
            </TabPanel>

            {/* Pending Posts (Approval) Tab */}
            <TabPanel px={0}>
              <Box
                border="1px"
                borderColor="gray.200"
                borderRadius="md"
                bg="white"
                shadow="sm"
              >
                <Box p={4} borderBottom="1px" borderColor="gray.200">
                  <HStack justify="space-between">
                    <Heading size="md">Bài viết chờ duyệt</Heading>
                    <Button size="sm" onClick={async () => {
                      setLoadingPending(true);
                      setPendingError(null);
                      try {
                        const list = await getPendingPosts();
                        setPendingPosts(Array.isArray(list) ? list : []);
                      } catch (e: any) {
                        setPendingError(e?.response?.data || e?.message || String(e));
                      } finally {
                        setLoadingPending(false);
                      }
                    }} isLoading={loadingPending}>
                      Làm mới
                    </Button>
                  </HStack>
                </Box>
                {pendingError && (
                  <Box m={4} p={3} borderWidth="1px" borderRadius="md" bg="red.50" borderColor="red.200">
                    <Text fontWeight="bold" mb={1}>Không tải được danh sách</Text>
                    <Text fontSize="sm" whiteSpace="pre-wrap">{typeof pendingError === 'string' ? pendingError : JSON.stringify(pendingError, null, 2)}</Text>
                  </Box>
                )}
                <Box>
                  <Table variant="simple">
                    <Thead>
                      <Tr>
                        <Th>ID</Th>
                        <Th>Tiêu đề</Th>
                        <Th>Tác giả</Th>
                        <Th>Nhóm</Th>
                        <Th>Trạng thái</Th>
                        <Th>Hành động</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {(!pendingPosts || pendingPosts.length === 0) && (
                        <Tr>
                          <Td colSpan={6}>
                            <VStack py={8}>
                              {loadingPending ? <Spinner /> : <Text>Không có bài chờ duyệt.</Text>}
                            </VStack>
                          </Td>
                        </Tr>
                      )}
                      {pendingPosts && pendingPosts.map((p: any) => {
                        const author = p?.userOfPost?.username;
                        const group = p?.groupOfPost?.name || 'Cộng đồng';
                        const title = p?.title || '(Không có tiêu đề)';
                        return (
                          <Tr key={String(p.id)}>
                            <Td>{String(p.id)}</Td>
                            <Td maxW="360px"><Text noOfLines={2}>{title}</Text></Td>
                            <Td>{author}</Td>
                            <Td>{group}</Td>
                            <Td><Badge colorScheme="yellow">Chờ duyệt</Badge></Td>
                            <Td>
                <Button size="sm" colorScheme="green" onClick={async () => {
                                try {
                  await approvePostById(p.id, p?.groupOfPost?.id ?? p?.group?.id);
                                  setPendingPosts(prev => prev.filter(x => String(x.id) !== String(p.id)));
                                  toast({ title: 'Đã duyệt bài', description: `ID ${p.id}`, status: 'success', duration: 2500, isClosable: true });
                                } catch (e: any) {
                                  console.error('approve failed', e);
                                  const msg = e?.response?.data ? JSON.stringify(e.response.data) : (e?.message || 'Lỗi không xác định');
                                  toast({ title: 'Duyệt thất bại', description: msg, status: 'error', duration: 3500, isClosable: true });
                                }
                              }}>Duyệt</Button>
                            </Td>
                          </Tr>
                        );
                      })}
                    </Tbody>
                  </Table>
                </Box>
              </Box>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </VStack>
    </Container>
  );
};

export default AdminDashboard;
