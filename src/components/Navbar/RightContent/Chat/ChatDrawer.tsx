import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  Divider,
  Flex,
  HStack,
  Icon,
  IconButton,
  Input,
  Text,
  VStack,
  useDisclosure,
  useToast,
  useColorModeValue,
  SlideFade,
} from "@chakra-ui/react";
import { keyframes as emotionKeyframes } from "@emotion/react";
import { ChatIcon, ArrowUpIcon, ChevronDownIcon, ChevronUpIcon, CloseIcon } from "@chakra-ui/icons";
import { BsRobot, BsPeople } from "react-icons/bs";

type Message = { id: string; from: "user" | "bot" | "peer"; text: string; time: number; thinking?: boolean };

// Define typing animation once
const typingDots = emotionKeyframes`
  0%, 80%, 100% { transform: scale(0.8); opacity: .4; }
  40% { transform: scale(1.2); opacity: 1; }
`;

// Simple fade-in-up animation for new messages
const fadeInUp = emotionKeyframes`
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
`;

// Bobbing avatar animation
const bob = emotionKeyframes`
  0% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
  100% { transform: translateY(0); }
`;

// Blinking caret for typing effect
const blink = emotionKeyframes`
  0%, 49% { opacity: 1; }
  50%, 100% { opacity: 0; }
`;

// Pulse for send button
const pulse = emotionKeyframes`
  0% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.05); opacity: 0.9; }
  100% { transform: scale(1); opacity: 1; }
`;

// Typing text animation component (simulates a user/bot typing label)
const TypingText: React.FC<{ label?: string; speed?: number }> = ({ label = 'Đang gõ...', speed = 90 }) => {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % (label.length + 1)), speed);
    return () => clearInterval(t);
  }, [label, speed]);
  return (
    <Text fontSize="sm" display="inline-flex" alignItems="center">
      {label.slice(0, idx)}
      <Box as="span" ml={1} sx={{ display: 'inline-block', width: '6px', height: '14px', background: 'transparent' }}>
        <Box as="span" sx={{ display: 'inline-block', marginLeft: '2px', width: '6px', height: '14px', background: 'currentColor', animation: `${blink} 1s step-end infinite` }} />
      </Box>
    </Text>
  );
};

export const useChatDrawer = () => {
  return useDisclosure();
};

const MessageBubble: React.FC<{ m: Message; index?: number }> = ({ m, index }) => {
  const isSelf = m.from === "user";
  // Colors: bot = light gray/blue, user = brand blue, peer = green
  const bg = m.from === "bot" ? "blue.50" : isSelf ? "blue.600" : "green.500";
  const color = m.from === "bot" ? "gray.800" : "white";

  // Avatar for bot/peer on left
  const avatar = (
    <Box w="36px" h="36px" mr={3} flexShrink={0} display="flex" alignItems="center" justifyContent="center" borderRadius="full" bg={m.from === 'bot' ? 'blue.100' : 'green.400'} sx={{ animation: `${bob} 2200ms ease-in-out infinite` }}>
      {m.from === 'bot' ? <BsRobot /> : <BsPeople />}
    </Box>
  );

  return (
    <Flex
      w="100%"
      justify={isSelf ? "flex-end" : "flex-start"}
      animation={`${fadeInUp} 220ms ease`}
      style={{ animationDelay: `${(index || 0) * 60}ms` }}
    >
      {!isSelf && avatar}
      <Box position="relative" maxW="78%">
        {/* bubble */}
        <Box
          bg={bg}
          color={color}
          px={4}
          py={2}
          borderRadius="16px"
          boxShadow={m.from === 'bot' ? 'sm' : 'none'}
        >
          {m.thinking ? (
            <HStack spacing={2} minH="22px">
              <TypingText label={m.from === 'bot' ? 'Đang trả lời...' : 'Đang trả lời...'} speed={80} />
            </HStack>
          ) : (
            <Text fontSize="sm">{m.text}</Text>
          )}
        </Box>

        {/* small rotated square tail to match bubble color */}
        <Box
          width="10px"
          height="10px"
          position="absolute"
          top="12px"
          left={!isSelf ? '-5px' : 'auto'}
          right={isSelf ? '-5px' : 'auto'}
          transform="rotate(45deg)"
          bg={bg}
          borderRadius="2px"
        />

      </Box>
      {isSelf && (
        <Box w="12px" />
      )}
    </Flex>
  );
};

const ChatInput: React.FC<{ onSend: (t: string) => void; placeholder?: string }> = ({ onSend, placeholder }) => {
  const [text, setText] = useState("");
  // Color-mode-aware input styles
  const inputBg = useColorModeValue("white", "gray.700");
  const inputColor = useColorModeValue("gray.800", "gray.100");
  const inputBorder = useColorModeValue("gray.200", "whiteAlpha.300");
  const placeholderColor = useColorModeValue("gray.500", "gray.400");
  const submit = () => {
    const t = text.trim();
    if (!t) return;
    onSend(t);
    setText("");
  };
  return (
    <HStack>
      <Input
        placeholder={placeholder || "Nhập câu hỏi của bạn..."}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
        variant="outline"
        bg={inputBg}
        color={inputColor}
        borderColor={inputBorder}
        _placeholder={{ color: placeholderColor }}
        _focus={{
          borderColor: "blue.400",
          boxShadow: "0 0 0 1px var(--chakra-colors-blue-400)",
          bg: inputBg,
        }}
      />
      <IconButton aria-label="Send" icon={<ArrowUpIcon />} onClick={submit} colorScheme="blue" isDisabled={!text.trim()} />
    </HStack>
  );
};

