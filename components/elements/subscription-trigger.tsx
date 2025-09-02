// components/subscription/SubscriptionTrigger.tsx
"use client";

import { useEffect, useState } from "react";
import { SubscribeModal } from "../subscribe/subscribe-modal";

export default function SubscriptionTrigger() {
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const alreadySubscribed = localStorage.getItem("alreadySubscribed");
    if (alreadySubscribed === "true") return;

    const timer = setTimeout(() => {
      // setShowModal(true);
    }, 30000); // 30 seconds

    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setShowModal(false);
  };

  return (
    <>
      {showModal && (
        <SubscribeModal
          isOpen={showModal}
          onClose={handleClose}
        />
      )}
    </>
  );
}
