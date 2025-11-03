async function fetchPosts() {
  const res = await fetch("/api/posts");
  return res.ok ? res.json() : [];
}

async function fetchStats() {
  const res = await fetch("/api/stats/emotions");
  return res.ok ? res.json() : {};
}

function createPostElement(p) {
  const div = document.createElement("div");
  div.className = "post";
  div.innerHTML = `
    <div>${escapeHtml(p.text)}</div>
    <div class="meta">
      <div><span class="emotag">${p.emotion}</span> ・ ${new Date(p.createdAt).toLocaleString()}</div>
      <div>❤️ <span id="likes-${p.id}">${p.likes}</span> 
        <button data-id="${p.id}" class="likeBtn">Like</button>
        <button data-id="${p.id}" class="delBtn" style="margin-left:8px;color:#a00;">Delete</button>
      </div>
    </div>
  `;
  return div;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

async function render() {
  const postsEl = document.getElementById("posts");
  const statsEl = document.getElementById("stats");
  try {
    const [posts, stats] = await Promise.all([fetchPosts(), fetchStats()]);
    // stats
    const statPairs = Object.entries(stats).sort((a,b)=>b[1]-a[1]);
    statsEl.innerHTML = statPairs.length ? statPairs.map(([k,v])=>`${k}: ${v}`).join(" ・ ") : "まだ投稿がありません";

    // posts
    postsEl.innerHTML = "";
    if (!posts || posts.length === 0) postsEl.textContent = "まだ投稿がありません";
    else posts.forEach(p => postsEl.appendChild(createPostElement(p)));

    // attach handlers
    document.querySelectorAll(".likeBtn").forEach(btn=>{
      btn.onclick = async () => {
        const id = btn.dataset.id;
        const r = await fetch(`/api/posts/${id}/like`, { method: "PATCH" });
        if (r.ok) {
          const updated = await r.json();
          document.getElementById(`likes-${id}`).textContent = updated.likes;
          await updateStats();
        } else {
          alert("いいねに失敗しました");
        }
      };
    });
    document.querySelectorAll(".delBtn").forEach(btn=>{
      btn.onclick = async () => {
        if (!confirm("本当に削除しますか？")) return;
        const id = btn.dataset.id;
        const r = await fetch(`/api/posts/${id}`, { method: "DELETE" });
        if (r.ok) {
          await render();
        } else {
          alert("削除に失敗しました");
        }
      };
    });
  } catch (e) {
    postsEl.textContent = "読み込みでエラーが発生しました";
    statsEl.textContent = "";
    console.error(e);
  }
}

async function updateStats() {
  const stats = await fetchStats();
  const statPairs = Object.entries(stats).sort((a,b)=>b[1]-a[1]);
  document.getElementById("stats").innerHTML = statPairs.length ? statPairs.map(([k,v])=>`${k}: ${v}`).join(" ・ ") : "まだ投稿がありません";
}

document.getElementById("postBtn").onclick = async () => {
  const textEl = document.getElementById("text");
  const text = textEl.value;
  if (!text || text.trim() === "") { alert("テキストを入力してください"); return; }
  if (text.trim().length > 280) { alert("テキストは280文字以内にしてください"); return; }
  const emotion = document.getElementById("emotion").value;
  const res = await fetch("/api/posts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, emotion })
  });
  if (res.status === 201) {
    textEl.value = "";
    await render();
  } else {
    const err = await res.json().catch(()=>({ error: "unknown" }));
    alert("投稿に失敗しました: " + (err.error || "unknown"));
  }
};

// 初回描画
render();
