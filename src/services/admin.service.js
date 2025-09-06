import request from "./request";

// Admin API services for dashboard data
export const getAdminStats = async () => {
  try {
    const response = await request.get("admin/stats");
    return response.data;
  } catch (error) {
    console.error("AdminService.getAdminStats: error=", error);
    throw error;
  }
};

export const getRecentPosts = async (limit = 10) => {
  try {
    const response = await request.get(`admin/posts/recent?limit=${limit}`);
    return response.data;
  } catch (error) {
    console.error("AdminService.getRecentPosts: error=", error);
    throw error;
  }
};

export const getRecentUsers = async (limit = 10) => {
  try {
    const response = await request.get(`admin/users/recent?limit=${limit}`);
    return response.data;
  } catch (error) {
    console.error("AdminService.getRecentUsers: error=", error);
    throw error;
  }
};

export const getReports = async (status = 'all') => {
  try {
    const response = await request.get(`admin/reports?status=${status}`);
    return response.data;
  } catch (error) {
    console.error("AdminService.getReports: error=", error);
    throw error;
  }
};

export const updatePostStatus = async (postId, status) => {
  try {
    const response = await request.put(`admin/posts/${postId}/status`, { status });
    return response.data;
  } catch (error) {
    console.error("AdminService.updatePostStatus: error=", error);
    throw error;
  }
};

export const deletePost = async (postId) => {
  // Backend only exposes /post/delete/{id}; reuse it here so existing admin UI code still works.
  try {
    if (postId == null) throw new Error('postId required');
    const response = await request.delete(`post/delete/${postId}`);
    return response.data;
  } catch (error) {
    console.error("AdminService.deletePost (mapped to /post/delete/{id}) error=", error);
    throw error;
  }
};

export const updateUserStatus = async (userId, status) => {
  try {
    const response = await request.put(`admin/users/${userId}/status`, { status });
    return response.data;
  } catch (error) {
    console.error("AdminService.updateUserStatus: error=", error);
    throw error;
  }
};

export const deleteUser = async (userId) => {
  try {
    const response = await request.delete(`admin/users/${userId}`);
    return response.data;
  } catch (error) {
    console.error("AdminService.deleteUser: error=", error);
    throw error;
  }
};

export const updateReportStatus = async (reportId, status) => {
  try {
    const response = await request.put(`admin/reports/${reportId}/status`, { status });
    return response.data;
  } catch (error) {
    console.error("AdminService.updateReportStatus: error=", error);
    throw error;
  }
};

export const banUser = async (userId, reason, duration) => {
  try {
    const response = await request.post(`admin/users/${userId}/ban`, { reason, duration });
    return response.data;
  } catch (error) {
    console.error("AdminService.banUser: error=", error);
    throw error;
  }
};

export const unbanUser = async (userId) => {
  try {
    const response = await request.post(`admin/users/${userId}/unban`);
    return response.data;
  } catch (error) {
    console.error("AdminService.unbanUser: error=", error);
    throw error;
  }
};

export default {
  getAdminStats,
  getRecentPosts,
  getRecentUsers,
  getReports,
  updatePostStatus,
  deletePost,
  updateUserStatus,
  deleteUser,
  updateReportStatus,
  banUser,
  unbanUser,
};
