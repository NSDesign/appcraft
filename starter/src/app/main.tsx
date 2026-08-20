import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./App";
import "./theme.css";

const root = document.getElementById("root");

if (!root) {
  throw new Error("No #root element. index.html and main.tsx have diverged.");
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
