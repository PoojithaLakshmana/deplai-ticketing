import { db } from "../db";
import { v4 as uuidv4 } from "uuid";
import { sendSlackMessage } from "./slackService";

/**
 * Severity ranking
 */
const severityRank: Record<string, number> = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4,
};

/**
 * SLA policy (days)
 */
const slaDays: Record<string, number> = {
  LOW: 14,
  MEDIUM: 7,
  HIGH: 3,
  CRITICAL: 1,
};

function calculateSlaDue(severity: string): Date {
  const days = slaDays[severity] ?? 7;
  const due = new Date();
  due.setDate(due.getDate() + days);
  return due;
}

/**
 * CREATE or UPDATE ticket (dedup + escalation)
 */
export async function upsertTicket(payload: any) {
  const {
    project_id,
    fingerprint,
    title,
    severity,
    category,
    location,
  } = payload;

  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    const [rows]: any = await conn.query(
      "SELECT * FROM tickets WHERE project_id = ? AND fingerprint = ?",
      [project_id, fingerprint]
    );

    // ---------------- NEW TICKET ----------------
    if (rows.length === 0) {
      const ticketId = uuidv4();
      const slaDue = calculateSlaDue(severity);

      await conn.query(
        `
        INSERT INTO tickets
        (
          ticket_id,
          project_id,
          fingerprint,
          title,
          severity,
          category,
          location,
          status,
          first_seen,
          last_seen,
          sla_due_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, 'OPEN', NOW(), NOW(), ?)
        `,
        [
          ticketId,
          project_id,
          fingerprint,
          title,
          severity,
          category,
          location,
          slaDue,
        ]
      );

      // 🔔 Slack: New ticket
      await sendSlackMessage(
        `🚨 New Ticket Created
Project: ${project_id}
Severity: ${severity}
Title: ${title}
Location: ${location}`
      );
    }
    // ---------------- EXISTING TICKET ----------------
    else {
      const ticket = rows[0];

      let newStatus = ticket.status;
      let newSeverity = ticket.severity;
      let newSlaDueAt = ticket.sla_due_at;

      // Reopen if resolved
      if (ticket.status === "RESOLVED") {
        newStatus = "REOPENED";

        await sendSlackMessage(
          `♻️ Ticket Reopened (Regression)
Ticket ID: ${ticket.ticket_id}
Title: ${ticket.title}`
        );
      }

      // Severity escalation
      if (severityRank[severity] > severityRank[ticket.severity]) {
        newSeverity = severity;
        newSlaDueAt = calculateSlaDue(severity);

        await sendSlackMessage(
          `⬆️ Severity Escalated
Ticket ID: ${ticket.ticket_id}
Old: ${ticket.severity}
New: ${severity}`
        );
      }

      await conn.query(
        `
        UPDATE tickets
        SET
          last_seen = NOW(),
          status = ?,
          severity = ?,
          sla_due_at = ?
        WHERE ticket_id = ?
        `,
        [newStatus, newSeverity, newSlaDueAt, ticket.ticket_id]
      );
    }

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

/**
 * RESOLVE ticket + SLA breach detection
 */
export async function resolveTicket(ticketId: string) {
  const [rows]: any = await db.query(
    "SELECT * FROM tickets WHERE ticket_id = ?",
    [ticketId]
  );

  if (rows.length === 0) {
    throw new Error("Ticket not found");
  }

  const ticket = rows[0];
  const now = new Date();
  const slaBreached =
    ticket.sla_due_at && new Date(ticket.sla_due_at) < now;

  await db.query(
    `
    UPDATE tickets
    SET
      status = 'RESOLVED',
      resolved_at = NOW(),
      sla_breached = ?
    WHERE ticket_id = ?
    `,
    [slaBreached ? 1 : 0, ticketId]
  );

  // 🔔 Slack: Resolved
  await sendSlackMessage(
    `✅ Ticket Resolved
Ticket ID: ${ticketId}
Severity: ${ticket.severity}
SLA Breached: ${slaBreached ? "YES" : "NO"}`
  );

  // 🔔 Slack: SLA Breach
  if (slaBreached) {
    await sendSlackMessage(
      `⏰ SLA BREACHED
Ticket ID: ${ticketId}
Severity: ${ticket.severity}`
    );
  }

  return {
    success: true,
    ticket_id: ticketId,
    status: "RESOLVED",
    sla_breached: slaBreached,
  };
}
