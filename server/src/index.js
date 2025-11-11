import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import path from "node:path";
import { fileURLToPath } from "node:url";
import petsRouter from "./routes/pets.js";
import uploadsRouter from "./routes/uploads.js";

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.resolve(__dirname, "../uploads");

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",")
  : null;

app.use(cors({
  origin(origin, callback) {
    if (!origin || !allowedOrigins) return callback(null, true);
    return allowedOrigins.includes(origin)
      ? callback(null, true)
      : callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
}));
app.use(express.json());
app.use(helmet({
  crossOriginResourcePolicy: false,
}));
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
app.use("/uploads", express.static(uploadsDir));

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/api/pets", petsRouter);
app.use("/api/uploads", uploadsRouter);

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  console.error("[API]", err);
  res.status(500).json({ message: "Unexpected error" });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`API ready on http://localhost:${PORT}`);
});
