// Khởi tạo Firebase (dùng bản ES module qua CDN, không cần npm)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase, ref, get, set, push, update, remove, onValue } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyD4B5WoLU94uGh2v3O8O0GnT1k6ELxXdqU",
  authDomain: "anuongmanhudihanhxac.firebaseapp.com",
  databaseURL: "https://anuongmanhudihanhxac-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "anuongmanhudihanhxac",
  storageBucket: "anuongmanhudihanhxac.firebasestorage.app",
  messagingSenderId: "988963755475",
  appId: "1:988963755475:web:fc148d2b95f2d3b2740b26"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export const auth = getAuth(app);
export { ref, get, set, push, update, remove, onValue, signInWithEmailAndPassword, signOut, onAuthStateChanged };
