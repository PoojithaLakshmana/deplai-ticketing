import express, { Request, Response } from "express";
import { upsertTicket, resolveTicket } from "../services/ticketService";
import { db } from "../db";

const router = express.Router();

/**
 * Create or update ticket (dedup)
 */
router.post("/upsert", async (req: Request, res: Response) => {
  try {
    await upsertTicket(req.body);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Ticket upsert failed" });
  }
});

/**
 * Get tickets (optional project filter)
 */
router.get("/", async (req: Request, res: Response) => {
  try {
    const { project_id } = req.query;

    let query = "SELECT * FROM tickets";
    const params: any[] = [];

    if (project_id) {
      query += " WHERE project_id = ?";
      params.push(project_id);
    }

    query += " ORDER BY last_seen DESC";

    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch tickets" });
  }
});

/**
 * Resolve a ticket
 */
router.patch("/:id/resolve", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await resolveTicket(id);
    res.json(result);
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

export default router;
import { generateTicketWordDoc } from "../services/wordExportService";

router.get("/:id/word", async (req, res) => {
  const { id } = req.params;

  const [rows]: any = await db.query(
    "SELECT * FROM tickets WHERE ticket_id = ?",
    [id]
  );

  if (rows.length === 0) {
    return res.status(404).json({ error: "Ticket not found" });
  }

  const filePath = await generateTicketWordDoc(rows[0]);
  res.json({ filePath });
});

