"use client";

import ServiceCard from "../components/ServiceCard";
import AccessGuard from "../components/AccessGuard";
import Header from "../components/Header";
import {
  ClipboardList,
  School,
  FileText,
  AlertCircle,
  UserPlus,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const PortalPage = () => {
  const portalServices = [
    {
      title: "Validation List",
      description: "Verify and validate student registration records",
      icon: ClipboardList,
      href: "/validation",
      variant: "primary" as const,
    },
    {
      title: "Secondary School Registration",
      description: "Register new students for secondary education",
      icon: School,
      href: "/school-registration",
      variant: "primary" as const,
    },
    {
      title: "Post Registration",
      description: "Manage post-registration activities and updates",
      icon: UserPlus,
      href: "/post-registration",
      variant: "primary" as const,
    },
  
  ];

  return (
    <AccessGuard>
      <div className="min-h-screen flex flex-col">
        <Header />
        
        <main className="flex-1 container mx-auto px-4 py-6 md:py-10 lg:py-12 xl:px-8 2xl:px-12 max-w-7xl xl:max-w-[1400px] 2xl:max-w-[1600px]">
          <div className="w-full">
            <div className="mb-6 xl:mb-8 pb-4 border-b-2 border-primary">
              <h2 className="text-xl md:text-2xl lg:text-3xl xl:text-4xl font-semibold text-foreground">
                School Portal Services
              </h2>
              <p className="text-sm md:text-base xl:text-lg text-muted-foreground mt-1 xl:mt-2">
                Select a service to proceed
              </p>
            </div>

            <Alert className="mb-6 xl:mb-8 border-primary/20 bg-accent">
              <AlertCircle className="h-4 w-4 xl:h-5 xl:w-5 text-primary" />
              <AlertDescription className="text-sm xl:text-base">
                For primary portal access, please visit{" "}
                <a
                  href="https://www.dsgmope.ng"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-primary underline hover:text-primary/80"
                >
                  www.dsgmope.ng
                </a>
              </AlertDescription>
            </Alert>

            <h3 className="text-xs xl:text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4 xl:mb-6">
              Available Services
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 xl:gap-6">
              {portalServices.map((service, index) => (
                <ServiceCard key={index} {...service} />
              ))}
            </div>
          </div>
        </main>
      </div>
    </AccessGuard>
  );
};

export default PortalPage;
