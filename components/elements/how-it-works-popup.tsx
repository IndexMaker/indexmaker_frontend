"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { XIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface HowItWorksPopupProps {
  open: boolean;
  onClose: () => void;
}

export function HowItWorksPopup({ open, onClose }: HowItWorksPopupProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener("resize", checkMobile);
    
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Extract video ID from YouTube URL
  const videoId = "tcm14lTQpYY";

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent 
        className={cn(
          "p-0 overflow-hidden border-0",
          isMobile 
            ? "w-[95vw] max-w-[95vw] h-auto" 
            : "w-[90vw] max-w-[1200px] h-auto"
        )}
      >
        <div className="relative w-full bg-black">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-2 right-2 z-10 rounded-full bg-black/50 p-2 text-white hover:bg-black/70 transition-colors"
            aria-label="Close"
          >
            <XIcon className="h-4 w-4" />
          </button>

          {/* Video Title */}
          <div className="absolute top-2 left-2 z-10 px-3 py-1 rounded bg-black/50">
            <h3 className="text-white text-sm font-semibold">Tutorial</h3>
          </div>

          {/* YouTube iframe */}
          <div 
            className={cn(
              "relative w-full",
              isMobile ? "aspect-video" : "aspect-video"
            )}
          >
            <iframe
              src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&cc_load_policy=1`}
              title="Tutorial"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="absolute inset-0 w-full h-full"
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
