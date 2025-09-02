import {
  Button,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  useDisclosure,
} from "@chakra-ui/react";
import React from "react";

type ModalWrapperProps = {
  isOpen: boolean;
  onClose: () => void;
};
const ModalWrapper: React.FC<ModalWrapperProps & { children: React.ReactNode }> = ({
  children,
  isOpen,
  onClose,
}) => {
  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} size="lg">
        {/* Keep overlay below header to avoid blocking header interactions; header dim is handled locally */}
        <ModalOverlay bg="blackAlpha.600" backdropFilter="blur(2px)"  />
        <ModalContent width={{ base: "sm", md: "xl" }} >
          {children}
        </ModalContent>
      </Modal>
    </>
  );
};
export default ModalWrapper;
