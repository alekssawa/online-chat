import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";

export const useAuthClient = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuthClient must be used within AuthProvider");
  return ctx.client;
};
