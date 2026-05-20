interface SearchParams {
  next?: string;
  error?: string;
}


export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { next, error } = await searchParams;
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '80vh',
      }}
    >
      <form
        method="POST"
        action="/api/sign-in"
        style={{
          width: 360,
          padding: 24,
          borderRadius: 16,
          border: '1px solid var(--border)',
          background: 'var(--surface)',
        }}
        className="col gap-16"
      >
        <div className="col gap-8">
          <div className="h2">ACT Capture — admin</div>
          <div className="muted" style={{ fontSize: 13 }}>
            Shared-password access. Enter the pilot password to continue.
          </div>
        </div>

        {error && (
          <div
            className="notice"
            style={{ borderColor: 'var(--error)', color: 'var(--error)' }}
          >
            {decodeURIComponent(error)}
          </div>
        )}

        <input type="hidden" name="next" value={next ?? '/'} />
        <input
          type="password"
          name="password"
          placeholder="password"
          autoComplete="current-password"
          required
          autoFocus
        />
        <button type="submit" className="primary" style={{ width: '100%' }}>
          Sign in
        </button>
      </form>
    </div>
  );
}
