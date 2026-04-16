import Link from 'next/link';
import { ArrowLeft, TrendingUp, BarChart3, Target, Users } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/auth/signin"
            className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Sign In
          </Link>

          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-r from-emerald-400 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <TrendingUp className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-white mb-4">About OptionsBookie</h1>
            <p className="text-xl text-slate-300">
              Precision options tracking for serious traders
            </p>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700 p-8 space-y-8">

          {/* What is OptionsBookie */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4 flex items-center gap-2">
              <Target className="w-6 h-6 text-blue-400" />
              What is OptionsBookie?
            </h2>
            <p className="text-slate-300 leading-relaxed mb-4">
              OptionsBookie is a focused options profit tracking tool designed for traders who want clear, accurate insights into their options performance.
              It's not a trading platform—it's a dedicated space to track options profits, understand premium-based returns, and organize your trading data.
            </p>
            <p className="text-slate-300 leading-relaxed">
              The app provides detailed analytics, accurate P&L calculations from premiums, and monthly categorization that helps you understand
              your options trading performance across different tickers and time periods.
            </p>
          </section>

          {/* Why I Built This */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4 flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-emerald-400" />
              Why I Built This
            </h2>
            <p className="text-slate-300 leading-relaxed mb-4">
              As an active options trader, I was frustrated with trying to track my options profits using generic Excel spreadsheets found online.
              These templates were either too complex or didn't properly calculate profit from premiums and long calls. While there are better
              online tools available, they all require paid subscriptions—and I didn't want to pay monthly fees for something so simplistic.
            </p>
            <p className="text-slate-300 leading-relaxed mb-4">
              I needed a simple tool that could:
            </p>
            <ul className="list-disc list-inside text-slate-300 space-y-2 ml-4 mb-4">
              <li>Track options profits accurately based on premiums received and paid</li>
              <li>Calculate Return on Risk (RoR) using actual collateral deployed</li>
              <li>Organize trades by month for easy performance analysis</li>
              <li>Show position performance per stock ticker</li>
              <li>Handle trade rolls and provide clear profit/loss tracking</li>
              <li>Replace messy Excel spreadsheets with a clean, focused interface</li>
            </ul>
            <p className="text-slate-300 leading-relaxed">
              When I couldn't find a simple, focused tool that met these needs, I decided to build one. OptionsBookie eliminates the need
              for complicated spreadsheets and provides a clean, dedicated space just for options profit tracking.
            </p>
          </section>

          {/* Key Features */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4 flex items-center gap-2">
              <Users className="w-6 h-6 text-purple-400" />
              Key Features
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h3 className="text-lg font-medium text-white">Options Profit Tracking</h3>
                <ul className="text-slate-300 space-y-1 text-sm">
                  <li>• Premium-based P&L calculations</li>
                  <li>• Long calls and short options tracking</li>
                  <li>• Trade roll handling</li>
                  <li>• Accurate profit/loss from premiums</li>
                </ul>
              </div>
              <div className="space-y-3">
                <h3 className="text-lg font-medium text-white">Performance Analytics</h3>
                <ul className="text-slate-300 space-y-1 text-sm">
                  <li>• Return on Risk (RoR) calculations</li>
                  <li>• Monthly performance breakdowns</li>
                  <li>• Win rate and success metrics</li>
                  <li>• Performance by ticker analysis</li>
                </ul>
              </div>
              <div className="space-y-3">
                <h3 className="text-lg font-medium text-white">Organization & Insights</h3>
                <ul className="text-slate-300 space-y-1 text-sm">
                  <li>• Monthly trade categorization</li>
                  <li>• Position tracking per stock ticker</li>
                  <li>• Days to expiry monitoring</li>
                  <li>• Fee tracking and impact</li>
                </ul>
              </div>
              <div className="space-y-3">
                <h3 className="text-lg font-medium text-white">Simple & Clean</h3>
                <ul className="text-slate-300 space-y-1 text-sm">
                  <li>• Replaces complex Excel spreadsheets</li>
                  <li>• Mobile-responsive design</li>
                  <li>• Fast data entry workflows</li>
                  <li>• Focused on options profits only</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Who It's For */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">Who It's For</h2>
            <p className="text-slate-300 leading-relaxed mb-4">
              OptionsBookie is designed for options traders who:
            </p>
            <ul className="list-disc list-inside text-slate-300 space-y-2 ml-4">
              <li>Want to track options profits without complex spreadsheets</li>
              <li>Need accurate premium-based P&L calculations</li>
              <li>Want to organize trades by month and ticker for easy analysis</li>
              <li>Don't want to pay monthly subscriptions for simple tracking tools</li>
              <li>Value clean, focused tools over bloated trading platforms</li>
              <li>Are tired of maintaining messy Excel files for options tracking</li>
              <li>Want to understand their Return on Risk from options trading</li>
            </ul>
          </section>

          {/* Contact CTA */}
          <section className="bg-slate-700/50 rounded-lg p-6 border border-slate-600">
            <h2 className="text-xl font-semibold text-white mb-3">Have Feedback or Suggestions?</h2>
            <p className="text-slate-300 mb-4">
              OptionsBookie is continuously evolving based on trader feedback. If you have ideas for improvements,
              feature requests, or just want to share your experience, I'd love to hear from you.
            </p>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors font-medium"
            >
              Get in Touch
            </Link>
          </section>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-slate-400 text-sm">
          <p>Built with precision for the options trading community</p>
        </div>
      </div>
    </div>
  );
}
