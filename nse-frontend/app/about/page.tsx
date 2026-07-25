"use client";

import { useEffect, useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { CommandMenu } from "@/components/layout/CommandMenu";
import { About } from "@/components/sections/About";
import { Footer } from "@/components/sections/Footer";

export default function AboutPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;

  return (
    <>
      <Navbar />
      <CommandMenu />
      <About />
      <Footer />
    </>
  );
}
