// Deprecated: no-op hook to avoid extra API calls. Home page owns fetching.
const useHomePosts = () => {
  const fetchHomePosts = async () => {
    if (process.env.NODE_ENV !== "production") {
      try { console.debug("useHomePosts.fetchHomePosts called (noop)"); } catch {}
    }
    return [] as any[];
  };
  return { fetchHomePosts };
};

export default useHomePosts;
