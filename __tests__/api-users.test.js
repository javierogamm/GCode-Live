jest.mock('../api/_supabase', () => ({
  supabaseFetch: jest.fn(),
}));

const { supabaseFetch } = require('../api/_supabase');
const handler = require('../api/users');

function createRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

describe('api/users PATCH', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('actualiza ultimo acceso cuando touchAccess=true', async () => {
    supabaseFetch.mockResolvedValue({
      ok: true,
      json: async () => [{ id: 9, name: 'ana', admin: false, ultimo_acceso_code: '2026-02-13T10:00:00.000Z' }],
    });

    const req = {
      method: 'PATCH',
      body: { id: 9, touchAccess: true },
    };
    const res = createRes();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(expect.objectContaining({ id: 9, ultimo_acceso_code: expect.any(String) }));
    expect(supabaseFetch).toHaveBeenCalledWith(
      'users',
      expect.objectContaining({
        method: 'PATCH',
        body: expect.objectContaining({ ultimo_acceso_code: expect.any(String) }),
      })
    );

    const [, options] = supabaseFetch.mock.calls[0];
    expect(options.query).toContain('select=id,name,admin,ultimo_acceso_code');
  });
});
