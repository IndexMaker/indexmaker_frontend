"use client";
import { useEffect, useState } from "react";
import { fetchProjects } from "@/api/projects";
import { useLanguage } from "@/contexts/language-context";
import Dashboard from "@/components/views/Dashboard/dashboard";
import { Project } from "@/types";
import { fallbackProjects } from "@/lib/fallback-projects";
import { ProjectCard } from "@/components/views/ecosystem/ecosystem";
import dynamic from "next/dynamic";

// Disable SSR completely for this page
const EcosystemClient = () => {
  const { t } = useLanguage();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProjects = async () => {
      try {
        const data = await fetchProjects();
        setProjects(data.length ? data : fallbackProjects);
      } catch {
        setProjects(fallbackProjects);
      } finally {
        setLoading(false);
      }
    };

    loadProjects();
  }, []);

  return (
    <Dashboard>
      <div className="flex flex-col gap-4">
        <div className="flex gap-5 flex-col">
          <h1 className="text-[38px] font-normal text-primary h-[44px] items-center flex">
            {t("common.ecosystem")}
          </h1>
          <p className="text-secondary text-[14px]">
            {t("common.projectsOnIndexMaker")}
          </p>
        </div>

        {loading ? (
          <div className="grid sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 custom-3xl-grid gap-3 py-10">
            {[...Array(4)].map((_, i) => (
              <div key={`skeleton-${i}`} className="h-64 bg-foreground rounded-lg animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 custom-3xl-grid gap-3 py-10">
            {projects.map((project) => (
              <ProjectCard 
                key={project.id} 
                project={project} 
              />
            ))}
          </div>
        )}
      </div>
    </Dashboard>
  );
};

// Export with no SSR
export default dynamic(() => Promise.resolve(EcosystemClient), {
  ssr: false
});