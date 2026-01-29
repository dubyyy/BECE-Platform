import Link from "next/link";
import { LucideIcon } from "lucide-react";

interface ServiceCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  href: string;
  variant?: "primary" | "secondary";
}

const ServiceCard = ({
  title,
  description,
  icon: Icon,
  href,
  variant: _variant = "primary",
}: ServiceCardProps) => {
  return (
    <Link href={href} className="block">
      <div className="h-full border border-border bg-card p-6 md:p-8 xl:p-10 hover:border-primary/60 transition-colors">
        <div className="flex items-start gap-4 md:gap-5 xl:gap-6">
          <div className="flex-shrink-0 mt-0.5">
            <Icon className="h-6 w-6 md:h-7 md:w-7 xl:h-8 xl:w-8 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg md:text-xl xl:text-lg font-semibold text-foreground mb-2">
              {title}
            </h3>
            <p className="text-sm md:text-sm text-muted-foreground leading-relaxed lg:text-sm">{description}</p>
          </div>
          
        </div>
      </div>
    </Link>
  );
};

export default ServiceCard;
