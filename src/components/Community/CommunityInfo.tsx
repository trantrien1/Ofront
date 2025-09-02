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
  useColorModeValue,
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

import { 
  Community, 
  CommunityRole, 
  CommunityMember, 
  CommunityRule, 
  BannedUser 
} from "../../atoms/communitiesAtom";

import { useRecoilValue, useSetRecoilState } from "recoil";
import { communityState } from "../../atoms/communitiesAtom";
import { normalizeTimestamp } from "../../helpers/timestampHelpers";

import Link from "next/link";
import { useRouter } from "next/router";
import { useCommunityPermissions } from "../../hooks/useCommunityPermissions";
import { updateGroup, deleteGroup } from "../../services/groups.service";

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
  // Admin-only edit/delete state and permissions
  const perms = useCommunityPermissions();
  const role = perms.getUserRole(communityData.id);
  const canModerateBool = perms.canModerate(communityData.id);
  const canManageRolesBool = perms.canManageRoles(communityData.id);
  const canBanUsersBool = perms.canBanUsers(communityData.id);
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();
  

  // Backward-compat booleans for existing UI blocks
  const isOwnerRole = role === "owner";

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
  console.error("Lỗi cập nhật hình ảnh", error?.message || error);
    }
    setImageLoading(false);
  };

  const handleUpdateDescription = async () => {
    try {
      await updateGroup({ communityId: communityData.id, description });
      setCommunityStateValue(prev => ({
        ...prev,
        currentCommunity: { ...prev.currentCommunity, description }
      }));
      toast({
        title: "Đã cập nhật mô tả",
        status: "success",
        duration: 3000,
      });
    } catch (error) {
      toast({
        title: "Lỗi cập nhật mô tả",
        status: "error",
        duration: 3000,
      });
    }
  };

  // Precompute theme-dependent colors to avoid calling hooks conditionally
  const headerSolidBg = useColorModeValue("blue.500", "blue.400");
  const contentBg = useColorModeValue("white", "gray.800");
  const contentBorder = useColorModeValue("gray.200", "whiteAlpha.300");
  const metaMuted = useColorModeValue("gray.600", "gray.400");
  const skeletonCardBg = useColorModeValue("white", "gray.800");
  const skeletonHeaderBg = useColorModeValue("blue.400", "blue.500");
  const skeletonLineBg = useColorModeValue("gray.200", "whiteAlpha.300");
  const renderSkeletonLine = (w: string, h = "12px", mb = 2) => (
    <Box height={h} width={w} bg={skeletonLineBg} borderRadius="md" mb={mb} />
  );
  // Lightweight skeleton while loading
  if (loading) {
    return (
      <Box pt={pt} position="sticky" top="44px">
        <Flex justify="space-between" align="center" p={3} color="white" bg={skeletonHeaderBg} borderRadius="4px 4px 0px 0px">
          <Box height="16px" width="140px" bg="whiteAlpha.700" borderRadius="md" />
          <Box height="16px" width="16px" bg="whiteAlpha.700" borderRadius="md" />
        </Flex>
        <Flex direction="column" p={3} bg={skeletonCardBg} borderRadius="0px 0px 4px 4px">
          {renderSkeletonLine("70%")}
          {renderSkeletonLine("90%")}
          <Divider my={3} />
          {renderSkeletonLine("40%")}
          {renderSkeletonLine("60%")}
          {renderSkeletonLine("50%")}
        </Flex>
      </Box>
    );
  }

  

  const handleConfirmDelete = async () => {
    try {
      await deleteGroup(communityData.id);
      toast({ title: "Cộng đồng đã bị xóa", status: "success", duration: 3000 });
      onDeleteClose();
      router.push("/my-community");
    } catch (error) {
      toast({ title: "Lỗi khi xóa cộng đồng", status: "error", duration: 3000 });
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
        title: "Đã thêm quy tắc",
        status: "success",
        duration: 3000,
      });
    } catch (error) {
      toast({
        title: "Lỗi khi thêm quy tắc",
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
        title: "Đã cập nhật quy tắc",
        status: "success",
        duration: 3000,
      });
    } catch (error) {
      toast({
        title: "Lỗi khi cập nhật quy tắc",
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
        title: "Đã xóa quy tắc",
        status: "success",
        duration: 3000,
      });
    } catch (error) {
      toast({
        title: "Lỗi khi xóa quy tắc",
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
        title: "Người dùng đã bị cấm",
        status: "success",
        duration: 3000,
      });
    } catch (error) {
      toast({
        title: "Lỗi khi cấm người dùng",
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
        title: "Người dùng đã được bỏ cấm",
        status: "success",
        duration: 3000,
      });
    } catch (error) {
      toast({
        title: "Lỗi khi bỏ cấm người dùng",
        status: "error",
        duration: 3000,
      });
    }
  };

  const handleUpdateRole = async (userId: string, newRole: CommunityRole) => {
    if (!canManageRolesBool) return;
    
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
        title: "Đã cập nhật vai trò",
        status: "success",
        duration: 3000,
      });
    } catch (error) {
      toast({
        title: "Lỗi khi cập nhật vai trò",
        status: "error",
        duration: 3000,
      });
    }
  };

  const handleAddMember = async () => {
    if (!newMember.userId.trim() || !canManageRolesBool) return;
    
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
        title: "Người dùng đã được thêm",
        status: "success",
        duration: 3000,
      });
    } catch (error) {
      toast({
        title: "Lỗi khi thêm người dùng",
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
  <Box pt={pt} position="sticky" top="44px" >
      {/* Header */}
      <Flex
        justify="space-between"
        align="center"
        p={4}
        color="white"
        bg={headerSolidBg}
        borderRadius="8px 8px 0 0"
        boxShadow="sm"
      >
        <Text fontSize="10pt" fontWeight={700}>
          Community Information
        </Text>
        <Icon as={HiOutlineDotsHorizontal} cursor="pointer" />
      </Flex>

      {/* Content with scroll */}
      <Flex
        direction="column"
        p={5}
  bg={contentBg}
        borderRadius="0 0 8px 8px"
        border="1px solid"
  borderColor={contentBorder}
        borderTop="none"
        boxShadow="sm"
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
                Giới thiệu về cộng đồng
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
                {/** Prefer live count from Recoil currentCommunity, fallback to prop */}
                {(() => {
                  /* no-op IIFE for scoping */
                  return null;
                })()}
                <Flex width="100%" p={2} fontWeight={600} fontSize="10pt">
                  <Flex direction="column" flexGrow={1}>
                    <Text fontSize="md">{(communityData?.numberOfMembers ?? 0).toLocaleString()}</Text>
                    <Text color={metaMuted}>Members</Text>
                  </Flex>
                  <Flex direction="column" flexGrow={1}>
                    
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
                  <Link href={`/community/${router.query.community}/submit`}>
                    <Button mt={4} height="36px" width="100%" colorScheme="blue" borderRadius="md">
                      Tạo bài viết
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
                      Thay đổi hình ảnh
                    </Text>
                    {communityData?.imageURL || selectedFile ? (
                      <Image
                        borderRadius="full"
                        boxSize="40px"
                        src={selectedFile || communityData?.imageURL}
                        alt="Community Image"
                      />
                    ) : (
                      <Image borderRadius="full" boxSize="40px" src="/images/logo.png" alt="logo" />
                    )}
                  </Flex>
                  {selectedFile &&
                    (imageLoading ? (
                      <Spinner />
                    ) : (
                      <Text cursor="pointer" onClick={updateImage} color="blue.500">
                        Lưu thay đổi
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
                Quyền và vai trò của bạn
              </Text>
              <Stack spacing={1} fontSize="10pt">
                <Text>Vai trò của bạn: <Text as="span" fontWeight="bold">{role}</Text></Text>
                <Text>Có thể quản lý vai trò: <Text as="span" fontWeight="bold">{canManageRolesBool ? "Có" : "Không"}</Text></Text>
                <Text>Có thể cấm người dùng: <Text as="span" fontWeight="bold">{canBanUsersBool ? "Có" : "Không"}</Text></Text>
              </Stack>
            </Box>

            {/* Community Management Section */}
            {canModerateBool && (
              <Box>
                <Text fontSize="12pt" fontWeight={600} mb={2}>
                  Quản lý cộng đồng
                </Text>
                
                {/* Description Management */}
                <Box mb={3}>
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
                  
                  {canBanUsersBool && (
                    <Button
                      leftIcon={<FaBan />}
                      variant="outline"
                      size="sm"
                      onClick={onBannedOpen}
                    >
                      Quản lý người bị cấm
                    </Button>
                  )}

                  {canManageRolesBool && (
                    <>
                      <Divider />
                      <Stack spacing={2}>
                        <Text fontSize="10pt" fontWeight={600}>Admin Actions</Text>
                        <Stack direction={{ base: "column", sm: "row" }} spacing={2}>
                          <Button size="sm" leftIcon={<FaTrash />} onClick={onDeleteOpen} colorScheme="red" variant="outline">
                            Xóa cộng đồng
                          </Button>
                        </Stack>
                      </Stack>
                    </>
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
                            aria-label="Chỉnh sửa quy tắc"
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
            {canManageRolesBool && member.userId !== user?.uid && (
                        <Select
                          size="sm"
                          value={member.role}
                          onChange={(e) => handleUpdateRole(member.userId, e.target.value as CommunityRole)}
                          width="120px"
                        >
                          <option value="member">Thành viên</option>
                          <option value="admin">Quản trị viên</option>
              {isOwnerRole && <option value="owner">Chủ sở hữu</option>}
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
                </Box>
              )}

              {/* Add Member Section */}
              {canManageRolesBool && (
                <Box p={4} border="1px solid" borderColor="blue.200" borderRadius="md" bg="blue.50">
                  <Text fontWeight={600} mb={2} color="blue.700">
                    Thêm thành viên bằng ID người dùng
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
                <Text fontWeight={600} mb={2}>Ban User</Text>
                <Input
                  placeholder="User ID"
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

      

      {/* Delete Confirm Modal */}
      <Modal isOpen={isDeleteOpen} onClose={onDeleteClose} size="md">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Xóa cộng đồng</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text>Bạn có chắc chắn muốn xóa cộng đồng này không? Hành động này không thể hoàn tác.</Text>
            <Stack direction="row" justify="flex-end" mt={4}>
              <Button variant="ghost" onClick={onDeleteClose}>Hủy</Button>
              <Button colorScheme="red" onClick={handleConfirmDelete} leftIcon={<FaTrash />}>Xóa</Button>
            </Stack>
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default CommunityInfo;
