import Header from './Header';

export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="p-6">
        {children}
      </main>
    </div>
  );
}
