import React from "react";
import { Box, Button, Text } from "@chakra-ui/react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../../firebase/clientApp";
import { useCommunityPermissions } from "../../hooks/useCommunityPermissions";

interface TestManagementProps {
  communityId: string;
}

const TestManagement: React.FC<TestManagementProps> = ({ communityId }) => {
  const [user] = useAuthState(auth);
  const { getUserRole, canModerate, canManageRoles, canBanUsers } = useCommunityPermissions();

  if (!user) return null;

  const userRole = getUserRole(communityId);

  return (
    <Box p={4} border="1px solid" borderColor="gray.200" borderRadius="md" mb={4}>
      <Text fontSize="lg" fontWeight="bold" mb={2}>
        Community Management Test
      </Text>
      <Text fontSize="sm" mb={2}>
        Your role: <strong>{userRole}</strong>
      </Text>
      <Text fontSize="sm" mb={2}>
        Can moderate: <strong>{canModerate(communityId) ? "Yes" : "No"}</strong>
      </Text>
      <Text fontSize="sm" mb={2}>
        Can manage roles: <strong>{canManageRoles(communityId) ? "Yes" : "No"}</strong>
      </Text>
      <Text fontSize="sm" mb={2}>
        Can ban users: <strong>{canBanUsers(communityId) ? "Yes" : "No"}</strong>
      </Text>
    </Box>
  );
};

export default TestManagement;
