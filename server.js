require("dotenv").config();

const path = require("path");
const express = require("express");
const nodemailer = require("nodemailer");

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json({ limit: "1mb" }));
app.use(express.static(__dirname));

function requireEnv(name) {
  if (!process.env[name]) {
    throw new Error(`Ontbrekende instelling in .env: ${name}`);
  }
  return process.env[name];
}

function createTransporter() {
  return nodemailer.createTransport({
    host: requireEnv("SMTP_HOST"),
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE).toLowerCase() === "true",
    auth: {
      user: requireEnv("SMTP_USER"),
      pass: requireEnv("SMTP_PASS")
    }
  });
}

app.post("/api/send-process-email", async (req, res) => {
  const { email, subject, body } = req.body || {};

  if (!email || !subject || !body) {
    return res.status(400).json({ error: "E-mail, onderwerp en tekst zijn verplicht." });
  }

  try {
    const transporter = createTransporter();
    await transporter.sendMail({
      from: process.env.MAIL_FROM || process.env.SMTP_USER,
      to: email,
      subject,
      text: body
    });

    return res.json({ ok: true });
  } catch (error) {
    console.error("E-mail verzenden mislukt:", error.message);
    return res.status(500).json({ error: "E-mail verzenden mislukt." });
  }
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(port, () => {
  console.log(`FTTH app draait op http://localhost:${port}`);
});

