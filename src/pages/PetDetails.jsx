import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { doc, getDoc, deleteDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import PetCard from "../components/PetCard";

export default function PetDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, profile, toggleSavedPet } = useAuth();
  const [pet, setPet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const snap = await getDoc(doc(db, "pets", id));
        if (!snap.exists()) {
          toast.error("Mascota no encontrada");
          navigate("/");
          return;
        }
        setPet({ id: snap.id, ...snap.data() });
      } catch (err) {
        console.error("[PetDetails] load", err);
        toast.error("No se pudo cargar la mascota");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, navigate]);

  const handleDelete = async () => {
    if (!pet) return;
    if (!confirm(`¿Eliminar "${pet.name}"?`)) return;
    try {
      setDeleting(true);
      await deleteDoc(doc(db, "pets", pet.id));
      toast.success("Publicación eliminada");
      navigate("/");
    } catch (err) {
      console.error("[PetDetails] delete", err);
      toast.error("No se pudo eliminar");
      setDeleting(false);
    }
  };

  if (loading) return <div className="card p-6 mt-10">Cargando información…</div>;
  if (!pet) return null;

  const isOwner = user?.uid === pet.ownerId;
  const saved = profile?.savedPets?.includes(pet.id);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <Link to="/" className="btn-ghost">← Volver</Link>
        {isOwner && (
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
            src={pet.imageUrl}
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
              <p className="text-base">
                {pet.contact
                  ? <a className="text-primary underline" href={`mailto:${pet.contact}`}>{pet.contact}</a>
                  : "No disponible"}
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <span className="badge">{pet.age} años</span>
              {pet.city && <span className="badge">{pet.city}</span>}
              {pet.status && <span className="badge">{pet.status}</span>}
            </div>
            <p className="text-gray-700">{pet.description}</p>
            <div className="flex gap-3">
              <button onClick={() => toggleSavedPet(pet.id)} className="btn-ghost" disabled={!user}>
                {saved ? "Quitar de pendientes" : "Guardar"}
              </button>
              {pet.contact && (
                <a className="btn-primary" href={`mailto:${pet.contact}`}>
                  Escribir
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      <section>
        <h2 className="section-title mb-3">Resumen compacto</h2>
        <PetCard
          pet={pet}
          onContact={pet.contact ? () => window.open(`mailto:${pet.contact}`) : undefined}
          canDelete={isOwner}
          onDelete={handleDelete}
          deleting={deleting}
          onSave={user ? () => toggleSavedPet(pet.id) : undefined}
          saved={saved}
        />
      </section>
    </div>
  );
}
