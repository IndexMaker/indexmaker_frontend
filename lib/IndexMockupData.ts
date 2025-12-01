import CPU from "@/components/icons/cpu";
import USMap from "@/components/icons/us-map";

// Icon mapping
export const iconComponents = {
  Cpu: CPU,
  MapPin: USMap,
};

export const indexData: any = {
  SY100: {
    fundDetails: [
      { label: "Fund Category", value: "Large Growth" },
      { label: "Fund Inception", value: "01/07/2025" },
      {
        label: "Exp Ratio (Gross)",
        value: "0.73%",
        date: "06/30/2025",
        hasTooltip: true,
      },
      {
        label: "Exp Ratio (Net)",
        value: "0.73%",
        date: "06/30/2025",
        hasTooltip: true,
      },
      { label: "NAV", value: "$1000.60", date: "06/30/2025", hasTooltip: true }, // NAV updated daily
      { label: "Minimum to Invest", value: "$10.00" },
      {
        label: "Turnover Rate",
        value: "90.00%",
        date: "01/31/2025",
        hasTooltip: true,
      },
      {
        label: "Portfolio Net Assets ($M)",
        value: "$1000.60",
        date: "06/30/2025",
        hasTooltip: true,
      },
      {
        label: "Share Class Net Assets ($M)",
        value: "$1000.60",
        date: "06/30/2025",
        hasTooltip: true,
      },
      {
        label: "12 Month Low-High",
        value: "$118,172 - $358,760", // 12-month range updated daily
        date: "06/30/2025",
        hasTooltip: false,
      },
    ],
    equityStyleMap: {
      currentPosition: { x: 2, y: 0 }, // Growth, Large Cap
      historicalPosition: { x: 2, y: 0 }, // Blend, Large Cap
      category: "Large Growth",
      fundAssetsCovered: "95.84%",
      description:
        "Invest in companies with market values greater than $10 billion that fund managers believe are poised for growth. Growth can be based on a variety of factors, such as revenue or earnings growth. Growth funds are typically focused on generating capital gains rather than income.",
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
        {
          name: "Rasa Capital",
          startDate: "01/30/2022",
        },
        {
          name: "Symmio Fundation",
          startDate: "04/11/2022",
        },
        { name: "SY" },
      ],
      commentaryLinks: [
        { title: "Quarterly Fund Review", url: "#" },
        { title: "Portfolio Manager Q&A", url: "#" },
        { title: "Investment Approach", url: "#" },
      ],
    },
    fundOverviewData: {
      asOfDate: "06/30/2025",
      topSector: {
        name: "Information Technology",
        iconName: "Cpu",
        weight: "93.66%",
      },
      topCountry: {
        name: "United States",
        weight: "93.66%",
        iconName: "MapPin",
      },
      objective: "Capital growth",
      strategy: `Investing at least 95% of assets in cryptocurrencies among the top 100 by market capitalization, allocated on an equal-weighted basis. Excludes assets issued by protocols that have not undergone a standardized vetting process for security, transparency, and operational integrity. Investing primarily in liquid, widely traded tokens listed on reputable centralized or decentralized exchanges.`,
      risk: `Cryptocurrencies and related markets are highly volatile and can decline significantly in response to adverse issuer-specific, technological, regulatory, political, market, or macroeconomic developments. The digital asset ecosystem is particularly susceptible to technological obsolescence, rapidly evolving protocols, frequent forks, declining token values and transaction fees, and competition from emerging blockchain projects, as well as broad fluctuations in investor sentiment and general economic conditions..`,
      disclosures: `This description is only intended to provide a brief overview of the index. Read the index's key investors information docuement
      for more detailed information about the index.`,
    },
    fundRisk:
"none",
    portfolioManagerInsights: [
      {
        id: 1,
        imageUrl: "chris-lin-bio",
        imageClassName: "w-full h-[100px] object-cover",
        title: "Breakthrough biotechs with a bright future",
        description:
          "",
        isLink: true,
      },
      {
        id: 2,
        imageUrl: "chris-lin",
        imageClassName: "w-[135px] h-[135px] object-cover",
        title: "Finance Revolution  ",
        description:
          "",
        isLink: true,
      },
    ],
    description:
      "SY Crypto 100 is a market-weighted index of the top 100 cryptocurrencies by market cap.",
    documents: [
      {
        id: "Index Overview",
        name: "Index Overview",
        url: "pdf-generation/pdfview/factsheet/SY100",
        description: "Technical details about the vault (coming in v0.8)",
      },
      {
        id: "audit",
        name: "Security Audit",
        url: "#",
        description: "Security audit report (coming in v1.0)",
      },
    ],
  },
  SYAZ: {
    fundDetails: [
      { label: "Index Category", value: "Large Growth" },
      { label: "Fund Inception", value: "12/31/1984" },
      {
        label: "Exp Ratio (Gross)",
        value: "0.73%",
        date: "06/30/2025",
        hasTooltip: true,
      },
      {
        label: "Exp Ratio (Net)",
        value: "0.73%",
        date: "06/30/2025",
        hasTooltip: true,
      },
      { label: "NAV", value: "$20.60", date: "06/30/2025", hasTooltip: true },
      { label: "Minimum to Invest", value: "$0.00" },
      {
        label: "Turnover Rate",
        value: "55.00%",
        date: "01/31/2025",
        hasTooltip: true,
      },
      {
        label: "Portfolio Net Assets ($M)",
        value: "$29,465.73",
        date: "06/30/2025",
        hasTooltip: true,
      },
      {
        label: "Share Class Net Assets ($M)",
        value: "$21,799.68",
        date: "06/30/2025",
        hasTooltip: true,
      },
      {
        label: "12 Month Low-High",
        value: "$16.90 - $24.02",
        date: "06/30/2025",
        hasTooltip: false,
      },
    ],
    equityStyleMap: {
      currentPosition: { x: 2, y: 0 }, // Growth, Large Cap
      historicalPosition: { x: 1, y: 0 }, // Blend, Large Cap
      category: "Large Growth",
      fundAssetsCovered: "95.84%",
      description:
        "Invest in companies with market values greater than $10 billion that fund managers believe are poised for growth. Growth can be based on a variety of factors, such as revenue or earnings growth. Growth funds are typically focused on generating capital gains rather than income.",
      asOfDate: "05/31/2025",
    },
    fundManagerData: {
      manager: {
        name: "Christopher W. Lin",
        role: "Primary Manager",
        tenureStartDate: "09/16/2017",
        avatar: "/path/to/manager-avatar.jpg",
      },
      managedFunds: [
        {
          name: "VIP Balanced Portfolio - Investor Class",
          startDate: "12/05/2024",
        },
        {
          name: "Fidelity Advisor® Equity Growth Fund Class C",
          startDate: "04/11/2025",
        },
        {
          name: "VIP Growth Portfolio - Service Class 2",
          startDate: "04/11/2025",
        },
      ],
      commentaryLinks: [
        { title: "Quarterly Fund Review", url: "#" },
        { title: "Portfolio Manager Q&A", url: "#" },
        { title: "Investment Approach", url: "#" },
      ],
    },
    fundOverviewData: {
      asOfDate: "04/30/2025",
      topSector: {
        name: "Information Technology",
        iconName: "Cpu",
        weight: "93.66%",
      },
      topCountry: {
        name: "United States",
        weight: "93.66%",
        iconName: "MapPin",
      },
      objective: "Seeks capital appreciation.",
      strategy: `Normally investing at least 80% of assets in securities principally traded on NASDAQ or an over-the-counter
      market, which has more small and medium-sized companies than other markets. Investing more than 25% of total
      assets in the technology sector. Investing in either "growth" stocks or "value" stocks or both. Normally
      investing primarily in common stocks.`,
      risk: `Stock markets, especially foreign markets, are volatile and can decline significantly in response to adverse
      issuer, political, regulatory, market, or economic developments. The technology industries can be
      significantly affected by obsolescence of existing technology, short product cycles, falling prices and
      profits, and competition from new market entrants and general economic conditions.`,
      disclosures: `This description is only intended to provide a brief overview of the mutual fund. Read the fund's prospectus
      for more detailed information about the fund.`,
    },
    fundRisk:
      "none",
    portfolioManagerInsights: [
      {
        id: 1,
        imageUrl: "chris-lin-bio",
        imageClassName: "w-full h-[100px] object-cover",
        title: "Breakthrough biotechs with a bright future",
        description:
          "Fidelity's Chris Lin considers two biotech companies well-positioned to revolutionize drug development and the treatment of major diseases.",
        isLink: true,
      },
      {
        id: 2,
        imageUrl: "chris-lin",
        imageClassName: "w-[135px] h-[135px] object-cover",
        title: "AI-Revolutionary",
        description:
          "Fidelity U.S. large cap growth portfolio managers see artificial intelligence as the most compelling multiyear investment theme that is going to drive major disruption across a variety of businesses.",
        isLink: true,
      },
    ],
    description:
      "The Spark DAI 1 vault curated by SparkDAO is intended to seamlessly allocate DAI liquidity from Maker to IndexMaker markets.",
    documents: [
      {
        id: "Index Overview",
        name: "Index Overview",
        url: "pdf-generation/pdfview/factsheet/SYAZ",
        description: "Technical details about the vault (coming in v0.8)",
      },
      {
        id: "audit",
        name: "Security Audit",
        url: "#",
        description: "Security audit report (coming in v1.0)",
      },
    ],
  },
  SYAI: {
    fundDetails: [
      { label: "Index Category", value: "Large Growth" },
      { label: "Fund Inception", value: "12/31/1984" },
      {
        label: "Exp Ratio (Gross)",
        value: "0.73%",
        date: "06/30/2025",
        hasTooltip: true,
      },
      {
        label: "Exp Ratio (Net)",
        value: "0.73%",
        date: "06/30/2025",
        hasTooltip: true,
      },
      { label: "NAV", value: "$20.60", date: "06/30/2025", hasTooltip: true },
      { label: "Minimum to Invest", value: "$0.00" },
      {
        label: "Turnover Rate",
        value: "55.00%",
        date: "01/31/2025",
        hasTooltip: true,
      },
      {
        label: "Portfolio Net Assets ($M)",
        value: "$29,465.73",
        date: "06/30/2025",
        hasTooltip: true,
      },
      {
        label: "Share Class Net Assets ($M)",
        value: "$21,799.68",
        date: "06/30/2025",
        hasTooltip: true,
      },
      {
        label: "12 Month Low-High",
        value: "$16.90 - $24.02",
        date: "06/30/2025",
        hasTooltip: false,
      },
    ],
    equityStyleMap: {
      currentPosition: { x: 2, y: 0 }, // Growth, Large Cap
      historicalPosition: { x: 1, y: 0 }, // Blend, Large Cap
      category: "Large Growth",
      fundAssetsCovered: "95.84%",
      description:
        "Invest in companies with market values greater than $10 billion that fund managers believe are poised for growth. Growth can be based on a variety of factors, such as revenue or earnings growth. Growth funds are typically focused on generating capital gains rather than income.",
      asOfDate: "05/31/2025",
    },
    fundManagerData: {
      manager: {
        name: "Christopher W. Lin",
        role: "Primary Manager",
        tenureStartDate: "09/16/2017",
        avatar: "/path/to/manager-avatar.jpg",
      },
      managedFunds: [
        {
          name: "VIP Balanced Portfolio - Investor Class",
          startDate: "12/05/2024",
        },
        {
          name: "Fidelity Advisor® Equity Growth Fund Class C",
          startDate: "04/11/2025",
        },
        {
          name: "VIP Growth Portfolio - Service Class 2",
          startDate: "04/11/2025",
        },
      ],
      commentaryLinks: [
        { title: "Quarterly Fund Review", url: "#" },
        { title: "Portfolio Manager Q&A", url: "#" },
        { title: "Investment Approach", url: "#" },
      ],
    },
    fundOverviewData: {
      asOfDate: "04/30/2025",
      topSector: {
        name: "Information Technology",
        iconName: "Cpu",
        weight: "93.66%",
      },
      topCountry: {
        name: "United States",
        weight: "93.66%",
        iconName: "MapPin",
      },
      objective: "Seeks capital appreciation.",
      strategy: `Normally investing at least 80% of assets in securities principally traded on NASDAQ or an over-the-counter
      market, which has more small and medium-sized companies than other markets. Investing more than 25% of total
      assets in the technology sector. Investing in either "growth" stocks or "value" stocks or both. Normally
      investing primarily in common stocks.`,
      risk: `Stock markets, especially foreign markets, are volatile and can decline significantly in response to adverse
      issuer, political, regulatory, market, or economic developments. The technology industries can be
      significantly affected by obsolescence of existing technology, short product cycles, falling prices and
      profits, and competition from new market entrants and general economic conditions.`,
      disclosures: `This description is only intended to provide a brief overview of the mutual fund. Read the fund's prospectus
      for more detailed information about the fund.`,
    },
    fundRisk:
      "none",
    portfolioManagerInsights: [
      {
        id: 1,
        imageUrl: "chris-lin-bio",
        imageClassName: "w-full h-[100px] object-cover",
        title: "Breakthrough biotechs with a bright future",
        description:
          "Fidelity's Chris Lin considers two biotech companies well-positioned to revolutionize drug development and the treatment of major diseases.",
        isLink: true,
      },
      {
        id: 2,
        imageUrl: "chris-lin",
        imageClassName: "w-[135px] h-[135px] object-cover",
        title: "AI-Revolutionary",
        description:
          "Fidelity U.S. large cap growth portfolio managers see artificial intelligence as the most compelling multiyear investment theme that is going to drive major disruption across a variety of businesses.",
        isLink: true,
      },
    ],
    description:
      "The Spark DAI 1 vault curated by SparkDAO is intended to seamlessly allocate DAI liquidity from Maker to IndexMaker markets.",
    documents: [
      {
        id: "Index Overview",
        name: "Index Overview",
        url: "pdf-generation/pdfview/factsheet/SYAI",
        description: "Technical details about the vault (coming in v0.8)",
      },
      {
        id: "audit",
        name: "Security Audit",
        url: "#",
        description: "Security audit report (coming in v1.0)",
      },
    ],
  },
  SYME: {
    fundDetails: [
      { label: "Index Category", value: "Large Growth" },
      { label: "Fund Inception", value: "12/31/1984" },
      {
        label: "Exp Ratio (Gross)",
        value: "0.73%",
        date: "06/30/2025",
        hasTooltip: true,
      },
      {
        label: "Exp Ratio (Net)",
        value: "0.73%",
        date: "06/30/2025",
        hasTooltip: true,
      },
      { label: "NAV", value: "$20.60", date: "06/30/2025", hasTooltip: true },
      { label: "Minimum to Invest", value: "$0.00" },
      {
        label: "Turnover Rate",
        value: "55.00%",
        date: "01/31/2025",
        hasTooltip: true,
      },
      {
        label: "Portfolio Net Assets ($M)",
        value: "$29,465.73",
        date: "06/30/2025",
        hasTooltip: true,
      },
      {
        label: "Share Class Net Assets ($M)",
        value: "$21,799.68",
        date: "06/30/2025",
        hasTooltip: true,
      },
      {
        label: "12 Month Low-High",
        value: "$16.90 - $24.02",
        date: "06/30/2025",
        hasTooltip: false,
      },
    ],
    equityStyleMap: {
      currentPosition: { x: 2, y: 0 }, // Growth, Large Cap
      historicalPosition: { x: 1, y: 0 }, // Blend, Large Cap
      category: "Large Growth",
      fundAssetsCovered: "95.84%",
      description:
        "Invest in companies with market values greater than $10 billion that fund managers believe are poised for growth. Growth can be based on a variety of factors, such as revenue or earnings growth. Growth funds are typically focused on generating capital gains rather than income.",
      asOfDate: "05/31/2025",
    },
    fundManagerData: {
      manager: {
        name: "Christopher W. Lin",
        role: "Primary Manager",
        tenureStartDate: "09/16/2017",
        avatar: "/path/to/manager-avatar.jpg",
      },
      managedFunds: [
        {
          name: "VIP Balanced Portfolio - Investor Class",
          startDate: "12/05/2024",
        },
        {
          name: "Fidelity Advisor® Equity Growth Fund Class C",
          startDate: "04/11/2025",
        },
        {
          name: "VIP Growth Portfolio - Service Class 2",
          startDate: "04/11/2025",
        },
      ],
      commentaryLinks: [
        { title: "Quarterly Fund Review", url: "#" },
        { title: "Portfolio Manager Q&A", url: "#" },
        { title: "Investment Approach", url: "#" },
      ],
    },
    fundOverviewData: {
      asOfDate: "04/30/2025",
      topSector: {
        name: "Information Technology",
        iconName: "Cpu",
        weight: "93.66%",
      },
      topCountry: {
        name: "United States",
        weight: "93.66%",
        iconName: "MapPin",
      },
      objective: "Seeks capital appreciation.",
      strategy: `Normally investing at least 80% of assets in securities principally traded on NASDAQ or an over-the-counter
      market, which has more small and medium-sized companies than other markets. Investing more than 25% of total
      assets in the technology sector. Investing in either "growth" stocks or "value" stocks or both. Normally
      investing primarily in common stocks.`,
      risk: `Stock markets, especially foreign markets, are volatile and can decline significantly in response to adverse
      issuer, political, regulatory, market, or economic developments. The technology industries can be
      significantly affected by obsolescence of existing technology, short product cycles, falling prices and
      profits, and competition from new market entrants and general economic conditions.`,
      disclosures: `This description is only intended to provide a brief overview of the mutual fund. Read the fund's prospectus
      for more detailed information about the fund.`,
    },
    fundRisk:
      "none",
    portfolioManagerInsights: [
      {
        id: 1,
        imageUrl: "chris-lin-bio",
        imageClassName: "w-full h-[100px] object-cover",
        title: "Breakthrough biotechs with a bright future",
        description:
          "Fidelity's Chris Lin considers two biotech companies well-positioned to revolutionize drug development and the treatment of major diseases.",
        isLink: true,
      },
      {
        id: 2,
        imageUrl: "chris-lin",
        imageClassName: "w-[135px] h-[135px] object-cover",
        title: "AI-Revolutionary",
        description:
          "Fidelity U.S. large cap growth portfolio managers see artificial intelligence as the most compelling multiyear investment theme that is going to drive major disruption across a variety of businesses.",
        isLink: true,
      },
    ],
    description:
      "The Spark DAI 1 vault curated by SparkDAO is intended to seamlessly allocate DAI liquidity from Maker to IndexMaker markets.",
    documents: [
      {
        id: "Index Overview",
        name: "Index Overview",
        url: "pdf-generation/pdfview/factsheet/SYME",
        description: "Technical details about the vault (coming in v0.8)",
      },
      {
        id: "audit",
        name: "Security Audit",
        url: "#",
        description: "Security audit report (coming in v1.0)",
      },
    ],
  },
  SYL2: {
    fundDetails: [
      { label: "Index Category", value: "Large Growth" },
      { label: "Fund Inception", value: "12/31/1984" },
      {
        label: "Exp Ratio (Gross)",
        value: "0.73%",
        date: "06/30/2025",
        hasTooltip: true,
      },
      {
        label: "Exp Ratio (Net)",
        value: "0.73%",
        date: "06/30/2025",
        hasTooltip: true,
      },
      { label: "NAV", value: "$20.60", date: "06/30/2025", hasTooltip: true },
      { label: "Minimum to Invest", value: "$0.00" },
      {
        label: "Turnover Rate",
        value: "55.00%",
        date: "01/31/2025",
        hasTooltip: true,
      },
      {
        label: "Portfolio Net Assets ($M)",
        value: "$29,465.73",
        date: "06/30/2025",
        hasTooltip: true,
      },
      {
        label: "Share Class Net Assets ($M)",
        value: "$21,799.68",
        date: "06/30/2025",
        hasTooltip: true,
      },
      {
        label: "12 Month Low-High",
        value: "$16.90 - $24.02",
        date: "06/30/2025",
        hasTooltip: false,
      },
    ],
    equityStyleMap: {
      currentPosition: { x: 2, y: 0 }, // Growth, Large Cap
      historicalPosition: { x: 1, y: 0 }, // Blend, Large Cap
      category: "Large Growth",
      fundAssetsCovered: "95.84%",
      description:
        "Invest in companies with market values greater than $10 billion that fund managers believe are poised for growth. Growth can be based on a variety of factors, such as revenue or earnings growth. Growth funds are typically focused on generating capital gains rather than income.",
      asOfDate: "05/31/2025",
    },
    fundManagerData: {
      manager: {
        name: "Christopher W. Lin",
        role: "Primary Manager",
        tenureStartDate: "09/16/2017",
        avatar: "/path/to/manager-avatar.jpg",
      },
      managedFunds: [
        {
          name: "VIP Balanced Portfolio - Investor Class",
          startDate: "12/05/2024",
        },
        {
          name: "Fidelity Advisor® Equity Growth Fund Class C",
          startDate: "04/11/2025",
        },
        {
          name: "VIP Growth Portfolio - Service Class 2",
          startDate: "04/11/2025",
        },
      ],
      commentaryLinks: [
        { title: "Quarterly Fund Review", url: "#" },
        { title: "Portfolio Manager Q&A", url: "#" },
        { title: "Investment Approach", url: "#" },
      ],
    },
    fundOverviewData: {
      asOfDate: "04/30/2025",
      topSector: {
        name: "Information Technology",
        iconName: "Cpu",
        weight: "93.66%",
      },
      topCountry: {
        name: "United States",
        weight: "93.66%",
        iconName: "MapPin",
      },
      objective: "Seeks capital appreciation.",
      strategy: `Normally investing at least 80% of assets in securities principally traded on NASDAQ or an over-the-counter
      market, which has more small and medium-sized companies than other markets. Investing more than 25% of total
      assets in the technology sector. Investing in either "growth" stocks or "value" stocks or both. Normally
      investing primarily in common stocks.`,
      risk: `Stock markets, especially foreign markets, are volatile and can decline significantly in response to adverse
      issuer, political, regulatory, market, or economic developments. The technology industries can be
      significantly affected by obsolescence of existing technology, short product cycles, falling prices and
      profits, and competition from new market entrants and general economic conditions.`,
      disclosures: `This description is only intended to provide a brief overview of the mutual fund. Read the fund's prospectus
      for more detailed information about the fund.`,
    },
    fundRisk:
      "none",
    portfolioManagerInsights: [
      {
        id: 1,
        imageUrl: "chris-lin-bio",
        imageClassName: "w-full h-[100px] object-cover",
        title: "Breakthrough biotechs with a bright future",
        description:
          "Fidelity's Chris Lin considers two biotech companies well-positioned to revolutionize drug development and the treatment of major diseases.",
        isLink: true,
      },
      {
        id: 2,
        imageUrl: "chris-lin",
        imageClassName: "w-[135px] h-[135px] object-cover",
        title: "AI-Revolutionary",
        description:
          "Fidelity U.S. large cap growth portfolio managers see artificial intelligence as the most compelling multiyear investment theme that is going to drive major disruption across a variety of businesses.",
        isLink: true,
      },
    ],
    description:
      "The Spark DAI 1 vault curated by SparkDAO is intended to seamlessly allocate DAI liquidity from Maker to IndexMaker markets.",
    documents: [
      {
        id: "Index Overview",
        name: "Index Overview",
        url: "pdf-generation/pdfview/factsheet/SYL2",
        description: "Technical details about the vault (coming in v0.8)",
      },
      {
        id: "audit",
        name: "Security Audit",
        url: "#",
        description: "Security audit report (coming in v1.0)",
      },
    ],
  },
  SYDF: {
    fundDetails: [
      { label: "Index Category", value: "Large Growth" },
      { label: "Fund Inception", value: "12/31/1984" },
      {
        label: "Exp Ratio (Gross)",
        value: "0.73%",
        date: "06/30/2025",
        hasTooltip: true,
      },
      {
        label: "Exp Ratio (Net)",
        value: "0.73%",
        date: "06/30/2025",
        hasTooltip: true,
      },
      { label: "NAV", value: "$20.60", date: "06/30/2025", hasTooltip: true },
      { label: "Minimum to Invest", value: "$0.00" },
      {
        label: "Turnover Rate",
        value: "55.00%",
        date: "01/31/2025",
        hasTooltip: true,
      },
      {
        label: "Portfolio Net Assets ($M)",
        value: "$29,465.73",
        date: "06/30/2025",
        hasTooltip: true,
      },
      {
        label: "Share Class Net Assets ($M)",
        value: "$21,799.68",
        date: "06/30/2025",
        hasTooltip: true,
      },
      {
        label: "12 Month Low-High",
        value: "$16.90 - $24.02",
        date: "06/30/2025",
        hasTooltip: false,
      },
    ],
    equityStyleMap: {
      currentPosition: { x: 2, y: 0 }, // Growth, Large Cap
      historicalPosition: { x: 1, y: 0 }, // Blend, Large Cap
      category: "Large Growth",
      fundAssetsCovered: "95.84%",
      description:
        "Invest in companies with market values greater than $10 billion that fund managers believe are poised for growth. Growth can be based on a variety of factors, such as revenue or earnings growth. Growth funds are typically focused on generating capital gains rather than income.",
      asOfDate: "05/31/2025",
    },
    fundManagerData: {
      manager: {
        name: "Christopher W. Lin",
        role: "Primary Manager",
        tenureStartDate: "09/16/2017",
        avatar: "/path/to/manager-avatar.jpg",
      },
      managedFunds: [
        {
          name: "VIP Balanced Portfolio - Investor Class",
          startDate: "12/05/2024",
        },
        {
          name: "Fidelity Advisor® Equity Growth Fund Class C",
          startDate: "04/11/2025",
        },
        {
          name: "VIP Growth Portfolio - Service Class 2",
          startDate: "04/11/2025",
        },
      ],
      commentaryLinks: [
        { title: "Quarterly Fund Review", url: "#" },
        { title: "Portfolio Manager Q&A", url: "#" },
        { title: "Investment Approach", url: "#" },
      ],
    },
    fundOverviewData: {
      asOfDate: "04/30/2025",
      topSector: {
        name: "Information Technology",
        iconName: "Cpu",
        weight: "93.66%",
      },
      topCountry: {
        name: "United States",
        weight: "93.66%",
        iconName: "MapPin",
      },
      objective: "Seeks capital appreciation.",
      strategy: `Normally investing at least 80% of assets in securities principally traded on NASDAQ or an over-the-counter
      market, which has more small and medium-sized companies than other markets. Investing more than 25% of total
      assets in the technology sector. Investing in either "growth" stocks or "value" stocks or both. Normally
      investing primarily in common stocks.`,
      risk: `Stock markets, especially foreign markets, are volatile and can decline significantly in response to adverse
      issuer, political, regulatory, market, or economic developments. The technology industries can be
      significantly affected by obsolescence of existing technology, short product cycles, falling prices and
      profits, and competition from new market entrants and general economic conditions.`,
      disclosures: `This description is only intended to provide a brief overview of the mutual fund. Read the fund's prospectus
      for more detailed information about the fund.`,
    },
    fundRisk:
      "none",
    portfolioManagerInsights: [
      {
        id: 1,
        imageUrl: "chris-lin-bio",
        imageClassName: "w-full h-[100px] object-cover",
        title: "Breakthrough biotechs with a bright future",
        description:
          "Fidelity's Chris Lin considers two biotech companies well-positioned to revolutionize drug development and the treatment of major diseases.",
        isLink: true,
      },
      {
        id: 2,
        imageUrl: "chris-lin",
        imageClassName: "w-[135px] h-[135px] object-cover",
        title: "AI-Revolutionary",
        description:
          "Fidelity U.S. large cap growth portfolio managers see artificial intelligence as the most compelling multiyear investment theme that is going to drive major disruption across a variety of businesses.",
        isLink: true,
      },
    ],
    description:
      "The Spark DAI 1 vault curated by SparkDAO is intended to seamlessly allocate DAI liquidity from Maker to IndexMaker markets.",
    documents: [
      {
        id: "Index Overview",
        name: "Index Overview",
        url: "pdf-generation/pdfview/factsheet/SYDF",
        description: "Technical details about the vault (coming in v0.8)",
      },
      {
        id: "audit",
        name: "Security Audit",
        url: "#",
        description: "Security audit report (coming in v1.0)",
      },
    ],
  },
};

// Helper function to get data by index ID
export const getIndexData = (indexId: string) => {
  return indexData[indexId] || null;
};
