import React, { useState } from "react";
import {
  Box,
  Button,
  Checkbox,
  Divider,
  Flex,
  Icon,
  Input,
  ModalBody,
  ModalCloseButton,
  ModalFooter,
  ModalHeader,
  Stack,
  Text,
  useColorModeValue,
} from "@chakra-ui/react";

import { useRouter } from "next/router";
import { BsFillEyeFill, BsFillPersonFill } from "react-icons/bs";
import { HiLockClosed } from "react-icons/hi";
import { useSetRecoilState, useRecoilValue } from "recoil";
import { communityState, createCommunityModalState } from "../../../atoms/communitiesAtom";

import ModalWrapper from "../ModalWrapper";
import { createGroup } from "../../../services/groups.service";

type CreateCommunityModalProps = {
  isOpen: boolean;
  handleClose: () => void;
  userId: string;
};

const CreateCommunityModal: React.FC<CreateCommunityModalProps> = ({
  isOpen,
  handleClose,
  userId,
}) => {
  const setSnippetState = useSetRecoilState(communityState);
  const setCreateCommunityModal = useSetRecoilState(createCommunityModalState);
  const [name, setName] = useState("");
  const [charsRemaining, setCharsRemaining] = useState(21);
  const [nameError, setNameError] = useState("");
  const [communityType, setCommunityType] = useState("public");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleCloseModal = () => {
    setCreateCommunityModal({ open: false });
    setName("");
    setCharsRemaining(21);
    setNameError("");
    setCommunityType("public");
    setLoading(false);
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.value.length > 21) return;
    setName(event.target.value);
    setCharsRemaining(21 - event.target.value.length);
  };

  const handleCreateCommunity = async () => {
    if (nameError) setNameError("");
    const format = /[ `!@#$%^&*()+\-=\[\]{};':"\\|,.<>\/?~]/;

    if (format.test(name) || name.length < 3) {
      return setNameError(
        "Community names must be between 3–21 characters, and can only contain letters, numbers, or underscores."
      );
    }

    setLoading(true);
    try {
      // Create via API, include privacy/communityType when available
      const created = await createGroup({ name, privacyType: communityType, communityType });
      // Mark as managed locally so it appears immediately in My Communities
      try {
        const createdId = (created && (created as any).id) ? String((created as any).id) : undefined;
        if (createdId && typeof window !== 'undefined') {
          const raw = window.localStorage.getItem('managedGroups');
          let arr: string[] = [];
          try {
            const parsed = raw ? JSON.parse(raw) : [];
            if (Array.isArray(parsed)) arr = parsed.map((x) => String(x));
          } catch {}
          const set = new Set<string>(arr);
          set.add(createdId);
          window.localStorage.setItem('managedGroups', JSON.stringify(Array.from(set)));
        }
      } catch {}
      // Best-effort snippet refresh: mark created group as managed/owner in snippets
      setSnippetState((prev) => {
        const createdId = (created && (created as any).id) ? String((created as any).id) : undefined;
        if (!createdId) return { ...prev };
        const exists = prev.mySnippets.some(s => s.communityId === createdId);
        if (exists) return { ...prev };
        return {
          ...prev,
          mySnippets: [
            ...prev.mySnippets,
            { communityId: createdId, imageURL: (created as any)?.imageURL || undefined, role: 'owner' as any },
          ],
        };
      });
      handleCloseModal();
  const dest = created && (created as any).id ? String((created as any).id) : name;
  router.push(`/community/${encodeURIComponent(dest)}`);
    } catch (error: any) {
      const msg = error?.response?.data?.error || error?.message || "Failed to create community";
      setNameError(msg);
    } finally {
      setLoading(false);
    }
  };

  const onCommunityTypeChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const {
      target: { name },
    } = event;
    if (name === communityType) return;
    setCommunityType(name);
  };

  return (
    <ModalWrapper isOpen={isOpen} onClose={handleCloseModal}>
      <ModalHeader
        display="flex"
        flexDirection="column"
        fontSize={15}
        padding={3}
      >
        Tạo cộng đồng
      </ModalHeader>
      <Box pr={3} pl={3}>
        <Divider />
        <ModalCloseButton />
        <ModalBody display="flex" flexDirection="column" padding="10px 0px">
          <Text fontWeight={600} fontSize={15}>
            Tên
          </Text>
          <Text fontSize={11} color={useColorModeValue("gray.500", "gray.400")}>
            Tên cộng đồng, bao gồm cả chữ hoa chữ thường, không thể thay đổi.
          </Text>
          <Text
            color={useColorModeValue("gray.400", "gray.500")}
            position="relative"
            top="28px"
            left="10px"
            width="20px"
          >
            
          </Text>
          <Input
            position="relative"
            name="name"
            value={name}
            onChange={handleChange}
            pl="22px"
            type={""}
            size="sm"
            bg={useColorModeValue("white", "gray.800")}
            border="1px solid"
            borderColor={useColorModeValue("gray.300", "gray.600")}
            _placeholder={{ color: useColorModeValue("gray.500", "gray.400") }}
            _focus={{
              outline: "none",
              bg: useColorModeValue("white", "gray.800"),
              border: "1px solid",
              borderColor: useColorModeValue("blue.500", "blue.300"),
            }}
          />
          <Text
            fontSize="9pt"
            color={charsRemaining === 0 ? "red" : "gray.500"}
            pt={2}
          >
            {charsRemaining} Characters remaining
          </Text>
          <Text fontSize="9pt" color="red" pt={1}>
            {nameError}
          </Text>
          <Box mt={4} mb={4}>
            <Text fontWeight={600} fontSize={15}>
              Loại cộng đồng
            </Text>
            <Stack spacing={2} pt={1}>
              <Checkbox
                colorScheme="blue"
                name="public"
                isChecked={communityType === "public"}
                onChange={onCommunityTypeChange}
              >
                <Flex alignItems="center">
                  <Icon as={BsFillPersonFill} mr={2} color={useColorModeValue("gray.500", "gray.400")} />
                  <Text fontSize="10pt" mr={1}>
                    Công khai
                  </Text>
                  <Text fontSize="8pt" color={useColorModeValue("gray.500", "gray.400")} pt={1}>
                    Bất kỳ ai cũng có thể xem, đăng bài và bình luận trong cộng đồng này
                  </Text>
                </Flex>
              </Checkbox>
              <Checkbox
                colorScheme="blue"
                name="restricted"
                isChecked={communityType === "restricted"}
                onChange={onCommunityTypeChange}
              >
                <Flex alignItems="center">
                  <Icon as={BsFillEyeFill} color={useColorModeValue("gray.500", "gray.400")} mr={2} />
                  <Text fontSize="10pt" mr={1}>
                    Hạn chế
                  </Text>
                  <Text fontSize="8pt" color={useColorModeValue("gray.500", "gray.400")} pt={1}>
                    Bất kỳ ai cũng có thể xem cộng đồng này, nhưng chỉ những người dùng đã được phê duyệt mới có thể đăng bài
                  </Text>
                </Flex>
              </Checkbox>
              <Checkbox
                colorScheme="blue"
                name="private"
                isChecked={communityType === "private"}
                onChange={onCommunityTypeChange}
              >
                <Flex alignItems="center">
                  <Icon as={HiLockClosed} color={useColorModeValue("gray.500", "gray.400")} mr={2} />
                  <Text fontSize="10pt" mr={1}>
                    Riêng tư
                  </Text>
                  <Text fontSize="8pt" color={useColorModeValue("gray.500", "gray.400")} pt={1}>
                    Chỉ những người dùng đã được phê duyệt mới có thể xem và đăng bài trong cộng đồng này
                  </Text>
                </Flex>
              </Checkbox>
            </Stack>
          </Box>
        </ModalBody>
      </Box>
      <ModalFooter bg={useColorModeValue("gray.100", "gray.700")} borderRadius="0px 0px 10px 10px" borderTop="1px solid" borderColor={useColorModeValue("gray.200", "gray.600")}>
        <Button variant="outline" colorScheme="gray" height="30px" mr={2} onClick={handleCloseModal}>
          Hủy
        </Button>
        <Button
          variant="solid"
          colorScheme="blue"
          height="30px"
          onClick={handleCreateCommunity}
          isLoading={loading}
        >
          Tạo cộng đồng
        </Button>
      </ModalFooter>
    </ModalWrapper>
  );
};
export default CreateCommunityModal;
