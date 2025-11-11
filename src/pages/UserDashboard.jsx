import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { collection, deleteDoc, doc, documentId, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import PetCard from "../components/PetCard";

const chunk = (arr, size = 10) => {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
};

export default function UserDashboard() {
  const { user, profile, updateDisplayName, toggleSavedPet } = useAuth();
  const [name, setName] = useState(profile?.displayName || "");
  const [savingName, setSavingName] = useState(false);
  const [myPets, setMyPets] = useState([]);
  const [savedPets, setSavedPets] = useState([]);
  const [loadingMine, setLoadingMine] = useState(true);
  const [loadingSaved, setLoadingSaved] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => { setName(profile?.displayName || ""); }, [profile?.displayName]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        setLoadingMine(true);
        const q = query(collection(db, "pets"), where("ownerId", "==", user.uid));
        const snap = await getDocs(q);
        setMyPets(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error("[Dashboard] loadPets", err);
        toast.error("No se pudieron cargar tus publicaciones");
      } finally {
        setLoadingMine(false);
      }
    };
    load();
  }, [user]);

  useEffect(() => {
    const ids = profile?.savedPets || [];
    if (!user || ids.length === 0) {
      setSavedPets([]);
      return;
    }
    const loadSaved = async () => {
      try {
        setLoadingSaved(true);
        const result = [];
        for (const portion of chunk(ids, 10)) {
          const q = query(collection(db, "pets"), where(documentId(), "in", portion));
          const snap = await getDocs(q);
          result.push(...snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        }
        const ordered = orderByIds(ids, result);
        setSavedPets(ordered);
      } catch (err) {
        console.error("[Dashboard] loadSaved", err);
        toast.error("No se pudo cargar la lista guardada");
      } finally {
        setLoadingSaved(false);
      }
    };
    loadSaved();
  }, [user, profile?.savedPets]);

  const handleNameSave = async (e) => {
    e.preventDefault();
    try {
      setSavingName(true);
      await updateDisplayName(name.trim());
      toast.success("Nombre actualizado");
    } catch (err) {
      console.error("[Dashboard] update name", err);
      toast.error(err.message || "No se pudo guardar");
    } finally {
      setSavingName(false);
    }
  };

  const handleDeletePet = async (pet) => {
    if (!confirm(`¿Eliminar "${pet.name}"?`)) return;
    try {
      setDeletingId(pet.id);
      await deleteDoc(doc(db, "pets", pet.id));
      setMyPets((prev) => prev.filter((p) => p.id !== pet.id));
      toast.success("Publicación eliminada");
    } catch (err) {
      console.error("[Dashboard] delete", err);
      toast.error("No se pudo eliminar");
    } finally {
      setDeletingId(null);
    }
  };

  if (!user) return null;

  return (
    <div className="space-y-10">
      <section className="card p-6">
        <h1 className="text-2xl font-semibold mb-4">Tu perfil</h1>
        <form onSubmit={handleNameSave} className="space-y-3 max-w-md">
          <label className="label">Nombre para mostrar</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Ana voluntaria" />
          <button className="btn-primary" type="submit" disabled={savingName}>
            {savingName ? "Guardando..." : "Guardar nombre"}
          </button>
        </form>
      </section>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-title">Tus publicaciones</h2>
          {loadingMine && <span className="text-sm text-gray-500">Cargando...</span>}
        </div>
        {myPets.length === 0 ? (
          <div className="empty">Aún no has publicado mascotas.</div>
        ) : (
          <div className="grid-pets">
            {myPets.map((pet) => (
              <PetCard
                key={pet.id}
                pet={pet}
                canDelete
                onDelete={() => handleDeletePet(pet)}
                deleting={deletingId === pet.id}
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-title">Tu lista guardada</h2>
          {loadingSaved && <span className="text-sm text-gray-500">Actualizando...</span>}
        </div>
        {savedPets.length === 0 ? (
          <p className="text-sm text-gray-500">No has guardado mascotas todavía. Pulsa “Guardar” en la lista principal.</p>
        ) : (
          <div className="grid-pets">
            {savedPets.map((pet) => (
              <PetCard
                key={pet.id}
                pet={pet}
                onSave={() => toggleSavedPet(pet.id)}
                saved
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function orderByIds(orderIds, pets) {
  const map = new Map(pets.map((p) => [p.id, p]));
  return orderIds.map((id) => map.get(id)).filter(Boolean);
}
