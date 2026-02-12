"use client";

import Image from "next/image";

const ROW_1 = [
  "/images/placeholder/item-01.png",
  "/images/placeholder/item-02.webp",
  "/images/placeholder/item-03.webp",
  "/images/placeholder/item-04.webp",
  "/images/placeholder/item-05.png",
  "/images/placeholder/item-06.png",
  "/images/placeholder/item-07.png",
  "/images/placeholder/item-08.png",
  "/images/placeholder/item-09.png",
  "/images/placeholder/item-10.png",
  "/images/placeholder/item-11.png",
];

const ROW_2 = [
  "/images/placeholder/item-12.png",
  "/images/placeholder/item-13.png",
  "/images/placeholder/item-14.webp",
  "/images/placeholder/item-15.png",
  "/images/placeholder/item-16.webp",
  "/images/placeholder/item-17.webp",
  "/images/placeholder/item-18.png",
  "/images/placeholder/item-19.webp",
  "/images/placeholder/item-20.webp",
  "/images/placeholder/item-21.png",
  "/images/placeholder/item-22.png",
];

function MarqueeRow({
  images,
  reverse = false,
  speed = 40,
}: {
  images: string[];
  reverse?: boolean;
  speed?: number;
}) {
  // Duplicate the images for seamless looping
  const duplicated = [...images, ...images];

  return (
    <div className="relative flex overflow-hidden group">
      {/* Fade edges */}
      <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-24 bg-gradient-to-r from-background to-transparent" />
      <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-24 bg-gradient-to-l from-background to-transparent" />

      <div
        className={`flex shrink-0 items-center gap-6 ${
          reverse ? "animate-marquee-reverse" : "animate-marquee"
        } group-hover:[animation-play-state:paused]`}
        style={{
          animationDuration: `${speed}s`,
        }}
      >
        {duplicated.map((src, i) => (
          <div
            key={`${src}-${i}`}
            className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-muted/50"
          >
            <Image
              src={src}
              alt=""
              fill
              className="object-contain p-2"
              sizes="80px"
              unoptimized
            />
          </div>
        ))}
      </div>

      {/* Second copy for seamless loop */}
      <div
        className={`flex shrink-0 items-center gap-6 ${
          reverse ? "animate-marquee-reverse" : "animate-marquee"
        } group-hover:[animation-play-state:paused]`}
        style={{
          animationDuration: `${speed}s`,
        }}
        aria-hidden
      >
        {duplicated.map((src, i) => (
          <div
            key={`dup-${src}-${i}`}
            className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-muted/50"
          >
            <Image
              src={src}
              alt=""
              fill
              className="object-contain p-2"
              sizes="80px"
              unoptimized
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export function Marquee() {
  return (
    <div className="w-full space-y-4 py-8">
      <MarqueeRow images={ROW_1} speed={120} />
      <MarqueeRow images={ROW_2} reverse speed={110} />
    </div>
  );
}
