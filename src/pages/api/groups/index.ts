import type { NextApiRequest, NextApiResponse } from "next";
import { getDB } from "../../../lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const db = getDB();

  try {
    if (req.method === "GET") {
      const [rows] = await db.query(
        `SELECT group_id as id, name, description, is_private as isPrivate, created_at as createdAt FROM groups ORDER BY created_at DESC`
      );
      return res.status(200).json(rows);
    }

    if (req.method === "POST") {
      const { name, description, isPrivate } = req.body || {};
      if (!name) return res.status(400).json({ error: "name is required" });
      const [result]: any = await db.query(
        `INSERT INTO groups (name, description, is_private) VALUES (?, ?, ?)` ,
        [name, description ?? null, !!isPrivate]
      );
      return res.status(201).json({ id: result.insertId });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err: any) {
    console.error("/api/groups error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}


