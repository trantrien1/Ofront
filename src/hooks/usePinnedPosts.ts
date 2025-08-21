import { useState, useEffect } from "react";
// Firebase removed
import { Post } from "../atoms/postsAtom";

export const usePinnedPosts = (pinnedPostIds: string[]) => {
  const [pinnedPosts, setPinnedPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchPinnedPosts = async () => {
      if (!pinnedPostIds || pinnedPostIds.length === 0) {
        setPinnedPosts([]);
        return;
      }

      setLoading(true);
      try {
  const mod = await import("../services/posts.service");
  const PostsService = mod.default || mod;
  const allPosts = (await PostsService.getPosts()) as Post[];
        const posts = allPosts.filter(p => pinnedPostIds.includes(p.id));

        // Sort posts to match the order of pinnedPostIds
        const sortedPosts = pinnedPostIds
          .map(id => posts.find(post => post.id === id))
          .filter(Boolean) as Post[];

        setPinnedPosts(sortedPosts);
      } catch (error) {
        console.error("Error fetching pinned posts:", error);
        setPinnedPosts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPinnedPosts();
  }, [pinnedPostIds]);

  return { pinnedPosts, loading };
};




