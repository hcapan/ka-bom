export default function About() {
  return (
    <main className="min-h-screen bg-white text-slate-500 px-6 py-20">
      <div className="mx-auto max-w-5xl">
        {/* Hero */}
        <section className="mb-20">
          <p className="text-sm uppercase tracking-[0.3em] text-red-500 mb-4">
            About CCW Canvas
          </p>

          <h1 className="text-5xl md:text-6xl font-bold leading-tight mb-6">
            Create Cisco BOMs
            <br />
            faster, smarter, and cleaner.
          </h1>

          <p className="text-zinc-400 text-lg max-w-3xl leading-8">
            CCW Canvas simplifies the Bill of Materials creation process for
            Cisco solutions. Instead of navigating complex spreadsheets and
            repetitive manual tasks, teams can visually build, organize, and
            manage BOMs in a streamlined workspace.
          </p>
        </section>

        {/* Features */}
        <section className="grid md:grid-cols-3 gap-6 mb-20">
          <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-8">
            <h3 className="text-xl font-semibold mb-4">
              Faster BOM Creation
            </h3>

            <p className="text-zinc-400 leading-7">
              Build complete Cisco BOMs with fewer clicks using intelligent
              workflows and reusable components.
            </p>
          </div>

          <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-8">
            <h3 className="text-xl font-semibold mb-4">
              Cleaner Collaboration
            </h3>

            <p className="text-zinc-400 leading-7">
              Keep engineers, architects, and sales teams aligned in a single
              shared environment.
            </p>
          </div>

          <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-8">
            <h3 className="text-xl font-semibold mb-4">
              Designed for Cisco Teams
            </h3>

            <p className="text-zinc-400 leading-7">
              Purpose-built for Cisco workflows, licensing structures, and
              enterprise infrastructure projects.
            </p>
          </div>
        </section>

        {/* Mission */}
        <section className="rounded-3xl border border-zinc-800 bg-gradient-to-br from-zinc-900 to-black p-10">
          <h2 className="text-3xl font-bold mb-6">
            Our Mission
          </h2>

          <p className="text-zinc-400 text-lg leading-8 max-w-4xl">
            CCW Canvas exists to reduce the complexity of Cisco BOM management.
            By combining intuitive design with workflow automation, we help
            solution engineers focus less on manual operations and more on
            designing impactful solutions for customers.
          </p>
        </section>
      </div>
    </main>
  )
}