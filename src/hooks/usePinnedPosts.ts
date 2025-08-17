import { useState, useEffect } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { firestore } from "../firebase/clientApp";
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
        const postsRef = collection(firestore, "posts");
        const q = query(postsRef, where("__name__", "in", pinnedPostIds));
        const querySnapshot = await getDocs(q);
        
        const posts: Post[] = [];
        querySnapshot.forEach((doc) => {
          posts.push({ id: doc.id, ...doc.data() } as Post);
        });

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
