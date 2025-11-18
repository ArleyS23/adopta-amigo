import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import PetCard from "../components/PetCard";
import { useAuth } from "../context/AuthContext";
import { verifyWithBase64Key } from "../utils/rsa";
import { deletePetRequest, listPets, updatePetRequest } from "../services/petsService";
import { ensureConversation } from "../services/conversationsService";
import { collection, documentId, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase";

export default function PetsList() {
  const [pets, setPets] = useState([]);
  const [qText, setQText] = useState("");
  const [city, setCity] = useState("");
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const { user, profile, toggleSavedPet, isAdmin, getIdToken } = useAuth();
  const navigate = useNavigate();

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await listPets();
      const enriched = await Promise.all(data.map(async (pet) => {
        if (pet.contact && pet.contactSignature && pet.ownerPublicKey) {
          try {
            const verified = await verifyWithBase64Key(pet.ownerPublicKey, pet.contact, pet.contactSignature);
            return { ...pet, contactVerified: verified };
          } catch {
            return { ...pet, contactVerified: false };
          }
        }
        return { ...pet, contactVerified: false };
      }));
      const withOwners = await ensureOwnerNames(enriched);
      setPets(withOwners);
    } catch (err) {
      console.error("[PetsList] load", err);
      toast.error(err?.message || "No se pudo cargar");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    return pets.filter((pet) => {
      const matchCity = city ? (pet.city || "").toLowerCase().includes(city.toLowerCase()) : true;
      const hay = [pet.name, pet.description, pet.city, pet.breed, pet.color].filter(Boolean).join(" ").toLowerCase();
      const matchText = qText ? hay.includes(qText.toLowerCase()) : true;
      return matchCity && matchText;
    });
  }, [pets, city, qText]);

  const handleDelete = async (pet) => {
    if (!user) {
      toast.error("Debes iniciar sesion para eliminar");
      return;
    }
    if (pet.ownerId !== user.uid && !isAdmin) {
      toast.error("No puedes eliminar esta publicación");
      return;
    }
    if (!confirm(`Eliminar a ${pet.name}?`)) return;
    try {
      const token = await getIdToken();
      if (!token) throw new Error("Sesion no lista");
      setDeletingId(pet.id);
      await deletePetRequest(pet.id, token);
      await load();
      toast.success("Publicacion eliminada");
    } catch (err) {
      console.error("[PetsList] delete", err);
      toast.error(err?.message || "No se pudo eliminar");
    } finally {
      setDeletingId(null);
    }
  };

  const handleChat = async (pet) => {
    if (!user) {
      toast.error("Debes iniciar sesión para chatear");
      return;
    }
    if (user.uid === pet.ownerId) {
      toast.error("Esta es tu publicación; revisa las solicitudes en Mi espacio");
      return;
    }
    try {
      const conversationId = await ensureConversation(pet, user, profile);
      navigate(`/chat/${conversationId}`);
    } catch (err) {
      console.error("[PetsList] chat", err);
      toast.error(err?.message || "No se pudo abrir el chat");
    }
  };

  const handleStatusCycle = async (pet) => {
    if (!user) return;
    try {
      const token = await getIdToken();
      if (!token) throw new Error("Sesion no lista");
      const next = nextStatus(pet.status);
      const updated = await updatePetRequest(pet.id, { status: next }, token);
      setPets((prev) => prev.map((p) => (p.id === pet.id ? { ...p, status: updated.status } : p)));
      toast.success(`Estado cambiado a ${STATUS_LABELS[next] || next}`);
    } catch (err) {
      console.error("[PetsList] status", err);
      toast.error(err?.message || "No se pudo actualizar el estado");
    }
  };

  return (
    <>
      <section className="mb-6">
        <h1 className="section-title">Mascotas en adopcion</h1>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <input className="input" placeholder="Buscar por nombre o descripcion..." value={qText} onChange={(e)=>setQText(e.target.value)} />
          <input className="input" placeholder="Filtrar por ciudad..." value={city} onChange={(e)=>setCity(e.target.value)} />
          <button onClick={load} className="btn-primary w-full sm:w-auto" disabled={loading}>
            {loading ? "Actualizando..." : "Refrescar"}
          </button>
        </div>
      </section>

      {filtered.length === 0 ? (
        <div className="empty">
          <div className="text-5xl mb-2">:)</div>
          <p>No hay mascotas publicadas aun.</p>
        </div>
      ) : (
        <div className="grid-pets">
          {filtered.map((pet) => (
            <PetCard
              key={pet.id}
              pet={pet}
              onChat={user ? () => handleChat(pet) : undefined}
              canDelete={user?.uid === pet.ownerId || isAdmin}
              onDelete={() => handleDelete(pet)}
              deleting={deletingId === pet.id}
              onSave={user ? () => toggleSavedPet(pet.id) : undefined}
              saved={profile?.savedPets?.includes(pet.id)}
              canChangeStatus={user?.uid === pet.ownerId || isAdmin}
              onChangeStatus={() => handleStatusCycle(pet)}
            />
          ))}
        </div>
      )}
    </>
  );
}

async function ensureOwnerNames(pets) {
  const missingIds = [...new Set(
    pets
      .filter((pet) => (!pet.ownerName || pet.ownerName === pet.ownerId) && pet.ownerId)
      .map((pet) => pet.ownerId),
  )];
  if (missingIds.length === 0) return pets;
  const map = new Map();
  for (let i = 0; i < missingIds.length; i += 10) {
    const slice = missingIds.slice(i, i + 10);
    const snap = await getDocs(query(collection(db, "users"), where(documentId(), "in", slice)));
    snap.forEach((docSnap) => {
      const data = docSnap.data();
      map.set(docSnap.id, data.displayName || data.email || "Usuario");
    });
  }
  return pets.map((pet) => ({
    ...pet,
    ownerName: pet.ownerName || map.get(pet.ownerId) || pet.ownerId || "Usuario",
    status: pet.status || "active",
  }));
}

const STATUS_FLOW = ["active", "pending", "adoptado"];
const STATUS_LABELS = {
  active: "Activo",
  pending: "Pendiente",
  adoptado: "Adoptado",
};

function nextStatus(current) {
  const idx = STATUS_FLOW.indexOf(current);
  if (idx === -1) return STATUS_FLOW[0];
  return STATUS_FLOW[(idx + 1) % STATUS_FLOW.length];
}
