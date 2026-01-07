"use client";

import Link from "next/link";
import LogoutButton from "@/components/LogoutButton";
import { useEffect, useState } from "react";
import { getCookie } from "@/lib/cookies";
import Image from "next/image";

const Header = () => {
  const [schoolInfo, setSchoolInfo] = useState<any>(null);

  useEffect(() => {
    // Check cookies first, then localStorage
    const cookieInfo = getCookie('schoolInfo');
    const localInfo = localStorage.getItem("schoolInfo");
    const info = cookieInfo || localInfo;
    
    if (info) {
      try {
        setSchoolInfo(JSON.parse(info));
      } catch (e) {
        console.error('Failed to parse school info:', e);
      }
    }
  }, []);

  return (
    <header className="bg-primary text-primary-foreground sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3 md:py-4 xl:px-8 2xl:px-12 max-w-7xl xl:max-w-[1400px] 2xl:max-w-[1600px]">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 md:gap-4">
            <div className="relative h-14 w-11 md:h-16 md:w-14 lg:h-18 lg:w-14 xl:h-20 xl:w-16 flex-shrink-0">
              <Image src="/delta-logo.png" alt="Delta State Government Seal" fill className="object-contain" priority />
            </div>
            <div className="border-l border-primary-foreground/30 pl-3 md:pl-4">
              <p className="text-xs md:text-sm xl:text-base font-medium tracking-wide uppercase opacity-90">
                Delta State Government
              </p>
              <h1 className="text-base md:text-lg lg:text-xl xl:text-2xl font-semibold leading-tight">
                Ministry of secondary education
              </h1>
              <p className="text-xs md:text-sm xl:text-base opacity-80">
                Official Portal
              </p>
            </div>
          </Link>
          <div className="flex items-center gap-4">
            {schoolInfo && (
              <div className="hidden md:block text-right text-xs border-r border-primary-foreground/30 pr-4">
                <p className="font-semibold">{schoolInfo.schoolName}</p>
                <p className="opacity-80">LGA: {schoolInfo.lgaCode} | Code: {schoolInfo.schoolCode}</p>
              </div>
            )}
            <LogoutButton />
          </div>
        </div>
      </div>
      <div className="h-0.5 bg-primary-foreground/20"></div>
    </header>
  );
};

export default Header;
