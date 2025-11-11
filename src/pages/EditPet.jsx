import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";

const schema = z.object({
  name: z.string().min(2, "Nombre muy corto"),
  age: z.coerce.number().min(0, "Edad invalida").max(30, "Edad muy alta"),
  description: z.string().min(5, "Agrega una descripcion"),
  city: z.string().optional(),
  contact: z.string().email("Email invalido").optional().or(z.literal("").transform(() => undefined)),
  imageUrl: z.string().url("URL invalida").optional().or(z.literal("").transform(() => undefined)),
});

export default function EditPet() {
  const { id } = useParams();
  const { user, rsaReady, signSecure, rsaPublicKey, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  const form = useForm({ resolver: zodResolver(schema) });

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
        const data = snap.data();
        if (data.ownerId !== user?.uid) {
          toast.error("No puedes editar esta publicación");
          navigate("/");
          return;
        }
        form.reset({
          name: data.name,
          age: data.age,
          description: data.description,
          city: data.city || "",
          contact: data.contact || "",
          imageUrl: data.imageUrl || "",
        });
      } catch (err) {
        console.error("[EditPet] load", err);
        toast.error("No se pudo cargar la mascota");
        navigate("/");
      } finally {
        setLoading(false);
      }
    }
    if (user) load();
  }, [id, navigate, user, form]);

  const onSubmit = async (values) => {
    if (!user || !rsaReady) {
      toast.error("Tu sesión o llaves no están listas");
      return;
    }
    try {
      setSaving(true);
      toast.loading("Guardando cambios…", { id: "edit" });
      const payload = {
        name: values.name,
        age: Number(values.age),
        description: values.description,
        city: values.city || null,
        contact: values.contact || null,
        imageUrl: values.imageUrl || null,
        ownerName: profile?.displayName || user.displayName || user.email || "Usuario",
        ownerPublicKey: rsaPublicKey,
        updatedAt: new Date().toISOString(),
      };
      if (values.contact) {
        payload.contactSignature = await signSecure(values.contact);
      } else {
        payload.contactSignature = null;
      }
      await updateDoc(doc(db, "pets", id), payload);
      toast.success("Publicación actualizada", { id: "edit" });
      navigate(`/pet/${id}`);
    } catch (err) {
      console.error("[EditPet] submit", err);
      toast.error(err.message || "No se pudo guardar", { id: "edit" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="card p-6 mt-10">Cargando…</div>;

  return (
    <div className="card max-w-2xl mx-auto p-6 mt-6">
      <h1 className="text-2xl font-bold mb-4">Editar publicación</h1>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Nombre</label>
          <input className="input" {...form.register("name")} />
          {form.formState.errors.name && <p className="text-red-500 text-sm">{form.formState.errors.name.message}</p>}
        </div>
        <div>
          <label className="label">Edad (años)</label>
          <input className="input" type="number" {...form.register("age")} />
          {form.formState.errors.age && <p className="text-red-500 text-sm">{form.formState.errors.age.message}</p>}
        </div>
        <div className="sm:col-span-2">
          <label className="label">Descripción</label>
          <textarea className="input" rows="3" {...form.register("description")} />
          {form.formState.errors.description && <p className="text-red-500 text-sm">{form.formState.errors.description.message}</p>}
        </div>
        <div>
          <label className="label">Ciudad</label>
          <input className="input" {...form.register("city")} />
        </div>
        <div>
          <label className="label">Email de contacto</label>
          <input className="input" {...form.register("contact")} />
          {form.formState.errors.contact && <p className="text-red-500 text-sm">{form.formState.errors.contact.message}</p>}
        </div>
        <div className="sm:col-span-2">
          <label className="label">URL de la foto</label>
          <input className="input" {...form.register("imageUrl")} />
          {form.formState.errors.imageUrl && <p className="text-red-500 text-sm">{form.formState.errors.imageUrl.message}</p>}
        </div>
        <div className="sm:col-span-2 flex justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={() => navigate(-1)}>Cancelar</button>
          <button className="btn-primary" type="submit" disabled={saving}>
            {saving ? "Guardando…" : "Guardar cambios"}
          </button>
        </div>
      </form>
    </div>
  );
}
