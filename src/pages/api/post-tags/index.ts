import type { NextApiRequest, NextApiResponse } from "next";
import { getDB } from "../../../lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const db = getDB();

  try {
    if (req.method === "GET") {
      const { postId } = req.query;
      if (!postId || Array.isArray(postId)) return res.status(400).json({ error: "postId required" });
      const [rows] = await db.query(
        `SELECT pt.post_id as postId, pt.tag_id as tagId, t.name as tagName
         FROM post_tags pt
         JOIN tags t ON t.tag_id = pt.tag_id
         WHERE pt.post_id = ?`,
        [postId]
      );
      return res.status(200).json(rows);
    }

    if (req.method === "POST") {
      const { postId, tagId } = req.body || {};
      if (!postId || !tagId) return res.status(400).json({ error: "postId and tagId required" });
      await db.query(`INSERT IGNORE INTO post_tags (post_id, tag_id) VALUES (?, ?)`, [postId, tagId]);
      return res.status(201).json({ ok: true });
    }

    if (req.method === "DELETE") {
      const { postId, tagId } = req.body || {};
      if (!postId || !tagId) return res.status(400).json({ error: "postId and tagId required" });
      await db.query(`DELETE FROM post_tags WHERE post_id = ? AND tag_id = ?`, [postId, tagId]);
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err: any) {
    console.error("/api/post-tags error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}


