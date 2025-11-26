'use client'

import Image from "next/image";
import Link from "next/link";
import { useContext, useEffect, useState } from "react";
import axios from "axios";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { UserDetailContext } from "@/context/UserDetailContext";
import { useAuth, UserButton } from "@clerk/nextjs";

type Chat = {
  id: number;
  chatMessage?: any;         // shape depends on your API
  createdBy?: string;
  createdOn?: string | Date;
  // fallback older property shapes you referenced:
  chatMessages?: { content?: string }[];
};

type ProjectItem = {
  projectId: string;
  frameId?: string;
  name?: string;
  chats?: Chat[];
};

export function AppSidebar() {
  const [projectList, setProjectList] = useState<ProjectItem[]>([]);
  const { userDetail } = useContext(UserDetailContext);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function getProjectList() {
      setLoading(true);
      setError(null);
      try {
        const res = await axios.get<ProjectItem[]>("/api/get-all-projects");
        if (!mounted) return;
        // normalize: ensure array
        setProjectList(Array.isArray(res.data) ? res.data : []);
      } catch (err: any) {
        console.error("Failed to load projects:", err);
        if (!mounted) return;
        setError(err?.message ?? "Failed to load projects");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    getProjectList();

    return () => {
      mounted = false;
    };
  }, []);


  // Helper to get label text for a project item (defensive)
  const getProjectLabel = (project: ProjectItem) => {
    // prefer explicit project name
    if (project.name) return project.name;
    // if chat structure uses chatMessage.content or chatMessages[]
    const firstChat = project.chats?.[0];
    // new shape: chatMessage could be a string or object
    const messageFromChatMessage =
      firstChat?.chatMessage?.content ?? // object shaped
        typeof firstChat?.chatMessage === "string" ? firstChat.chatMessage : undefined;
    if (messageFromChatMessage) return String(messageFromChatMessage);

    // older shape you referenced: chatMessages array
    const legacy = firstChat?.chatMessages?.[0]?.content;
    if (legacy) return legacy;

    // fallback
    return "Untitled Project";
  };

  const credits = userDetail?.credits ?? 2;
  // compute percentage for Progress (example: assume max 10 credits)
  const creditPercent = Math.min(100, Math.round((credits / 10) * 100));

  return (
    <Sidebar>
      <SidebarHeader className="p-5">
        <div className="flex items-center gap-2">
          {/* optional: use <Image> for optimization */}
          <Image src="/logo.svg" alt="logo" width={35} height={35} />
          <h2 className="font-bold text-xl">AI Website Builder</h2>
        </div>

        <Link href="/workspace" className="mt-5 w-full">
          <Button className="w-full">+ Add New Project</Button>
        </Link>
      </SidebarHeader>

      <SidebarContent className="p-2">
        <SidebarGroup>
          <SidebarGroupLabel>Projects</SidebarGroupLabel>

          {!loading && projectList.length === 0 && !error && (
            <h2 className="text-sm px-2 text-gray-500">No Projects Found</h2>
          )}

          {error && (
            <div className="text-sm px-2 text-red-500">Error: {error}</div>
          )}

          <div>
            {!loading && projectList.length > 0 ? (
              projectList.map((project) => {
                // stable key using projectId + frameId (less collisions than index)
                const key = `${project.projectId}::${project.frameId ?? "noframe"}`;

                // build href (only include frameId if present)
                const href = project.frameId
                  ? `/playground/${project.projectId}?frameId=${project.frameId}`
                  : `/playground/${project.projectId}`;

                return (
                  <Link
                    href={href}
                    key={key}
                    className="my-2 hover:bg-secondary p-2 rounded-lg cursor-pointer block"
                  >
                    <h2 className="line-clamp-1">{getProjectLabel(project)}</h2>
                  </Link>
                );
              })
            ) : (
              // loading skeletons (include key)
              [1, 2, 3, 4, 5].map((n) => (
                <Skeleton key={n} className="w-full h-10 rounded-lg mt-2" />
              ))
            )}
          </div>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-2">
       <div className="p-3 border rounded-xl space-y-3 bg-secondary">
          <h2 className="flex justify-between items-center">
            Remaining Credits <span className="font-bold">{credits}</span>
          </h2>
          <Progress value={userDetail} />
          <Link href={'/workspace/pricing'} className="w-full">
            <Button className="w-full">Upgrade to Unlimited</Button>
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <UserButton />
          <Button variant={"ghost"}> Settings </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
