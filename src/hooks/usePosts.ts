import { useEffect, useRef, useState } from "react";
import { useRecoilState, useRecoilValue, useSetRecoilState } from "recoil";
import { authModalState } from "../atoms/authModalAtom";
import { Community, communityState } from "../atoms/communitiesAtom";
import { Post, postState } from "../atoms/postsAtom";
import { useRouter } from "next/router";
import { userState } from "../atoms/userAtom";
import * as PostsService from "../services/posts.service";

// Expanded like-level mapping to align with API (1..5)
// 1: Like (Đồng ý), 2: Love (Tim), 3: Care/Strong like, 4: Wow/Haha, 5: Angry
export const LIKE_LEVEL = { LIKE: 1, LOVE: 2, CARE: 3, WOW: 4, ANGRY: 5 } as const;
type LikeLevel = 1 | 2 | 3 | 4 | 5;

const usePosts = (communityData?: Community) => {
  const router = useRouter();
  const [postStateValue, setPostStateValue] = useRecoilState(postState);
  const communityValue = useRecoilValue(communityState);
  const user = useRecoilValue(userState);
  const setAuthModalState = useSetRecoilState(authModalState);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false); // kept for compatibility

  // Prevent parallel requests per post
  const inflightRef = useRef<Record<string, boolean>>({});

  const selectPost = (post: Post, postIdx: number) => {
    setPostStateValue(prev => ({ ...prev, selectedPost: { ...post, postIdx } }));
    const cid = communityData?.id || post.communityId;
    router.push(cid ? `/community/${cid}/comments/${post.id}` : `/comments/${post.id}`);
  };

  // Patch a post everywhere (posts array, selectedPost, cache)
  const patchPostEverywhere = (updated: Post) => {
    setPostStateValue(prev => {
      const uid = String(updated.id);
      let found = false;
      const posts = prev.posts.map(p => {
        if (String(p.id) === uid) { found = true; return updated; }
        return p;
      });
      if (!found) { try { console.warn('[patchPostEverywhere] post not found in list', { id: uid }); } catch {} }
      const selectedPost = prev.selectedPost && String(prev.selectedPost.id) === uid
        ? { ...(prev.selectedPost as Post), ...updated }
        : prev.selectedPost;
      const cid = updated.communityId || communityValue.currentCommunity?.id;
      let postsCache = prev.postsCache;
      if (cid) {
        const existing = prev.postsCache[cid] || [];
        postsCache = { ...prev.postsCache, [cid]: existing.map(p => String(p.id) === uid ? updated : p) };
      }
      return { ...prev, posts, selectedPost, postsCache };
    });
  };

  // Satisfaction setter (optimistic + rollback + spam guard)
  const setSatisfaction = async (post: Post, level: LikeLevel) => {
  try { console.log('[update-level][invoke]', { postId: post?.id, level, uid: user?.uid }); } catch {}
    if (!user?.uid) { setAuthModalState({ open: true, view: "login" }); return; }
    if (!post?.id) return;
    const key = String(post.id);
  if (inflightRef.current[key]) { try { console.log('[update-level][skip-inflight]', { postId: post.id }); } catch {}; return; }
    inflightRef.current[key] = true;
    const prev = post as Post;
    const optimistic = { ...post, likeLevel: level } as any;
  try { console.log('[update-level][optimistic]', { postId: post.id, level }); } catch {}
    patchPostEverywhere(optimistic);
    // Expose for manual inspection in DevTools
    try { (window as any).__lastSatisfaction = { ts: Date.now(), postId: post.id, level }; } catch {}
    // Fuse: auto-clear inflight after 6s in case promise hangs
    const fuse = setTimeout(() => {
      if (inflightRef.current[key]) {
        inflightRef.current[key] = false;
        try { console.warn('[usePosts] fuse cleared inflight stuck', { postId: post.id }); } catch {}
      }
    }, 6000);
    try {
  await (PostsService as any).updateLikeLevel?.({ postId: post.id, level });
  try { console.log('[update-level][success]', { postId: post.id, level }); } catch {}
    } catch (e: any) {
      patchPostEverywhere(prev); // rollback
      setError(e?.message || 'Cập nhật phản hồi thất bại');
    console.error('[update-level][error]', e);
    } finally {
      inflightRef.current[key] = false;
  try { console.log('[update-level][inflight-cleared]', { postId: post.id }); } catch {}
      clearTimeout(fuse);
    }
  };

  // Local clear (no backend delete yet)
  const clearSatisfaction = async (post: Post) => {
    if (!user?.uid) { setAuthModalState({ open: true, view: "login" }); return; }
    if (!post?.id) return;
    const prev = post;
    const optimistic: any = { ...post };
    delete optimistic.likeLevel;
    patchPostEverywhere(optimistic);
    // When backend supports clearing, call API & rollback if fails
  };

  // Legacy vote (kept only if some UI still calls it) – could be removed later
  const onVote = async (e: React.MouseEvent<any>, post: Post) => {
    e.stopPropagation();
    // Redirect legacy like to strong like (CARE) toggle
    if ((post as any).likeLevel === LIKE_LEVEL.CARE) return clearSatisfaction(post);
    return setSatisfaction(post, LIKE_LEVEL.CARE);
  };

  const onDeletePost = async (post: Post): Promise<boolean> => {
    try {
      const currentUid = user?.uid?.toLowerCase();
      const candidates = [ (post as any).creatorId, (post as any).userUID, post.userDisplayText, (post as any).userOfPost?.username, (post as any).userOfPost?.userUID ]
        .filter(Boolean).map((v: any) => String(v).toLowerCase());
      const isOwner = !!currentUid && candidates.includes(currentUid);
      const isAdmin = (user as any)?.role === 'admin';
      if (!isOwner && !isAdmin) return false;
      await (PostsService as any).deletePost?.({ postId: post.id });
      setPostStateValue(prev => ({
        ...prev,
        posts: prev.posts.filter(p => p.id !== post.id),
        postsCache: {
          ...prev.postsCache,
          [post.communityId]: (prev.postsCache[post.communityId] || []).filter(p => p.id !== post.id)
        }
      }));
      return true;
    } catch (e) { console.error('onDeletePost error', e); return false; }
  };

  // Adapter for UI: accept and forward any level 1..5
  const onUpdateLikeLevel = async (post: Post, level: number) => {
    const clamped = Math.max(1, Math.min(5, Math.floor(level)));
    return setSatisfaction(post, clamped as LikeLevel);
  };

  return {
    postStateValue,
    setPostStateValue,
    // renamed selectPost but keep original alias for safety
    selectPost,
    onSelectPost: selectPost,
    onDeletePost,
  // satisfaction API
  setSatisfied: (post: Post) => setSatisfaction(post, LIKE_LEVEL.CARE),
  setDissatisfied: (post: Post) => setSatisfaction(post, LIKE_LEVEL.LIKE),
    clearSatisfaction,
    // legacy
    onVote,
    onUpdateLikeLevel,
    LIKE_LEVEL,
    LIKE_LEVEL_LABELS: (PostsService as any).LIKE_LEVEL_LABELS || {},
    loading,
    setLoading,
    error,
  };
};

export default usePosts;
