const API_BASE = "http://localhost:3000";    
const PUBLIC_BASE = "https://short.link";    

const listEl = document.getElementById("linkList");
const form = document.getElementById("shortenForm");
const urlInput = document.getElementById("longUrl");
const expirySelect = document.getElementById("expiry");

function renderRow(item) {
  const li = document.createElement("li");
  li.className = "link-row";
  li.dataset.code = item.code;

  const displayUrl  = item.shortUrl || `${PUBLIC_BASE}/${item.code}`;
  const devRedirect = `${API_BASE}/${item.code}`;

  const left = document.createElement("div");
  left.className = "row-left";

  const a = document.createElement("a");
  a.href = displayUrl;          
  a.target = "_blank";
  a.rel = "noopener";
  a.textContent = displayUrl;

  a.addEventListener("click", (e) => {
    if (location.hostname !== "short.link") {
      e.preventDefault();
      window.open(devRedirect, "_blank", "noopener");
    }
  });

  const stat = document.createElement("div");
  stat.className = "stat";
  stat.textContent = `This link has been clicked ${item.click_count ?? 0} times.`;

  left.appendChild(a);
  left.appendChild(stat);

  const actions = document.createElement("div");
  actions.className = "actions";

  const qrBtn = document.createElement("button");
  qrBtn.title = "Show QR";
  qrBtn.textContent = "QR";

  const del = document.createElement("button");
  del.className = "del-btn";
  del.title = "Delete";
  del.textContent = "🗑️";
  del.addEventListener("click", async () => {
    if (!confirm("Delete this short link?")) return;
    const res = await fetch(`${API_BASE}/links/${item.code}`, { method: "DELETE" });
    if (res.ok) li.remove();
    else alert("Could not delete");
  });

  actions.appendChild(qrBtn);
  actions.appendChild(del);

  const topRow = document.createElement("div");
  topRow.className = "row-top";
  topRow.appendChild(left);
  topRow.appendChild(actions);

  const qrBox = document.createElement("div");
  qrBox.className = "qr-box";

  qrBtn.addEventListener("click", () => {
    const qrTarget = (item.original_url && /^https?:\/\//.test(item.original_url))
      ? item.original_url
      : displayUrl;

    if (!qrBox.firstChild) {
      const img = document.createElement("img");
      img.alt = "QR";
      img.width = 120;
      img.height = 120;
      img.referrerPolicy = "no-referrer";
      img.src = "https://api.qrserver.com/v1/create-qr-code/?size=120x120&data="
                + encodeURIComponent(qrTarget);
      qrBox.appendChild(img);

      const dl = document.createElement("a");
      dl.textContent = "Download";
      dl.href = img.src;
      dl.download = `${item.code}.png`;
      qrBox.appendChild(dl);
    }
    qrBox.style.display = (qrBox.style.display === "none") ? "block" : "none";
  });

  li.appendChild(topRow);
  li.appendChild(qrBox);
  return li;
}

async function loadLinks() {
  const res = await fetch(`${API_BASE}/links`);
  const data = await res.json();
  listEl.innerHTML = "";
  data.forEach(row => listEl.appendChild(renderRow(row)));
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const url = urlInput.value.trim();
  const ttl = expirySelect.value || "";
  if (!url || !ttl) return alert("Please enter a URL and choose an expiration.");

  const res = await fetch(`${API_BASE}/shorten`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, ttl })
  });

  const data = await res.json();
  if (!res.ok) return alert("Error: " + (data.error || "Unknown error"));

  const row = {
    code: data.code,
    click_count: 0,
    shortUrl: data.shortUrl,
    original_url: url
  };
  listEl.prepend(renderRow(row));
  form.reset();
});

loadLinks();
