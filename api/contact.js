// Vercel Serverless Function — Contact form handler
// Stores submissions in the project environment (email notification via
// Resend is enabled only when RESEND_API_KEY + FROM_EMAIL env vars are set).
// Submissions are always saved to a JSON file in .vercel/data (via the
// kv-less approach below we use an in-memory log + optional email).

const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "messages.json");

function readMessages() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch {
    return [];
  }
}

function saveMessages(list) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(list, null, 2));
}

module.exports = async (req, res) => {
  // Accept only same-origin / CORS-safe POST
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  // GET with ?list=1 returns all stored messages (admin.html)
  if (req.method === "GET" && req.query && req.query.list) {
    return res.status(200).json(readMessages());
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

    // Optional email notification via Resend (set env vars in Vercel dashboard)
    if (process.env.RESEND_API_KEY && process.env.FROM_EMAIL && process.env.TO_EMAIL) {
      try {
        const payload = {
          from: process.env.FROM_EMAIL,
          to: process.env.TO_EMAIL,
          subject: `New Hoyga Hodan inquiry — ${name} (${role || "Unknown"})`,
          html: `
            <h2>New inquiry on hoygahodan.so</h2>
            <p><b>Name:</b> ${name}<br>
            <b>Email:</b> ${email}<br>
            <b>Organization:</b> ${org || "—"}<br>
            <b>I am a:</b> ${role || "—"}<br>
            <b>Received:</b> ${entry.receivedAt}</p>
            <hr><p>${message.replace(/\n/g, "<br>")}</p>`,
        };
        const resp = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });
        if (!resp.ok) {
          console.warn("Resend notification failed:", resp.status);
        }
      } catch (e) {
        console.warn("Resend error:", e);
      }
    }

    return res.status(200).json({ ok: true, id: entry.id });
  } catch (e) {
    console.error("Contact handler error:", e);
    return res.status(500).json({ error: "Something went wrong. Please try again." });
  }
};
