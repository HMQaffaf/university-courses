const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

let auth = null;
let db = null;

const keyPath = path.join(__dirname, "serviceAccountKey.json");

if (fs.existsSync(keyPath)) {
  try {
    const serviceAccount = require(keyPath);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    auth = admin.auth();
    db = admin.firestore();
    console.log("Firebase Admin initialized successfully.");
  } catch (err) {
    console.warn("Warning: Could not initialize Firebase Admin:", err.message);
  }
} else {
  console.warn("Notice: serviceAccountKey.json not found. Google token verification on server will use fallback decoding in dev mode.");
}

module.exports = { auth, db };
