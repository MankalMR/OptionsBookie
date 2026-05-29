import { Metadata } from 'next';

export const metadata: Metadata = {
  title: {
    default: 'Authentication - OptionsBookie',
    template: '%s | OptionsBookie'
  },
  description: 'Sign in to your OptionsBookie account to access your options trading portfolio, analytics, and performance tracking.',
  robots: {
    index: false,
    follow: true,
  },
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

