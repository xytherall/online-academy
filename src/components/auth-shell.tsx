/** Centered card wrapper for the login and change-password screens. */
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 items-center justify-center px-4 pb-16 sm:px-6">
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
