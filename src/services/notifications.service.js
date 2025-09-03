import request from "./request";

// Backend endpoints per NotificationController:
// GET  notifications/get
// PUT  notifications/{id}/read
export const getUserNotifications = async () => {
	try {
		const response = await request.get("notifications/get");
		return response.data;
	} catch (e) {
		try { console.warn("getUserNotifications failed:", e?.response?.status, e?.message); } catch {}
		return [];
	}
};

export const markNotificationAsRead = async (id) => {
	const response = await request.put(`notifications/${id}/read`);
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


