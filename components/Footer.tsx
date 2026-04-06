import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-400 text-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="font-bold text-lg text-white mb-1">
            Vakweb<span className="text-orange-500">Twente</span>
          </div>
          <p className="text-slate-500 text-xs">Aanvraagmachines voor Twentse vakbedrijven</p>
          <p className="text-slate-500 text-xs mt-1">Enschede · Hengelo · Almelo · Oldenzaal · Borne en omgeving</p>
        </div>

        <nav className="flex flex-col sm:flex-row gap-4 text-slate-400">
          <Link href="/demo" className="hover:text-white transition-colors">Demo bekijken</Link>
          <Link href="/prijzen" className="hover:text-white transition-colors">Prijzen</Link>
          <Link href="/contact" className="hover:text-white transition-colors">Contact</Link>
          <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
        </nav>

        <div className="text-slate-500 text-xs">
          <p>© {new Date().getFullYear()} VakwebTwente</p>
          <p className="mt-1">KVK: 12345678</p>
        </div>
      </div>
    </footer>
  );
}
