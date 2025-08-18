import type { NextApiRequest, NextApiResponse } from "next";
import { getDB } from "../../../lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "DELETE") return res.status(405).json({ error: "Method not allowed" });

  const db = getDB();
  const { id } = req.query;
  if (!id || Array.isArray(id)) return res.status(400).json({ error: "id required" });

  try {
    await db.query(`DELETE FROM comments WHERE comment_id = ?`, [id]);
    return res.status(200).json({ ok: true });
  } catch (err: any) {
    console.error("DELETE /api/comments/[id] error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}


