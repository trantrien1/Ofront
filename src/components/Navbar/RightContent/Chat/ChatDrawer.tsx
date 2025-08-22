import React, { useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  Divider,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerHeader,
  DrawerOverlay,
  Flex,
  HStack,
  Icon,
  IconButton,
  Input,
  Text,
  VStack,
  useDisclosure,
  useToast,
} from "@chakra-ui/react";
import { ChatIcon, ArrowUpIcon } from "@chakra-ui/icons";
import { BsRobot, BsPeople } from "react-icons/bs";

type Message = { id: string; from: "user" | "bot" | "peer"; text: string; time: number };

export const useChatDrawer = () => {
  return useDisclosure();
};

const MessageBubble: React.FC<{ m: Message }> = ({ m }) => {
  const isSelf = m.from === "user";
  const bg = m.from === "bot" ? "gray.100" : isSelf ? "blue.500" : "green.500";
  const color = m.from === "bot" ? "gray.800" : "white";
  return (
    <Flex w="100%" justify={isSelf ? "flex-end" : "flex-start"}>
      <Box maxW="75%" bg={bg} color={color} px={3} py={2} borderRadius="md">
        <Text fontSize="sm">{m.text}</Text>
      </Box>
    </Flex>
  );
};

const ChatInput: React.FC<{ onSend: (t: string) => void; placeholder?: string }> = ({ onSend, placeholder }) => {
  const [text, setText] = useState("");
  const submit = () => {
    const t = text.trim();
    if (!t) return;
    onSend(t);
    setText("");
  };
  return (
    <HStack>
      <Input
        placeholder={placeholder || "Type a message"}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
      />
      <IconButton aria-label="Send" icon={<ArrowUpIcon />} onClick={submit} colorScheme="blue" />
    </HStack>
  );
};

const ChatPanel: React.FC<{ messages: Message[] }> = ({ messages }) => {
  const bottomRef = useRef<HTMLDivElement>(null);
  const list = useMemo(
    () =>
      messages
        .slice()
        .sort((a, b) => a.time - b.time)
        .map((m) => <MessageBubble key={m.id} m={m} />),
    [messages]
  );
  return (
  <VStack align="stretch" spacing={3} overflowY="auto" maxH="calc(100vh - 220px)">
      {list}
      <Box ref={bottomRef} />
    </VStack>
  );
};

type ChatDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
};

