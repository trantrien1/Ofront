import React, { useState } from "react";
import { Flex, Textarea, Button, Text, Avatar, Box, Switch, Tooltip } from "@chakra-ui/react";
type User = { uid: string; email?: string; photoURL?: string };

type ReplyInputProps = {
  comment: string;
  setComment: (value: string) => void;
  loading: boolean;
  user?: User | null;
  onReply: (comment: string, anonymous?: boolean) => void;
  onCancel: () => void;
  parentCommentText?: string;
};

const ReplyInput: React.FC<ReplyInputProps> = ({
  comment,
  setComment,
  loading,
  user,
  onReply,
  onCancel,
  parentCommentText,
}) => {
  const [anonymous, setAnonymous] = useState(false);
  return (
    <Box ml={8} mt={2} borderLeft="2px solid" borderColor="gray.200" pl={4}>
        {parentCommentText && (
        <Text fontSize="8pt" color="gray.500" mb={2}>
          Phản hồi tới: &quot;{parentCommentText.length > 50 ? parentCommentText.substring(0, 50) + '...' : parentCommentText}&quot;
        </Text>
      )}
      <Flex direction="column" position="relative">
        {user ? (
          <>
            <Flex align="center" mb={2}>
              <Avatar size="xs" src={user.photoURL || undefined} mr={2} />
              <Text fontSize="9pt">
                Trả lời với tư cách{" "}
                <span style={{ color: "#3182CE" }}>
                  {user?.email?.split("@")[0]}
                </span>
              </Text>
            </Flex>
            <Textarea
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              placeholder="Write a reply..."
              fontSize="10pt"
              borderRadius={4}
              minHeight="100px"
              pb={10}
              _placeholder={{ color: "gray.500" }}
              _focus={{
                outline: "none",
                bg: "white",
                border: "1px solid black",
              }}
            />
            <Flex
              position="absolute"
              left="1px"
              right={0.1}
              bottom="1px"
              justify="flex-end"
              bg="gray.100"
              p="6px 8px"
              borderRadius="0px 0px 4px 4px"
              gap={2}
            >
              <Flex align="center" gap={3} mr="auto">
                <Tooltip label="Khi bật, tên của bạn sẽ không hiển thị cùng phản hồi." placement="top" hasArrow>
                  <Text fontSize="sm" cursor="help">
                    {anonymous ? '👻 Đăng ẩn danh' : '👤 Đăng công khai'}
                  </Text>
                </Tooltip>
                <Text fontSize="xs" mt={0} color="gray.500" display={{ base: 'none', md: 'block' }}>Bật để ẩn tên khi trả lời.</Text>
              </Flex>
              <Switch isChecked={anonymous} onChange={(e) => setAnonymous((e.target as HTMLInputElement).checked)} colorScheme="green" size="md" aria-label={anonymous ? 'Ẩn danh: Bật' : 'Ẩn danh: Tắt'} />
              <Button
                size="sm"
                variant="ghost"
                onClick={onCancel}
                disabled={loading}
              >
                Hủy
              </Button>
              <Button
                size="sm"
                height="26px"
                disabled={!comment.length}
                isLoading={loading}
                onClick={() => onReply(comment, anonymous)}
              >
                Trả lời
              </Button>
            </Flex>
          </>
        ) : (
          <Text fontSize="9pt" color="gray.500">
            Vui lòng đăng nhập để trả lời
          </Text>
        )}
      </Flex>
    </Box>
  );
};

export default ReplyInput;
