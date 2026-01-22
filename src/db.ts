import mysql from "mysql2/promise";

export const db = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "Pillu@123",
  database: "deplai_ticketing",
  waitForConnections: true,
  connectionLimit: 10
});
