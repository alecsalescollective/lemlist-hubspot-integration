import Header from './Header';
import { SkipLink, LoadingBar } from '../ui';

export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      {/* Accessibility: Skip to main content link */}
      <SkipLink />

      {/* Global loading indicator */}
      <LoadingBar />

      {/* Header with navigation and filters */}
      <Header />

      {/* Main content area - responsive padding */}
      <main
        id="main-content"
        className="p-4 sm:p-6 lg:p-8 focus:outline-none"
        tabIndex={-1}
      >
        {children}
      </main>
    </div>
  );
}
