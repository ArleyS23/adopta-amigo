import { useAuth } from "../context/AuthContext";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { Link, useNavigate } from "react-router-dom";

export default function Register() {
  const { register: signUp } = useAuth();
  const nav = useNavigate();
  const { register, handleSubmit } = useForm();

  const onSubmit = async ({ email, password }) => {
    try { await signUp(email, password); toast.success("Revisa tu correo para verificar"); nav("/"); }
    catch (e) { toast.error(e.message); }
  };

  return (
    <div className="card max-w-sm mx-auto p-6 mt-8">
      <h1 className="text-2xl font-bold mb-4">Crear cuenta</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        <input className="input" placeholder="Email" {...register("email")} />
        <input className="input" type="password" placeholder="Contraseña" {...register("password")} />
        <button className="btn-primary w-full">Registrarme</button>
      </form>
      <p className="text-sm mt-3">¿Ya tienes cuenta? <Link to="/login" className="underline">Entrar</Link></p>
    </div>
  );
}
