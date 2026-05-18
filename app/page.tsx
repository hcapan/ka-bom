import Link from "next/link";

import HeroIllustration from "./components/chrome/HeroIllustration";


export default function Home() {
  return (
    <main className="w-full min-h-screen bg-white text-slate-900 overflow-hidden">
  {/* Hero */}
  <section className="relative flex min-h-screen flex-col-reverse lg:flex-row items-center justify-between px-8 md:px-16 pt-16 pb-24 gap-12">

    {/* Left Content */}
    <div className="z-10 max-w-xl space-y-6 lg:mt-0">

      {/* Badge */}
      <p className="text-sm tracking-[0.25em] uppercase text-blue-500 font-semibold">
        Cisco BOM Automation Tool
      </p>

      {/* Title */}
      <h1 className="text-5xl md:text-7xl font-extrabold leading-tight text-slate-800">
        CCW Canvas
      </h1>

      {/* Subtitle */}
      <p className="text-lg md:text-xl text-slate-500 leading-8">
        Create Cisco Bills of Materials faster, cleaner, and without the complexity of spreadsheets.
        Streamline your CCW workflow in a modern visual workspace.
      </p>

      {/* Divider */}
      <div className="w-24 h-1 bg-blue-500/30 rounded-full" />

      {/* CTA */}
      <div className="pt-4">
        <Link
          href="/canvas"
          className="inline-flex items-center justify-center bg-blue-500 hover:bg-blue-600 transition px-10 py-4 rounded-2xl text-white text-lg font-semibold shadow-lg hover:shadow-2xl"
        >
          Start Building BOMs
        </Link>
      </div>

      {/* Micro trust text */}
      <p className="text-sm text-slate-400 pt-2">
        No spreadsheets. No manual CCW complexity.
      </p>
    </div>

    {/* Right Visual */}
    <div className="relative flex items-center justify-center w-full lg:w-[55%]">
      <div className="absolute w-100 h-100 bg-blue-100 rounded-full blur-3xl opacity-40" />

      <HeroIllustration />
    </div>

  </section>
</main>
  );
}
