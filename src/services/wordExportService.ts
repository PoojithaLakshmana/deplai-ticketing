import { Document, Packer, Paragraph, TextRun } from "docx";
import fs from "fs";
import path from "path";

export async function generateTicketWordDoc(ticket: any) {
  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: "DeplAI – Ticket Summary",
                bold: true,
                size: 32,
              }),
            ],
          }),

          new Paragraph(`Ticket ID: ${ticket.ticket_id}`),
          new Paragraph(`Project: ${ticket.project_id}`),
          new Paragraph(`Title: ${ticket.title}`),
          new Paragraph(`Severity: ${ticket.severity}`),
          new Paragraph(`Category: ${ticket.category}`),
          new Paragraph(`Location: ${ticket.location}`),
          new Paragraph(`Status: ${ticket.status}`),
          new Paragraph(`First Seen: ${ticket.first_seen}`),
          new Paragraph(`Last Seen: ${ticket.last_seen}`),
          new Paragraph(`SLA Due: ${ticket.sla_due_at ?? "N/A"}`),
          new Paragraph(`SLA Breached: ${ticket.sla_breached ? "YES" : "NO"}`),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);

  const filePath = path.join(
    process.cwd(),
    `ticket-${ticket.ticket_id}.docx`
  );

  fs.writeFileSync(filePath, buffer);

  return filePath;
}
