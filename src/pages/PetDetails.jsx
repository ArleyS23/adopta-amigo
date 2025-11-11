import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import PetCard from "../components/PetCard";
import { deletePetRequest, getPet, updatePetRequest } from "../services/petsService";
import { ensureConversation } from "../services/conversationsService";

const API_ORIGIN = (import.meta.env.VITE_API_URL || "http://localhost:4000/api").replace(/\/api$/, "");
const STATUS_FLOW = ["active", "pending", "adoptado"];
const STATUS_LABELS = {
  active: "Activo",
  pending: "Pendiente",
  adoptado: "Adoptado",
};

export default function PetDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, profile, toggleSavedPet, isAdmin } = useAuth();
  const [pet, setPet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [openingChat, setOpeningChat] = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const data = await getPet(id);
        setPet(data);
      } catch (err) {
        console.error("[PetDetails] load", err);
        toast.error(err?.message || "No se pudo cargar la mascota");
        navigate("/");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, navigate]);

  const handleDelete = async () => {
    if (!pet) return;
    const isOwner = user?.uid === pet.ownerId;
    if (!isOwner && !isAdmin) {
      toast.error("No tienes permiso para eliminar esta publicación");
      return;
    }
    if (!confirm(`¿Eliminar "${pet.name}"?`)) return;
    try {
      setDeleting(true);
      await deletePetRequest(pet.id, user, profile?.role || "user");
      toast.success("Publicación eliminada");
      navigate("/");
    } catch (err) {
      console.error("[PetDetails] delete", err);
      toast.error(err?.message || "No se pudo eliminar");
      setDeleting(false);
    }
  };

  const handleChat = async () => {
    if (!pet) return;
    if (!user) {
      toast.error("Debes iniciar sesión");
      return;
    }
    if (user.uid === pet.ownerId) {
      toast("Esta es tu publicación; revisa las solicitudes en Mi espacio");
      return;
    }
    try {
      setOpeningChat(true);
      const conversationId = await ensureConversation(pet, user, profile);
      navigate(`/chat/${conversationId}`);
    } catch (err) {
      console.error("[PetDetails] chat", err);
      toast.error(err?.message || "No se pudo abrir el chat");
    } finally {
      setOpeningChat(false);
    }
  };

  const handleCycleStatus = async () => {
    if (!pet || !user) return;
    try {
      setChangingStatus(true);
      const next = nextStatus(pet.status);
      const updated = await updatePetRequest(pet.id, { status: next }, user, profile?.role || "user");
      setPet((prev) => ({ ...prev, status: updated.status }));
      toast.success(`Estado actualizado a ${STATUS_LABELS[next] || next}`);
    } catch (err) {
      console.error("[PetDetails] status", err);
      toast.error(err?.message || "No se pudo actualizar el estado");
    } finally {
      setChangingStatus(false);
    }
  };

  if (loading) return <div className="card p-6 mt-10">Cargando información…</div>;
  if (!pet) return null;

  const isOwner = user?.uid === pet.ownerId;
  const canEdit = isOwner || isAdmin;
  const saved = profile?.savedPets?.includes(pet.id);

  const heroImage = pet.imageUrl?.startsWith("/uploads/")
    ? `${API_ORIGIN}${pet.imageUrl}`
    : (pet.imageUrl || "https://placehold.co/800x600?text=Mascota");

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <Link to="/" className="btn-ghost">← Volver</Link>
        {canEdit && (
          <div className="flex gap-2">
            <Link to={`/pet/${pet.id}/edit`} className="btn-secondary">Editar</Link>
            <button className="btn-danger" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Eliminando…" : "Eliminar"}
            </button>
          </div>
        )}
      </div>

      <div className="card overflow-hidden">
        <div className="grid md:grid-cols-2">
          <img
            src={heroImage}
            alt={pet.name}
            className="w-full h-80 object-cover"
          />
          <div className="p-6 space-y-4">
            <div>
              <p className="text-sm uppercase text-gray-500">Publicada por</p>
              <p className="text-lg font-semibold">{pet.ownerName || "Usuario"}</p>
            </div>
            <div>
              <p className="text-sm uppercase text-gray-500">Contacto</p>
              <div className="flex gap-2 flex-wrap items-center">
                {pet.contact && (
                  <a className="text-primary underline" href={`mailto:${pet.contact}`}>{pet.contact}</a>
                )}
                {user && user.uid !== pet.ownerId && (
                  <button className="btn-primary" onClick={handleChat} disabled={openingChat}>
                    {openingChat ? "Abriendo…" : "Chat"}
                  </button>
                )}
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <span className="badge">{pet.age} años</span>
              {pet.city && <span className="badge">{pet.city}</span>}
              {pet.status && <span className="badge">{STATUS_LABELS[pet.status] || pet.status}</span>}
              {pet.breed && <span className="badge">{pet.breed}</span>}
              {pet.color && <span className="badge">{pet.color}</span>}
              {pet.size && <span className="badge">{pet.size}</span>}
            </div>
            <p className="text-gray-700">{pet.description}</p>
            {Array.isArray(pet.vaccines) && pet.vaccines.length > 0 && (
              <div>
                <p className="text-sm uppercase text-gray-500">Vacunas</p>
                <p className="text-gray-700">{pet.vaccines.join(", ")}</p>
              </div>
            )}
            <div className="flex gap-3 flex-wrap">
              <button onClick={() => toggleSavedPet(pet.id)} className="btn-ghost" disabled={!user}>
                {saved ? "Quitar de pendientes" : "Guardar"}
              </button>
              {canEdit && (
                <button className="btn-ghost" onClick={handleCycleStatus} disabled={changingStatus}>
                  {changingStatus ? "Actualizando…" : `Estado: ${STATUS_LABELS[pet.status] || pet.status}`}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <section>
        <h2 className="section-title mb-3">Resumen compacto</h2>
        <PetCard
          pet={pet}
          onChat={user && user.uid !== pet.ownerId ? () => handleChat() : undefined}
          canDelete={canEdit}
          onDelete={handleDelete}
          deleting={deleting}
          onSave={user ? () => toggleSavedPet(pet.id) : undefined}
          saved={saved}
          canChangeStatus={canEdit}
          onChangeStatus={handleCycleStatus}
        />
      </section>
    </div>
  );
}

function nextStatus(current) {
  const idx = STATUS_FLOW.indexOf(current);
  if (idx === -1) return STATUS_FLOW[0];
  return STATUS_FLOW[(idx + 1) % STATUS_FLOW.length];
}
