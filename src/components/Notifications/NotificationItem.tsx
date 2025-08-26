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
} from "@chakra-ui/react";
import { Notification } from "../../atoms/notificationsAtom";
import { normalizeTimestamp, formatTimeAgo } from "../../helpers/timestampHelpers";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import { useSetRecoilState } from "recoil";
import { postState } from "../../atoms/postsAtom";

// Disable SSR for this component to prevent hydration issues
const NotificationItem = dynamic(() => Promise.resolve(NotificationItemComponent), {
	ssr: false,
	loading: () => <NotificationItemSkeleton />
});

const NotificationItemSkeleton = () => (
	<Box p={3} borderBottom="1px solid" borderColor="gray.100">
		<Flex align="start" gap={3}>
			<Avatar size="sm" />
			<Box flex={1}>
				<Text fontSize="sm" color="gray.500">Loading...</Text>
			</Box>
		</Flex>
	</Box>
);

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

	// Fetch user data - For now, derive from notification (no Firebase)
	useEffect(() => {
		setUserData({
			displayName: notification.userId || "Unknown User",
			photoURL: "",
		});
		setLoading(false);
	}, [notification.userId]);

	const formatTimeAgoLocal = (timestamp: any) => {
		if (!timestamp) return "Just now";
		try {
			return formatTimeAgo(normalizeTimestamp(timestamp));
		} catch (error) {
			console.error("Error formatting timestamp:", error);
			return "Just now";
		}
	};

	const getTypeEmoji = () => {
		switch (notification.type) {
			case "comment":
				return "💬";
			case "like":
				return "❤️";
			case "follow":
				return "👥";
			case "mention":
				return "📢";
			default:
				return "📌";
		}
	};

	const handleNotificationClick = () => {
		// Mark notification as read
		onMarkAsRead(notification.id);

		// Navigate to the relevant page
		if (notification.type === "comment" && notification.postId && notification.communityName) {
			const url = `/r/${notification.communityName}/comments/${notification.postId}`;
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
			<Box p={3} borderBottom="1px solid" borderColor="gray.100">
				<Text fontSize="sm" color="gray.500">Loading...</Text>
			</Box>
		);
	}

	return (
		<Box
			p={3}
			borderBottom="1px solid"
			borderColor="gray.100"
			bg={notification.read ? "white" : "blue.50"}
			cursor="pointer"
			_hover={{ bg: "gray.50" }}
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
						<Text fontSize="sm" fontWeight="medium">
							{userData?.displayName || "Unknown User"}
						</Text>
					</Flex>
					<Text fontSize="sm" color="gray.600" mb={1}>
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
						<Text fontSize="xs" color="gray.500" fontStyle="italic">
							&ldquo;{notification.postTitle}&rdquo;
						</Text>
					)}
					{notification.communityName && (
						<Text fontSize="xs" color="blue.500">
							r/{notification.communityName}
						</Text>
					)}
					<Text fontSize="xs" color="gray.400" mt={1}>
						{formatTimeAgoLocal(notification.timestamp)}
					</Text>
				</Box>
			</Flex>
		</Box>
	);
};

export default NotificationItem;
