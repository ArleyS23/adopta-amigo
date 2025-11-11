import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import PetCard from "../components/PetCard";
import { useAuth } from "../context/AuthContext";
import Modal from "../components/Modal";
import { collection, deleteDoc, doc, getDocs, limit, orderBy, query } from "firebase/firestore";
import { db } from "../firebase";
import { verifyWithBase64Key } from "../utils/rsa";

export default function PetsList() {
  const [pets, setPets] = useState([]);
  const [qText, setQText] = useState("");
  const [city, setCity] = useState("");
  const [contactPet, setContactPet] = useState(null);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const { user, profile, toggleSavedPet } = useAuth();

  const load = async () => {
    try {
      setLoading(true);
      const q = query(
        collection(db, "pets"),
        orderBy("createdAt", "desc"),
        limit(100),
      );
      const snap = await getDocs(q);
      const mapped = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          ...data,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt,
        };
      });
      const enriched = await Promise.all(mapped.map(async (pet) => {
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
      setPets(enriched);
    } catch (err) {
      console.error("[PetsList] load", err);
      toast.error(err?.message || "No se pudo cargar");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    return pets.filter((pet) => {
      const matchCity = city ? (pet.city || "").toLowerCase().includes(city.toLowerCase()) : true;
      const hay = [pet.name, pet.description, pet.city].filter(Boolean).join(" ").toLowerCase();
      const matchText = qText ? hay.includes(qText.toLowerCase()) : true;
      return matchCity && matchText;
    });
  }, [pets, city, qText]);

  const handleDelete = async (pet) => {
    if (!user) {
      toast.error("Debes iniciar sesion para eliminar");
      return;
    }
    if (!confirm(`Eliminar a ${pet.name}?`)) return;
    try {
      setDeletingId(pet.id);
      await deleteDoc(doc(db, "pets", pet.id));
      setPets((prev) => prev.filter((p) => p.id !== pet.id));
      toast.success("Publicacion eliminada");
    } catch (err) {
      console.error("[PetsList] delete", err);
      toast.error(err?.message || "No se pudo eliminar");
    } finally {
      setDeletingId(null);
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
              onContact={() => setContactPet(pet)}
              canDelete={user?.uid === pet.ownerId}
              onDelete={() => handleDelete(pet)}
              deleting={deletingId === pet.id}
              onSave={user ? () => toggleSavedPet(pet.id) : undefined}
              saved={profile?.savedPets?.includes(pet.id)}
            />
          ))}
        </div>
      )}

      <Modal
        open={!!contactPet}
        onClose={() => setContactPet(null)}
        title={`Contacto de ${contactPet?.name || ""}`}
        footer={<button className="btn-ghost" onClick={()=>setContactPet(null)}>Cerrar</button>}
      >
        {contactPet?.contact
          ? <div className="space-y-2">
              <p className="text-sm text-gray-700">Puedes escribir a:</p>
              <a className="btn-primary" href={`mailto:${contactPet.contact}`}>{contactPet.contact}</a>
            </div>
          : <p className="text-sm text-gray-700">El dueno no compartio email.</p>
        }
      </Modal>
    </>
  );
}
