"use client";

import { useState } from "react";
import { useUpdateProfile } from "@/features/profile/hooks/useProfile";

export default function EditProfile() {
  const mutation = useUpdateProfile();

  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");

const handleSubmit = () => {
const formData = new FormData();
formData.append("bio", bio);
formData.append("location", location);

mutation.mutate(formData, {
    onError: (err: any) => {
    console.log("❌ STATUS:", err.response?.status);
    console.log("❌ DATA:", err.response?.data);
    },
});
};

  return (
    <div>
      <input
        placeholder="Bio"
        onChange={(e) => setBio(e.target.value)}
      />
      <input
        placeholder="Location"
        onChange={(e) => setLocation(e.target.value)}
      />

      <button onClick={handleSubmit}>
        Update
      </button>
    </div>
  );
}