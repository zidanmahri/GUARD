import express from "express";

const app = express();
app.use(express.json());

// Simpan data banlist sementara di memory
let banlist = [];

// Endpoint cek siapa saja yang di-ban
app.get("/banlist", (req, res) => {
  res.json(banlist);
});

// Endpoint ban user
app.post("/ban", (req, res) => {
  const { username, reason } = req.body;
  if (!username) {
    return res.status(400).json({ error: "Username required" });
  }
  if (!banlist.find(u => u.username === username)) {
    banlist.push({ username, reason: reason || "No reason" });
  }
  res.json({ success: true, banlist });
});

// Endpoint unban user
app.post("/unban", (req, res) => {
  const { username } = req.body;
  banlist = banlist.filter(u => u.username !== username);
  res.json({ success: true, banlist });
});

// 🚀 FIX: gunakan PORT dari Railway
const PORT = process.env.PORT || 8080;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🌐 API running on http://0.0.0.0:${PORT}`);
});
