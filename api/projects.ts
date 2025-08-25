import { Project } from "@/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API;

export const fetchProjects = async (): Promise<Project[]> => {
  const response = await fetch(`${API_BASE_URL}/projects`);
  if (!response.ok) {
    throw new Error("Failed to fetch projects");
  }
  return response.json();
};

export const fetchProjectById = async (projectId: string): Promise<Project> => {
  const response = await fetch(
    `${API_BASE_URL}/projects/by-project-id/${projectId}`
  );

  if (response.status === 404) {
    throw new Error("Project not found");
  }

  if (!response.ok) {
    throw new Error("Failed to fetch project");
  }

  return response.json();
};

export const createProject = async (
  projectData: Omit<Project, "id">
): Promise<Project> => {
  const response = await fetch(`${API_BASE_URL}/projects`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(projectData),
  });
  if (!response.ok) {
    throw new Error("Failed to create project");
  }
  return response.json();
};
