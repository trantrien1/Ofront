import type { NextApiRequest, NextApiResponse } from "next";
import { getDB } from "../../../lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const db = getDB();
  const { userId, postId, commentId } = req.body || {};
  if (!userId || (!postId && !commentId)) {
    return res.status(400).json({ error: "userId and postId or commentId required" });
  }

  try {
    // Check existing like (unique on userId + postId + commentId)
    const [rows]: any = await db.query(
      `SELECT like_id FROM likes WHERE user_id = ? AND ${postId ? "post_id = ?" : "post_id IS NULL"} AND ${commentId ? "comment_id = ?" : "comment_id IS NULL"} LIMIT 1`,
      postId && commentId ? [userId, postId, commentId] : postId ? [userId, postId] : [userId, commentId]
    );

    if (rows.length) {
      await db.query(
        `DELETE FROM likes WHERE like_id = ?`,
        [rows[0].like_id]
      );
      return res.status(200).json({ liked: false });
    }

    await db.query(
      `INSERT INTO likes (user_id, post_id, comment_id) VALUES (?, ?, ?)` ,
      [userId, postId ?? null, commentId ?? null]
    );
    return res.status(200).json({ liked: true });
  } catch (err: any) {
    console.error("/api/likes/toggle error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}


