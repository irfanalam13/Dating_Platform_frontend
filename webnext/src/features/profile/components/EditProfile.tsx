// "use client";

// import { useState } from "react";
// import { useUpdateProfile } from "@/features/profile/hooks/useProfile";
// import { useRouter } from 'next/navigation';

// export default function EditProfile() {
//   const mutation = useUpdateProfile();

//   const [bio, setBio] = useState("");
//   const [location, setLocation] = useState("");
//   const router = useRouter();
// const handleSubmit = () => {
// const formData = new FormData();
// formData.append("bio", bio);
// formData.append("location", location);

// mutation.mutate(formData, {
//     onError: (err: any) => {
//     console.log("❌ STATUS:", err.response?.status);
//     console.log("❌ DATA:", err.response?.data);
//     },
// });
// }; 

//   return (
//     <div>
//       <input
//         placeholder="Bio"
//         onChange={(e) => setBio(e.target.value)}
//       />
//       <input
//         placeholder="Location"
//         onChange={(e) => setLocation(e.target.value)}
//       />

//       <button onClick={handleSubmit}>
//         Update
//       </button>
//     </div>
//   );
// }








"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { useUpdateProfile } from "@/features/profile/hooks/useProfile";
import { showSuccess, showError } from "@/shared/utils/toast";

// 1. Define schema using Zod
const profileSchema = z.object({
  bio: z
    .string()
    .min(10, { message: "Bio must be at least 10 characters long" })
    .max(160, { message: "Bio cannot exceed 160 characters" }),
  location: z
    .string()
    .min(2, { message: "Location must be at least 2 characters" })
    .max(50, { message: "Location cannot exceed 50 characters" }),
});

// Infer types from the schema
type ProfileFormData = z.infer<typeof profileSchema>;

export default function EditProfile() {
  const router = useRouter();
  const mutation = useUpdateProfile();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting, isDirty, isValid },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    mode: "onTouched",
    defaultValues: {
      bio: "",
      location: "",
    },
  });

  // 2. Submit handler
  const onSubmit = async (data: ProfileFormData) => {
    const formData = new FormData();
    formData.append("bio", data.bio);
    formData.append("location", data.location);

    mutation.mutate(formData, {
      onSuccess: (res: any) => {
        showSuccess(res?.message || "Profile updated successfully");
        router.push("/profile"); // Redirect after success
      },
      onError: (err: any) => {
        console.error("❌ UPDATE PROFILE ERROR:", err);
        showError(err?.response?.data?.message || "Failed to update profile");

        // Map backend-specific error fields to the form
        const apiErrors = err?.response?.data?.errors;
        if (apiErrors) {
          Object.keys(apiErrors).forEach((field) => {
            setError(field as keyof ProfileFormData, {
              type: "manual",
              message: apiErrors[field],
            });
          });
        }
      },
    });
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-50 p-6">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="w-full max-w-md bg-white p-8 rounded-xl shadow-md border border-gray-100 space-y-6"
      >
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Edit Profile</h1>
          <p className="text-sm text-gray-500 mt-1">Update your profile information below.</p>
        </div>

        {/* Bio Field */}
        <div className="flex flex-col space-y-2">
          <label htmlFor="bio" className="text-sm font-medium text-gray-700">
            Bio
          </label>
          <textarea
            id="bio"
            {...register("bio")}
            className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            placeholder="Tell us a little bit about yourself"
            rows={4}
          />
          {errors.bio && (
            <p className="text-sm font-medium text-red-600 animate-fadeIn">
              {errors.bio.message}
            </p>
          )}
        </div>

        {/* Location Field */}
        <div className="flex flex-col space-y-2">
          <label htmlFor="location" className="text-sm font-medium text-gray-700">
            Location
          </label>
          <input
            id="location"
            type="text"
            {...register("location")}
            className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            placeholder="e.g., San Francisco, CA"
          />
          {errors.location && (
            <p className="text-sm font-medium text-red-600 animate-fadeIn">
              {errors.location.message}
            </p>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={!isDirty || !isValid || isSubmitting || mutation.isPending}
          className="w-full py-3 px-4 text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg shadow-md font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          {isSubmitting || mutation.isPending ? (
            <>
              <svg
                className="animate-spin h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              <span>Saving...</span>
            </>
          ) : (
            "Save Changes"
          )}
        </button>
      </form>
    </div>
  );
}