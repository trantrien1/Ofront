import type { NextApiRequest, NextApiResponse } from "next";
import { getDB } from "../../../lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const db = getDB();
  const { id } = req.query;
  if (!id || Array.isArray(id)) return res.status(400).json({ error: "id required" });

  try {
    if (req.method === "DELETE") {
      await db.query(`DELETE FROM posts WHERE post_id = ?`, [id]);
      return res.status(200).json({ ok: true });
    }

    if (req.method === "GET") {
      const [rows]: any = await db.query(
        `SELECT 
          p.post_id AS id,
          p.user_id AS creatorId,
          p.category_id AS communityId,
          p.title,
          p.content AS body,
          p.type,
          p.created_at AS createdAt,
          p.updated_at AS updatedAt,
          p.status
        FROM posts p WHERE p.post_id = ? LIMIT 1`,
        [id]
      );
      if (!rows.length) return res.status(404).json({ error: "Not found" });
      return res.status(200).json(rows[0]);
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    console.error("/api/posts/[id] error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}


