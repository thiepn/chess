import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./design/tokens.css";
import "./styles.css";
import "./styles/p48-material.css";
import "./styles/p49-motion.css";
import "./styles/p53-customization.css";
import "./styles/p52-accessibility.css";
import "./styles/p59-visual-qa.css";
import "./styles/p59b-refinement.css";
import "./styles/p64-premium-finishing.css";

import { initializeChessAccount } from "./account/chessSession";

async function startChess() {
  const root = document.getElementById("root")!;
  // The Auth code and app-specific identity must be verified before any
  // authenticated Chess state can be read or rendered.
  root.textContent = "Preparing Chess…";
  const disposition = await initializeChessAccount();
  if (disposition === "redirecting") {
    root.textContent = "Opening THIEPN Account…";
    return;
  }
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
void startChess();
