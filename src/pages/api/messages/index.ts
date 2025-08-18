import type { NextApiRequest, NextApiResponse } from "next";
import { getDB } from "../../../lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const db = getDB();

  try {
    if (req.method === "GET") {
      const { userA, userB } = req.query;
      if (!userA || !userB || Array.isArray(userA) || Array.isArray(userB)) {
        return res.status(400).json({ error: "userA and userB are required" });
      }
      const [rows] = await db.query(
        `SELECT m.message_id as id, m.sender_id as senderId, m.receiver_id as receiverId, m.content, m.created_at as createdAt
         FROM messages m
         WHERE (m.sender_id = ? AND m.receiver_id = ?) OR (m.sender_id = ? AND m.receiver_id = ?)
         ORDER BY m.created_at ASC`,
        [userA, userB, userB, userA]
      );
      return res.status(200).json(rows);
    }

    if (req.method === "POST") {
      const { senderId, receiverId, content } = req.body || {};
      if (!senderId || !receiverId || !content) {
        return res.status(400).json({ error: "senderId, receiverId, content are required" });
      }
      const [result]: any = await db.query(
        `INSERT INTO messages (sender_id, receiver_id, content) VALUES (?, ?, ?)` ,
        [senderId, receiverId, content]
      );
      return res.status(201).json({ id: result.insertId });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err: any) {
    console.error("/api/messages error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}


