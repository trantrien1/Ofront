import React, { useState, useRef } from "react";
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
  useToast,
  Image,
  Avatar,
  IconButton,
  Spinner,
} from "@chakra-ui/react";
import { 
  FaUsers, 
  FaGavel, 
  FaBan, 
  FaEdit, 
  FaTrash, 
  FaCrown,
  FaShieldAlt,
  FaUserShield,
  FaUser,
  FaReddit
} from "react-icons/fa";
import { HiOutlineDotsHorizontal } from "react-icons/hi";
import { RiCakeLine } from "react-icons/ri";
// import { useAuthState } from "react-firebase-hooks/auth";
// Firebase removed
import { 
  Community, 
  CommunityRole, 
  CommunityMember, 
  CommunityRule, 
  BannedUser 
} from "../../atoms/communitiesAtom";
// Firebase removed
import { useRecoilValue, useSetRecoilState } from "recoil";
import { communityState } from "../../atoms/communitiesAtom";
import { normalizeTimestamp } from "../../helpers/timestampHelpers";
// Firebase removed
import Link from "next/link";
import { useRouter } from "next/router";

interface CommunityInfoProps {
  communityData: Community;
  pt?: number;
  onCreatePage?: boolean;
  loading?: boolean;
}

const CommunityInfo: React.FC<CommunityInfoProps> = ({
  communityData,
  pt,
  onCreatePage,
  loading,
}) => {
  const user = null as any;
  const router = useRouter();
  const selectFileRef = useRef<HTMLInputElement>(null);
  const setCommunityStateValue = useSetRecoilState(communityState);
  const toast = useToast();
  
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
  const [selectedFile, setSelectedFile] = useState<string>();
  const [imageLoading, setImageLoading] = useState(false);

  // Check if user has admin permissions
  const userRole = communityData.members?.find(m => m.userId === user?.uid)?.role || "member";
  const isOwner = user?.uid === communityData.creatorId;
  const isAdmin = isOwner || userRole === "admin" || userRole === "moderator";
  const canManageRoles = isOwner || userRole === "admin";
  const canBanUsers = isOwner || userRole === "admin" || userRole === "moderator";

  const onSelectImage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const reader = new FileReader();
    if (event.target.files?.[0]) {
      reader.readAsDataURL(event.target.files[0]);
    }

    reader.onload = (readerEvent) => {
      if (readerEvent.target?.result) {
        setSelectedFile(readerEvent.target?.result as string);
      }
    };
  };

  const updateImage = async () => {
    if (!selectedFile) return;
    setImageLoading(true);
    try {
      // TODO: Implement image upload to your own storage and update via API
      setCommunityStateValue((prev) => ({
        ...prev,
        currentCommunity: {
          ...prev.currentCommunity,
          imageURL: selectedFile,
        },
      }));
    } catch (error: any) {
      console.log("updateImage error", error.message);
    }
    setImageLoading(false);
  };

  const handleUpdateDescription = async () => {
    try {
      // TODO: Update community description via API
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

      // TODO: Update via API, local optimistic update
      setCommunityStateValue(prev => ({
        ...prev,
        currentCommunity: {
          ...prev.currentCommunity,
          rules: [...(prev.currentCommunity.rules || []), rule]
        }
      }));

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
      // TODO: Update via API; optimistic local update
      setCommunityStateValue(prev => ({
        ...prev,
        currentCommunity: { ...prev.currentCommunity, rules: updatedRules }
      }));

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
      // TODO: Update via API; optimistic local update
      setCommunityStateValue(prev => ({
        ...prev,
        currentCommunity: { ...prev.currentCommunity, rules: updatedRules }
      }));

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
        bannedAt: new Date() as any,
        bannedBy: user?.uid || "",
        reason: banUser.reason,
        displayName: communityData.members?.find(m => m.userId === banUser.userId)?.displayName,
        imageURL: communityData.members?.find(m => m.userId === banUser.userId)?.imageURL
      };

      // TODO: Update via API; optimistic local update
      setCommunityStateValue(prev => ({
        ...prev,
        currentCommunity: {
          ...prev.currentCommunity,
          bannedUsers: [...(prev.currentCommunity.bannedUsers || []), bannedUser]
        }
      }));

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
      // TODO: Update via API; optimistic local update
      setCommunityStateValue(prev => ({
        ...prev,
        currentCommunity: { ...prev.currentCommunity, bannedUsers: updatedBannedUsers }
      }));

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
      // TODO: Update via API; optimistic local update
      setCommunityStateValue(prev => ({
        ...prev,
        currentCommunity: { ...prev.currentCommunity, members: updatedMembers }
      }));

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
        joinedAt: new Date() as any,
        displayName: newMember.userId,
        imageURL: ""
      };

      // TODO: Update via API; optimistic local update
      setCommunityStateValue(prev => ({
        ...prev,
        currentCommunity: {
          ...prev.currentCommunity,
          members: [...(prev.currentCommunity.members || []), memberToAdd],
          numberOfMembers: (prev.currentCommunity.numberOfMembers || 0) + 1,
        }
      }));

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
    <Box pt={pt} position="sticky" top="14px">
      {/* Header */}
      <Flex
        justify="space-between"
        align="center"
        p={3}
        color="white"
        bg="blue.400"
        borderRadius="4px 4px 0px 0px"
      >
        <Text fontSize="10pt" fontWeight={700}>
          Community Information
        </Text>
        <Icon as={HiOutlineDotsHorizontal} cursor="pointer" />
      </Flex>

      {/* Content with scroll */}
      <Flex 
        direction="column" 
        p={3} 
        bg="white" 
        borderRadius="0px 0px 4px 4px"
        maxH="600px"
        overflowY="auto"
        css={{
          '&::-webkit-scrollbar': {
            width: '8px',
          },
          '&::-webkit-scrollbar-track': {
            background: '#f1f1f1',
            borderRadius: '4px',
          },
          '&::-webkit-scrollbar-thumb': {
            background: '#c1c1c1',
            borderRadius: '4px',
          },
          '&::-webkit-scrollbar-thumb:hover': {
            background: '#a8a8a8',
          },
        }}
      >
        {loading ? (
          <Stack mt={2}>
            <Box width="40px" height="40px" bg="gray.200" borderRadius="full" />
            <Box height="10px" bg="gray.200" borderRadius="md" />
            <Box height="20px" bg="gray.200" borderRadius="md" />
            <Box height="20px" bg="gray.200" borderRadius="md" />
            <Box height="20px" bg="gray.200" borderRadius="md" />
          </Stack>
        ) : (
          <Stack spacing={4}>
            {/* About Section */}
            <Box>
              <Text fontSize="12pt" fontWeight={600} mb={2}>
                About Community
              </Text>
              
              {communityData?.description && (
                <Box
                  bg="gray.50"
                  width="100%"
                  p={3}
                  borderRadius={4}
                  border="1px solid"
                  borderColor="gray.200"
                  mb={3}
                >
                  <Text fontSize="10pt" color="gray.700" lineHeight="1.4">
                    {communityData.description}
                  </Text>
                </Box>
              )}

              <Stack spacing={2}>
                <Flex width="100%" p={2} fontWeight={600} fontSize="10pt">
                  <Flex direction="column" flexGrow={1}>
                    <Text>
                      {communityData?.numberOfMembers?.toLocaleString()}
                    </Text>
                    <Text>Members</Text>
                  </Flex>
                  <Flex direction="column" flexGrow={1}>
                    <Text>1</Text>
                    <Text>Online</Text>
                  </Flex>
                </Flex>
                <Divider />
                <Flex
                  align="center"
                  width="100%"
                  p={1}
                  fontWeight={500}
                  fontSize="10pt"
                >
                  <Icon as={RiCakeLine} mr={2} fontSize={18} />
                  {communityData?.createdAt && (
                    <Text>
                      Created{" "}
                      {new Date(normalizeTimestamp(communityData.createdAt)).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </Text>
                  )}
                </Flex>
                {!onCreatePage && (
                  <Link href={`/r/${router.query.community}/submit`}>
                    <Button mt={3} height="30px" width="100%">
                      Create Post
                    </Button>
                  </Link>
                )}
              </Stack>
            </Box>

            {/* Admin Section */}
            {user?.uid === communityData?.creatorId && (
              <Box>
                <Text fontSize="12pt" fontWeight={600} mb={2}>
                  Admin
                </Text>
                <Stack fontSize="10pt" spacing={2}>
                  <Flex align="center" justify="space-between">
                    <Text
                      color="blue.500"
                      cursor="pointer"
                      _hover={{ textDecoration: "underline" }}
                      onClick={() => selectFileRef.current?.click()}
                    >
                      Change Image
                    </Text>
                    {communityData?.imageURL || selectedFile ? (
                      <Image
                        borderRadius="full"
                        boxSize="40px"
                        src={selectedFile || communityData?.imageURL}
                        alt="Community Image"
                      />
                    ) : (
                      <Icon
                        as={FaReddit}
                        fontSize={40}
                        color="brand.100"
                        mr={2}
                      />
                    )}
                  </Flex>
                  {selectedFile &&
                    (imageLoading ? (
                      <Spinner />
                    ) : (
                      <Text cursor="pointer" onClick={updateImage} color="blue.500">
                        Save Changes
                      </Text>
                    ))}
                  <input
                    id="file-upload"
                    type="file"
                    accept="image/x-png,image/gif,image/jpeg"
                    hidden
                    ref={selectFileRef}
                    onChange={onSelectImage}
                  />
                </Stack>
              </Box>
            )}

            {/* Role and Permissions Panel */}
            <Box
              p={3}
              border="1px solid"
              borderColor="gray.200"
              borderRadius="md"
              bg="gray.50"
            >
              <Text fontSize="12pt" fontWeight={600} mb={2}>
                Your Role & Permissions
              </Text>
              <Stack spacing={1} fontSize="10pt">
                <Text>Your role: <Text as="span" fontWeight="bold">{userRole}</Text></Text>
                <Text>Can moderate: <Text as="span" fontWeight="bold">{isAdmin ? "Yes" : "No"}</Text></Text>
                <Text>Can manage roles: <Text as="span" fontWeight="bold">{canManageRoles ? "Yes" : "No"}</Text></Text>
                <Text>Can ban users: <Text as="span" fontWeight="bold">{canBanUsers ? "Yes" : "No"}</Text></Text>
              </Stack>
            </Box>

            {/* Community Management Section */}
            {isAdmin && (
              <Box>
                <Text fontSize="12pt" fontWeight={600} mb={2}>
                  Community Management
                </Text>
                
                {/* Description Management */}
                <Box mb={3}>
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
              </Box>
            )}
          </Stack>
        )}
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

export default CommunityInfo;
