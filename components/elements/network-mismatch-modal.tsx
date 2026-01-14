import { CustomButton } from "../ui/custom-button";

// Helper function to get network name from chain ID
const getNetworkName = (chainId: string): string => {
  switch (chainId) {
    case "0x1":
      return "Ethereum";
    case "0x2105":
      return "Base";
    case "0xa4b1":
      return "Arbitrum One";
    case "0x6A11E3D":
      return "IndexMaker Chain";
    default:
      return "Unknown";
  }
};

// Modal Component
export const NetworkMismatchModal = ({
    isOpen,
    onClose,
    walletChainId,
    desiredNetwork,
    onSwitch,
  }: {
    isOpen: boolean;
    onClose: () => void;
    walletChainId: string;
    desiredNetwork: string;
    onSwitch: () => {};
  }) => {
    if (!isOpen) return null;
  
    const walletNetwork = getNetworkName(walletChainId);
    const desiredNetworkName = getNetworkName(desiredNetwork);
  
    return (
      <div className="absolute z-10 top-[70px] right-[50px] max-w-[400px] rounded-md">
        <div className="bg-foreground p-10 border-accent border-1 rounded-md">
          <span
            className="absolute top-[10px] right-[10px] text-[11px] text-secondary cursor-pointer"
            onClick={onClose}
          >
            Close
          </span>
          <div className="flex flex-col gap-8">
            <div className="flex gap-2 flex-col">
              <p className="text-[16px] text-primary">
                You're currently connected to the wrong chain.
              </p>
              <p className="text-[14px] text-secondary">
                Current wallet is connected to {walletNetwork}.
              </p>
            </div>
            <CustomButton
              className="rounded-[4px] w-full text-[13px] font-200"
              variant="default"
              onClick={onSwitch}
            >
              Switch to {desiredNetworkName}
            </CustomButton>
          </div>
        </div>
      </div>
    );
  };
