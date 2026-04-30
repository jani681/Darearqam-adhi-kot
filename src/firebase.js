import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCgStZINnijw4gO1bmjcKD--YvzWi_hLwo",
  authDomain: "dar-e-arqam-adhi-kot.firebaseapp.com",
  projectId: "dar-e-arqam-adhi-kot",
  storageBucket: "dar-e-arqam-adhi-kot.firebasestorage.app",
  messagingSenderId: "305555657601",
  appId: "1:305555657601:web:1e1b42b5bb812752744e80",
  measurementId: "G-VT4W1CMFFC"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
