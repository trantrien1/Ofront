import type { NextApiRequest, NextApiResponse } from "next";
import { getDB } from "../../../lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const db = getDB();

  try {
    if (req.method === "GET") {
      const { postId } = req.query;
      if (!postId || Array.isArray(postId)) return res.status(400).json({ error: "postId is required" });

      const [rows] = await db.query(
        `SELECT 
           c.comment_id as id,
           c.post_id as postId,
           c.user_id as userId,
           c.content,
           c.parent_id as parentId,
           c.created_at as createdAt,
           u.username as creatorDisplayText,
           u.avatar_url as creatorPhotoURL
         FROM comments c 
         JOIN users u ON u.user_id = c.user_id
         WHERE c.post_id = ? 
         ORDER BY c.created_at ASC`,
        [postId]
      );
      return res.status(200).json(rows);
    }

    if (req.method === "POST") {
      const { postId, userId, content, parentId } = req.body || {};
      if (!postId || !userId || !content) {
        return res.status(400).json({ error: "postId, userId, content are required" });
      }

      const [result]: any = await db.query(
        `INSERT INTO comments (post_id, user_id, content, parent_id) VALUES (?, ?, ?, ?)` ,
        [postId, userId, content, parentId ?? null]
      );

      // Return the created comment basic data
      return res.status(201).json({ id: result.insertId });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err: any) {
    console.error("/api/comments error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}


