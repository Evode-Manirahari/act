/** Auth header plumbing (pilot auth Phase 4). */

const REAL_ENV = process.env;

async function loadAuthToken(opts: {
  url?: string;
  key?: string;
  supabaseMock?: unknown;
}) {
  let mod!: typeof import('../authToken');
  await jest.isolateModulesAsync(async () => {
    process.env = {
      ...REAL_ENV,
      EXPO_PUBLIC_SUPABASE_URL: opts.url ?? '',
      EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: opts.key ?? '',
    };
    if (opts.supabaseMock !== undefined) {
      jest.doMock('../supabase', () => opts.supabaseMock);
    }
    mod = await import('../authToken');
  });
  return mod;
}

afterEach(() => {
  process.env = REAL_ENV;
  jest.resetModules();
});

describe('authToken', () => {
  it('is anonymous while Supabase is not configured, without loading the client', async () => {
    // No supabase mock on purpose: the unconfigured path must never import
    // ./supabase (which drags in native modules plain-node jest cannot load).
    const mod = await loadAuthToken({});
    expect(await mod.hasAuthSession()).toBe(false);
    expect(await mod.getAuthHeaders()).toEqual({});
  });

  it('attaches the session access token as a Bearer header', async () => {
    const getSession = jest
      .fn()
      .mockResolvedValue({ data: { session: { access_token: 'tok-123' } } });
    const mod = await loadAuthToken({
      url: 'https://unit.supabase.co',
      key: 'sb_publishable_x',
      supabaseMock: { supabase: { auth: { getSession } } },
    });
    expect(await mod.hasAuthSession()).toBe(true);
    expect(await mod.getAuthHeaders()).toEqual({ Authorization: 'Bearer tok-123' });
  });

  it('is anonymous when configured but logged out', async () => {
    const getSession = jest.fn().mockResolvedValue({ data: { session: null } });
    const mod = await loadAuthToken({
      url: 'https://unit.supabase.co',
      key: 'sb_publishable_x',
      supabaseMock: { supabase: { auth: { getSession } } },
    });
    expect(await mod.hasAuthSession()).toBe(false);
    expect(await mod.getAuthHeaders()).toEqual({});
  });

  it('fails open to anonymous when the session read throws', async () => {
    const getSession = jest.fn().mockRejectedValue(new Error('storage corrupt'));
    const mod = await loadAuthToken({
      url: 'https://unit.supabase.co',
      key: 'sb_publishable_x',
      supabaseMock: { supabase: { auth: { getSession } } },
    });
    expect(await mod.hasAuthSession()).toBe(false);
    expect(await mod.getAuthHeaders()).toEqual({});
  });
});
