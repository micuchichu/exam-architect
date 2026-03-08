import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { migrateQuestions } from "./lib/store";

migrateQuestions();

createRoot(document.getElementById("root")!).render(<App />);
