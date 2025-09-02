import React, { useState } from "react";

type PostsHomeProps = {};

const PostsHome: React.FC<PostsHomeProps> = () => {
  const [loading, setLoading] = useState(false);

  // stuff related to home page only
  return <div>Trình bao bọc bài viết trang chủ</div>;
};
export default PostsHome;
