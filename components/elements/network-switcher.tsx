"use client";

import { JSX, useEffect } from "react";
import { Check, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Image from "next/image";
import Base from "../../public/icons/base.png";
import ETH from "../../public/logos/ethereum.png";
import Favicon from "../../public/favicon.svg";

type Network = {
  id: string;
  name: string;
  chainId: string;
  icon: string;
};

export const networks: Network[] = [
  {
    id: "arbitrum",
    name: "Arbitrum",
    chainId: "0xa4b1",
    icon: 'arbitrum',
  },
  {
    id: "orbit",
    name: "IndexMaker Chain",
    chainId: "0x6A11E3D",
    icon: 'indexmaker',
  },
];
interface NetworkSwitcherProps {
  handleNetworkSwitch: (chainId: string) => void;
  selectedNetwork: Network | null;
  setSelectedNetwork: (selectedNetwork: Network) => void;
}
export function NetworkSwitcher({
  handleNetworkSwitch,
  selectedNetwork,
  setSelectedNetwork,
}: NetworkSwitcherProps) {
  // const router = useRouter();
  // const searchParams = useSearchParams();

  // Get network from URL or default to Ethereum
  // const defaultNetwork =
  //   networks.find((n) => n.id === searchParams.get("network")) || networks[0];
  // const [selectedNetwork, setSelectedNetwork] = useState(defaultNetwork);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild className="px-0">
        <Button
          variant="outline"
          className="flex rounded-[4px] cursor-pointer text-xs line-[16px] items-center w-[46px] has-[>svg]:px-1 m-auto max-h-[26px] border-none text-primary hover:text-white hover:bg-[#fafafa1a] gap-1 hover:border-none shadow-none !bg-transparent md:!bg-foreground"
        >
          <span className="flex items-center">
            <span>{getNetworkIcon(selectedNetwork?.icon || 'arbitrum')}</span>
          </span>
          <ChevronDown className="h-4 w-4 opacity-50 text-secondary hidden md:flex" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-[200px] bg-foreground border-none text-[11px] text-secondary"
      >
        {networks.map((network) => (
          <DropdownMenuItem
            key={network.id}
            onClick={() => {
              setSelectedNetwork(network);
              handleNetworkSwitch(network.chainId);
            }}
            className="flex items-center justify-between active:bg-[#fafafa20]"
          >
            <span className="flex items-center gap-2">
              <span>{getNetworkIcon(network.icon)}</span>
              <span>{network.name}</span>
            </span>
            {selectedNetwork?.id === network.id && (
              <Check className="h-4 w-4" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export const getNetworkIcon = (iconIdentifier: string) => {
  switch (iconIdentifier) {
    case "arbitrum":
      return (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 0L2.5 6v12L12 24l9.5-6V6L12 0zm6.28 16.78l-3.54 2.04-2.74 1.58-2.74-1.58-3.54-2.04V7.22l3.54-2.04L12 3.6l2.74 1.58 3.54 2.04v9.56z" fill="#2D374B"/>
          <path d="M14.74 13.39l-1.87 2.97-2.74-1.58 1.87-2.97 2.74 1.58z" fill="#28A0F0"/>
          <path d="M17.48 11.81l-2.74-1.58v-3.16l2.74 1.58v3.16z" fill="#96BEDC"/>
        </svg>
      );
    case "indexmaker":
      return (
        <Image
          src={Favicon}
          alt={"IndexMaker Chain"}
          width={17}
          height={17}
        />
      );
    case "ethereum":
      return (
        <Image
          src={ETH}
          alt={"Ethereum"}
          width={17}
          height={17}
        />
      );
    case "base":
      return <Image src={Base} alt={"Base"} width={17} height={17} />;
    default:
      return null;
  }
};
