// "use client";

// import { useEffect } from "react";
// import { useRouter } from "next/navigation";
// import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";

// export default function Page() {
//   const { loading, isAuthenticated } = useCurrentUser();
//   const router = useRouter();

//   useEffect(() => {
//     if (!loading && !isAuthenticated) {
//       router.replace("/login");
//     }
//   }, [loading, isAuthenticated, router]);

//   if (loading) {
//     return (
//       <div className="flex items-center justify-center min-h-screen">
//         <p className="text-zinc-500">Loading...</p>
//       </div>
//     );
//   }

//   // Prevents flashing the page content before the redirect occurs
//   if (!isAuthenticated) {
//     return null; 
//   }

//   return <div>Shree Page ✅</div>;
// }

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";

export default function Page() {
  const { loading, isAuthenticated } = useCurrentUser();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [loading, isAuthenticated, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-zinc-500">Loading...</p>
      </div>
    );
  }

  // Show a login prompt with a button instead of returning null
  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
        <h1 className="text-2xl font-bold mb-2">Welcome to Shree Page</h1>
        <p className="text-zinc-500 mb-6">
          You need to be logged in to view the contents of this page.
        </p>
        <button
          onClick={() => router.push("/login")}
          className="px-5 py-2.5 bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 rounded-md font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition"
        >
          Go to Login
        </button>
      </div>
    );
  }

  return <div>Shree Page ✅</div>;
}