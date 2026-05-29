import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight, BarChart3, LineChart, PieChart, ShieldCheck, Zap } from 'lucide-react';
import AppHeader from '@/components/AppHeader';

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <AppHeader />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-16 md:py-24 lg:py-32 bg-gradient-to-b from-blue-50 to-background dark:from-blue-950/20 dark:to-background">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="space-y-2">
                <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl">
                  The Ultimate <span className="text-blue-600">Options Trading Tracker</span>
                </h1>
                <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl lg:text-2xl mt-4">
                  Professional-grade analytics for covered calls, cash-secured puts, and complex option strategies. Track your P&L, risk, and performance in real-time.
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-4 mt-8">
                <Link href="/auth/signin">
                  <Button size="lg" className="h-12 px-8 text-lg rounded-full">
                    Start Tracking Now
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link href="/demo">
                  <Button size="lg" variant="outline" className="h-12 px-8 text-lg rounded-full">
                    View Live Demo
                  </Button>
                </Link>
              </div>
              <div className="mt-12 w-full max-w-5xl mx-auto rounded-xl border border-border shadow-2xl overflow-hidden bg-slate-950 aspect-video relative group">
                {/* Modern Dashboard Mockup with CSS */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-transparent to-purple-600/10" />
                <div className="relative h-full w-full p-6 flex flex-col gap-4">
                  {/* Header mockup */}
                  <div className="flex justify-between items-center pb-4 border-b border-white/10">
                    <div className="flex gap-2">
                      <div className="h-3 w-3 rounded-full bg-red-500/50" />
                      <div className="h-3 w-3 rounded-full bg-amber-500/50" />
                      <div className="h-3 w-3 rounded-full bg-emerald-500/50" />
                    </div>
                    <div className="h-4 w-32 bg-white/10 rounded" />
                    <div className="flex gap-2">
                      <div className="h-4 w-12 bg-white/10 rounded" />
                      <div className="h-4 w-12 bg-blue-600/50 rounded" />
                    </div>
                  </div>
                  {/* Content mockup */}
                  <div className="flex-1 grid grid-cols-12 gap-4">
                    <div className="col-span-8 bg-white/5 rounded-lg p-4 flex flex-col gap-4 border border-white/5">
                      <div className="flex justify-between items-center">
                        <div className="h-6 w-48 bg-white/20 rounded" />
                        <div className="h-6 w-24 bg-white/10 rounded" />
                      </div>
                      <div className="flex-1 bg-gradient-to-t from-blue-500/20 to-transparent rounded-lg relative overflow-hidden border border-blue-500/20">
                        <div className="absolute inset-0 flex items-center justify-center">
                          <LineChart className="h-32 w-32 text-blue-500/20" />
                        </div>
                        <div className="absolute bottom-4 left-4 h-4 w-32 bg-white/10 rounded" />
                        <div className="absolute top-4 right-4 h-8 w-24 bg-emerald-500/20 rounded-full border border-emerald-500/30 flex items-center justify-center">
                          <div className="h-2 w-2 rounded-full bg-emerald-500 mr-2" />
                          <div className="h-3 w-12 bg-emerald-500/40 rounded" />
                        </div>
                      </div>
                    </div>
                    <div className="col-span-4 flex flex-col gap-4">
                      <div className="h-1/3 bg-white/5 rounded-lg border border-white/5 p-3 flex flex-col gap-2">
                        <div className="h-4 w-24 bg-white/20 rounded" />
                        <div className="flex-1 flex items-end gap-1">
                          {[40, 70, 45, 90, 65].map((h, i) => (
                            <div key={i} className="flex-1 bg-blue-500/30 rounded-t" style={{ height: `${h}%` }} />
                          ))}
                        </div>
                      </div>
                      <div className="h-2/3 bg-white/5 rounded-lg border border-white/5 p-4 space-y-3">
                        <div className="h-4 w-32 bg-white/20 rounded mb-4" />
                        {[1, 2, 3, 4].map(i => (
                          <div key={i} className="flex justify-between items-center py-2 border-b border-white/5 last:border-0">
                            <div className="h-3 w-16 bg-white/10 rounded" />
                            <div className="h-3 w-12 bg-emerald-500/20 rounded" />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                {/* Overlay with CTA sentiment */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                  <div className="bg-white text-black px-6 py-3 rounded-full font-bold shadow-2xl scale-90 group-hover:scale-100 transition-transform">
                    Live Dashboard Preview
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-16 md:py-24 bg-background">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <Card className="border-none shadow-none bg-transparent">
                <CardContent className="pt-6 space-y-2">
                  <Zap className="h-12 w-12 text-blue-600 mb-4" />
                  <h3 className="text-xl font-bold">Real-Time P&L</h3>
                  <p className="text-muted-foreground">
                    Get instantaneous updates on your realized and unrealized profit and loss across all portfolios.
                  </p>
                </CardContent>
              </Card>
              <Card className="border-none shadow-none bg-transparent">
                <CardContent className="pt-6 space-y-2">
                  <LineChart className="h-12 w-12 text-blue-600 mb-4" />
                  <h3 className="text-xl font-bold">Strategy Analysis</h3>
                  <p className="text-muted-foreground">
                    Automatically group trades into chains to track the performance of complex rolls and adjustments.
                  </p>
                </CardContent>
              </Card>
              <Card className="border-none shadow-none bg-transparent">
                <CardContent className="pt-6 space-y-2">
                  <ShieldCheck className="h-12 w-12 text-blue-600 mb-4" />
                  <h3 className="text-xl font-bold">Risk Management</h3>
                  <p className="text-muted-foreground">
                    Monitor your collateral, exposure, and assignment risk with built-in safety indicators.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* SEO Content Section */}
        <section className="py-16 md:py-24 bg-muted/50 border-y border-border">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl mb-6">
                  Professional Options Tracking Made Simple
                </h2>
                <div className="space-y-4 text-muted-foreground">
                  <p>
                    Stop using spreadsheets to track your options trades. OptionsBookie provides a purpose-built interface for options traders who sell premium, run the wheel strategy, or manage complex multi-leg positions.
                  </p>
                  <ul className="grid grid-cols-1 gap-2">
                    <li className="flex items-center gap-2">
                      <PieChart className="h-4 w-4 text-blue-600" />
                      <span>Track Covered Calls & Cash Secured Puts</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <PieChart className="h-4 w-4 text-blue-600" />
                      <span>Monitor Annualized RoR (Return on Risk)</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <PieChart className="h-4 w-4 text-blue-600" />
                      <span>Automatic Chain Tracking for Rolled Trades</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <PieChart className="h-4 w-4 text-blue-600" />
                      <span>Real-time ITM/OTM Status Indicators</span>
                    </li>
                  </ul>
                </div>
              </div>
              <div className="bg-blue-600 rounded-2xl p-8 text-white shadow-xl">
                <h3 className="text-2xl font-bold mb-4">Why track with us?</h3>
                <p className="mb-6 opacity-90">
                  "Most brokerage platforms are terrible at showing the total history of a rolled position. OptionsBookie solves this by linking transactions together into a single performance chain."
                </p>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-white/20" />
                  <div>
                    <p className="font-bold">Manohar Mankala</p>
                    <p className="text-xs opacity-75">Founder & Active Trader</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="py-8 border-t border-border bg-background">
        <div className="container px-4 md:px-6 mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            © 2024 OptionsBookie. Professional Options Trading Journal.
          </p>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <Link href="/about" className="hover:text-blue-600">About</Link>
            <Link href="/contact" className="hover:text-blue-600">Contact</Link>
            <Link href="/privacy" className="hover:text-blue-600">Privacy Policy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
