export interface ApprovePostParams { postId: string | number; approve?: boolean }
export interface UpdatePostParams { postId: string | number; title?: string; content?: string }

export declare const getPosts: (options?: any) => Promise<any[]>;
export declare const likePost: (params: { postId: string | number }) => Promise<any>;
export declare const approvePost: (params: ApprovePostParams) => Promise<any>;
export declare const updatePost: (params: UpdatePostParams) => Promise<any>;
export declare const deletePost: (params: { postId: string | number }) => Promise<any>;
export declare const createPost: (postData: any) => Promise<any>;

declare const _default: {
  getPosts: typeof getPosts;
  likePost: typeof likePost;
  approvePost: typeof approvePost;
  updatePost: typeof updatePost;
  deletePost: typeof deletePost;
  createPost: typeof createPost;
}
export default _default;
