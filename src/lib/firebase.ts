"use client";

import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyC9f1utkYzM-LIbd7Sa6UdwoMY7P436UE4",
  authDomain: "barbearia-demo-771b2.firebaseapp.com",
  projectId: "barbearia-demo-771b2",
  storageBucket: "barbearia-demo-771b2.firebasestorage.app",
  messagingSenderId: "618749823855",
  appId: "1:618749823855:web:162b14a16b77e6f9ccf69a",
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);