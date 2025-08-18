import type { NextApiRequest, NextApiResponse } from "next";
import { getDB } from "../../../lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const db = getDB();

  try {
    if (req.method === "GET") {
      const { groupId } = req.query;
      if (!groupId || Array.isArray(groupId)) return res.status(400).json({ error: "groupId required" });
      const [rows] = await db.query(
        `SELECT gm.group_id as groupId, gm.user_id as userId, gm.role, gm.joined_at as joinedAt, gm.status
         FROM group_members gm WHERE gm.group_id = ?`,
        [groupId]
      );
      return res.status(200).json(rows);
    }

    if (req.method === "POST") {
      const { groupId, userId, role = "member", status = 1 } = req.body || {};
      if (!groupId || !userId) return res.status(400).json({ error: "groupId and userId required" });
      await db.query(
        `INSERT INTO group_members (group_id, user_id, role, status) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE role = VALUES(role), status = VALUES(status)`,
        [groupId, userId, role, status]
      );
      return res.status(201).json({ ok: true });
    }

    if (req.method === "DELETE") {
      const { groupId, userId } = req.body || {};
      if (!groupId || !userId) return res.status(400).json({ error: "groupId and userId required" });
      await db.query(`DELETE FROM group_members WHERE group_id = ? AND user_id = ?`, [groupId, userId]);
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err: any) {
    console.error("/api/group-members error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}


