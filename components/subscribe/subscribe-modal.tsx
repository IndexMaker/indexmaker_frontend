"use client";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/contexts/language-context";
import { useState } from "react";
import { toast } from "sonner";
import { subscribeEmail } from "@/server/indices";
import { useDebounce } from "use-debounce";
import { useMediaQuery } from "react-responsive";
export function SubscribeModal({
  isOpen,
  onClose,
  IndexName = "VanEck",
}: {
  isOpen: boolean;
  onClose: () => void;
  IndexName?: string;
}) {
  const { t } = useLanguage();
  const isSmallWindow = useMediaQuery({ maxWidth: 1024 });
  const [email, setEmail] = useState("");
  const [debouncedEmail] = useDebounce(email, 300);
  const [privacyChecked, setPrivacyChecked] = useState(false);
  const [twitterHandle, setTwitterHandle] = useState("");

  const handleSubmit = async () => {
    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(debouncedEmail);
    if (!isValidEmail) {
      toast.error("Please enter a valid email address.");
      return;
    }

    try {
      await subscribeEmail({ email: debouncedEmail, twitter: twitterHandle });
      toast.success("Thanks for subscribing!");
      localStorage.setItem("alreadySubscribed", "true");
      onClose();
    } catch (err) {
      toast.error("Subscription failed.");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className={`  max-h-[90vh] overflow-y-auto ${
          isSmallWindow ? "!w-[80vw] !max-w-[90vw]" : "!w-[50vw] !max-w-[60vw]"
        }`}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <div className="container mx-auto px-4 py-8">
          {/* Header Section */}
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-4 text-primary">
              Subscribe to IndexMaker Insights
            </h2>
            <p className="text-lg mb-6 text-secondary text-left">
              {t("subscribe.description") ||
                "Receive direct updates with the latest observations on markets from our senior investment professionals and discover the latest opportunities across equities, bonds and specialized assets."}
            </p>
            <p className="text-sm mb-8 text-secondary text-left">
              {t("subscribe.learnMore") ||
                "Learn more about how we approach each topic and select your subscriptions below."}
            </p>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-200 my-6"></div>

          {/* Existing Subscribers Note */}
          {/* <p className="text-sm font-medium mb-6 text-secondary">
            {t("subscribe.existingSubscribers") || 
            "Existing subscribers: Please enter your email address to receive a link to manage your existing subscriptions and update your preferences."}
          </p> */}

          {/* Form */}
          <div className="space-y-6 flex flex-col">
            {/* Email Field */}
            <div className="flex flex-row gap-4 justify-between">
              <div className="w-full">
                <Label
                  htmlFor="email"
                  className="block mb-2 font-medium text-primary"
                >
                  {t("subscribe.emailLabel") || "EMAIL ADDRESS*"}
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-4 border rounded-lg text-[18px] text-primary h-[64px]"
                  placeholder="your@email.com"
                  required
                />
              </div>
              <div className="w-full">
                <Label
                  htmlFor="twitter"
                  className="block mb-2 font-medium text-primary"
                >
                  {
                    "COMPANY TWITTER HANDLE (optional)"}
                </Label>
                <Input
                  id="twitter"
                  type="text"
                  value={twitterHandle}
                  onChange={(e) => setTwitterHandle(e.target.value)}
                  className="w-full p-4 border rounded-lg text-[18px] text-primary h-[64px]"
                  placeholder="@yourcompany"
                />
              </div>

              {/* Investor Type Field */}
              {/* <div className="w-full">
                <Label className="block mb-2 font-medium text-primary">
                  {t("subscribe.investorType") || "INVESTOR TYPE"}
                </Label>
                <select className="w-full p-4 border rounded-lg text-[18px] bg-background text-primary h-[64px]">
                  <option value="individual">
                    {t("subscribe.individualInvestor") || "INDIVIDUAL INVESTOR"}
                  </option>
                  <option value="institutional">
                    {t("subscribe.institutionalInvestor") ||
                      "INSTITUTIONAL INVESTOR"}
                  </option>
                </select>
              </div> */}
            </div>

            {/* Privacy Policy Checkbox */}
            <div className="flex items-center space-x-2 justify-center">
              <Checkbox
                id="privacy"
                checked={privacyChecked}
                onCheckedChange={(checked) =>
                  setPrivacyChecked(checked as boolean)
                }
                required
              />
              <Label
                htmlFor="privacy"
                className="text-sm font-medium text-secondary"
              >
                {t("subscribe.privacyPolicy") ||
                  "I have read the Online Privacy Policy"}
              </Label>
            </div>

            {/* Submit Button */}
            <Button
              onClick={handleSubmit}
              className="w-full py-6 text-lg font-bold cursor-pointer"
              disabled={!privacyChecked}
            >
              {t("subscribe.submitButton") || "SUBSCRIBE"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
