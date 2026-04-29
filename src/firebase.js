import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAt2wsDHuc2LdQOXjXb8rrAibWYFgaAX-c",
  authDomain: "dar-e-arqam-ali-campus.firebaseapp.com",
  projectId: "dar-e-arqam-ali-campus",
  storageBucket: "dar-e-arqam-ali-campus.firebasestorage.app",
  messagingSenderId: "667117683459",
  appId: "1:667117683459:web:026bc5240a22e5a41e9f36",
  measurementId: "G-S4DESWN2TG"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
