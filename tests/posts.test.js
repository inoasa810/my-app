const request = require('supertest');
const { app, db } = require('../src/app');

beforeEach(async () => {
  db.data.posts = [];
  db.data.nextId = 1;
  if (db.write) await db.write();
});

describe('Posts API', () => {
  test('POST /api/posts creates a post (201)', async () => {
    const res = await request(app)
      .post('/api/posts')
      .send({ text: 'テスト投稿', emotion: 'happy' });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.text).toBe('テスト投稿');
    expect(res.body.emotion).toBe('happy');
  });

  test('POST /api/posts validation fails without text (400)', async () => {
    const res = await request(app)
      .post('/api/posts')
      .send({ emotion: 'sad' });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  test('PATCH /api/posts/:id/like increments likes', async () => {
    // このテスト用に投稿を作る
    const create = await request(app)
      .post('/api/posts')
      .send({ text: 'いいね用', emotion: 'happy' });
    const id = create.body.id;

    const res1 = await request(app).patch(`/api/posts/${id}/like`);
    expect(res1.status).toBe(200);
    expect(res1.body).toHaveProperty('likes', 1);

    const res2 = await request(app).patch(`/api/posts/${id}/like`);
    expect(res2.status).toBe(200);
    expect(res2.body).toHaveProperty('likes', 2);
  });

  test('GET /api/stats/emotions returns correct counts', async () => {
    // 必要な件数分投稿を作る
    await request(app).post('/api/posts').send({ text: 's1', emotion: 'happy' });
    await request(app).post('/api/posts').send({ text: 's2', emotion: 'happy' });
    await request(app).post('/api/posts').send({ text: 's3', emotion: 'sad' });

    const res = await request(app).get('/api/stats/emotions');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('happy');
    expect(res.body.happy).toBeGreaterThanOrEqual(2);
    expect(res.body).toHaveProperty('sad');
  });

  test('DELETE /api/posts/:id removes post', async () => {
    const create = await request(app)
      .post('/api/posts')
      .send({ text: '削除用', emotion: 'neutral' });
    const id = create.body.id;

    const res = await request(app).delete(`/api/posts/${id}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('ok', true);

    const res2 = await request(app).patch(`/api/posts/${id}/like`);
    expect(res2.status).toBe(404);
  });
});
