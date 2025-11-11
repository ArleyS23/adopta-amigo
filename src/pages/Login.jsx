import { useAuth } from "../context/AuthContext";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { Link, useNavigate } from "react-router-dom";

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const { register, handleSubmit } = useForm();

  const onSubmit = async ({ email, password }) => {
    try { await login(email, password); toast.success("Bienvenido"); nav("/"); }
    catch (e) { toast.error(e.message); }
  };

  return (
    <div className="card max-w-sm mx-auto p-6 mt-8">
      <h1 className="text-2xl font-bold mb-4">Iniciar sesión</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        <input className="input" placeholder="Email" {...register("email")} />
        <input className="input" type="password" placeholder="Contraseña" {...register("password")} />
        <button className="btn-primary w-full">Entrar</button>
      </form>
      <p className="text-sm mt-3">¿No tienes cuenta? <Link to="/register" className="underline">Regístrate</Link></p>
    </div>
  );
}
