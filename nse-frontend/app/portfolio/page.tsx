"use client";

import { useEffect, useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { CommandMenu } from "@/components/layout/CommandMenu";
import { Portfolio } from "@/components/sections/Portfolio";

export default function PortfolioPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;

  return (
    <>
      <Navbar />
      <CommandMenu />
      <Portfolio />
    </>
  );
}
