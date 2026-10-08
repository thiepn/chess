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

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
