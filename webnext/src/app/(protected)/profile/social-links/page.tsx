// app/profile/social-links/page.tsx
// Route: /profile/social-links

"use client";

import SocialLinksManager from "@/features/profile/components/SocialLinksManager";

export default function SocialLinksPage() {
  return (
    <main className="min-h-screen py-8 px-4">
      <div className="max-w-sm mx-auto">

        {/* Header */}
        <div className="mb-6">
          <div>
            <h1 className="text-lg font-semibold text-gray-800">Social Links</h1>
            <p className="text-xs text-gray-400">
              Visible to anyone who views your profile
            </p>
          </div>
        </div>

        {/* Manager */}
        <div className="rounded-3xl shadow-sm border border-gray-100 p-5">
          <SocialLinksManager />
        </div>

        {/* Privacy note */}
        <p className="text-xs text-center text-gray-400 mt-4 px-4">
           Your social links are public. Only add links you're comfortable sharing.
        </p>
      </div>
    </main>
  );
}