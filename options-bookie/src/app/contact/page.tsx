import Link from 'next/link';
import { ArrowLeft, Mail, MessageSquare, Clock, CheckCircle, Linkedin } from 'lucide-react';

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
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
              <Mail className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-white mb-4">Get in Touch</h1>
            <p className="text-xl text-slate-300">
              Have feedback, suggestions, or questions? I'd love to hear from you.
            </p>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700 p-8 space-y-8">

          {/* Contact Methods */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-6 flex items-center gap-2">
              <MessageSquare className="w-6 h-6 text-blue-400" />
              How to Reach Me
            </h2>

            <div className="grid gap-6">
              {/* Email Contact */}
              <div className="bg-slate-700/50 rounded-lg p-6 border border-slate-600">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Mail className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white mb-2">Email</h3>
                    <p className="text-slate-300 mb-3">
                      For feature requests, bug reports, or general feedback about OptionsBookie.
                    </p>
                    <a
                      href="mailto:feedback@mankala.space?subject=OptionsBookie Feedback"
                      className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors font-medium"
                    >
                      <Mail className="w-4 h-4" />
                      Send Email
                    </a>
                  </div>
                </div>
              </div>

              {/* LinkedIn Contact */}
              <div className="bg-slate-700/50 rounded-lg p-6 border border-slate-600">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-blue-700 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Linkedin className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white mb-2">LinkedIn</h3>
                    <p className="text-slate-300 mb-3">
                      Connect with me professionally or learn more about my background and other projects.
                    </p>
                    <a
                      href="https://www.linkedin.com/in/manohar-mankala"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-lg transition-colors font-medium"
                    >
                      <Linkedin className="w-4 h-4" />
                      Connect on LinkedIn
                    </a>
                  </div>
                </div>
              </div>

              {/* Response Time */}
              <div className="bg-slate-700/50 rounded-lg p-6 border border-slate-600">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-emerald-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Clock className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white mb-2">Response Time</h3>
                    <p className="text-slate-300">
                      I typically respond to emails within 24-48 hours. For urgent issues or bugs that affect trading,
                      I'll prioritize and respond as quickly as possible.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* What to Include */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-6 flex items-center gap-2">
              <CheckCircle className="w-6 h-6 text-emerald-400" />
              What to Include in Your Message
            </h2>

            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-white mb-3">For Bug Reports:</h3>
                <ul className="list-disc list-inside text-slate-300 space-y-1 ml-4">
                  <li>Steps to reproduce the issue</li>
                  <li>What you expected to happen vs. what actually happened</li>
                  <li>Browser and device information</li>
                  <li>Screenshots if helpful</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-medium text-white mb-3">For Feature Requests:</h3>
                <ul className="list-disc list-inside text-slate-300 space-y-1 ml-4">
                  <li>Description of the feature you'd like to see</li>
                  <li>How it would improve your trading workflow</li>
                  <li>Any specific requirements or preferences</li>
                  <li>Priority level (nice-to-have vs. critical for your use case)</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-medium text-white mb-3">For General Feedback:</h3>
                <ul className="list-disc list-inside text-slate-300 space-y-1 ml-4">
                  <li>What you like about OptionsBookie</li>
                  <li>What could be improved</li>
                  <li>Your trading style and how you use the app</li>
                  <li>Any suggestions for better user experience</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Community */}
          <section className="bg-slate-700/50 rounded-lg p-6 border border-slate-600">
            <h2 className="text-xl font-semibold text-white mb-3">Building Together</h2>
            <p className="text-slate-300 mb-4">
              OptionsBookie is built by a trader, for traders. Your feedback directly shapes the development roadmap.
              Every feature request is considered, and many of the current capabilities came from user suggestions.
            </p>
            <p className="text-slate-300">
              Whether you're a new user with questions or an experienced trader with advanced feature ideas,
              your input helps make OptionsBookie better for the entire community.
            </p>
          </section>

          {/* Quick Links */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">Quick Links</h2>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/about"
                className="inline-flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                About OptionsBookie
              </Link>
              <Link
                href="/auth/signin"
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Sign In to App
              </Link>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-slate-400 text-sm">
          <p>Thank you for helping make OptionsBookie better!</p>
        </div>
      </div>
    </div>
  );
}
