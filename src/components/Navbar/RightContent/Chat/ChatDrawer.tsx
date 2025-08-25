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
import { keyframes as emotionKeyframes } from "@emotion/react";
import { ChatIcon, ArrowUpIcon } from "@chakra-ui/icons";
import { BsRobot, BsPeople } from "react-icons/bs";

type Message = { id: string; from: "user" | "bot" | "peer"; text: string; time: number; thinking?: boolean };

// Define typing animation once
const typingDots = emotionKeyframes`
  0%, 80%, 100% { transform: scale(0.8); opacity: .4; }
  40% { transform: scale(1.2); opacity: 1; }
`;

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
        {m.thinking ? (
          <HStack spacing={2} minH="22px">
            <Box as="span" w="10px" h="10px" borderRadius="full" bg={m.from === "bot" ? "purple.500" : "whiteAlpha.800"} animation={`${typingDots} 1s infinite ease-in-out`} />
            <Box as="span" w="10px" h="10px" borderRadius="full" bg={m.from === "bot" ? "purple.500" : "whiteAlpha.800"} animation={`${typingDots} 1s infinite ease-in-out`} style={{ animationDelay: "0.15s" }} />
            <Box as="span" w="10px" h="10px" borderRadius="full" bg={m.from === "bot" ? "purple.500" : "whiteAlpha.800"} animation={`${typingDots} 1s infinite ease-in-out`} style={{ animationDelay: "0.3s" }} />
          </HStack>
        ) : (
          <Text fontSize="sm">{m.text}</Text>
        )}
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
    <VStack align="stretch" spacing={3} overflowY="auto" flex={1} minH={0}>
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
      const history = botMessages.map((m) => ({ from: m.from === 'bot' ? 'bot' : 'user', text: m.text }));
  // Add placeholder thinking message
  const placeholderId = `b-${Date.now() + 1}`;
  setBotMessages((arr) => [...arr, { id: placeholderId, from: 'bot', text: '', time: Date.now() + 1, thinking: true }]);
      const r = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: text, history }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || `HTTP ${r.status}`);
      const botText = (data?.reply || '').toString();
  // Replace placeholder with real reply
  setBotMessages((arr) => arr.map((m) => m.id === placeholderId ? { ...m, text: botText || '...', thinking: false } : m));
    } catch (e: any) {
  // Replace placeholder with error text if exists
  setBotMessages((arr) => arr.map((m) => m.thinking ? { ...m, text: 'Chatbot error', thinking: false } : m));
  toast({ status: 'error', title: 'Chatbot error', description: e?.message || 'Failed' });
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
            <Flex flex={1} direction="column" p={4} gap={3} minH={0}>
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
