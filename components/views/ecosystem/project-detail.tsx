"use client";
import { fetchProjectById } from "@/server/projects";
import Docs from "@/components/icons/docs";
import IndexMaker from "@/components/icons/indexmaker";
import Social from "@/components/icons/social";
import URL from "@/components/icons/url";
import { CustomButton } from "@/components/ui/custom-button";
import { useLanguage } from "@/contexts/language-context";
import { getFallbackProject } from "@/lib/fallback-projects";
import { Project } from "@/types/index";
import { ArrowRight } from "lucide-react";
import { useTheme } from "next-themes";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import Dashboard from "../Dashboard/dashboard";

interface ProjectDetailPageProps {
  projectId: string;
}

export function ProjectDetailPage({ projectId }: ProjectDetailPageProps) {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadProject = async () => {
      try {
        const data = await fetchProjectById(projectId);
        if (data && data.projectId) {
          setProject(data);
        } else {
          const fallbackProject = getFallbackProject(projectId);
          fallbackProject && setProject(fallbackProject);
        }
      } catch (err) {
        const fallbackProject = getFallbackProject(projectId);
        fallbackProject && setProject(fallbackProject);
      } finally {
        const fallbackProject = getFallbackProject(projectId);
        fallbackProject && setProject(fallbackProject);
        console.log(fallbackProject);
        setLoading(false);
      }
    };

    loadProject();
  }, [projectId]);

  if (loading)
    return (
      <Dashboard>
        <div>Loading...</div>
      </Dashboard>
    );
  if (error)
    return (
      <Dashboard>
        <div>Error: {error}</div>
      </Dashboard>
    );
  if (!project)
    return (
      <Dashboard>
        <div>Project not found</div>
      </Dashboard>
    );

  return (
    <Dashboard>
      <div className="flex gap-15 flex-col">
        {/* Project Header */}
        <div className="flex items-end md:items-center justify-between h-[100px] md:h-[60px]">
          <div className="flex items-center gap-3 md:gap-5 flex-col md:flex-row">
            <div className="bg-foreground w-20 h-20 rounded-full flex items-center justify-center text-xl">
              <IndexMaker className="h-10 text-muted" color={theme === 'light' ? '#2470ff' : '#ffffff'} />
            </div>
            <p className="text-[20px] md:text-[38px] font-normal text-primary h-[24px] md:h-full">
              {project.name}
            </p>
          </div>

          {project.websiteUrl && (
            <CustomButton
              variant="default"
              className="hidden md:flex bg-[#2470ff] hover:bg-blue-700 h-[26px] w-auto items-center rounded-[4px] pl-[8px] pt-[6px]"
            >
              <Link href={project.websiteUrl} target="_blank" className="flex">
                <div className="text-[11px] whitespace-nowrap">
                  {t("common.launchApp")}
                </div>
                <ArrowRight className="ml-2 h-3 w-3 rotate-315" />
              </Link>
            </CustomButton>
          )}
        </div>

        {/* Project Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Project Screenshots */}
          {project.screenshots && project.screenshots.length > 0 && (
            <div className="space-y-4 order-first lg:order-last">
              <div className="bg-transparent rounded-lg overflow-hidden">
                <Image
                  src={project.screenshots[0]}
                  alt={`${project.name} interface`}
                  className="w-full h-auto"
                  width={500}
                  height={220}
                />
              </div>

              {project.screenshots.length > 1 && (
                <div className="flex gap-4">
                  {project.screenshots.slice(1, 3).map((screenshot, index) => (
                    <div
                      key={index}
                      className="bg-transparent rounded-lg overflow-hidden"
                    >
                      <Image
                        src={screenshot}
                        alt={`${project.name} interface detail ${index + 1}`}
                        className="w-[170px] h-[108px] cursor-pointer"
                        width={170}
                        height={108}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Project Description */}
          <div className="space-y-8 bg-foreground p-10 rounded-md">
            <p className="text-muted text-[14px]">{project.description}</p>

            {project.overview && (
              <div className="space-y-4">
                <h2 className="text-[16px] font-semibold text-card">
                  {t("common.overview")}
                </h2>
                <p className="text-muted text-[14px]">{project.overview}</p>
              </div>
            )}

            {project.integrationDetails && (
              <div className="space-y-4">
                <h2 className="text-[16px] font-semibold text-card">
                  {t("common.indexmakerIntegration")}
                </h2>
                <p className="text-muted-foreground text-[14px]">
                  {project.integrationDetails}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Links Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {project.websiteUrl && (
            <div className="bg-foreground rounded-lg p-5">
              <h3 className="text-[13px] font-medium text-muted-foreground mb-3 flex items-center gap-2">
                <URL className="h-3 w-3 text-blue-700" /> {t("common.url")}
              </h3>
              <Link
                href={project.websiteUrl}
                target="_blank"
                className="text-primary text-[13px] flex items-center"
              >
                {project.websiteUrl}
                <ArrowRight className="ml-1 h-3 w-3 rotate-315" />
              </Link>
            </div>
          )}

          {project.docsUrl && (
            <div className="bg-foreground rounded-lg p-5">
              <h3 className="text-[13px] font-medium text-muted-foreground mb-3 flex items-center gap-2">
                <Docs className="h-3 w-3 text-blue-700" />{" "}
                {t("common.integrationDocs")}
              </h3>
              <Link
                href={project.docsUrl}
                target="_blank"
                className="text-primary text-[13px] flex items-center"
              >
                Documentation
                <ArrowRight className="ml-1 h-3 w-3 rotate-315" />
              </Link>
            </div>
          )}

          <div className="bg-foreground rounded-lg p-5">
            <h3 className="text-[13px] font-medium text-muted-foreground mb-3 flex items-center gap-2">
              <Social className="h-3 w-3 text-blue-700" /> {t("common.social")}
            </h3>
            <div className="flex gap-4">
              {project.twitterUrl && (
                <Link
                  href={project.twitterUrl}
                  target="_blank"
                  className="text-primary text-[13px] flex items-center"
                >
                  X <ArrowRight className="ml-1 h-3 w-3 rotate-315" />
                </Link>
              )}
              {project.discordUrl && (
                <Link
                  href={project.discordUrl}
                  target="_blank"
                  className="text-primary text-[13px] flex items-center"
                >
                  Discord <ArrowRight className="ml-1 h-3 w-3 rotate-315" />
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </Dashboard>
  );
}
