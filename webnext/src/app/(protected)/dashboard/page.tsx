"use client";

import ProtectedRoute from "@/shared/lib/protected-route";
import { useContext } from "react";
import { AuthContext } from "@/shared/lib/auth-context";

export default function Dashboard() {
  const { user } = useContext(AuthContext);

  return (
    <ProtectedRoute>
      <h1>Welcome {user?.username}</h1>
    </ProtectedRoute>
  );
}