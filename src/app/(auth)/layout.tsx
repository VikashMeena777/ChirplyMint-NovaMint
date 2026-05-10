import Link from "next/link";
import Image from "next/image";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 py-12">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2.5 mb-10">
        <Image src="/logo.png" alt="ChirplyMint" width={40} height={40} className="w-10 h-10 rounded-xl" />
        <span className="text-2xl font-bold tracking-tight text-foreground">
          Chirply<span className="text-[oklch(0.52_0.19_162)]">Mint</span>
        </span>
      </Link>

      {/* Auth card */}
      <div className="w-full max-w-md">{children}</div>

      {/* Footer */}
      <p className="mt-10 text-xs text-muted-foreground">
        © {new Date().getFullYear()} ChirplyMint by NovaMint Networks
      </p>
    </div>
  );
}
