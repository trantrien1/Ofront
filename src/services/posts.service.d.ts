export interface ApprovePostParams { postId: string | number; approve?: boolean }
export interface UpdatePostParams { postId: string | number; title?: string; content?: string }

export declare const getPosts: (options?: any) => Promise<any[]>;
export declare const getPostsByGroup: (params: { groupId: string | number; sort?: string; typeSort?: string }) => Promise<any[]>;
export declare const likePost: (params: { postId: string | number }) => Promise<any>;
export declare const approvePost: (params: ApprovePostParams) => Promise<any>;
export declare const updatePost: (params: UpdatePostParams) => Promise<any>;
export declare const deletePost: (params: { postId: string | number }) => Promise<any>;
export declare const createPost: (postData: any) => Promise<any>;
export declare const getPostById: (params: { postId: string | number }) => Promise<any>;

declare const _default: {
  getPosts: typeof getPosts;
  getPostsByGroup: typeof getPostsByGroup;
  likePost: typeof likePost;
  approvePost: typeof approvePost;
  updatePost: typeof updatePost;
  deletePost: typeof deletePost;
  createPost: typeof createPost;
  getPostById: typeof getPostById;
}
export default _default;
