import { Router } from "express";
import { nanoid } from "nanoid";
import { z } from "zod";
import { addPet, deletePet, findPetById, getAllPets, updatePet } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

const imageUrlSchema = z.union([
  z.string().url(),
  z.string().regex(/^\/uploads\//, { message: "Image path must start with /uploads/" }),
]);

const sizeSchema = z.enum(["pequeno", "mediano", "grande"]);

const statusSchema = z.enum(["active", "pending", "adoptado"]);

const petBaseSchema = z.object({
  name: z.string().min(2).max(80),
  age: z.coerce.number().min(0).max(30),
  description: z.string().min(5).max(500),
  city: z.string().min(2).max(80).optional(),
  breed: z.string().max(100).optional(),
  color: z.string().max(60).optional(),
  size: sizeSchema.optional(),
  vaccines: z.array(z.string()).optional(),
  contact: z.string().email().optional(),
  imageUrl: imageUrlSchema.optional(),
  status: statusSchema.optional(),
});

const createPetSchema = petBaseSchema;
const updatePetSchema = petBaseSchema.partial();

const normalizeStatus = (status) => {
  if (!status) return "active";
  if (status === "available") return "active";
  return ["active", "pending", "adoptado"].includes(status) ? status : "active";
};

router.get("/", async (req, res) => {
  const {
    search = "",
    city = "",
    ownerId = "",
    ids = "",
  } = req.query;
  const pets = (await getAllPets()).map((pet) => ({
    ...pet,
    status: normalizeStatus(pet.status),
  }));
  const qText = String(search).toLowerCase();
  const qCity = String(city).toLowerCase();
  const idsFilter = ids ? String(ids).split(",").map((id) => id.trim()) : null;
  const filtered = pets.filter((pet) => {
    const matchesCity = qCity ? (pet.city || "").toLowerCase().includes(qCity) : true;
    const haystack = [pet.name, pet.description, pet.city, pet.breed, pet.color]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    const matchesText = qText ? haystack.includes(qText) : true;
    const matchesOwner = ownerId ? pet.ownerId === ownerId : true;
    const matchesIds = idsFilter ? idsFilter.includes(pet.id) : true;
    return matchesCity && matchesText && matchesOwner && matchesIds;
  });
  res.json(filtered);
});

router.get("/:id", async (req, res) => {
  const pet = await findPetById(req.params.id);
  if (!pet) return res.status(404).json({ message: "Pet not found" });
  res.json({ ...pet, status: normalizeStatus(pet.status) });
});

router.post("/", requireAuth, async (req, res, next) => {
  try {
    const { uid: userId, email } = req.auth;
    const body = createPetSchema.parse(req.body);
    const vaccines = body.vaccines
      ? Array.isArray(body.vaccines) ? body.vaccines : [body.vaccines]
      : [];
    const pet = {
      id: `pet_${nanoid(10)}`,
      ...body,
      vaccines,
      imageUrl: body.imageUrl || "https://placehold.co/800x600/png?text=Mascota",
      ownerId: userId,
      ownerName: body.ownerName || email || "Usuario",
      ownerPublicKey: body.ownerPublicKey || null,
      contactSignature: body.contactSignature || null,
      createdAt: new Date().toISOString(),
      status: body.status || "active",
    };
    await addPet(pet);
    res.status(201).json({ ...pet, status: normalizeStatus(pet.status) });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: "Validation error", issues: err.errors });
    }
    next(err);
  }
});

router.patch("/:id", requireAuth, async (req, res) => {
  const { uid: userId, role } = req.auth;
  const pet = await findPetById(req.params.id);
  if (!pet) return res.status(404).json({ message: "Pet not found" });
  const isOwner = pet.ownerId === userId;
  if (!isOwner && role !== "admin") return res.status(403).json({ message: "Not allowed" });
  const body = updatePetSchema.parse(req.body);
  const vaccines = body.vaccines !== undefined
    ? (Array.isArray(body.vaccines) ? body.vaccines : [body.vaccines])
    : pet.vaccines || [];
  const updated = await updatePet(req.params.id, {
    ...body,
    vaccines,
    status: body.status || pet.status || "active",
    updatedAt: new Date().toISOString(),
  });
  res.json({ ...updated, status: normalizeStatus(updated.status) });
});

router.delete("/:id", requireAuth, async (req, res) => {
  const { uid: userId, role } = req.auth;
  const pet = await findPetById(req.params.id);
  if (!pet) return res.status(404).json({ message: "Pet not found" });
  const isOwner = pet.ownerId === userId;
  if (!isOwner && role !== "admin") return res.status(403).json({ message: "Not allowed" });
  await deletePet(req.params.id);
  return res.status(204).send();
});

export default router;
