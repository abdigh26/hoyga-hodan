// Vercel Serverless Function — Hoyga Hodan contact form
//
// Production notes:
// - A Vercel function has no durable local filesystem. This handler uses /tmp only
//   for a short-lived convenience cache; do not treat it as permanent storage.
// - Configure RESEND_API_KEY, FROM_EMAIL and TO_EMAIL in Vercel to receive durable
//   email notifications for every inquiry.
// - Configure ADMIN_TOKEN to enable the protected message viewer at /admin.html.

const fs = require("fs");
const path = require("path");

const DATA_DIR = process.env.VERCEL
  ? path.join("/tmp", "hoyga-hodan")
  : path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "messages.json");

function readMessages() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch {
    return [];
  }
}

function saveMessages(list) {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(list, null, 2));
  } catch (error) {
    // Email delivery remains available even if the serverless cache cannot be written.
    console.warn("Temporary contact cache could not be written:", error.message);
  }
}

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;",
  }[character]));
}

function hasAdminAccess(req) {
  const token = process.env.ADMIN_TOKEN;
  if (!token) return false;
  const supplied = req.headers["x-admin-token"] || (req.query && req.query.token);
  return supplied === token;
}

module.exports = async (req, res) => {
  // The message viewer is deliberately protected. The old public GET route would
  // otherwise expose contact submissions to anyone who knew the endpoint.
  if (req.method === "GET" && req.query && req.query.list) {
    if (!hasAdminAccess(req)) {
      return res.status(401).json({ error: "Admin authorization required." });
    }
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json(readMessages());
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = req.body || {};
    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim();
    const org = String(body.org || "").trim();
    const role = String(body.role || "").trim();
    const message = String(body.message || "").trim();

    if (!name || !email || !message) {
      return res.status(400).json({ error: "Name, email, and message are required." });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: "Invalid email address." });
    }
    if (name.length > 120 || email.length > 254 || org.length > 160 || role.length > 120 || message.length > 5000) {
      return res.status(400).json({ error: "Please shorten your message and try again." });
    }

    const entry = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      receivedAt: new Date().toISOString(),
      name,
      email,
      org,
      role,
      message,
    };

    const list = readMessages();
    list.push(entry);
    saveMessages(list);

    if (process.env.RESEND_API_KEY && process.env.FROM_EMAIL && process.env.TO_EMAIL) {
      try {
        const payload = {
          from: process.env.FROM_EMAIL,
          to: process.env.TO_EMAIL,
          subject: `New Hoyga Hodan inquiry — ${escapeHtml(name)} (${escapeHtml(role || "Unknown")})`,
          html: `
            <h2>New inquiry on hoygahodan.so</h2>
            <p><b>Name:</b> ${escapeHtml(name)}<br>
            <b>Email:</b> ${escapeHtml(email)}<br>
            <b>Organization:</b> ${escapeHtml(org || "—")}<br>
            <b>I am a:</b> ${escapeHtml(role || "—")}<br>
            <b>Received:</b> ${escapeHtml(entry.receivedAt)}</p>
            <hr><p>${escapeHtml(message).replace(/\n/g, "<br>")}</p>`,
        };
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });
        if (!response.ok) console.warn("Resend notification failed:", response.status);
      } catch (error) {
        console.warn("Resend error:", error.message);
      }
    }

    return res.status(200).json({ ok: true, id: entry.id });
  } catch (error) {
    console.error("Contact handler error:", error);
    return res.status(500).json({ error: "Something went wrong. Please try again." });
  }
};
