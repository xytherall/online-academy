export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-border px-6 py-4">
        <nav className="flex items-center justify-between">
          <span className="font-semibold">Academy</span>
          <a href="/login" className="text-sm text-muted-foreground hover:text-foreground">
            Login
          </a>
        </nav>
      </header>
      <main className="flex flex-1 items-center justify-center px-6 py-16">
        <p className="text-center text-muted-foreground">Site coming soon.</p>
      </main>
    </div>
  );
}
