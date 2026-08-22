const axios = require('axios');

async function test() {
  try {
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000'
    const res = await axios.post(`${baseUrl}/api/recognize`, {
      image_b64: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
      filename: "test.jpg"
    }, { timeout: 60000 });
    console.log("Success:", res.data);
  } catch (err) {
    console.error("Error:", err.message);
  }
}
test();
