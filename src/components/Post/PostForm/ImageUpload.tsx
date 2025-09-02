import React, { Ref } from "react";
import { Flex, Stack, Button, Image, useColorModeValue } from "@chakra-ui/react";

type ImageUploadProps = {
  selectedFile?: string;
  setSelectedFile: (value: string) => void;
  setSelectedTab: (value: string) => void;
  selectFileRef: React.RefObject<HTMLInputElement>;
  onSelectImage: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleCreatePost: () => void;
  loading: boolean;
  textInputs: {
    title: string;
    body: string;
  };
};

const ImageUpload: React.FC<ImageUploadProps> = ({
  selectedFile,
  setSelectedFile,
  setSelectedTab,
  selectFileRef,
  onSelectImage,
  handleCreatePost,
  loading,
  textInputs,
}) => {
  const dashedBorder = useColorModeValue("gray.200", "whiteAlpha.300");
  return (
    <Flex direction="column" justify="center" align="center" width="100%">
      {selectedFile ? (
        <>
          <Image
            src={selectedFile as string}
            maxWidth="400px"
            maxHeight="400px"
            alt="selected"
          />
          <Stack direction="row" mt={4}>
            <Button height="28px" onClick={() => setSelectedTab("Post")}>
              Quay lại bài viết
            </Button>
            <Button
              variant="outline"
              height="28px"
              onClick={() => setSelectedFile("")}
            >
              Xóa
            </Button>
            <Button
              height="28px"
              padding="0px 30px"
              disabled={!textInputs.title}
              isLoading={loading}
              onClick={handleCreatePost}
            >
              Đăng bài
            </Button>
          </Stack>
        </>
      ) : (
        <Flex
          justify="center"
          align="center"
          p={20}
          border="1px dashed"
          borderColor={dashedBorder}
          borderRadius={4}
          width="100%"
        >
          <Button
            variant="outline"
            height="28px"
            onClick={() => selectFileRef.current?.click()}
          >
            Tải lên
          </Button>
          <input
            id="file-upload"
            type="file"
            accept="image/x-png,image/gif,image/jpeg"
            hidden
            ref={selectFileRef}
            onChange={onSelectImage}
          />
        </Flex>
      )}
    </Flex>
  );
};
export default ImageUpload;
