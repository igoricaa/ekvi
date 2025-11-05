"use client";

import { useQuery } from "convex/react";
import { api } from "../../../packages/backend/convex/_generated/api";

export default function Home() {
  const users = useQuery(api.users.list);

  return (
    <main className="p-8">
      <h1 className="font-bold text-4xl">EKVI</h1>

      <p>Users: {users?.length ?? 0}</p>
    </main>
  );
}
