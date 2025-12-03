// All indexes are updated bi-weekly. 
// StyleMap profiles (coordinates) are preserved.
// Descriptions and strategies now match the ticker themes.

const STANDARD_RISK_DISCLOSURE = `Cryptocurrencies and related markets are highly volatile and can decline significantly in response to adverse issuer-specific, technological, regulatory, political, market, or macroeconomic developments. The digital asset ecosystem is particularly susceptible to technological obsolescence, rapidly evolving protocols, frequent forks, declining token values and transaction fees, and competition from emerging blockchain projects, as well as broad fluctuations in investor sentiment and general economic conditions.`;

const STANDARD_DISCLOSURE_LINK = `This description is only intended to provide a brief overview of the index. Read the index's key investors information document for more detailed information.`;

export const indexData: any = {
  SY100: { // Top 100 Crypto by Market Caps
    fundDetails: [
      { label: "Fund Category", value: "Large Cap" },
      { label: "Rebalancing", value: "Bi-weekly" },
    ],
    equityStyleMap: {
      currentPosition: { x: 1, y: 0 },
      historicalPosition: { x: 1, y: 0 },
      category: "Large Growth",
      fundAssetsCovered: "98.5%",
      description: "Invests in the top 100 cryptocurrencies by market capitalization. These assets represent the foundational layer of the crypto economy, focusing on established protocols with high liquidity.",
      asOfDate: "05/31/2025",
    },
    fundManagerData: {
      manager: {
        name: "Symmio Index",
        role: "Curator",
        tenureStartDate: "06/30/2025",
        avatar: "@/components/icons/indexmaker.tsx",
      },
      managedFunds: [
        { name: "Rasa Capital", startDate: "01/30/2022" },
        { name: "Symmio Foundation", startDate: "04/11/2022" },
        { name: "SY" },
      ],
      commentaryLinks: [
        { title: "Quarterly Fund Review", url: "#" },
      ],
    },
    fundOverviewData: {
      asOfDate: "06/30/2025",
      objective: "Capital growth via broad market exposure",
      strategy: `Investing at least 95% of assets in cryptocurrencies among the top 100 by market capitalization, allocated on a market-weighted basis. The index is rebalanced bi-weekly to reflect market movements. Excludes assets issued by protocols that have not undergone a standardized vetting process for security, transparency, and operational integrity.`,
      risk: STANDARD_RISK_DISCLOSURE,
      disclosures: STANDARD_DISCLOSURE_LINK,
    },
    fundRisk: "High",
    description: "SY Crypto 100 is a market-weighted index of the top 100 cryptocurrencies by market cap.",
    documents: [
      {
        id: "Index Overview",
        name: "Index Overview",
        url: "pdf-generation/pdfview/factsheet/SY100",
        description: "Technical details about the vault",
      },
      {
        id: "audit",
        name: "Security Audit",
        url: "#",
        description: "Security audit report",
      },
    ],
  },

  SYAZ: {  // Top 20 ICO listed A16z backed tokens by market caps 
    fundDetails: [
      { label: "Index Category", value: "Venture Portfolio" },
      { label: "Rebalancing", value: "Bi-weekly" },
    ],
    equityStyleMap: {
      currentPosition: { x: 1, y: 0 },
      historicalPosition: { x: 1, y: 0 },
      category: "Large Growth", // Kept as per prompt
      fundAssetsCovered: "95.84%",
      description: "Focuses on high-potential projects backed by Andreessen Horowitz (a16z). These assets generally benefit from strong institutional support, regulatory guidance, and significant initial capital injection.",
      asOfDate: "05/31/2025",
    },
    fundManagerData: {
      manager: {
        name: "Symmio Index",
        role: "Curator",
        tenureStartDate: "09/16/2025",
        avatar: "@/components/icons/indexmaker.tsx",
      },
      managedFunds: [
        { name: "SY100", startDate: "06/30/2025" },
      ],
      commentaryLinks: [
        { title: "Quarterly Fund Review", url: "#" },
      ],
    },
    fundOverviewData: {
      asOfDate: "06/30/2025",
      objective: "Institutional-grade Capital Appreciation",
      strategy: `Invests exclusively in the top 20 tokens by market capitalization that are part of the Andreessen Horowitz (a16z) portfolio. This strategy seeks to leverage the due diligence of top-tier venture capital by tracking their most successful liquid investments. The index is updated bi-weekly.`,
      risk: STANDARD_RISK_DISCLOSURE,
      disclosures: STANDARD_DISCLOSURE_LINK,
    },
    fundRisk: "High",
    description: "SYAZ tracks the top 20 ICO-listed tokens backed by Andreessen Horowitz (a16z), weighted by market cap.",
    documents: [
      {
        id: "Index Overview",
        name: "Index Overview",
        url: "pdf-generation/pdfview/factsheet/SYAZ",
        description: "Technical details about the vault",
      },
      {
        id: "audit",
        name: "Security Audit",
        url: "#",
        description: "Security audit report",
      },
    ],
  },

  SYAI: {  // Top 20 AI tokens by market caps 
    fundDetails: [
      { label: "Index Category", value: "Thematic - AI" },
      { label: "Rebalancing", value: "Bi-weekly" },
    ],
    equityStyleMap: {
      currentPosition: { x: 2, y: 1 },
      historicalPosition: { x: 2, y: 1 },
      category: "Aggressive Growth", // Kept coords, updated label to fit
      fundAssetsCovered: "98.2%",
      description: "Invests in protocols at the intersection of Artificial Intelligence and Blockchain. This includes decentralized compute networks, AI agents, and data marketplaces.",
      asOfDate: "05/31/2025",
    },
    fundManagerData: {
      manager: {
        name: "Symmio Index",
        role: "Curator",
        tenureStartDate: "09/16/2025",
        avatar: "@/components/icons/indexmaker.tsx",
      },
      managedFunds: [
        { name: "SY100", startDate: "06/30/2025" },
      ],
      commentaryLinks: [
        { title: "Quarterly Fund Review", url: "#" },
      ],
    },
    fundOverviewData: {
      asOfDate: "06/30/2025",
      objective: "Thematic Capital Appreciation",
      strategy: `Tracks the performance of the top 20 Artificial Intelligence (AI) related tokens. The strategy focuses on projects building decentralized infrastructure for machine learning, neural networks, and automated agents. Rebalanced bi-weekly to capture the fast-moving trends in the AI sector.`,
      risk: STANDARD_RISK_DISCLOSURE,
      disclosures: STANDARD_DISCLOSURE_LINK,
    },
    fundRisk: "Very High",
    description: "SYAI is a market-cap weighted index of the top 20 tokens powering the decentralized Artificial Intelligence economy.",
    documents: [
      {
        id: "Index Overview",
        name: "Index Overview",
        url: "pdf-generation/pdfview/factsheet/SYAI",
        description: "Technical details about the vault",
      },
      {
        id: "audit",
        name: "Security Audit",
        url: "#",
        description: "Security audit report",
      },
    ],
  },

  SYME: {  // Top 20 Memes tokens by market caps 
    fundDetails: [
      { label: "Index Category", value: "Speculative" },
      { label: "Rebalancing", value: "Bi-weekly" },
    ],
    equityStyleMap: {
      currentPosition: { x: 1, y: 2 },
      historicalPosition: { x: 1, y: 2 },
      category: "Speculative Growth",
      fundAssetsCovered: "100%",
      description: "Invests in high-volatility assets driven primarily by social sentiment and community engagement (Meme coins). These assets are characterized by extreme price swings and high risk.",
      asOfDate: "05/31/2025",
    },
    fundManagerData: {
      manager: {
        name: "Symmio Index",
        role: "Curator",
        tenureStartDate: "09/16/2025",
        avatar: "@/components/icons/indexmaker.tsx",
      },
      managedFunds: [
        { name: "SY100", startDate: "06/30/2025" },
      ],
      commentaryLinks: [
        { title: "Quarterly Fund Review", url: "#" },
      ],
    },
    fundOverviewData: {
      asOfDate: "06/30/2025",
      objective: "High-Risk Speculative Growth",
      strategy: `Provides exposure to the top 20 Meme tokens by market capitalization. This index is designed for high-risk tolerance portfolios seeking exposure to viral social trends in the cryptocurrency space. Updated bi-weekly to rotate out fading trends and capture new viral assets.`,
      risk: STANDARD_RISK_DISCLOSURE,
      disclosures: STANDARD_DISCLOSURE_LINK,
    },
    fundRisk: "Extreme",
    description: "SYME tracks the top 20 Meme tokens by market cap, capturing high-volatility social sentiment trends.",
    documents: [
      {
        id: "Index Overview",
        name: "Index Overview",
        url: "pdf-generation/pdfview/factsheet/SYME",
        description: "Technical details about the vault",
      },
      {
        id: "audit",
        name: "Security Audit",
        url: "#",
        description: "Security audit report",
      },
    ],
  },

  SYL2: { // Top 20 Layer 2 Blockchains tokens by market caps 
    fundDetails: [
      { label: "Index Category", value: "Infrastructure" },
      { label: "Rebalancing", value: "Bi-weekly" },
    ],
    equityStyleMap: {
      currentPosition: { x: 1, y: 0 },
      historicalPosition: { x: 1, y: 0 },
      category: "Large Growth",
      fundAssetsCovered: "96.5%",
      description: "Invests in scaling solutions for major blockchains (Layer 2s). These protocols are essential for reducing transaction costs and increasing throughput for the Ethereum ecosystem.",
      asOfDate: "05/31/2025",
    },
    fundManagerData: {
      manager: {
        name: "Symmio Index",
        role: "Curator",
        tenureStartDate: "09/16/2025",
        avatar: "@/components/icons/indexmaker.tsx",
      },
      managedFunds: [
        { name: "SY100", startDate: "06/30/2025" },
      ],
      commentaryLinks: [
        { title: "Quarterly Fund Review", url: "#" },
      ],
    },
    fundOverviewData: {
      asOfDate: "06/30/2025",
      objective: "Infrastructure Growth",
      strategy: `Investing in the top 20 Layer 2 (L2) scaling solutions by market capitalization. This includes Rollups (Optimistic and ZK) and Sidechains that scale Ethereum. The index captures the value of the underlying infrastructure supporting the Web3 application layer.`,
      risk: STANDARD_RISK_DISCLOSURE,
      disclosures: STANDARD_DISCLOSURE_LINK,
    },
    fundRisk: "High",
    description: "SYL2 is a market-weighted index of the top 20 Layer 2 blockchain tokens, focusing on Ethereum scaling infrastructure.",
    documents: [
      {
        id: "Index Overview",
        name: "Index Overview",
        url: "pdf-generation/pdfview/factsheet/SYL2",
        description: "Technical details about the vault",
      },
      {
        id: "audit",
        name: "Security Audit",
        url: "#",
        description: "Security audit report",
      },
    ],
  },

  SYDF: { // Top 20 DeFi tokens by market caps 
    fundDetails: [
      { label: "Index Category", value: "Sector - DeFi" },
      { label: "Rebalancing", value: "Bi-weekly" },
    ],
    equityStyleMap: {
      currentPosition: { x: 0, y: 1 },
      historicalPosition: { x: 0, y: 1 },
      category: "Large Value", // Positioned slightly different based on coords
      fundAssetsCovered: "97.1%",
      description: "Invests in the foundational protocols of Decentralized Finance (DeFi), including decentralized exchanges (DEXs), lending platforms, and derivatives markets.",
      asOfDate: "05/31/2025",
    },
    fundManagerData: {
      manager: {
        name: "Symmio Index",
        role: "Curator",
        tenureStartDate: "09/16/2025",
        avatar: "@/components/icons/indexmaker.tsx",
      },
      managedFunds: [
        { name: "SY100", startDate: "06/30/2025" },
      ],
      commentaryLinks: [
        { title: "Quarterly Fund Review", url: "#" },
      ],
    },
    fundOverviewData: {
      asOfDate: "06/30/2025",
      objective: "Sector Appreciation",
      strategy: `Tracks the top 20 Decentralized Finance (DeFi) governance tokens by market capitalization. The fund focuses on protocols that generate on-chain revenue through lending, trading, and asset management services, providing exposure to the alternative financial system.`,
      risk: STANDARD_RISK_DISCLOSURE,
      disclosures: STANDARD_DISCLOSURE_LINK,
    },
    fundRisk: "High",
    description: "SYDF tracks the top 20 Decentralized Finance (DeFi) tokens by market cap, covering DEXs, lending, and derivatives.",
    documents: [
      {
        id: "Index Overview",
        name: "Index Overview",
        url: "pdf-generation/pdfview/factsheet/SYDF",
        description: "Technical details about the vault",
      },
      {
        id: "audit",
        name: "Security Audit",
        url: "#",
        description: "Security audit report",
      },
    ],
  },
};

// Helper function to get data by index ID
export const getIndexData = (indexId: string) => {
  return indexData[indexId] || null;
};