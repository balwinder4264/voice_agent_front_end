"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { PREVIEW_TARGET_KEY, PREVIEW_TOKEN_KEY } from "../../previewSession";

export default function PreviewBootstrapPage() {
  const params = useParams();

  useEffect(() => {
    const target = params.target;
    const token = decodeURIComponent(window.location.hash.replace(/^#/, ""));
    if (!token || !["shop", "sales"].includes(target)) {
      window.location.replace("/admin");
      return;
    }

    window.sessionStorage.setItem(PREVIEW_TOKEN_KEY, token);
    window.sessionStorage.setItem(PREVIEW_TARGET_KEY, target);
    window.location.replace(target === "sales" ? "/sales" : "/");
  }, [params.target]);

  return (
    <main className="shop-auth">
      <section className="preview-loading">
        <span className="admin-kicker">Admin preview</span>
        <h1>Opening portal</h1>
      </section>
    </main>
  );
}
