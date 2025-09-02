import React from "react";
import { Flex, Button } from "@chakra-ui/react";
import Link from "next/link";

const CommunityNotFound: React.FC = () => {
  return (
    <Flex
      direction="column"
      justifyContent="center"
      alignItems="center"
      minHeight="60vh"
    >
      Rất tiếc, cộng đồng đó không tồn tại hoặc đã bị cấm.
      <Link href="/">
        <Button mt={4}>VỀ TRANG CHỦ</Button>
      </Link>
    </Flex>
  );
};
export default CommunityNotFound;
