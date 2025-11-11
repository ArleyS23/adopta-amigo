import { Router } from "express";
import multer from "multer";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync, mkdirSync } from "node:fs";
import { nanoid } from "nanoid";

const router = Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.resolve(__dirname, "../../uploads");

if (!existsSync(uploadsDir)) {
  mkdirSync(uploadsDir, { recursive: true });
}

const allowedMime = new Set(["image/jpeg", "image/png", "image/webp"]);
const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || ".jpg";
    cb(null, `pet-${nanoid(10)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!allowedMime.has(file.mimetype)) {
      return cb(new Error("Formato no permitido"));
    }
    cb(null, true);
  },
});

const handleUpload = upload.single("image");

router.post("/", (req, res) => {
  const userId = req.header("x-user-id");
  if (!userId) return res.status(401).json({ message: "Missing x-user-id header" });
  handleUpload(req, res, (err) => {
    if (err) {
      if (err.message === "File too large") {
        return res.status(400).json({ message: "Imagen supera los 5MB" });
      }
      return res.status(400).json({ message: err.message });
    }
    if (!req.file) return res.status(400).json({ message: "No se intento subir imagen" });
    res.status(201).json({ url: `/uploads/${req.file.filename}` });
  });
});

export default router;
