"use client";
export default function CookieSettings() {
  return (
    <button type="button" className="btn btn-link btn-sm" onClick={() => {
      try { localStorage.removeItem("cookie-consent"); } catch {}
      window.location.reload();
    }}>Cookie settings</button>
  );
}
