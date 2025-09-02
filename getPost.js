async function getPosts() {
    const token = "eyJhbGciOiJIUzI1NiJ9.eyJ1c2VybmFtZSI6InBoYW1jdWEiLCJzdWIiOiJwaGFtY3VhIiwiZXhwIjoxNzU1NzgzODI1fQ.WhBnJMgRFwE24v3v5VTwTYG7CCHQC6wuYn40Cathb5s";
  
    try {
      const res = await fetch("https://rehearten-production.up.railway.app/post/get?sort=like&typeSort=desc", {
        method: "GET",
        headers: {
          "Accept": "application/json",
          "Authorization": `Bearer ${token}`
        }
      });
  
      console.log("Status:", res.status);
      console.log("Headers:", Object.fromEntries(res.headers));
      const raw = await res.text();
      console.log("Raw response:", raw);
    } catch (err) {
      console.error("Error:", err);
    }
  }
  
  getPosts();
  