import express from "express";

const app = express();
app.use(express.json());

let banlist = []; // simpan banlist di memory sementara

// ambil banlist
app.get("/banlist", (req, res) => {
  res.json(banlist);
});

// tambahkan user ke banlist
app.post("/ban", (req, res) => {
  const { username } = req.body;
  if (!username) {
    return res.status(400).json({ error: "username wajib diisi" });
  }
  if (!banlist.includes(username)) {
    banlist.push(username);
  }
  res.json({ success: true, banlist });
});

// hapus user dari banlist
app.post("/unban", (req, res) => {
  const { username } = req.body;
  if (!username) {
    return res.status(400).json({ error: "username wajib diisi" });
  }
  banlist = banlist.filter(u => u !== username);
  res.json({ success: true, banlist });
});

// root
app.get("/", (req, res) => {
  res.send("✅ Roblox Guard API jalan");
});

// Railway butuh port dari ENV
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 API jalan di port ${PORT}`);
});
