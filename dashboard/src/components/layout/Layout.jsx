import Header from './Header';
import { SkipLink, LoadingBar } from '../ui';
import { layout } from '../../styles/designTokens';

export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      {/* Accessibility: Skip to main content link */}
      <SkipLink />

      {/* Global loading indicator */}
      <LoadingBar />

      {/* Header with navigation and filters */}
      <Header />

      {/* Main content area */}
      <main
        id="main-content"
        className={`${layout.mainPadding} focus:outline-none`}
        tabIndex={-1}
      >
        {children}
      </main>
    </div>
  );
}
