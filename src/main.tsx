import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { runChessStartup } from "./startup/chessStartup";
import "./design/tokens.css";
import "./styles.css";
import "./styles/p48-material.css";
import "./styles/p49-motion.css";
import "./styles/p53-customization.css";
import "./styles/p52-accessibility.css";
import "./styles/p59-visual-qa.css";
import "./styles/p59b-refinement.css";
import "./styles/p64-premium-finishing.css";
import "./styles/p107-study.css";
import "./styles/mobile-app-viewport.css";

import { initializeChessAccount } from "./account/chessSession";

async function startChess() {
  const root = document.getElementById("root");
  if (!root) return;
  // The owner-specific app module must not be evaluated before Account has
  // completed its one-use OAuth callback or guest-first initialization.
  root.textContent = "Preparing Chess…";
  const outcome = await runChessStartup(initializeChessAccount, async () => {
    const { default: App } = await import("./App");
    createRoot(root).render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
  });

  if (outcome === "redirecting") {
    root.textContent = "Opening THIEPN Account…";
    return;
  }
  if (outcome === "ready") return;

  // A missing/offline authored lesson asset can reject the app's top-level
  // module import. Do not strand users on an empty page or expose auth data.
  // A full reload is intentional: rejected ESM imports are not reliably
  // retried by importing the same URL in the same document.
  const notice = document.createElement("main");
  notice.setAttribute("role", "alert");
  notice.style.cssText = "max-width:32rem;margin:12vh auto;padding:1.5rem;color:inherit;font:inherit;";
  const heading = document.createElement("h1");
  heading.textContent = "Chess could not finish loading";
  const message = document.createElement("p");
  message.textContent = "The app or a required lesson file is unavailable. Check your connection and try loading again. Your saved progress has not been cleared.";
  const retry = document.createElement("button");
  retry.type = "button";
  retry.textContent = "Reload Chess";
  retry.addEventListener("click", () => window.location.reload());
  notice.append(heading, message, retry);
  root.replaceChildren(notice);
}
void startChess();
