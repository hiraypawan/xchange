'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import { 
  Download, 
  User, 
  LogOut, 
  Menu, 
  X,
  Chrome,
  ExternalLink
} from 'lucide-react';

export default function Header() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [extensionVersion, setExtensionVersion] = useState('1.4.18');

  // Don't show header on landing page or auth pages
  if (pathname === '/' || pathname?.startsWith('/auth/')) {
    return null;
  }

  useEffect(() => {
    // Fetch latest extension version
    const fetchExtensionVersion = async () => {
      try {
        const response = await fetch('/api/extension?action=info');
        const data = await response.json();
        if (data.success) {
          setExtensionVersion(data.version);
        }
      } catch (error) {
        console.error('Failed to fetch extension version:', error);
      }
    };

    fetchExtensionVersion();
  }, []);

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/' });
  };

  const navigation = [
    { name: 'Dashboard', href: '/dashboard' },
    { name: 'Browse Posts', href: '/dashboard/browse' },
    { name: 'Analytics', href: '/dashboard/analytics' },
    { name: 'Profile', href: '/dashboard/profile' }
  ];

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link href="/dashboard" className="flex items-center">
              <span className="text-2xl font-bold text-blue-600">Xchangee</span>
            </Link>
          </div>

          {/* Navigation - Desktop */}
          <nav className="hidden md:flex space-x-8">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`px-3 py-2 text-sm font-medium transition-colors ${
                  pathname === item.href
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-700 hover:text-blue-600'
                }`}
              >
                {item.name}
              </Link>
            ))}
          </nav>

          {/* Right side - Extension + User Menu */}
          <div className="flex items-center gap-4">
            {/* Install Extension Button */}
            <Link
              href="/extension"
              className="hidden sm:inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <Chrome className="w-4 h-4" />
              Install Extension
              <span className="text-xs bg-blue-500 px-2 py-0.5 rounded">
                v{extensionVersion}
              </span>
            </Link>

            {/* Mobile Extension Button */}
            <Link
              href="/extension"
              className="sm:hidden inline-flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <Download className="w-4 h-4" />
            </Link>

            {/* User Menu */}
            {status === 'loading' ? (
              <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
            ) : session ? (
              <div className="relative">
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  {session.user?.image ? (
                    <img
                      src={session.user.image}
                      alt="Profile"
                      className="w-8 h-8 rounded-full"
                    />
                  ) : (
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-blue-600" />
                    </div>
                  )}
                  <span className="hidden md:block text-sm font-medium text-gray-700">
                    {session.user?.name || session.user?.username}
                  </span>
                </button>

                {/* Dropdown Menu */}
                {isMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                    <Link
                      href="/dashboard/profile"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        Profile
                      </div>
                    </Link>
                    <button
                      onClick={handleSignOut}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <LogOut className="w-4 h-4" />
                        Sign Out
                      </div>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/auth/signin"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Sign In
              </Link>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              {isMenuOpen ? (
                <X className="w-5 h-5 text-gray-600" />
              ) : (
                <Menu className="w-5 h-5 text-gray-600" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-200">
            <nav className="space-y-2">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`block px-3 py-2 text-base font-medium transition-colors ${
                    pathname === item.href
                      ? 'text-blue-600 bg-blue-50'
                      : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'
                  }`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item.name}
                </Link>
              ))}
              <Link
                href="/extension"
                className="flex items-center gap-2 px-3 py-2 text-base font-medium text-blue-600 hover:bg-blue-50 transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                <Chrome className="w-5 h-5" />
                Install Extension v{extensionVersion}
              </Link>
            </nav>
          </div>
        )}
      </div>

      {/* Click outside to close dropdown */}
      {isMenuOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsMenuOpen(false)}
        />
      )}
    </header>
  );
}