import mysql from "mysql2/promise";

const {
  MYSQL_HOST = "localhost",
  MYSQL_PORT = "3306",
  MYSQL_USER = "root",
  MYSQL_PASSWORD = "",
  MYSQL_DATABASE = "forum_blog",
} = process.env as Record<string, string>;

let pool: mysql.Pool | null = null;

export const getDB = () => {
  if (!pool) {
    pool = mysql.createPool({
      host: MYSQL_HOST,
      port: Number(MYSQL_PORT),
      user: MYSQL_USER,
      password: MYSQL_PASSWORD,
      database: MYSQL_DATABASE,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      timezone: "Z",
    });
  }
  return pool;
};

export type DB = ReturnType<typeof getDB>;


