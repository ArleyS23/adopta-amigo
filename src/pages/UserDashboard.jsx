import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import PetCard from "../components/PetCard";
import { deletePetRequest, listPets, updatePetRequest } from "../services/petsService";
import { updateConversationStatus } from "../services/conversationsService";
import { db } from "../firebase";

const chunk = (arr, size = 10) => {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
};

const STATUS_LABELS = {
  pending: "Pendiente",
  active: "Activo",
  adoptado: "Adoptado",
};

export default function UserDashboard() {
  const { user, profile, updateProfile, toggleSavedPet, isAdmin } = useAuth();
  const [name, setName] = useState(profile?.displayName || "");
  const [photo, setPhoto] = useState(profile?.photoURL || "");
  const [savingName, setSavingName] = useState(false);
  const [myPets, setMyPets] = useState([]);
  const [savedPets, setSavedPets] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loadingMine, setLoadingMine] = useState(true);
  const [loadingSaved, setLoadingSaved] = useState(false);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    setName(profile?.displayName || "");
    setPhoto(profile?.photoURL || "");
  }, [profile?.displayName, profile?.photoURL]);

  useEffect(() => {
    if (!user) return;
    async function loadMine() {
      try {
        setLoadingMine(true);
        const data = await listPets({ ownerId: user.uid });
        setMyPets(data);
      } catch (err) {
        console.error("[Dashboard] loadPets", err);
        toast.error("No se pudieron cargar tus publicaciones");
      } finally {
        setLoadingMine(false);
      }
    }
    loadMine();
  }, [user]);

  useEffect(() => {
    const ids = profile?.savedPets || [];
    if (!user || ids.length === 0) {
      setSavedPets([]);
      return;
    }
    async function loadSaved() {
      try {
        setLoadingSaved(true);
        const result = [];
        for (const part of chunk(ids, 10)) {
          const data = await listPets({ ids: part });
          result.push(...data);
        }
        setSavedPets(orderByIds(ids, result));
      } catch (err) {
        console.error("[Dashboard] loadSaved", err);
        toast.error("No se pudo cargar la lista guardada");
      } finally {
        setLoadingSaved(false);
      }
    }
    loadSaved();
  }, [user, profile?.savedPets]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "conversations"), where("ownerId", "==", user.uid));
    const unsub = onSnapshot(q, (snap) => {
      setRequests(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoadingRequests(false);
    });
    return () => unsub();
  }, [user]);

  const handleNameSave = async (e) => {
    e.preventDefault();
    try {
      setSavingName(true);
      await updateProfile({ displayName: name.trim(), photoURL: photo.trim() });
      toast.success("Perfil actualizado");
    } catch (err) {
      console.error("[Dashboard] update profile", err);
      toast.error(err.message || "No se pudo guardar");
    } finally {
      setSavingName(false);
    }
  };

  const handleDeletePet = async (pet) => {
    if (!confirm(`¿Eliminar "${pet.name}"?`)) return;
    try {
      setDeletingId(pet.id);
      await deletePetRequest(pet.id, user, profile?.role || "user");
      setMyPets((prev) => prev.filter((p) => p.id !== pet.id));
      toast.success("Publicación eliminada");
    } catch (err) {
      console.error("[Dashboard] delete", err);
      toast.error("No se pudo eliminar");
    } finally {
      setDeletingId(null);
    }
  };

  const handleStatusChange = async (conversation, newStatus) => {
    try {
      await updateConversationStatus(conversation.id, newStatus);
      await updatePetRequest(conversation.petId, { status: newStatus }, user, profile?.role || "user");
      toast.success("Estado actualizado");
    } catch (err) {
      console.error("[Dashboard] status", err);
      toast.error(err?.message || "No se pudo actualizar");
    }
  };

  if (!user) return null;

  return (
    <div className="space-y-10">
      <section className="card p-6">
        <h1 className="text-2xl font-semibold mb-4">Tu perfil</h1>
        <div className="flex items-center gap-4 mb-6">
          <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-100">
            {photo
              ? <img src={photo} alt="Avatar" className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center text-2xl text-gray-400">{(name || user.email || "?").charAt(0).toUpperCase()}</div>
            }
          </div>
          <div>
            <p className="text-lg font-semibold">{profile?.displayName || user.email}</p>
            <p className="text-sm text-gray-600">{user.email}</p>
            <span className={`badge mt-2 ${isAdmin ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}`}>
              {isAdmin ? "Administrador" : "Usuario"}
            </span>
          </div>
        </div>
        <form onSubmit={handleNameSave} className="space-y-3 max-w-md">
          <label className="label">Nombre para mostrar</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Ana voluntaria" />
          <label className="label">Foto (URL)</label>
          <input className="input" value={photo} onChange={(e) => setPhoto(e.target.value)} placeholder="https://..." />
          <button className="btn-primary" type="submit" disabled={savingName}>
            {savingName ? "Guardando..." : "Guardar cambios"}
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
          <p className="text-sm text-gray-500">No has guardado mascotas todavía. Pulsa "Guardar" en la lista principal.</p>
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

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-title">Solicitudes pendientes</h2>
          {loadingRequests && <span className="text-sm text-gray-500">Cargando...</span>}
        </div>
        {requests.length === 0 ? (
          <p className="text-sm text-gray-500">Aún no tienes solicitudes de adopción.</p>
        ) : (
          <div className="space-y-3">
            {requests.map((req) => (
              <div key={req.id} className="card p-4 space-y-3">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                  <div>
                    <p className="font-semibold">{req.petName}</p>
                    <p className="text-sm text-gray-600">Interesado: {req.adopterName}</p>
                  </div>
                  <div className="flex gap-2">
                    <button className="btn-ghost" onClick={() => navigate(`/chat/${req.id}`)}>Abrir chat</button>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                  <label className="text-sm text-gray-600">Estado</label>
                  <select
                    className="input w-full sm:w-auto"
                    value={req.status || "pending"}
                    onChange={(e) => handleStatusChange(req, e.target.value)}
                  >
                    {Object.entries(STATUS_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>
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
