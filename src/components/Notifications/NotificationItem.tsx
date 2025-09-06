import React, { useEffect, useState } from "react";
import {
	Avatar,
	Box,
	Flex,
	Text,
	Button,
	useToast,
	Tag,
	HStack,
	useColorModeValue,
} from "@chakra-ui/react";
import { Notification } from "../../atoms/notificationsAtom";
// Replaced hook-based relative time with SSR-safe TimeCell component
import TimeCell from "../Common/TimeCell";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import { useSetRecoilState } from "recoil";
import { postState } from "../../atoms/postsAtom";
// Disable SSR for this component to prevent hydration issues

const NotificationItem = dynamic(() => Promise.resolve(NotificationItemComponent), {
	ssr: false,
	loading: () => <NotificationItemSkeleton />
});

const NotificationItemSkeleton = () => {
	const borderCol = useColorModeValue("gray.100", "gray.700");
	const muted = useColorModeValue("gray.500", "gray.400");
	return (
		<Box p={3} borderBottom="1px solid" borderColor={borderCol}>
			<Flex align="start" gap={3}>
				<Avatar size="sm" />
				<Box flex={1}>
					<Text fontSize="sm" color={muted}>Loading...</Text>
				</Box>
			</Flex>
		</Box>
	);
};

type NotificationItemProps = {
	notification: Notification;
	onMarkAsRead: (notificationId: string) => void;
};

type UserData = {
	displayName: string;
	photoURL: string;
};

const NotificationItemComponent: React.FC<NotificationItemProps> = ({
	notification,
	onMarkAsRead,
}) => {
	const [userData, setUserData] = useState<UserData | null>(null);
	const [loading, setLoading] = useState(true);
	const router = useRouter();
		const toast = useToast();
	const setPostState = useSetRecoilState(postState);

	// Base date (already normalized when mapped in useNotifications)
	const baseDate = notification?.timestamp?.toDate ? notification.timestamp.toDate() : new Date();

	// Precompute all theme-dependent styles up front (hooks cannot be used conditionally)
	const borderCol = useColorModeValue("gray.100", "gray.700");
	const bgRead = useColorModeValue("white", "gray.800");
	const bgUnread = useColorModeValue("blue.50", "whiteAlpha.100");
	const hoverBg = useColorModeValue("gray.50", "whiteAlpha.100");
	const nameColor = useColorModeValue("gray.800", "gray.100");
	const messageColor = useColorModeValue("gray.600", "gray.300");
	const postTitleColor = useColorModeValue("gray.500", "gray.400");
	const communityLink = useColorModeValue("blue.500", "blue.300");
	const timeColor = useColorModeValue("gray.400", "gray.500");
	const muted = useColorModeValue("gray.500", "gray.400");

	// Fetch user data - For now, derive from notification (no Firebase)
		useEffect(() => {
			const deriveName = () => {
				if (notification.userId && String(notification.userId).trim()) return String(notification.userId);
				const msg = notification.message || '';
				// Try to extract name from Vietnamese server message
				try {
					let m = msg.match(/Người dùng\s+([^:\n]+?)\s+(?:mới đăng|đã đăng)/i);
					if (m && m[1]) return m[1].trim();
					m = msg.match(/^\s*([^:\n]+?)\s+đã đăng/i);
					if (m && m[1]) return m[1].trim();
				} catch {}
				return 'Unknown User';
			};
			setUserData({ displayName: deriveName(), photoURL: '' });
			setLoading(false);
		}, [notification.userId, notification.message]);

	

	const getTypeEmoji = () => {
		// Extra heuristic: if message indicates a new post ("mới đăng bài viết"), use a pencil
		const msg = (notification.message || "").toLowerCase();
		if (msg.includes("mới đăng bài viết") || msg.includes("đăng bài")) return "📝";
		switch (notification.type) {
			case "comment": return "💬";
			case "like": return "❤️";
			case "follow": return "👥";
			case "mention": return "📢";
			default: return "�"; // fallback to chat bubble for consistency
		}
	};
	console.log("đây là notification", notification.timestamp);
	const handleNotificationClick = () => {
		// Mark notification as read
		onMarkAsRead(notification.id);

		// Navigate to the relevant page
		if (notification.type === "comment" && notification.postId && notification.communityName) {
			const url = `/community/${notification.communityName}/comments/${notification.postId}`;
			// If we have a commentId, add it as a hash to highlight the specific comment
			const fullUrl = notification.commentId ? `${url}#comment-${notification.commentId}` : url;
			router.push(fullUrl);
		}
		// Add other notification types navigation here if needed
	};

		const handleApprove = async (e: React.MouseEvent) => {
			e.stopPropagation();
			if (!notification.postId) return;
			try {
				const svc = await import("../../services/posts.service");
				await (svc as any).approvePost({ postId: notification.postId, approve: true });
				// Optimistically update posts in Recoil so the post appears on the home feed
				setPostState((prev) => ({
					...prev,
					posts: (prev.posts || []).map((p) =>
						String(p.id) === String(notification.postId)
							? { ...p, status: 1, approved: true }
							: p
					),
					postsCache: Object.fromEntries(
						Object.entries(prev.postsCache || {}).map(([k, arr]) => [
							k,
							(arr || []).map((p) =>
								String(p.id) === String(notification.postId)
									? { ...p, status: 1, approved: true }
									: p
							),
						])
					),
					postUpdateRequired: false,
				}));
				toast({ status: 'success', title: 'Post approved' });
				onMarkAsRead(notification.id);
			} catch (err) {
				toast({ status: 'error', title: 'Approve failed' });
			}
		};

	if (loading) {
		return (
			<Box p={3} borderBottom="1px solid" borderColor={borderCol}>
				<Text fontSize="sm" color={muted}>Loading...</Text>
			</Box>
		);
	}

	return (
		<Box
			p={3}
			borderBottom="1px solid"
			borderColor={borderCol}
			bg={notification.read ? bgRead : bgUnread}
			cursor="pointer"
			_hover={{ bg: hoverBg }}
			onClick={handleNotificationClick}
		>
			<Flex align="start" gap={3}>
				<Avatar
					size="sm"
					src={userData?.photoURL}
					name={userData?.displayName || "Unknown User"}
				/>
				<Box flex={1}>
					<Flex align="center" gap={2} mb={1}>
						<Text fontSize="16px">{getTypeEmoji()}</Text>
						<Text fontSize="sm" fontWeight="medium" color={nameColor}>
							{userData?.displayName || "Unknown User"}
						</Text>
					</Flex>
					<Text fontSize="sm" color={messageColor} mb={1}>
						{notification.message}
					</Text>
					{notification.pending && (
						<HStack spacing={2} mb={1}>
							<Tag size="sm" colorScheme="orange">Chưa duyệt</Tag>
							{notification.postId && (
								<Button size="xs" colorScheme="green" onClick={handleApprove}>Duyệt</Button>
							)}
						</HStack>
					)}
						{notification.postTitle && (
							<Text fontSize="xs" color={postTitleColor} fontStyle="italic">
								&ldquo;{notification.postTitle}&rdquo;
							</Text>
						)}
								{notification.communityName && (
									<Text fontSize="xs" color={communityLink}>
										{notification.communityName}
									</Text>
								)}
						<Text fontSize="xs" color={timeColor} mt={1}>
							<TimeCell createdAt={baseDate} />
						</Text>
				</Box>
			</Flex>
		</Box>
	);
};

export default NotificationItem;
