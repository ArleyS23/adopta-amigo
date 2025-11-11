import { access, mkdir, readFile, writeFile } from "fs/promises";
import { fileURLToPath } from "url";

const petsFile = fileURLToPath(new URL("../data/pets.json", import.meta.url));
const dataDir = fileURLToPath(new URL("../data", import.meta.url));

async function ensureFile() {
  try {
    await access(petsFile);
  } catch {
    await mkdir(dataDir, { recursive: true });
    await writeFile(petsFile, "[]", "utf-8");
  }
}

export async function getAllPets() {
  await ensureFile();
  const raw = await readFile(petsFile, "utf-8");
  return JSON.parse(raw);
}

async function persist(pets) {
  await writeFile(petsFile, JSON.stringify(pets, null, 2), "utf-8");
}

export async function addPet(pet) {
  const pets = await getAllPets();
  const list = [pet, ...pets];
  await persist(list);
  return pet;
}

export async function deletePet(id) {
  const pets = await getAllPets();
  const idx = pets.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  const [removed] = pets.splice(idx, 1);
  await persist(pets);
  return removed;
}

export async function findPetById(id) {
  const pets = await getAllPets();
  return pets.find((p) => p.id === id) || null;
}