"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, X } from "lucide-react";
import { useAuth } from "@/features/auth";
import ProfileImage from "@/shared/components/ProfileImage";
import { showError, showSuccess } from "@/shared/utils/toast";
import {
  getFollowers, getFollowing, getFollowRequests, getSavedProfiles,
  actOnFollowRequest, removeFollower, unfollowUser,
} from "@/shared/api/follow.api";
import type { FollowUser } from "@/shared/types/follow.types";

type Tab = "followers" | "following" | "requests" | "saved";
const TABS: { key: Tab; label: string }[] = [
  { key: "followers", label: "Followers" },
  { key: "following", label: "Following" },
  { key: "requests", label: "Requests" },
  { key: "saved", label: "Saved" },
];

export default function ConnectionsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const qc = useQueryClient();
  const myId = Number(user?.id);
  const [tab, setTab] = useState<Tab>("followers");

  const followers = useQuery({
    queryKey: ["followers", myId], queryFn: () => getFollowers(myId),
    enabled: !!myId && tab === "followers",
  });
  const following = useQuery({
    queryKey: ["following", myId], queryFn: () => getFollowing(myId),
    enabled: !!myId && tab === "following",
  });
  const requests = useQuery({
    queryKey: ["follow-requests"], queryFn: getFollowRequests,
    enabled: tab === "requests",
  });
  const saved = useQuery({
    queryKey: ["saved-profiles"], queryFn: getSavedProfiles,
    enabled: tab === "saved",
  });

  const reqAction = useMutation({
    mutationFn: (v: { id: string; action: "accept" | "reject" }) =>
      actOnFollowRequest(v.id, v.action),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["follow-requests"] });
      qc.invalidateQueries({ queryKey: ["followers", myId] });
      showSuccess("Done");
    },
    onError: (e) => showError(e, "Action failed."),
  });

  const removeFollowerM = useMutation({
    mutationFn: (uid: number) => removeFollower(uid),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["followers", myId] }); showSuccess("Follower removed"); },
    onError: (e) => showError(e, "Could not remove."),
  });

  const unfollowM = useMutation({
    mutationFn: (uid: number) => unfollowUser(uid),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["following", myId] }); showSuccess("Unfollowed"); },
    onError: (e) => showError(e, "Could not unfollow."),
  });

  const Row = ({ u, right }: { u: FollowUser; right?: React.ReactNode }) => (
    <div className="flex items-center gap-3 px-4 py-3">
      <button
        onClick={() => router.push(`/profile/${u.user_id}`)}
        className="flex flex-1 items-center gap-3 text-left min-w-0"
      >
        <ProfileImage src={u.profile_image} name={u.name} className="h-10 w-10 rounded-full" textClassName="text-sm" />
        <span className="truncate text-sm font-semibold text-[#2D2424]">{u.name}</span>
      </button>
      {right}
    </div>
  );

  return (
    <main className="min-h-[100dvh] px-4 py-5 text-[#2D2424]">
      <div className="mx-auto max-w-md">
        <header className="mb-4 flex items-center gap-3">
          <button onClick={() => router.push("/home")} className="glass-btn grid h-9 w-9 place-items-center rounded-full" aria-label="Back">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="text-xl font-semibold">Connections</h1>
        </header>

        <div className="mb-4 flex gap-2">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition
                ${tab === t.key ? "bg-indigo-600 text-white" : "glass-btn"}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="divide-y divide-white/40 rounded-2xl bg-white/40 backdrop-blur-md">
          {tab === "followers" && (
            (followers.data?.results ?? []).length === 0
              ? <Empty label="No followers yet" loading={followers.isLoading} />
              : followers.data!.results.map((u) => (
                <Row key={u.user_id} u={u} right={
                  <button onClick={() => removeFollowerM.mutate(u.user_id)} className="glass-btn rounded-full px-3 py-1 text-xs font-semibold">Remove</button>
                } />
              ))
          )}

          {tab === "following" && (
            (following.data?.results ?? []).length === 0
              ? <Empty label="Not following anyone yet" loading={following.isLoading} />
              : following.data!.results.map((u) => (
                <Row key={u.user_id} u={u} right={
                  <button onClick={() => unfollowM.mutate(u.user_id)} className="glass-btn rounded-full px-3 py-1 text-xs font-semibold">Unfollow</button>
                } />
              ))
          )}

          {tab === "requests" && (
            (requests.data?.results ?? []).length === 0
              ? <Empty label="No follow requests" loading={requests.isLoading} />
              : requests.data!.results.map((r) => (
                <Row key={r.id} u={r.follower} right={
                  <div className="flex gap-1.5">
                    <button onClick={() => reqAction.mutate({ id: r.id, action: "accept" })} className="grid h-8 w-8 place-items-center rounded-full bg-indigo-600 text-white" aria-label="Accept"><Check className="h-4 w-4" /></button>
                    <button onClick={() => reqAction.mutate({ id: r.id, action: "reject" })} className="glass-btn grid h-8 w-8 place-items-center rounded-full" aria-label="Reject"><X className="h-4 w-4" /></button>
                  </div>
                } />
              ))
          )}

          {tab === "saved" && (
            (saved.data?.results ?? []).length === 0
              ? <Empty label="No saved profiles" loading={saved.isLoading} />
              : saved.data!.results.map((s) => <Row key={s.id} u={s.profile} />)
          )}
        </div>
      </div>
    </main>
  );
}

function Empty({ label, loading }: { label: string; loading: boolean }) {
  return (
    <div className="px-4 py-12 text-center text-sm text-[#746767]">
      {loading ? "Loading…" : label}
    </div>
  );
}
