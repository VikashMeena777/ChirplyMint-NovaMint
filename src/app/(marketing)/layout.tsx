import { Navbar } from "@/components/marketing/navbar";
import { Footer } from "@/components/marketing/footer";
import SmoothScroll from "@/components/motion/smooth-scroll";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SmoothScroll>
      <div className="relative min-h-screen flex flex-col bg-background overflow-hidden">
        <Navbar />
        <main className="flex-1 pt-28 md:pt-32">{children}</main>
        <Footer />
      </div>
    </SmoothScroll>
  );
}
