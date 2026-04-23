"use client";

import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBrK3IleTNXnooZ8RfQMJoX6glbR6vFs1A",
  authDomain: "barbearia-reis23.firebaseapp.com",
  projectId: "barbearia-reis23",
  storageBucket: "barbearia-reis23.firebasestorage.app",
  messagingSenderId: "827420854274",
  appId: "1:827420854274:web:e6205dbf434a2a74bc3f1b",
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);