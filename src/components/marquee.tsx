"use client";

import Image from "next/image";

const ROW_1 = [
  // Bhagat's inventory
  "https://example.com/images/inventory/nike-cg.png",
  "https://example.com/images/inventory/ap-max.png",
  "https://example.com/images/inventory/yonex.png",
  "https://example.com/images/inventory/brew-metric.webp",
  "https://example.com/images/inventory/marshall.webp",
  "https://example.com/images/inventory/nike-ts.png",
  "https://example.com/images/inventory/nb-740.webp",
  "https://example.com/images/inventory/meta-rb.webp",
  "https://example.com/images/inventory/coach-bp.webp",
  "https://example.com/images/inventory/loop.png",
  "https://example.com/images/inventory/lego-nike.jpg",
  // Sample inventory
  "https://inventory.example.com/media/pages/objects/physix/467b3a3dfa-1735225123/vitra-physix.png",
  "https://inventory.example.com/media/pages/objects/samba-og-royal-blue-gum/f1bdf82cb0-1735225136/adidas-samba-og-royal-blue-gum.png",
  "https://inventory.example.com/media/pages/objects/macbook-pro-16-inch/1d46adb667-1735225111/apple-macbook-pro-16.png",
  "https://inventory.example.com/media/pages/objects/xt-6/3bb63478db-1735225141/salomon-xt-6.png",
  "https://inventory.example.com/media/pages/objects/s3/39f6d0366b-1735225117/vanmoof-s3.png",
  "https://inventory.example.com/media/pages/objects/no-1-black/6a2d679848-1735225113/tidwatches-no1.png",
  "https://inventory.example.com/media/pages/objects/blok-medium/0fc7b91206-1735225113/pinqponq-blok-medium.png",
  "https://inventory.example.com/media/pages/objects/tma-2-s05-h02-e10-c02/23e557cdc4-1735225122/aiaiai-tm-2.png",
  "https://inventory.example.com/media/pages/objects/dieter-rams-the-complete-works/d9880d671c-1735225126/klaus-klemp-phaidon-dieter-rams.png",
  "https://inventory.example.com/media/pages/objects/karst-eau-de-parfum/7b9db18af4-1735225125/aesop-karst.png",
];

const ROW_2 = [
  // Bhagat's inventory
  "https://example.com/images/inventory/gear-aid.png",
  "https://example.com/images/inventory/pata-t.png",
  "https://example.com/images/inventory/sf-46.png",
  "https://example.com/images/inventory/oralb.webp",
  "https://example.com/images/inventory/samsonite-55.png",
  "https://example.com/images/inventory/helio.png",
  "https://example.com/images/inventory/hydaway.png",
  "https://example.com/images/inventory/nerf.webp",
  "https://example.com/images/inventory/soled-out.webp",
  "https://example.com/images/inventory/sf-44.png",
  "https://example.com/images/inventory/samsonite-75.png",
  // Sample inventory
  "https://inventory.example.com/media/pages/objects/eidesis-eau-de-parfum/2b2547bdf5-1735225595/aesop-eidesis.png",
  "https://inventory.example.com/media/pages/objects/w241-faro/0fa0eaad09-1741952849/wastberg-w241-faro.png",
  "https://inventory.example.com/media/pages/objects/ipad-pro-11/8f4b82d808-1735225112/apple-ipad-pro-11.png",
  "https://inventory.example.com/media/pages/objects/327-nimbus-cloud/b6af5f9aad-1735225118/new-balance-327.png",
  "https://inventory.example.com/media/pages/objects/palo-santo-14-candle/a014b0895a-1735225139/lelabo-palo-santo-14-candle.png",
  "https://inventory.example.com/media/pages/objects/airpods-pro-2/26012844b9-1735225119/apple-airpods-pro-2.png",
  "https://inventory.example.com/media/pages/objects/travel-tumbler/0184823b98-1735225121/kinto-travel-tumbler.png",
  "https://inventory.example.com/media/pages/objects/float-shelf/44b91ce94e-1735225126/new-tendency-float-shelf.png",
  "https://inventory.example.com/media/pages/objects/josi-cote-decheval/dc8ac47ab3-1735225124/omen-josi-cote-decheval.png",
  "https://inventory.example.com/media/pages/objects/selection-architecture/cc99416dde-1735225114/minimalissimo-selection.png",
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
