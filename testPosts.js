// testPosts.js

// Endpoint
const URL = "https://rehearten-production.up.railway.app/post/get?sort=like&typeSort=desc";

// Token thật (đã login)
const realToken = "eyJhbGciOiJIUzI1NiJ9.eyJ1c2VybmFtZSI6InBoYW1jdWEiLCJzdWIiOiJwaGFtY3VhIiwiZXhwIjoxNzU1NzgzODI1fQ.WhBnJMgRFwE24v3v5VTwTYG7CCHQC6wuYn40Cathb5s";

// Token giả
const fakeToken = "abc.def.ghi";

// Helper gọi API
async function test(label, token) {
  try {
    const headers = {
      "Accept": "application/json",
    };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(URL, { headers });
    const raw = await res.text();
    console.log("====", label, "====");
    console.log("Status:", res.status);
    console.log("Headers:", Object.fromEntries(res.headers));
    console.log("Raw response:", raw, "\n");
  } catch (err) {
    console.error("Error:", err);
  }
}

async function run() {
  await test("No token", null);
  await test("Real token", realToken);
  await test("Fake token", fakeToken);
}

run();
