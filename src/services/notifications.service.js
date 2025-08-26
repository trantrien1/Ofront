import request from "./request";

export const getUserNotifications = async (userId) => {
	try {
		const response = await request.get("notifications", { params: { userId } });
		return response.data;
	} catch (e) {
		try { console.warn("getUserNotifications failed:", e?.response?.status, e?.message); } catch {}
		return [];
	}
};

export const markNotificationAsRead = async (id) => {
	const response = await request.patch("notifications", { id, read: true });
	return response.data;
};

export const markManyNotificationsAsRead = async (ids) => {
	const responses = await Promise.all(ids.map((id) => markNotificationAsRead(id)));
	return responses.map((r) => r);
};

export const createNotification = async (payload) => {
	const response = await request.post("notifications", payload);
	return response.data;
};

export default {
	getUserNotifications,
	markNotificationAsRead,
	markManyNotificationsAsRead,
	createNotification,
};