const ChatPanel: React.FC<{ messages: Message[] }> = ({ messages }) => {
  // Only autoscroll if user is near the bottom to avoid disrupting reading history
  const viewportRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  const sorted = useMemo(() => messages.slice().sort((a, b) => a.time - b.time), [messages]);

  const isNearBottom = (el: HTMLElement, threshold = 80) => {
    return el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
  };

  const onScroll = () => {
    const el = viewportRef.current;
    if (!el) return;
    setAutoScroll(isNearBottom(el));
  };

  // Scroll to bottom for new messages only when near bottom
  useEffect(() => {
    if (autoScroll) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [sorted, autoScroll]);

  // On mount, jump to bottom without animation
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "auto" });
  }, []);

  // If content height changes (images, async content), keep at bottom when allowed
  useEffect(() => {
    const el = viewportRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => {
      if (autoScroll) bottomRef.current?.scrollIntoView({ behavior: "auto" });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [autoScroll]);

  return (
    <VStack
      ref={viewportRef}
      onScroll={onScroll}
      align="stretch"
      spacing={3}
      overflowY="auto"
      flex={1}
      minH={0}
      sx={{ scrollBehavior: "smooth" }}
    >
      {sorted.map((m) => (
        <MessageBubble key={m.id} m={m} />
      ))}
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

  const [minimized, setMinimized] = useState(false);
  const panelBg = useColorModeValue("white", "gray.800");
  const headerBg = useColorModeValue("gray.50", "gray.700");
  const subtleBorder = useColorModeValue("gray.200", "whiteAlpha.300");
  const subtleText = useColorModeValue("gray.600", "gray.400");

  return (
    <Box
      as={SlideFade}
      in={isOpen}
      offsetY="16px"
      unmountOnExit
      position="fixed"
      right={{ base: 2, md: 4 }}
      bottom={{ base: 2, md: 4 }}
      w={{ base: "95vw", md: "420px", lg: "860px" }}
      maxW="95vw"
      zIndex={3000}
    >
      <Box
        h={minimized ? "48px" : { base: "70vh", md: "70vh" }}
        bg={panelBg}
        borderWidth="1px"
  borderColor={subtleBorder}
        borderRadius="lg"
        boxShadow="2xl"
        overflow="hidden"
        transition="height 0.25s ease"
        display="flex"
        flexDirection="column"
      >
        {/* Header with minimize/close */}
        <Flex
          align="center"
          justify="space-between"
          px={3}
          py={2}
          bg={headerBg}
          borderBottomWidth="1px"
          borderColor={subtleBorder}
        >
          <HStack spacing={2}>
            <Icon as={BsRobot} />
            <Text fontWeight="bold">Chats</Text>
          </HStack>
          <HStack spacing={1}>
            <IconButton
              aria-label={minimized ? "Expand" : "Minimize"}
              icon={minimized ? <ChevronUpIcon /> : <ChevronDownIcon />}
              size="sm"
              variant="ghost"
              onClick={() => setMinimized((v) => !v)}
            />
            <IconButton
              aria-label="Close"
              icon={<CloseIcon boxSize={3} />}
              size="sm"
              variant="ghost"
              onClick={onClose}
            />
          </HStack>
        </Flex>

        {/* Body */}
        {!minimized && (
          <Flex flex={1} minH={0}>
            {/* Left navigation */}
            <VStack align="stretch" w="280px" borderRight="1px solid" borderColor={subtleBorder} spacing={1} p={3}>
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
                    <Box p={2} color={subtleText}>No conversations</Box>
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
                  <ChatInput onSend={sendToBot} placeholder="Nhập câu hỏi của bạn..." />
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
                    Chào mừng bạn đến với phòng chat!
                  </Text>
                  <Text color={subtleText} textAlign="center">
                    Bắt đầu một cuộc trò chuyện trực tiếp với người dùng khác.
                  </Text>
                  <HStack>
                    <Input
                      placeholder="Nhập tên người dùng"
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
                      Bắt đầu cuộc trò chuyện mới
                    </Button>
                  </HStack>
                </Flex>
              )}
            </Flex>
          </Flex>
        )}
      </Box>
  </Box>
  );
};

export const ChatButton: React.FC<{ onOpen: () => void }> = ({ onOpen }) => (
  <IconButton aria-label="Chat" icon={<ChatIcon />} onClick={onOpen} variant="ghost" />
);

export default ChatDrawer;
