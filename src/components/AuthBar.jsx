// src/components/AuthBar.jsx
import React, { useState } from "react";
import { supabase } from "../supabaseClient";

export default function AuthBar({ session }) {
  const [email, setEmail] = useState("");

// wherever you call signInWithOAuth (e.g., AuthBar.jsx)
const signInWithGitHub = async () => {
  const isLocal = location.hostname === "localhost" || location.hostname === "127.0.0.1";

  // On GitHub Pages, the app is at /my-english-trainer
  const redirectTo = isLocal
    ? location.origin // http://localhost:5173
    : `${location.origin}/my-english-trainer`; // https://nadezdatsygankova.github.io/my-english-trainer

  console.log("OAuth redirectTo =>", redirectTo); // keep for debugging

  const { error } = await supabase.auth.signInWithOAuth({
    provider: "github",
    options: { redirectTo }, // <-- critical
  });
  if (error) console.error("GitHub sign-in error:", error);
};

const sendMagicLink = async (e) => {
  e.preventDefault();
  if (!email) return alert("Enter email");

  const isLocal = location.hostname === "localhost" || location.hostname === "127.0.0.1";
  const emailRedirectTo = isLocal
    ? location.origin                         // http://localhost:5173
    : `${location.origin}/my-english-trainer`; // https://.../my-english-trainer

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo },   // <-- critical
  });
  if (error) alert(error.message);
  else alert("Magic link sent. Check your inbox.");
};

  const signOut = async () => { await supabase.auth.signOut(); };

  return (
    <div style={{
      display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap",
      background: "#f8fafc", border: "1px solid #e2e8f0",
      padding: 10, borderRadius: 10, margin: "12px 20px 0"
    }}>
      {!session ? (
        <>
          <button
            onClick={signInWithGitHub}
            style={{ background:"#111827", color:"#fff", border:0, padding:"8px 12px", borderRadius:8, cursor:"pointer" }}
          >
            Sign in with GitHub
          </button>
          <form onSubmit={sendMagicLink} style={{ display:"flex", gap:8, alignItems:"center" }}>
            <input
              type="email"
              placeholder="email for magic link"
              value={email}
              onChange={(e)=>setEmail(e.target.value)}
              style={{ padding:8, border:"1px solid #cbd5e1", borderRadius:8 }}
            />
            <button type="submit" style={{ padding:"8px 12px", borderRadius:8, border:"1px solid #cbd5e1", cursor:"pointer" }}>
              Send link
            </button>
          </form>
        </>
      ) : (
        <>
          <span style={{ color:"#0f172a" }}>
            Signed in as <strong>{session.user.email || session.user.id}</strong>
          </span>
          <button
            onClick={signOut}
            style={{ padding:"8px 12px", borderRadius:8, border:"1px solid #cbd5e1", cursor:"pointer" }}
          >
            Sign out
          </button>
        </>
      )}
    </div>
  );
}