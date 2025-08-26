import React, { useEffect, useState } from "react";
import PageContentLayout from "../../components/Layout/PageContent";
import { Box, Button, Flex, Heading, HStack, IconButton, Image, Input, Stack, Text, Textarea, useDisclosure, useToast } from "@chakra-ui/react";
import { useRouter } from "next/router";
import { DeleteIcon, EditIcon } from "@chakra-ui/icons";

interface VideoItem {
  id: string;
  title: string;
  description?: string;
  duration?: string;
  thumb?: string;
}

const VideosPage: React.FC = () => {
  const toast = useToast();
  const router = useRouter();
  const courseId = (router.query.courseId as string) || "c1";
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");

  useEffect(() => {
    // TODO: replace with real service call
    setVideos([
      { id: "v1", title: "Intro", description: "Welcome to the course", duration: "03:12", thumb: "/images/redditlogo.png" },
      { id: "v2", title: "Setup", description: "Install tools", duration: "07:45", thumb: "/images/redditlogo.png" },
    ]);
  }, [courseId]);

  const onUpload = async () => {
    setUploading(true);
    try {
      // TODO: integrate upload
      const id = `v${Date.now()}`;
      setVideos(prev => [{ id, title: newTitle || `Video ${prev.length + 1}`, description: newDescription, duration: "--:--" }, ...prev]);
      setNewTitle("");
      setNewDescription("");
      toast({ status: "success", title: "Uploaded" });
    } finally { setUploading(false); }
  };

  const onDelete = (id: string) => {
    setVideos(prev => prev.filter(v => v.id !== id));
    toast({ status: "success", title: "Deleted" });
  };

  const onEdit = (id: string, title: string, description?: string) => {
    setVideos(prev => prev.map(v => v.id === id ? { ...v, title, description } : v));
    toast({ status: "success", title: "Saved" });
  };

  return (
    <PageContentLayout>
      <Stack spacing={4}>
        <Heading size="md">Manage Course Videos</Heading>
        <Box borderWidth="1px" borderRadius="md" p={4} bg="white">
          <Heading size="sm" mb={3}>Upload</Heading>
          <Stack spacing={3}>
            <Input placeholder="Video title" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
            <Textarea placeholder="Description" value={newDescription} onChange={(e) => setNewDescription(e.target.value)} />
            <Button onClick={onUpload} colorScheme="blue" isLoading={uploading}>Upload</Button>
          </Stack>
        </Box>

        <Stack spacing={3}>
          {videos.map(v => (
            <Box key={v.id} borderWidth="1px" borderRadius="md" p={3} bg="white">
              <Flex>
                {v.thumb && <Image src={v.thumb} alt={v.title} boxSize="64px" mr={3} objectFit="cover" borderRadius="md" />}
                <Box flex={1}>
                  <Flex justify="space-between" align="start">
                    <Heading size="sm">{v.title}</Heading>
                    <HStack>
                      <IconButton aria-label="edit" icon={<EditIcon />} size="sm" onClick={() => onEdit(v.id, `${v.title} (edited)`, v.description)} />
                      <IconButton aria-label="delete" icon={<DeleteIcon />} size="sm" onClick={() => onDelete(v.id)} />
                    </HStack>
                  </Flex>
                  {v.description && <Text fontSize="sm" color="gray.600">{v.description}</Text>}
                  {v.duration && <Text fontSize="xs" color="gray.500">Duration: {v.duration}</Text>}
                </Box>
              </Flex>
            </Box>
          ))}
        </Stack>
      </Stack>
      <Box />
    </PageContentLayout>
  );
};

export default VideosPage;
