import express from "express";
import bodyParser from "body-parser";

const app = express();
app.use(bodyParser.json());

let banlist = [];

// ✅ GET banlist
app.get("/banlist", (req, res) => {
  res.json(banlist);
});

// 🚫 Ban user
app.post("/ban", (req, res) => {
  const { username, reason } = req.body;
  if (!username) return res.status(400).json({ error: "Username required" });

  banlist.push({ username, reason: reason || "No reason" });
  res.json({ message: `${username} banned` });
});

// ✅ Unban user
app.post("/unban", (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ error: "Username required" });

  banlist = banlist.filter(u => u.username !== username);
  res.json({ message: `${username} unbanned` });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ API running on port ${PORT}`));
