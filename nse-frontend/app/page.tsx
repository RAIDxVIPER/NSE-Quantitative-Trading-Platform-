"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Navbar } from "@/components/layout/Navbar";
import { CommandMenu } from "@/components/layout/CommandMenu";
import { Hero } from "@/components/sections/Hero";
import { Dashboard } from "@/components/sections/Dashboard";
import { Analytics } from "@/components/sections/Analytics";
import { Portfolio } from "@/components/sections/Portfolio";
import { News } from "@/components/sections/News";
import { Search } from "@/components/sections/Search";
import { About } from "@/components/sections/About";
import { Footer } from "@/components/sections/Footer";

const Scene = dynamic(
  () => import("@/components/3d/Scene").then((mod) => mod.Scene),
  { ssr: false }
);

export default function Home() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <>
      <Navbar />
      <CommandMenu />
      <Scene />
      <Hero />
      <Dashboard />
      <Analytics />
      <Portfolio />
      <News />
      <Search />
      <About />
      <Footer />
    </>
  );
}
