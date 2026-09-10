import { Navbar } from "@/components/marketing/navbar";
import { SmoothScroll } from "@/components/motion/smooth-scroll";
import { Footer } from "@/components/marketing/footer";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SmoothScroll>
      <div className="force-light relative min-h-screen flex flex-col bg-background">
        <Navbar />
        <main className="flex-1 pt-20">{children}</main>
        <Footer />
      </div>
    </SmoothScroll>
  );
}
