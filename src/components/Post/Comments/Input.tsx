import React, { MouseEventHandler, useState } from "react";
import { Flex, Textarea, Button, Text } from "@chakra-ui/react";
type User = { uid: string; email?: string; photoURL?: string; displayName?: string };
import AuthButtons from "../../Navbar/RightContent/AuthButtons";

type CommentInputProps = {
  comment: string;
  setComment: (value: string) => void;
  loading: boolean;
  user?: User | null;
  onCreateComment: (comment: string) => void;
};

const CommentInput: React.FC<CommentInputProps> = ({
  comment,
  setComment,
  loading,
  user,
  onCreateComment,
}) => {
  return (
    <Flex direction="column" position="relative">
      {user && (
        <>
          <Text mb={1}>
            Comment as{" "}
            <span style={{ color: "#3182CE" }}>
              {user?.displayName || user?.email?.split("@")[0] || user?.uid || "user"}
            </span>
          </Text>
          <Textarea
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder="What are your thoughts?"
            fontSize="10pt"
            borderRadius={4}
            minHeight="160px"
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
          >
            <Button
              height="26px"
              disabled={!comment.length}
              isLoading={loading}
              onClick={() => {
                console.log("=== COMMENT BUTTON CLICKED ===");
                console.log("Comment text:", comment);
                console.log("onCreateComment function:", typeof onCreateComment);
                console.log("User in CommentInput:", user);
                console.log("==================================");
                onCreateComment(comment);
              }}
            >
              Comment
            </Button>
          </Flex>
        </>
      )}
    </Flex>
  );
};
export default CommentInput;
