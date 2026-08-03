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

/**
 * The debrief loop uses requireAuthHeaders, which fails CLOSED. An answer sent
 * anonymously is an answer with no author, and that is the provenance hole that
 * let fabricated cards through — so a missing session must stop the request
 * rather than let it proceed unattributed.
 */
describe('requireAuthHeaders', () => {
  it('attaches the Bearer header when a live session exists', async () => {
    const getSession = jest
      .fn()
      .mockResolvedValue({ data: { session: { access_token: 'TEST_DATA-tok' } } });
    const mod = await loadAuthToken({
      url: 'https://unit.supabase.co',
      key: 'sb_publishable_x',
      supabaseMock: { supabase: { auth: { getSession } } },
    });
    expect(await mod.requireAuthHeaders()).toEqual({
      Authorization: 'Bearer TEST_DATA-tok',
    });
  });

  it('throws instead of continuing anonymously when the session is gone', async () => {
    const getSession = jest.fn().mockResolvedValue({ data: { session: null } });
    const mod = await loadAuthToken({
      url: 'https://unit.supabase.co',
      key: 'sb_publishable_x',
      supabaseMock: { supabase: { auth: { getSession } } },
    });

    await expect(mod.requireAuthHeaders()).rejects.toBeInstanceOf(mod.AuthRequiredError);
  });

  it('throws when the session read fails, rather than falling back to anonymous', async () => {
    const getSession = jest.fn().mockRejectedValue(new Error('storage corrupt'));
    const mod = await loadAuthToken({
      url: 'https://unit.supabase.co',
      key: 'sb_publishable_x',
      supabaseMock: { supabase: { auth: { getSession } } },
    });

    // getAuthHeaders still fails open for reads; the strict path does not.
    expect(await mod.getAuthHeaders()).toEqual({});
    await expect(mod.requireAuthHeaders()).rejects.toBeInstanceOf(mod.AuthRequiredError);
  });

  it('leaves the unconfigured demo flow untouched', async () => {
    // No Supabase project = no session to require. The seeded demo flow is the
    // designed behaviour there and must not start throwing.
    const mod = await loadAuthToken({});
    expect(mod.isAuthGateActive()).toBe(false);
    expect(await mod.requireAuthHeaders()).toEqual({});
  });
});
