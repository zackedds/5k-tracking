/**
 * Firebase test client — mirrors exactly what the app does client-side.
 */
import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue, push, set, update, remove, get, Database } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyBvZqMZnL0LPc8gt-22kirj_S8qCRZ4HRw",
  authDomain: "tbp-5k-tracker.firebaseapp.com",
  databaseURL: "https://tbp-5k-tracker-default-rtdb.firebaseio.com",
  projectId: "tbp-5k-tracker",
  storageBucket: "tbp-5k-tracker.firebasestorage.app",
  messagingSenderId: "848758461650",
  appId: "1:848758461650:web:383dd34f15c6bd1d7f490b",
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

export { db, ref, onValue, push, set, update, remove, get };
export type { Database };
