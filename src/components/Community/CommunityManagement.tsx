import React, { useState } from "react";
import {
  Box,
  Button,
  Flex,
  Icon,
  Stack,
  Text,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  Input,
  Textarea,
  Select,
  VStack,
  HStack,
  Badge,
  Divider,
  Alert,
  AlertIcon,
  useToast,
  Image,
  Avatar,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  IconButton,
} from "@chakra-ui/react";
import { 
  FaUsers, 
  FaGavel, 
  FaBan, 
  FaEdit, 
  FaTrash, 
  FaPlus,
  FaCrown,
  FaShieldAlt,
  FaUserShield,
  FaUser
} from "react-icons/fa";
import { HiOutlineDotsHorizontal } from "react-icons/hi";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, firestore } from "../../firebase/clientApp";
import { 
  Community, 
  CommunityRole, 
  CommunityMember, 
  CommunityRule, 
  BannedUser 
} from "../../atoms/communitiesAtom";
import { doc, updateDoc, arrayUnion, arrayRemove, Timestamp, increment } from "firebase/firestore";
import { useRecoilValue } from "recoil";
import { communityState } from "../../atoms/communitiesAtom";

interface CommunityManagementProps {
  communityData: Community;
}

const CommunityManagement: React.FC<CommunityManagementProps> = ({ communityData }) => {
  const [user] = useAuthState(auth);
  const toast = useToast();
  const communityStateValue = useRecoilValue(communityState);
  
  // Modals
  const { isOpen: isRulesOpen, onOpen: onRulesOpen, onClose: onRulesClose } = useDisclosure();
  const { isOpen: isMembersOpen, onOpen: onMembersOpen, onClose: onMembersClose } = useDisclosure();
  const { isOpen: isBannedOpen, onOpen: onBannedOpen, onClose: onBannedClose } = useDisclosure();
  
  // Form states
  const [newRule, setNewRule] = useState({ title: "", description: "" });
  const [editingRule, setEditingRule] = useState<CommunityRule | null>(null);
  const [banUser, setBanUser] = useState({ userId: "", reason: "" });
  const [description, setDescription] = useState(communityData.description || "");
  const [newMember, setNewMember] = useState({ userId: "", role: "member" as CommunityRole });

  // Check if user has admin permissions
  const userRole = communityData.members?.find(m => m.userId === user?.uid)?.role || "member";
  const isOwner = user?.uid === communityData.creatorId;
  const isAdmin = isOwner || userRole === "admin" || userRole === "moderator";
  const canManageRoles = isOwner || userRole === "admin";
  const canBanUsers = isOwner || userRole === "admin" || userRole === "moderator";

  if (!isAdmin) return null;

  const handleUpdateDescription = async () => {
    try {
      await updateDoc(doc(firestore, "communities", communityData.id), {
        description: description
      });
      toast({
        title: "Description updated",
        status: "success",
        duration: 3000,
      });
    } catch (error) {
      toast({
        title: "Error updating description",
        status: "error",
        duration: 3000,
      });
    }
  };

  const handleAddRule = async () => {
    if (!newRule.title || !newRule.description) return;
    
    try {
      const rule: CommunityRule = {
        id: Date.now().toString(),
        title: newRule.title,
        description: newRule.description,
        order: (communityData.rules?.length || 0) + 1
      };
      
      await updateDoc(doc(firestore, "communities", communityData.id), {
        rules: arrayUnion(rule)
      });
      
      setNewRule({ title: "", description: "" });
      toast({
        title: "Rule added",
        status: "success",
        duration: 3000,
      });
    } catch (error) {
      toast({
        title: "Error adding rule",
        status: "error",
        duration: 3000,
      });
    }
  };

  const handleUpdateRule = async () => {
    if (!editingRule) return;
    
    try {
      const updatedRules = communityData.rules?.map(rule => 
        rule.id === editingRule.id ? editingRule : rule
      ) || [];
      
      await updateDoc(doc(firestore, "communities", communityData.id), {
        rules: updatedRules
      });
      
      setEditingRule(null);
      toast({
        title: "Rule updated",
        status: "success",
        duration: 3000,
      });
    } catch (error) {
      toast({
        title: "Error updating rule",
        status: "error",
        duration: 3000,
      });
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    try {
      const updatedRules = communityData.rules?.filter(rule => rule.id !== ruleId) || [];
      await updateDoc(doc(firestore, "communities", communityData.id), {
        rules: updatedRules
      });
      
      toast({
        title: "Rule deleted",
        status: "success",
        duration: 3000,
      });
    } catch (error) {
      toast({
        title: "Error deleting rule",
        status: "error",
        duration: 3000,
      });
    }
  };

  const handleBanUser = async () => {
    if (!banUser.userId || !banUser.reason) return;
    
    try {
      const bannedUser: BannedUser = {
        userId: banUser.userId,
        bannedAt: Timestamp.now(),
        bannedBy: user?.uid || "",
        reason: banUser.reason,
        displayName: communityData.members?.find(m => m.userId === banUser.userId)?.displayName,
        imageURL: communityData.members?.find(m => m.userId === banUser.userId)?.imageURL
      };
      
      await updateDoc(doc(firestore, "communities", communityData.id), {
        bannedUsers: arrayUnion(bannedUser)
      });
      
      setBanUser({ userId: "", reason: "" });
      toast({
        title: "User banned",
        status: "success",
        duration: 3000,
      });
    } catch (error) {
      toast({
        title: "Error banning user",
        status: "error",
        duration: 3000,
      });
    }
  };

  const handleUnbanUser = async (userId: string) => {
    try {
      const updatedBannedUsers = communityData.bannedUsers?.filter(banned => banned.userId !== userId) || [];
      await updateDoc(doc(firestore, "communities", communityData.id), {
        bannedUsers: updatedBannedUsers
      });
      
      toast({
        title: "User unbanned",
        status: "success",
        duration: 3000,
      });
    } catch (error) {
      toast({
        title: "Error unbanning user",
        status: "error",
        duration: 3000,
      });
    }
  };

  const handleUpdateRole = async (userId: string, newRole: CommunityRole) => {
    if (!canManageRoles) return;
    
    try {
      const updatedMembers = communityData.members?.map(member => 
        member.userId === userId ? { ...member, role: newRole } : member
      ) || [];
      
      await updateDoc(doc(firestore, "communities", communityData.id), {
        members: updatedMembers
      });
      
      toast({
        title: "Role updated",
        status: "success",
        duration: 3000,
      });
    } catch (error) {
      toast({
        title: "Error updating role",
        status: "error",
        duration: 3000,
      });
    }
  };

  const handleAddMember = async () => {
    if (!newMember.userId.trim() || !canManageRoles) return;
    
    try {
      const memberToAdd: CommunityMember = {
        userId: newMember.userId,
        role: newMember.role,
        joinedAt: Timestamp.now(),
        displayName: newMember.userId, // You might want to fetch user data here
        imageURL: ""
      };
      
      await updateDoc(doc(firestore, "communities", communityData.id), {
        members: arrayUnion(memberToAdd),
        numberOfMembers: increment(1)
      });
      
      setNewMember({ userId: "", role: "member" });
      toast({
        title: "Member added",
        status: "success",
        duration: 3000,
      });
    } catch (error) {
      toast({
        title: "Error adding member",
        status: "error",
        duration: 3000,
      });
    }
  };

  const getRoleIcon = (role: CommunityRole) => {
    switch (role) {
      case "owner": return FaCrown;
      case "admin": return FaShieldAlt;
      case "moderator": return FaUserShield;
      default: return FaUser;
    }
  };

  const getRoleColor = (role: CommunityRole) => {
    switch (role) {
      case "owner": return "yellow";
      case "admin": return "red";
      case "moderator": return "blue";
      default: return "gray";
    }
  };

  const formatTimestamp = (timestamp: any) => {
    if (!timestamp) return 'Unknown date';
    if (timestamp.toDate && typeof timestamp.toDate === 'function') {
      return timestamp.toDate().toLocaleDateString();
    }
    if (timestamp instanceof Date) {
      return timestamp.toLocaleDateString();
    }
    if (typeof timestamp === 'number') {
      return new Date(timestamp).toLocaleDateString();
    }
    return 'Unknown date';
  };

  return (
    <Box pt={0} position="sticky" top="14px">
      <Flex
        justify="space-between"
        align="center"
        p={3}
        color="white"
        bg="blue.500"
        borderRadius="4px 4px 0px 0px"
      >
        <Text fontSize="10pt" fontWeight={700}>
          Community Management
        </Text>
        <Icon as={HiOutlineDotsHorizontal} cursor="pointer" />
      </Flex>
      
      <Flex direction="column" p={3} bg="white" borderRadius="0px 0px 4px 4px">
        <Stack spacing={3}>
          {/* Description Management */}
          <Box>
            <Text fontSize="10pt" fontWeight={600} mb={2}>
              Community Description
            </Text>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a description for your community..."
              size="sm"
              mb={2}
            />
            <Button size="sm" onClick={handleUpdateDescription}>
              Update Description
            </Button>
          </Box>
          
          <Divider />
          
          {/* Management Buttons */}
          <Stack spacing={2}>
            <Button
              leftIcon={<FaGavel />}
              variant="outline"
              size="sm"
              onClick={onRulesOpen}
            >
              Manage Rules
            </Button>
            
            <Button
              leftIcon={<FaUsers />}
              variant="outline"
              size="sm"
              onClick={onMembersOpen}
            >
              Manage Members
            </Button>
            
            {canBanUsers && (
              <Button
                leftIcon={<FaBan />}
                variant="outline"
                size="sm"
                onClick={onBannedOpen}
              >
                Banned Users
              </Button>
            )}
          </Stack>
        </Stack>
      </Flex>

      {/* Rules Modal */}
      <Modal isOpen={isRulesOpen} onClose={onRulesClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Community Rules</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4} align="stretch">
              {/* Add New Rule */}
              <Box p={4} border="1px solid" borderColor="gray.200" borderRadius="md">
                <Text fontWeight={600} mb={2}>Add New Rule</Text>
                <Input
                  placeholder="Rule title"
                  value={newRule.title}
                  onChange={(e) => setNewRule(prev => ({ ...prev, title: e.target.value }))}
                  mb={2}
                />
                <Textarea
                  placeholder="Rule description"
                  value={newRule.description}
                  onChange={(e) => setNewRule(prev => ({ ...prev, description: e.target.value }))}
                  mb={2}
                />
                <Button size="sm" onClick={handleAddRule}>
                  Add Rule
                </Button>
              </Box>

              {/* Existing Rules */}
              {communityData.rules?.map((rule) => (
                <Box key={rule.id} p={4} border="1px solid" borderColor="gray.200" borderRadius="md">
                  {editingRule?.id === rule.id ? (
                    <VStack align="stretch">
                      <Input
                        value={editingRule.title}
                        onChange={(e) => setEditingRule(prev => prev ? { ...prev, title: e.target.value } : null)}
                      />
                      <Textarea
                        value={editingRule.description}
                        onChange={(e) => setEditingRule(prev => prev ? { ...prev, description: e.target.value } : null)}
                      />
                      <HStack>
                        <Button size="sm" onClick={handleUpdateRule}>Save</Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingRule(null)}>Cancel</Button>
                      </HStack>
                    </VStack>
                  ) : (
                    <VStack align="stretch">
                      <HStack justify="space-between">
                        <Text fontWeight={600}>{rule.title}</Text>
                        <HStack>
                          <IconButton
                            aria-label="Edit rule"
                            icon={<FaEdit />}
                            size="sm"
                            onClick={() => setEditingRule(rule)}
                          />
                          <IconButton
                            aria-label="Delete rule"
                            icon={<FaTrash />}
                            size="sm"
                            onClick={() => handleDeleteRule(rule.id)}
                          />
                        </HStack>
                      </HStack>
                      <Text fontSize="sm">{rule.description}</Text>
                    </VStack>
                  )}
                </Box>
              ))}
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* Members Modal */}
      <Modal isOpen={isMembersOpen} onClose={onMembersClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Community Members</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4} align="stretch">
              {/* Community Owner */}
              <Box p={4} border="1px solid" borderColor="gray.200" borderRadius="md" bg="yellow.50">
                <HStack justify="space-between">
                  <HStack>
                    <Avatar size="sm" name="Owner" />
                    <VStack align="start" spacing={0}>
                      <Text fontWeight={600}>Community Owner</Text>
                      <Text fontSize="xs" color="gray.500">
                        Creator of this community
                      </Text>
                    </VStack>
                  </HStack>
                  <Badge colorScheme="yellow">
                    <Icon as={FaCrown} mr={1} />
                    Owner
                  </Badge>
                </HStack>
              </Box>

                             {/* Members List */}
               {communityData.members && Array.isArray(communityData.members) && communityData.members.length > 0 ? (
                 communityData.members.map((member) => (
                  <HStack key={member.userId} justify="space-between" p={3} border="1px solid" borderColor="gray.200" borderRadius="md">
                    <HStack>
                      <Avatar size="sm" src={member.imageURL} name={member.displayName} />
                      <VStack align="start" spacing={0}>
                        <Text fontWeight={600}>{member.displayName || member.userId}</Text>
                                                 <Text fontSize="xs" color="gray.500">
                           Joined {formatTimestamp(member.joinedAt)}
                         </Text>
                      </VStack>
                    </HStack>
                    <HStack>
                      <Badge colorScheme={getRoleColor(member.role)}>
                        <Icon as={getRoleIcon(member.role)} mr={1} />
                        {member.role}
                      </Badge>
                      {canManageRoles && member.userId !== user?.uid && (
                        <Select
                          size="sm"
                          value={member.role}
                          onChange={(e) => handleUpdateRole(member.userId, e.target.value as CommunityRole)}
                          width="120px"
                        >
                          <option value="member">Member</option>
                          <option value="moderator">Moderator</option>
                          <option value="admin">Admin</option>
                          {isOwner && <option value="owner">Owner</option>}
                        </Select>
                      )}
                    </HStack>
                  </HStack>
                ))
              ) : (
                                 <Box p={4} border="1px solid" borderColor="gray.200" borderRadius="md" textAlign="center">
                   <Text color="gray.500" fontSize="sm">
                     No members found. Members will appear here when they join the community.
                   </Text>
                   <Text color="gray.400" fontSize="xs" mt={2}>
                     Total members: {communityData.numberOfMembers || 0}
                   </Text>
                   <Text color="gray.400" fontSize="xs" mt={1}>
                     Members array: {communityData.members ? `${communityData.members.length} items` : 'Not initialized'}
                   </Text>
                 </Box>
              )}

              {/* Add Member Section */}
              {canManageRoles && (
                <Box p={4} border="1px solid" borderColor="blue.200" borderRadius="md" bg="blue.50">
                  <Text fontWeight={600} mb={2} color="blue.700">
                    Add Member by User ID
                  </Text>
                  <HStack>
                    <Input
                      placeholder="Enter user ID"
                      size="sm"
                      flex={1}
                      value={newMember.userId}
                      onChange={(e) => setNewMember(prev => ({ ...prev, userId: e.target.value }))}
                    />
                    <Select 
                      size="sm" 
                      width="120px" 
                      value={newMember.role}
                      onChange={(e) => setNewMember(prev => ({ ...prev, role: e.target.value as CommunityRole }))}
                    >
                      <option value="member">Member</option>
                      <option value="moderator">Moderator</option>
                      <option value="admin">Admin</option>
                    </Select>
                    <Button 
                      size="sm" 
                      colorScheme="blue"
                      onClick={handleAddMember}
                      isDisabled={!newMember.userId.trim()}
                    >
                      Add
                    </Button>
                  </HStack>
                </Box>
              )}
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* Banned Users Modal */}
      <Modal isOpen={isBannedOpen} onClose={onBannedClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Banned Users</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4} align="stretch">
              {/* Ban New User */}
              <Box p={4} border="1px solid" borderColor="gray.200" borderRadius="md">
                <Text fontWeight={600} mb={2}>Ban User</Text>
                <Input
                  placeholder="User ID"
                  value={banUser.userId}
                  onChange={(e) => setBanUser(prev => ({ ...prev, userId: e.target.value }))}
                  mb={2}
                />
                <Textarea
                  placeholder="Reason for ban"
                  value={banUser.reason}
                  onChange={(e) => setBanUser(prev => ({ ...prev, reason: e.target.value }))}
                  mb={2}
                />
                <Button size="sm" colorScheme="red" onClick={handleBanUser}>
                  Ban User
                </Button>
              </Box>

                             {/* Banned Users List */}
               {communityData.bannedUsers && Array.isArray(communityData.bannedUsers) && communityData.bannedUsers.map((bannedUser) => (
                <HStack key={bannedUser.userId} justify="space-between" p={3} border="1px solid" borderColor="gray.200" borderRadius="md">
                  <VStack align="start" spacing={0}>
                    <Text fontWeight={600}>{bannedUser.displayName || bannedUser.userId}</Text>
                                         <Text fontSize="xs" color="gray.500">
                       Banned on {formatTimestamp(bannedUser.bannedAt)}
                     </Text>
                    <Text fontSize="sm" color="red.500">
                      Reason: {bannedUser.reason}
                    </Text>
                  </VStack>
                  <Button size="sm" variant="outline" onClick={() => handleUnbanUser(bannedUser.userId)}>
                    Unban
                  </Button>
                </HStack>
              ))}
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default CommunityManagement;
