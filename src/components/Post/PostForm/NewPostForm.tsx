import React, { useEffect, useRef, useState } from "react";
import {
	Box,
	Button,
	Flex,
	Icon,
	Input,
	Stack,
	Textarea,
	Image,
	Select,
	RadioGroup,
	HStack,
	Radio,
	Text,
} from "@chakra-ui/react";
type User = { uid: string; email?: string };
import { useRouter } from "next/router";
import { BiPoll } from "react-icons/bi";
import { BsLink45Deg, BsMic } from "react-icons/bs";
import { IoDocumentText, IoImageOutline } from "react-icons/io5";
import { AiFillCloseCircle } from "react-icons/ai";
import { useRecoilState, useSetRecoilState } from "recoil";
import PostsService, { createPost as createPostApi } from "../../../services/posts.service";

import TabItem from "./TabItem";
import { postState } from "../../../atoms/postsAtom";

import TextInputs from "./TextInputs";
import ImageUpload from "./ImageUpload";

const formTabs = [
	{
		title: "Post",
		icon: IoDocumentText,
	},
	{
		title: "Images & Video",
		icon: IoImageOutline,
	},
	{
		title: "Link",
		icon: BsLink45Deg,
	},
	{
		title: "Poll",
		icon: BiPoll,
	},
	{
		title: "Talk",
		icon: BsMic,
	},
];

export type TabItemType = {
	title: string;
	icon: typeof Icon.arguments;
};

type NewPostFormProps = {
	communityId: string;
	communityImageURL?: string;
	user: User;
};

const NewPostForm: React.FC<NewPostFormProps> = ({
	communityId,
	communityImageURL,
	user,
}) => {
	const [selectedTab, setSelectedTab] = useState(formTabs[0].title);
	const [textInputs, setTextInputs] = useState({
		title: "",
		body: "",
	});
	const [selectedFile, setSelectedFile] = useState<string>();
	const selectFileRef = useRef<HTMLInputElement>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const router = useRouter();
	const setPostItems = useSetRecoilState(postState);
	const [visibility, setVisibility] = useState<"public" | "community">("public");
	const [targetCommunityId, setTargetCommunityId] = useState<string>(communityId || "");

		const handleCreatePost = async () => {
			setLoading(true);
			const { title, body } = textInputs;
			try {
				const payload: any = {
					title,
					body,
					postType: selectedFile ? "IMAGE" : "TEXT",
					imageURL: selectedFile || null,
					communityId: visibility === "community" ? targetCommunityId : null,
					isPersonalPost: visibility !== "community",
				};
				await createPostApi(payload);
				// Navigate home and let the Home page refresh after ~2s
				try { await router.push('/?refreshDelay=2000'); } catch {}
			} catch (error) {
				setError("Error creating post");
			} finally {
				setLoading(false);
			}
		};

	const onSelectImage = (event: React.ChangeEvent<HTMLInputElement>) => {
		const reader = new FileReader();
		if (event.target.files?.[0]) {
			const file = event.target.files[0];
			// Compress image if it's larger than 500KB
			if (file.size > 500 * 1024) {
				const canvas = document.createElement('canvas');
				const ctx = canvas.getContext('2d');
				const img = new window.Image();
				img.onload = () => {
					// Calculate new dimensions (max 800px width/height)
					const maxSize = 800;
					let { width, height } = img;
					if (width > height) {
						if (width > maxSize) {
							height = (height * maxSize) / width;
							width = maxSize;
						}
					} else {
						if (height > maxSize) {
							width = (width * maxSize) / height;
							height = maxSize;
						}
					}
					canvas.width = width;
					canvas.height = height;
					ctx?.drawImage(img, 0, 0, width, height);
					const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
					setSelectedFile(compressedDataUrl);
				};
				img.src = URL.createObjectURL(file);
			} else {
				reader.readAsDataURL(file);
				reader.onload = (readerEvent) => {
					if (readerEvent.target?.result) {
						setSelectedFile(readerEvent.target?.result as string);
					}
				};
			}
		}
	};

	const onTextChange = ({
		target: { name, value },
	}: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
		setTextInputs((prev) => ({
			...prev,
			[name]: value,
		}));
	};

	return (
		<Flex direction="column" bg="white" borderRadius={4} mt={2}>
			{/* Audience / Visibility */}
			<Box p={4} borderBottom="1px solid" borderColor="gray.100">
				<Stack spacing={3}>
					<Box>
						<Text fontSize="sm" fontWeight={600} mb={2}>Audience</Text>
						<RadioGroup value={visibility} onChange={(val) => setVisibility(val as any)}>
							<HStack spacing={6}>
								<Radio value="public">Public</Radio>
								<Radio value="community">Community</Radio>
							</HStack>
						</RadioGroup>
					</Box>
					{visibility === "community" && (
						<Box>
							<Text fontSize="sm" fontWeight={600} mb={2}>Select community</Text>
							<Select value={targetCommunityId} onChange={(e) => setTargetCommunityId(e.target.value)} placeholder="Select community">
								{communityId && (
									<option value={communityId}>{communityId}</option>
								)}
							</Select>
						</Box>
					)}
				</Stack>
			</Box>
			<Flex width="100%">
				{formTabs.map((item, index) => (
					<TabItem
						key={index}
						item={item}
						selected={item.title === selectedTab}
						setSelectedTab={setSelectedTab}
					/>
				))}
			</Flex>
			<Flex p={4}>
				{selectedTab === "Post" && (
					<TextInputs
						textInputs={textInputs}
						onChange={onTextChange}
						handleCreatePost={handleCreatePost}
						loading={loading}
					/>
				)}
				{selectedTab === "Images & Video" && (
					<ImageUpload
						selectedFile={selectedFile}
						setSelectedFile={setSelectedFile}
						setSelectedTab={setSelectedTab}
						selectFileRef={selectFileRef}
						onSelectImage={onSelectImage}
						handleCreatePost={handleCreatePost}
						loading={loading}
						textInputs={textInputs}
					/>
				)}
			</Flex>
		</Flex>
	);
}
export default NewPostForm;
