import type { NextApiRequest, NextApiResponse } from "next";
import { getDB } from "../../../lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const db = getDB();

  try {
    if (req.method === "GET") {
      const [rows] = await db.query(`SELECT tag_id as id, name FROM tags ORDER BY name ASC`);
      return res.status(200).json(rows);
    }

    if (req.method === "POST") {
      const { name } = req.body || {};
      if (!name) return res.status(400).json({ error: "name is required" });
      const [result]: any = await db.query(
        `INSERT INTO tags (name) VALUES (?)` ,
        [name]
      );
      return res.status(201).json({ id: result.insertId });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err: any) {
    console.error("/api/tags error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}


