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
export const networks: Network[] = [
  {
    id: "base",
    name: "Base",
    chainId: "0x2105",
    icon: 'base',
  },
  // {
  //   id: "mainnet",
  //   name: "Ethereum",
  //   chainId: "0x1",
  //   icon: 'ethereum',
  // },
];

type Network = {
  id: string;
  name: string;
  chainId: string;
  icon: string;
};
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
            <span>{getNetworkIcon(selectedNetwork?.icon || 'ethereum')}</span>
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
