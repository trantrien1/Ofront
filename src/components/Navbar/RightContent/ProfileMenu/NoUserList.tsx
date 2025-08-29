import React from "react";
import { MenuItem, Flex, Icon } from "@chakra-ui/react";
import { MdOutlineLogin } from "react-icons/md";
import { AuthModalState } from "../../../../atoms/authModalAtom";
import { useRecoilValue } from "recoil";
import { userState } from "../../../../atoms/userAtom";

type NoUserListProps = {
  setModalState: (value: AuthModalState) => void;
};

const NoUserList: React.FC<NoUserListProps> = ({ setModalState }) => {
  const user = useRecoilValue(userState) as any;
  if (user) return null;

  return (
    <>
      <MenuItem
        fontSize="10pt"
        fontWeight={700}
        _hover={{ bg: "blue.500", color: "white" }}
        onClick={() => setModalState({ open: true, view: "login" })}
      >
        <Flex alignItems="center">
          <Icon fontSize={20} mr={2} as={MdOutlineLogin} />
          Đăng nhập / Đăng ký
        </Flex>
      </MenuItem>
    </>
  );
};
export default NoUserList;
