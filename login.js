// login.js
async function login() {
  try {
    const res = await fetch("https://rehearten-production.up.railway.app/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: "phamcua",
        password: "123456",
      }),
    });

    const data = await res.text();   // nhận raw text thay vì JSON
    console.log("Login response:", data);
  } catch (err) {
    console.error("Error:", err);
  }
}

login();
