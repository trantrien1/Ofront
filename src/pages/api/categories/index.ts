import type { NextApiRequest, NextApiResponse } from "next";
import { getDB } from "../../../lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const db = getDB();

  try {
    if (req.method === "GET") {
      const [rows] = await db.query(
        `SELECT category_id as id, name, description, created_at as createdAt FROM categories ORDER BY created_at DESC`
      );
      return res.status(200).json(rows);
    }

    if (req.method === "POST") {
      const { name, description } = req.body || {};
      if (!name) return res.status(400).json({ error: "name is required" });
      const [result]: any = await db.query(
        `INSERT INTO categories (name, description) VALUES (?, ?)` ,
        [name, description ?? null]
      );
      return res.status(201).json({ id: result.insertId });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err: any) {
    console.error("/api/categories error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}


