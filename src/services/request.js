import axios from "axios";
import nookies from "nookies";

// Use explicit NEXT_PUBLIC_API_BASE_URL when provided (useful in production or remote dev).
// Default to relative `/api/` so client code talks to the running Next server regardless of port.
const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL || "/api/";

// Read token from cookie (works on client and server with nookies)
let token = "";
try {
	const cookies = nookies.get(undefined);
	let raw = cookies?.token || "";
	// Some flows might store a JSON string in the token cookie (e.g., {"token":"<jwt>","role":"admin"})
	// Normalize it to the actual JWT string.
	if (raw) {
		let s = String(raw).trim();
		if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
			s = s.slice(1, -1);
		}
		if (s.startsWith("{") && s.endsWith("}")) {
			try {
				const obj = JSON.parse(s);
				if (obj && typeof obj.token === "string" && obj.token) {
					raw = obj.token;
				}
			} catch {}
		}
		token = raw;
	}
	
	// Fallback: try localStorage if no cookie (VS Code Simple Browser compatibility)
	if (!token && typeof window !== "undefined") {
		try {
			let ls = localStorage.getItem("authToken") || "";
			if (ls) {
				let s = String(ls).trim();
				if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) s = s.slice(1, -1);
				if (s.startsWith("{") && s.endsWith("}")) {
					try { const obj = JSON.parse(s); if (obj && typeof obj.token === 'string') ls = obj.token; } catch {}
				}
				token = ls;
			}
		} catch (e) {
			// localStorage not available
		}
	}
} catch (e) {
	token = "";
}

const request = axios.create({
	baseURL,
	// allow browser to send cookies to same-origin API routes
	withCredentials: true,
});

if (token) {
	request.defaults.headers.common["Authorization"] = `Bearer ${token}`;
	try {
		console.debug("request: initialized with token (length)", token.length);
	} catch (e) {}
}

// Function to update token after login
export const updateRequestToken = (newToken) => {
	try {
		if (newToken) {
			let t = newToken;
			// Normalize possible JSON-wrapped token
			try {
				if (typeof t === 'string') {
					let s = t.trim();
					if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
						s = s.slice(1, -1);
					}
					if (s.startsWith("{") && s.endsWith("}")) {
						const obj = JSON.parse(s);
						if (obj && typeof obj.token === 'string' && obj.token) {
							t = obj.token;
						}
					}
				}
			} catch {}
			request.defaults.headers.common["Authorization"] = `Bearer ${t}`;
			console.debug("request: token updated (length)", String(t).length);
		} else {
			delete request.defaults.headers.common["Authorization"];
			console.debug("request: token cleared");
		}
	} catch (e) {
		console.error("request: failed to update token", e);
	}
};

// Response interceptor: if we get 401, clear token and reload (force logout)
request.interceptors.response.use(
	(response) => response,
	(error) => {
		try {
			const status = error?.response?.status;
			if (status === 401) {
				try {
					nookies.destroy(undefined, "token");
				} catch (e) {}
				try {
					if (request && request.defaults && request.defaults.headers) {
						delete request.defaults.headers.common["Authorization"];
					}
				} catch (e) {}
				if (typeof window !== "undefined") {
					// redirect to home or login
					window.location.href = "/";
				}
			}
		} catch (e) {
			// ignore
		}
		// Map error to Vietnamese, so UI can show friendly messages instead of just status codes
		try {
			const localized = (() => {
				// Network or CORS error (no response)
				if (!error?.response) {
					const msg = String(error?.message || "").toLowerCase();
					if (msg.includes("network")) return "Không thể kết nối tới máy chủ. Vui lòng kiểm tra kết nối mạng.";
					return "Đã xảy ra lỗi. Vui lòng thử lại.";
				}

				const { status, data } = error.response;

				const extractText = (val) => {
					if (!val) return "";
					if (typeof val === "string") return val;
					if (typeof val === "object") {
						// Common fields
						if (typeof val.message === "string" && val.message) return val.message;
						if (typeof val.error === "string" && val.error) return val.error;
						// Validation style { errors: [{ message | defaultMessage }] }
						if (Array.isArray(val.errors) && val.errors.length) {
							const msgs = val.errors
								.map((e) => e?.message || e?.defaultMessage || e?.msg)
								.filter(Boolean);
							if (msgs.length) return msgs.join("; ");
						}
						// Next API proxy: { upstreamBody: ... }
						if (val.upstreamBody) return extractText(val.upstreamBody);
						// Spring style { detail }
						if (typeof val.detail === "string") return val.detail;
						// Fallback stringify
						try { return JSON.stringify(val); } catch { return ""; }
					}
					return "";
				};

				let rawMsg = extractText(data) || String(error?.message || "");
				let lc = rawMsg.toLowerCase();

				// Special-case common upstream payloads without a clear message
				if (lc.includes("data is not valid") || lc.includes("bad_request") || lc.includes("\"status\":\"bad_request\"")) {
					return "Sai tài khoản hoặc mật khẩu";
				}
			})();

			if (localized && typeof localized === "string") {
				// Preserve original error under a property
				error.userMessage = localized;
				try { error.message = localized; } catch {}
			}
		} catch {}
		return Promise.reject(error);
	}
);

export default request;


