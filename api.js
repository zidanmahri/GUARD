const express = require("express");
const app = express();
app.use(express.json());

// Simpan ban list sementara (RAM)
// nanti bisa diupgrade ke database (MongoDB/Firebase)
let banList = [];

// Endpoint ban
app.post("/ban", (req, res) => {
    const { username } = req.body;
    if (!banList.includes(username)) {
        banList.push(username);
        console.log("🚫 Ban:", username);
    }
    res.json({ success: true, message: `${username} banned` });
});

// Endpoint unban
app.post("/unban", (req, res) => {
    const { username } = req.body;
    banList = banList.filter(u => u !== username);
    console.log("🟢 Unban:", username);
    res.json({ success: true, message: `${username} unbanned` });
});

// Endpoint untuk Roblox cek banlist
app.get("/banlist", (req, res) => {
    res.json(banList);
});

// Jalankan server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🌐 API running on port ${PORT}`));
