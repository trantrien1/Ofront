import type { NextApiRequest, NextApiResponse } from "next";
import { getDB } from "../../../lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const db = getDB();

  try {
    if (req.method === "GET") {
      const { userId } = req.query;
      if (!userId || Array.isArray(userId)) return res.status(400).json({ error: "userId required" });
      const [rows] = await db.query(
        `SELECT n.notification_id as id, n.user_id as userId, n.content, n.is_read as isRead, n.created_at as createdAt
         FROM notifications n WHERE n.user_id = ? ORDER BY n.created_at DESC`,
        [userId]
      );
      return res.status(200).json(rows);
    }

    if (req.method === "POST") {
      const { userId, content } = req.body || {};
      if (!userId || !content) return res.status(400).json({ error: "userId and content required" });
      const [result]: any = await db.query(
        `INSERT INTO notifications (user_id, content) VALUES (?, ?)` ,
        [userId, content]
      );
      return res.status(201).json({ id: result.insertId });
    }

    if (req.method === "PATCH") {
      const { id, read } = req.body || {};
      if (!id) return res.status(400).json({ error: "id required" });
      await db.query(`UPDATE notifications SET is_read = ? WHERE notification_id = ?`, [!!read, id]);
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err: any) {
    console.error("/api/notifications error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}


