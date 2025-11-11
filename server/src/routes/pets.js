import { Router } from "express";
import { nanoid } from "nanoid";
import { z } from "zod";
import { addPet, deletePet, findPetById, getAllPets } from "../db.js";

const router = Router();

const imageUrlSchema = z.union([
  z.string().url(),
  z.string().regex(/^\/uploads\//, { message: "Image path must start with /uploads/" }),
]);

const createPetSchema = z.object({
  name: z.string().min(2).max(80),
  age: z.coerce.number().min(0).max(30),
  description: z.string().min(5).max(500),
  city: z.string().min(2).max(80).optional(),
  contact: z.string().email().optional(),
  imageUrl: imageUrlSchema.optional(),
});

router.get("/", async (req, res) => {
  const { search = "", city = "" } = req.query;
  const pets = await getAllPets();
  const qText = String(search).toLowerCase();
  const qCity = String(city).toLowerCase();
  const filtered = pets.filter((pet) => {
    const matchesCity = qCity ? (pet.city || "").toLowerCase().includes(qCity) : true;
    const haystack = [pet.name, pet.description, pet.city]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    const matchesText = qText ? haystack.includes(qText) : true;
    return matchesCity && matchesText;
  });
  res.json(filtered);
});

router.post("/", async (req, res, next) => {
  try {
    const userId = req.header("x-user-id");
    if (!userId) return res.status(401).json({ message: "Missing x-user-id header" });
    const body = createPetSchema.parse(req.body);
    const pet = {
      id: `pet_${nanoid(10)}`,
      ...body,
      imageUrl: body.imageUrl || "https://placehold.co/800x600/png?text=Mascota",
      ownerId: userId,
      createdAt: new Date().toISOString(),
      status: "available",
    };
    await addPet(pet);
    res.status(201).json(pet);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: "Validation error", issues: err.errors });
    }
    next(err);
  }
});

router.delete("/:id", async (req, res) => {
  const userId = req.header("x-user-id");
  if (!userId) return res.status(401).json({ message: "Missing x-user-id header" });
  const pet = await findPetById(req.params.id);
  if (!pet) return res.status(404).json({ message: "Pet not found" });
  if (pet.ownerId !== userId) return res.status(403).json({ message: "Not allowed" });
  await deletePet(req.params.id);
  return res.status(204).send();
});

export default router;
