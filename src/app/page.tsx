"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";

const carouselItems = [
  { src: "/demo/airpods-max.png", label: "AirPods Max" },
  { src: "/demo/macbook-pro.png", label: "MacBook Pro" },
  { src: "/demo/ps5-slim.png", label: "PS5 Slim" },
  { src: "/demo/onitsuka-mexico66.png", label: "Mexico 66" },
  { src: "/demo/marshall-emberton.png", label: "Emberton II" },
];

const doubledItems = [...carouselItems, ...carouselItems];

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-5 max-w-6xl mx-auto w-full">
        <span className="text-sm font-medium tracking-tight text-foreground">
          Inventory
        </span>
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="text-sm text-muted-foreground"
        >
          <Link href="/login">Sign in</Link>
        </Button>
      </nav>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <p className="text-[10px] font-medium tracking-[0.2em] uppercase text-muted-foreground mb-6">
            A personal archive
          </p>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-semibold tracking-tight text-foreground leading-[1.1] mb-5">
            Catalog the objects
            <br />
            that define you.
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground max-w-xl mx-auto mb-10 leading-relaxed">
            A minimalist digital vault for the things you own, want, and love.
            Sneakers, tech, design — all in one curated space.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Button
              asChild
              className="rounded-full px-6 h-11 text-sm font-medium gap-2"
            >
              <Link href="/signup">
                Get Started
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
            <Button
              variant="outline"
              asChild
              className="rounded-full px-6 h-11 text-sm font-medium gap-2"
            >
              <Link href="/demo">
                <Eye className="w-4 h-4" />
                See Example
              </Link>
            </Button>
          </div>
        </motion.div>
      </main>

      {/* Auto-scrolling Carousel */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.4 }}
        className="w-full overflow-hidden py-10 sm:py-16"
      >
        <div className="relative">
          {/* Fade edges */}
          <div className="absolute left-0 top-0 bottom-0 w-16 sm:w-24 bg-gradient-to-r from-background to-transparent z-10" />
          <div className="absolute right-0 top-0 bottom-0 w-16 sm:w-24 bg-gradient-to-l from-background to-transparent z-10" />

          <motion.div
            className="flex gap-4 sm:gap-6"
            animate={{ x: [0, -(carouselItems.length * (200 + 24))] }}
            transition={{
              x: {
                duration: 25,
                repeat: Infinity,
                ease: "linear",
              },
            }}
          >
            {doubledItems.map((item, i) => (
              <div
                key={i}
                className="flex-shrink-0 w-[160px] sm:w-[200px] aspect-square bg-secondary flex items-center justify-center p-6 sm:p-8"
              >
                <img
                  src={item.src}
                  alt={item.label}
                  className="max-h-full max-w-full object-contain"
                  loading="lazy"
                />
              </div>
            ))}
          </motion.div>
        </div>
      </motion.div>

      {/* Footer */}
      <footer className="py-6 text-center">
        <p className="text-xs text-muted-foreground">
          Inventory — Your personal archive.
        </p>
      </footer>
    </div>
  );
}
