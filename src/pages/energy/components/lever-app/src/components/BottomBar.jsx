import React from "react";

export default function BottomBar() {
  return (
    <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, padding: "5px 14px 8px" }}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="1.8" strokeLinecap="round" style={{ cursor: "pointer", opacity: 0.65 }}>
        <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 01-3.46 0" />
      </svg>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="1.8" strokeLinecap="round" style={{ cursor: "pointer", opacity: 0.65 }}>
        <circle cx="10.5" cy="10.5" r="6.5" /><path d="M21 21l-4.35-4.35" /><path d="M10.5 8v5" /><path d="M8 10.5h5" />
      </svg>
    </div>
  );
}
