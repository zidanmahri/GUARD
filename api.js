import express from "express";

const app = express();
app.use(express.json());

let banlist = [];

// 🔥 ambil banlist
app.get("/banlist", (req, res) => {
  res.json(banlist);
});

// 🔥 tambah user ke banlist
app.post("/ban", (req, res) => {
  const { username, reason } = req.body;
  banlist.push({ username, reason });
  res.json({ success: true, message: `User ${username} banned` });
});

// 🔥 hapus user dari banlist
app.post("/unban", (req, res) => {
  const { username } = req.body;
  banlist = banlist.filter(u => u.username !== username);
  res.json({ success: true, message: `User ${username} unbanned` });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🌐 API running on port ${PORT}`);
});
