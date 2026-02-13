import ServiceCard from "./components/ServiceCard";
import PublicHeader from "./components/PublicHeader";
import {
  School,
  FileText,
  Users,
} from "lucide-react";


const Index = () => {
  const publicServices = [
    {
      title: "Check Primary Result",
      description: "Access and verify official primary school examination results and certificates",
      icon: FileText,
      href: "/primary-result",
      variant: "primary" as const,
    },
    {
      title: "CIE Student Inspector",
      description: "Browse and manage student records by Local Government Area",
      icon: Users,
      href: "/cie",
      variant: "primary" as const,
    },
   
  ];

  const portalServices = [
    {
      title: "School Portal Access",
      description: "Authorized access for school administrators, validation services, and registration management",
      icon: School,
      href: "/access",
      variant: "primary" as const,
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PublicHeader />
        
        <main className="flex-1">
          <div className="container mx-auto px-4 py-6 md:py-10 lg:py-12 xl:px-8 2xl:px-12 max-w-7xl xl:max-w-[1400px] 2xl:max-w-[1600px]">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 xl:gap-16">
              {/* Main Content */}
              <div className="lg:col-span-8">
                {/* Page Title */}
                <div className="mb-6 pb-4 border-b-2 border-primary">
                  <h2 className="text-xl md:text-2xl lg:text-3xl xl:text-4xl font-semibold text-foreground">
                    Online Services
                  </h2>
                  <p className="text-sm md:text-base xl:text-lg text-muted-foreground mt-1 xl:mt-2">
                    Select a service to proceed
                  </p>
                </div>

                {/* Services Section */}
                <div className="mb-8">
                  <h3 className="text-xs xl:text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4 xl:mb-6">
                    Available Services
                  </h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    {publicServices.map((service, index) => (
                      <ServiceCard key={index} {...service} />
                    ))}
                    {portalServices.map((service, index) => (
                      <ServiceCard key={index} {...service} />
                    ))}
                  </div>
                </div>
              </div>

              {/* Sidebar */}
              <aside className="lg:col-span-4">
                {/* Notice Banner */}
                <div className="mb-6 p-4 bg-accent border border-border border-l-4 border-l-primary">
                  <h4 className="text-xs xl:text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2 xl:mb-3">
                    Notice
                  </h4>
                  <p className="text-sm xl:text-base text-foreground leading-relaxed">
                    For comprehensive primary education portal services, 
                    visit the official ministry website at{" "}
                    <a
                      href="https://www.dsgmope.ng"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-primary underline underline-offset-2"
                    >
                      www.dsgmope.ng
                    </a>
                  </p>
                </div>

                {/* Additional Information */}
                <div className="p-4 border border-border bg-card">
                  <h4 className="text-xs xl:text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2 xl:mb-3">
                    Information
                  </h4>
                  <p className="text-sm xl:text-base text-muted-foreground leading-relaxed">
                    This portal provides official services for the verification of primary education 
                    examination results and access to school administrative functions. All data is 
                    sourced directly from the Ministry of Primary Education records.
                  </p>
                </div>

                {/* Quick Links */}
                <div className="mt-6 p-4 border border-border bg-card">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                    Quick Links
                  </h4>
                  <ul className="space-y-2 text-sm">
                    <li>
                      <a href="https://www.dsgmope.ng" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline underline-offset-2">
                        Ministry Official Website
                      </a>
                    </li>
                    <li>
                      <a href="https://www.deltastate.gov.ng" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline underline-offset-2">
                        Delta State Government Portal
                      </a>
                    </li>
                  </ul>
                </div>
              </aside>
            </div>
          </div>
        </main>
      </div>
  );
};

export default Index;
