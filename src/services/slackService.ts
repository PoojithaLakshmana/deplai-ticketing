import axios from "axios";

const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;

export async function sendSlackMessage(text: string) {
  if (!SLACK_WEBHOOK_URL) {
    console.warn("Slack webhook URL not configured");
    return;
  }

  try {
    await axios.post(SLACK_WEBHOOK_URL, {
      text,
    });
  } catch (err) {
    console.error("Failed to send Slack message", err);
  }
}
