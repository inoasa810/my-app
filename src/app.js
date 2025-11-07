const express = require("express");
const path = require("path");

const app = express();

app.use(express.json());
app.use(express.static("public"));

// --- DB の切替対応 ---
// Jest 実行時は process.env.JEST_WORKER_ID が設定されるので、
// その場合は lowdb を require せずにインメモリの簡易DBを使う
let db;
let useLowdb = false;

if (!process.env.JEST_WORKER_ID) {
  // 普段の実行（npm start など）は lowdb を使う
  try {
    const { Low } = require("lowdb");
    const { JSONFile } = require("lowdb/node");
    const file = path.join(process.cwd(), "db.json");
    const adapter = new JSONFile(file);
    db = new Low(adapter, { posts: [], nextId: 1 });
    useLowdb = true;
  } catch (e) {
    console.warn("lowdb load failed, falling back to in-memory DB:", e && e.message);
    db = { data: { posts: [], nextId: 1 }, read: async () => {}, write: async () => {} };
  }
} else {
  // テスト実行時（Jest）：インメモリDBを使用
  db = { data: { posts: [], nextId: 1 }, read: async () => {}, write: async () => {} };
}

// DB 初期化
async function initDb() {
  try {
    await db.read();
    if (!db.data) {
      db.data = { posts: [], nextId: 1 };
      await db.write();
    }
  } catch (err) {
    db.data = { posts: [], nextId: 1 };
    await db.write();
  }
}
initDb().catch(err => {
  console.error("DB init failed:", err);
  if (useLowdb) process.exit(1);
});

// --- ヘルパー ---
function sanitizeText(s) {
  return String(s || "").trim().slice(0, 280);
}
const ALLOWED_EMOTIONS = ["happy", "sad", "angry", "surprised", "neutral"];

async function getAllPosts() {
  await db.read();
  const posts = (db.data && db.data.posts) || [];
  return posts.slice().sort((a, b) => b.createdAt - a.createdAt);
}

// --- ルート / API ---
// GET 全投稿
app.get("/api/posts", async (req, res) => {
  const posts = await getAllPosts();
  res.json(posts);
});

// POST 新規投稿
app.post("/api/posts", async (req, res) => {
  const { text, emotion } = req.body || {};
  if (typeof text !== "string" || text.trim() === "") {
    return res.status(400).json({ error: "text is required" });
  }
  const clean = sanitizeText(text);
  if (clean.length < 1) return res.status(400).json({ error: "text is too short" });
  const emo = ALLOWED_EMOTIONS.includes(emotion) ? emotion : "neutral";

  await db.read();
  const id = db.data.nextId++;
  const post = {
    id,
    text: clean,
    emotion: emo,
    likes: 0,
    createdAt: Date.now()
  };
  db.data.posts.push(post);
  await db.write();
  res.status(201).json(post);
});

// PATCH いいね
app.patch("/api/posts/:id/like", async (req, res) => {
  const id = Number(req.params.id);
  await db.read();
  const p = (db.data.posts || []).find(x => x.id === id);
  if (!p) return res.status(404).json({ error: "post not found" });
  p.likes += 1;
  await db.write();
  res.json(p);
});

// DELETE 投稿削除
app.delete("/api/posts/:id", async (req, res) => {
  const id = Number(req.params.id);
  await db.read();
  const idx = (db.data.posts || []).findIndex(p => p.id === id);
  if (idx === -1) return res.status(404).json({ error: "post not found" });
  const [removed] = db.data.posts.splice(idx, 1);
  await db.write();
  res.json({ ok: true, removed });
});

// 感情ごとの集計
app.get("/api/stats/emotions", async (req, res) => {
  await db.read();
  const counts = (db.data.posts || []).reduce((acc, p) => {
    acc[p.emotion] = (acc[p.emotion] || 0) + 1;
    return acc;
  }, {});
  res.json(counts);
});

// ヘルスチェック
app.get("/health", (req, res) => res.json({ status: "ok", time: Date.now() }));

module.exports = { app, db };
