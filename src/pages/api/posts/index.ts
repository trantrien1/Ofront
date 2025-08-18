import type { NextApiRequest, NextApiResponse } from "next";
import { getDB } from "../../../lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const db = getDB();

  try {
    if (req.method === "GET") {
      const { categoryId, userId } = req.query;

      let sql = `
        SELECT 
          p.post_id AS id,
          p.user_id AS creatorId,
          p.category_id AS communityId,
          p.title,
          p.content AS body,
          p.type,
          p.created_at AS createdAt,
          p.updated_at AS updatedAt,
          p.status,
          COALESCE(l.likes, 0) AS voteStatus,
          COALESCE(c.comments, 0) AS numberOfComments
        FROM posts p
        LEFT JOIN (
          SELECT post_id, COUNT(*) AS likes
          FROM likes
          WHERE comment_id IS NULL
          GROUP BY post_id
        ) l ON l.post_id = p.post_id
        LEFT JOIN (
          SELECT post_id, COUNT(*) AS comments
          FROM comments
          GROUP BY post_id
        ) c ON c.post_id = p.post_id`;
      const params: any[] = [];
      const where: string[] = [];

      if (categoryId && !Array.isArray(categoryId)) {
        where.push("p.category_id = ?");
        params.push(categoryId);
      }
      if (userId && !Array.isArray(userId)) {
        where.push("p.user_id = ?");
        params.push(userId);
      }
      if (where.length) sql += ` WHERE ${where.join(" AND ")}`;
      sql += " ORDER BY p.created_at DESC";

      const [rows] = await db.query(sql, params);
      return res.status(200).json(rows);
    }

    if (req.method === "POST") {
      const { userId, categoryId, title, content, type, status } = req.body || {};
      if (!userId || !title || !content) {
        return res.status(400).json({ error: "userId, title, content are required" });
      }

      const [result]: any = await db.query(
        `INSERT INTO posts (user_id, category_id, title, content, type, status) VALUES (?, ?, ?, ?, ?, ?)` ,
        [userId, categoryId ?? null, title, content, type ?? "forum", status ?? 1]
      );

      return res.status(201).json({ id: result.insertId });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err: any) {
    console.error("/api/posts error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}