const ChatDrawer: React.FC<ChatDrawerProps> = ({ isOpen, onClose, userId }) => {
  const toast = useToast();
  const [botMessages, setBotMessages] = useState<Message[]>([
    { id: "w", from: "bot", text: "Xin chào! Tôi có thể giúp gì?", time: Date.now() },
  ]);
  const [dmMessages, setDmMessages] = useState<Message[]>([]);
  const [activeView, setActiveView] = useState<"bot" | "direct">("bot");
  const [convos, setConvos] = useState<{ id: string; name: string; messages: Message[] }[]>([]);
  const [selectedConvoId, setSelectedConvoId] = useState<string | null>(null);
  const [newPeer, setNewPeer] = useState("");

  const sendToBot = async (text: string) => {
    const userMsg: Message = { id: `u-${Date.now()}`, from: "user", text, time: Date.now() };
    setBotMessages((arr) => [...arr, userMsg]);
    try {
      // Minimal local echo bot; replace with your API call later
      const reply: Message = {
        id: `b-${Date.now() + 1}`,
        from: "bot",
        text: `Bot: ${text}`,
        time: Date.now() + 1,
      };
      setTimeout(() => setBotMessages((arr) => [...arr, reply]), 200);
    } catch (e: any) {
      toast({ status: "error", title: "Chatbot error", description: e?.message || "Failed" });
    }
  };

  const sendDM = (text: string) => {
    const userMsg: Message = { id: `u-${Date.now()}`, from: "user", text, time: Date.now() };
    // Ensure a conversation exists
    let convoId = selectedConvoId;
    if (!convoId) {
      const name = newPeer || "New chat";
      const cId = `c-${Date.now()}`;
      setConvos((list) => [...list, { id: cId, name, messages: [userMsg] }]);
      setSelectedConvoId(cId);
      setNewPeer("");
      return;
    }
    setConvos((list) =>
      list.map((c) => (c.id === convoId ? { ...c, messages: [...c.messages, userMsg] } : c))
    );
  };

  return (
    <Drawer isOpen={isOpen} placement="right" onClose={onClose} size="xl">
      <DrawerOverlay />
      <DrawerContent>
        <DrawerCloseButton />
        <DrawerHeader>Chats</DrawerHeader>
        <DrawerBody p={0}>
          <Flex height="calc(100vh - 120px)">
            {/* Left navigation */}
            <VStack align="stretch" w="280px" borderRight="1px solid" borderColor="gray.200" spacing={1} p={3}>
              <Text fontWeight="bold" mb={1}>
                Chats
              </Text>
              <Button
                variant={activeView === "bot" ? "solid" : "ghost"}
                colorScheme={activeView === "bot" ? "blue" : undefined}
                leftIcon={<Icon as={BsRobot} />}
                justifyContent="flex-start"
                onClick={() => setActiveView("bot")}
              >
                Chatbot
              </Button>
              <Button
                variant={activeView === "direct" ? "solid" : "ghost"}
                colorScheme={activeView === "direct" ? "blue" : undefined}
                leftIcon={<Icon as={BsPeople} />}
                justifyContent="flex-start"
                onClick={() => setActiveView("direct")}
              >
                Direct
              </Button>
              <Divider my={2} />
              {activeView === "direct" && (
                <VStack align="stretch" spacing={1} overflowY="auto">
                  {convos.length === 0 ? (
                    <Box p={2} color="gray.500">No conversations</Box>
                  ) : (
                    convos.map((c) => (
                      <Button
                        key={c.id}
                        variant={selectedConvoId === c.id ? "solid" : "ghost"}
                        colorScheme={selectedConvoId === c.id ? "blue" : undefined}
                        justifyContent="flex-start"
                        onClick={() => setSelectedConvoId(c.id)}
                      >
                        {c.name}
                      </Button>
                    ))
                  )}
                </VStack>
              )}
            </VStack>

            {/* Main panel */}
            <Flex flex={1} direction="column" p={4} gap={3}>
              {activeView === "bot" ? (
                <>
                  <ChatPanel messages={botMessages} />
                  <Divider />
                  <ChatInput onSend={sendToBot} placeholder="Hỏi chatbot..." />
                </>
              ) : selectedConvoId ? (
                <>
                  <ChatPanel
                    messages={
                      convos.find((c) => c.id === selectedConvoId)?.messages || []
                    }
                  />
                  <Divider />
                  <ChatInput onSend={sendDM} placeholder="Nhắn tin..." />
                </>
              ) : (
                <Flex flex={1} direction="column" align="center" justify="center" gap={3}>
                  <Text fontSize="lg" fontWeight="bold">
                    Welcome to chat!
                  </Text>
                  <Text color="gray.600" textAlign="center">
                    Start a direct chat with another user.
                  </Text>
                  <HStack>
                    <Input
                      placeholder="Enter username"
                      value={newPeer}
                      onChange={(e) => setNewPeer(e.target.value)}
                      width="260px"
                    />
                    <Button
                      colorScheme="blue"
                      onClick={() => {
                        const name = newPeer.trim();
                        if (!name) return;
                        const cId = `c-${Date.now()}`;
                        setConvos((list) => [...list, { id: cId, name, messages: [] }]);
                        setSelectedConvoId(cId);
                        setNewPeer("");
                      }}
                    >
                      Start new chat
                    </Button>
                  </HStack>
                </Flex>
              )}
            </Flex>
          </Flex>
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
};

export const ChatButton: React.FC<{ onOpen: () => void }> = ({ onOpen }) => (
  <IconButton aria-label="Chat" icon={<ChatIcon />} onClick={onOpen} variant="ghost" />
);

export default ChatDrawer;
