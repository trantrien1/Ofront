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
// Firebase removed
import { 
  Community, 
  CommunityRole, 
  CommunityMember, 
  CommunityRule, 
  BannedUser 
} from "../../atoms/communitiesAtom";
// Firebase removed
import { useRecoilValue } from "recoil";
import { communityState } from "../../atoms/communitiesAtom";

interface CommunityManagementProps {
  communityData: Community;
}

const CommunityManagement: React.FC<CommunityManagementProps> = ({ communityData }) => {
  const user = null as any;
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
      // TODO: Update via API; optimistic update only here
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
      // TODO: Update via API
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
      // TODO: Update via API
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
      // TODO: Update via API
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
      // TODO: Update via API
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
      // TODO: Update via API
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
      // TODO: Update via API
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
        displayName: newMember.userId, // You might want to fetch user data here
        imageURL: ""
      };
      // TODO: Update via API
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
  <Box pt={0} position="sticky" top="44px" >
      <Flex
        justify="space-between"
        align="center"
        p={3}
        color="white"
        bg="blue.500"
        borderRadius="4px 4px 0px 0px"
      >
        <Text fontSize="10pt" fontWeight={700}>
          Quản lí cộng đồng
        </Text>
        <Icon as={HiOutlineDotsHorizontal} cursor="pointer" />
      </Flex>
      
      <Flex direction="column" p={3} bg="white" borderRadius="0px 0px 4px 4px">
        <Stack spacing={3}>
          {/* Description Management */}
          <Box>
            <Text fontSize="10pt" fontWeight={600} mb={2}>
              Mô tả cộng đồng
            </Text>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Thêm mô tả cho cộng đồng của bạn..."
              size="sm"
              mb={2}
            />
            <Button size="sm" onClick={handleUpdateDescription}>
              Cập nhật mô tả
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
              Quản lý quy tắc
            </Button>
            
            <Button
              leftIcon={<FaUsers />}
              variant="outline"
              size="sm"
              onClick={onMembersOpen}
            >
              Quản lý thành viên
            </Button>
            
            {canBanUsers && (
              <Button
                leftIcon={<FaBan />}
                variant="outline"
                size="sm"
                onClick={onBannedOpen}
              >
                Người dùng bị cấm
              </Button>
            )}
          </Stack>
        </Stack>
      </Flex>

      {/* Rules Modal */}
      <Modal isOpen={isRulesOpen} onClose={onRulesClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Quy tắc cộng đồng</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4} align="stretch">
              {/* Add New Rule */}
              <Box p={4} border="1px solid" borderColor="gray.200" borderRadius="md">
                <Text fontWeight={600} mb={2}>Thêm quy tắc mới</Text>
                <Input
                  placeholder="Tiêu đề quy tắc"
                  value={newRule.title}
                  onChange={(e) => setNewRule(prev => ({ ...prev, title: e.target.value }))}
                  mb={2}
                />
                <Textarea
                  placeholder="Mô tả quy tắc"
                  value={newRule.description}
                  onChange={(e) => setNewRule(prev => ({ ...prev, description: e.target.value }))}
                  mb={2}
                />
                <Button size="sm" onClick={handleAddRule}>
                  Thêm quy tắc
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
                            aria-label="Sửa quy tắc"
                            icon={<FaEdit />}
                            size="sm"
                            onClick={() => setEditingRule(rule)}
                          />
                          <IconButton
                            aria-label="Xóa quy tắc"
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
          <ModalHeader>Thành viên cộng đồng</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4} align="stretch">
              {/* Community Owner */}
              <Box p={4} border="1px solid" borderColor="gray.200" borderRadius="md" bg="yellow.50">
                <HStack justify="space-between">
                  <HStack>
                    <Avatar size="sm" name="Owner" />
                    <VStack align="start" spacing={0}>
                      <Text fontWeight={600}>Chủ sở hữu cộng đồng</Text>
                      <Text fontSize="xs" color="gray.500">
                        Người tạo ra cộng đồng này
                      </Text>
                    </VStack>
                  </HStack>
                  <Badge colorScheme="yellow">
                    <Icon as={FaCrown} mr={1} />
                    Chủ sở hữu
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
                          Tham gia {formatTimestamp(member.joinedAt)}
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
                          <option value="member">Thành viên</option>
                          <option value="admin">Quản trị viên</option>
                          {isOwner && <option value="owner">Chủ sở hữu</option>}
                        </Select>
                      )}
                    </HStack>
                  </HStack>
                ))
              ) : (
                                 <Box p={4} border="1px solid" borderColor="gray.200" borderRadius="md" textAlign="center">
                   <Text color="gray.500" fontSize="sm">
                     Không tìm thấy thành viên. Thành viên sẽ xuất hiện ở đây khi họ tham gia cộng đồng.
                   </Text>
                   <Text color="gray.400" fontSize="xs" mt={2}>
                     Tổng số thành viên: {communityData.numberOfMembers || 0}
                   </Text>
                 </Box>
              )}

              {/* Add Member Section */}
              {canManageRoles && (
                <Box p={4} border="1px solid" borderColor="blue.200" borderRadius="md" bg="blue.50">
                  <Text fontWeight={600} mb={2} color="blue.700">
                    Thêm thành viên mới
                  </Text>
                  <HStack>
                    <Input
                      placeholder="Nhập ID người dùng"
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
                      Thêm
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
          <ModalHeader>Người dùng bị cấm</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4} align="stretch">
              {/* Ban New User */}
              <Box p={4} border="1px solid" borderColor="gray.200" borderRadius="md">
                <Text fontWeight={600} mb={2}>Cấm người dùng</Text>
                <Input
                  placeholder="ID người dùng"
                  value={banUser.userId}
                  onChange={(e) => setBanUser(prev => ({ ...prev, userId: e.target.value }))}
                  mb={2}
                />
                <Textarea
                  placeholder="Lý do cấm"
                  value={banUser.reason}
                  onChange={(e) => setBanUser(prev => ({ ...prev, reason: e.target.value }))}
                  mb={2}
                />
                <Button size="sm" colorScheme="red" onClick={handleBanUser}>
                  Cấm người dùng
                </Button>
              </Box>

                             {/* Banned Users List */}
               {communityData.bannedUsers && Array.isArray(communityData.bannedUsers) && communityData.bannedUsers.map((bannedUser) => (
                <HStack key={bannedUser.userId} justify="space-between" p={3} border="1px solid" borderColor="gray.200" borderRadius="md">
                  <VStack align="start" spacing={0}>
                    <Text fontWeight={600}>{bannedUser.displayName || bannedUser.userId}</Text>
                    <Text fontSize="xs" color="gray.500">
                      Bị cấm vào {formatTimestamp(bannedUser.bannedAt)}
                    </Text>
                    <Text fontSize="sm" color="red.500">
                      Lý do: {bannedUser.reason}
                    </Text>
                  </VStack>
                  <Button size="sm" variant="outline" onClick={() => handleUnbanUser(bannedUser.userId)}>
                    Gỡ cấm
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
