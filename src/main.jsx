/* eslint-disable react-refresh/only-export-components */
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./index.css";
import AuthProvider from "./context/AuthContext";
import ProtectedRoute from "./routes/ProtectedRoute";
import Layout from "./components/Layout";
import PetsList from "./pages/PetsList";
import NewPet from "./pages/NewPet";
import Login from "./pages/Login";
import Register from "./pages/Register";
import VerifyEmail from "./pages/VerifyEmail";
import UserDashboard from "./pages/UserDashboard";
import { Toaster } from "react-hot-toast";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<PetsList />} />
            <Route path="/new" element={<ProtectedRoute><NewPet/></ProtectedRoute>} />
            <Route path="/verify-email" element={<ProtectedRoute><VerifyEmail/></ProtectedRoute>} />
            <Route path="/me" element={<ProtectedRoute><UserDashboard/></ProtectedRoute>} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
          </Routes>
        </Layout>
      </BrowserRouter>
      <Toaster position="top-right" />
    </AuthProvider>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
