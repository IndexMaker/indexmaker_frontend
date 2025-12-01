import { Project } from "@/types/index";

export const fallbackProjects: Project[] = [
  {
    id: 1,
    projectId: "symmio",
    name: "Symmio",
    description: "Derivatives Peer2Peer clearing infrastructure",
    icon: "aragon",
    websiteUrl: "https://symm.io",
    docsUrl: "https://docs.symmio.org",
    twitterUrl: "https://twitter.com/symmio",
    discordUrl: "https://discord.gg/symmio",
    screenshots: [
      "/project/aragon1.png",
      "/project/aragon2.png"
    ],
    overview: "Symmio was founded in 2016 with the belief that the fate of humanity will be decided at the frontier of technological innovation. Symmio launched the first DAO Framework in 2017 which secures over $40 billion in TVL. Symmio's tech stack allows anyone to launch a DAO, enabling organizations to securely govern their protocols and assets onchain.",
    integrationDetails: "Symmio is integrated with IndexMaker on multiple levels. First, Metaindexmaker vault curators can easily spin up trustless guardians for their vaults using the Symmio App. For example, Steakhouse Financial secures vaults for their depositors with Symmio Guardian DAOs. Second, any DAO or multisig on Symmio can now seamlessly use IndexMaker using Symmio's DappConnect, which enables onchain organizations to create actions directly through a Dapps user interface - no code required."
  },
  {
    id: 2,
    projectId: "tbd",
    name: "To Be Announced",
    description: "",
    icon: "brahma",
    websiteUrl: "https://indexmaker.global",
    docsUrl: "https://docs.carbon.org",
    twitterUrl: "https://twitter.com/carbon",
    discordUrl: "https://discord.gg/carbon",
    screenshots: [
      "/project/aragon1.png",
      "/project/aragon2.png"
    ],
    overview: "Carbon was founded in 2016 with the belief that the fate of humanity will be decided at the frontier of technological innovation. Carbon launched the first DAO Framework in 2017 which secures over $40 billion in TVL. Carbon's tech stack allows anyone to launch a DAO, enabling organizations to securely govern their protocols and assets onchain.",
    integrationDetails: "Carbon is integrated with IndexMaker on multiple levels. First, Metaindexmaker vault curators can easily spin up trustless guardians for their vaults using the Carbon App. For example, Steakhouse Financial secures vaults for their depositors with Carbon Guardian DAOs. Second, any DAO or multisig on Carbon can now seamlessly use IndexMaker using Carbon's DappConnect, which enables onchain organizations to create actions directly through a Dapps user interface - no code required."
  }
];

export const getFallbackProject = (projectId: string): Project | undefined => {
  return fallbackProjects.find(p => p.projectId === projectId);
};