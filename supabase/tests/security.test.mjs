// Behaviour and security tests for the SEAM schema. Run: npm run test:db
import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import { as, createDatabase, createUser } from './harness.mjs';

const U = async (db, sql, p) => (await db.query(sql, p)).rows;
let db, A, B;
const lookId = async (slug) => (await U(db, `select l.id from public.looks l where l.image_path like '%/' || $1 || '.jpg'`, [slug]))[0].id;
const productId = async (ext) => (await U(db, `select id from public.products where external_id = $1`, [ext]))[0].id;
const rejects = (p, pattern) => assert.rejects(p, pattern);

before(async () => {
  db = await createDatabase();
  A = await createUser(db, 'a@test.dev', { display_name: 'Aya' });
  B = await createUser(db, 'b@test.dev');
});
after(() => db?.close());

describe('seed and reads', () => {
  test('catalogue and content load', async () => {
    assert.equal((await U(db, 'select count(*)::int n from public.products'))[0].n, 56);
    assert.equal((await U(db, "select count(*)::int n from public.looks where status = 'published'"))[0].n, 13);
    assert.equal((await U(db, 'select count(*)::int n from public.look_pieces'))[0].n, 45);
  });
  test('anonymous visitors get the feed, newest first, with bands and piece counts', async () => {
    const feed = await as(db, null, 'select * from public.get_feed(50)');
    assert.equal(feed.length, 13);
    assert.equal(feed[0].id, await lookId('amira-soft-tailoring'));
    assert.equal(Number(feed[0].piece_count), 5);
    assert.equal(feed[0].price_band, 3); // median of $135 $260 $310 $420 = $285 -> $$$
  });
  test('feed paginates by keyset and filters by style', async () => {
    const page1 = await as(db, null, 'select * from public.get_feed(4)');
    const page2 = await as(db, null, 'select * from public.get_feed(4, $1)', [page1[3].published_at]);
    assert.equal(page2.length, 4);
    assert.ok(!page2.some((r) => page1.find((p) => p.id === r.id)));
    const tailored = await as(db, null, `select * from public.get_feed(50, null, 'Tailored')`);
    assert.equal(tailored.length, 4);
  });
  test('new accounts get a profile automatically', async () => {
    const [p] = await U(db, 'select handle, display_name from public.profiles where id = $1', [A]);
    assert.match(p.handle, /^user[0-9a-f]{10}$/);
    assert.equal(p.display_name, 'Aya');
  });
});

describe('alternatives', () => {
  test('price bands split around the reference price (±15%)', async () => {
    const ref = await productId('orro-penny-loafers');
    const count = async (band) => (await as(db, null, 'select * from public.similar_products($1, $2)', [ref, band])).length;
    assert.equal(await count('lower'), 6);
    assert.equal(await count('similar'), 4);
    assert.equal(await count('higher'), 2);
  });
  test('with embeddings, nearest image wins over nearest price', async () => {
    const ref = await productId('orro-penny-loafers');
    const near = await productId('arlo-suede-loafer'); // $330
    const far = await productId('halden-penny-loafer'); // $295, closer in price
    const vec = (hot) => '[' + Array.from({ length: 768 }, (_, i) => (i === hot ? 1 : 0.001)).join(',') + ']';
    await U(db, 'update public.products set embedding = $2::extensions.vector where id = $1', [ref, vec(0)]);
    await U(db, 'update public.products set embedding = $2::extensions.vector where id = $1', [near, vec(0)]);
    await U(db, 'update public.products set embedding = $2::extensions.vector where id = $1', [far, vec(5)]);
    const rows = await as(db, null, `select id from public.similar_products($1, 'similar')`, [ref]);
    assert.equal(rows[0].id, near);
  });
});

describe('saving and Lookbooks', () => {
  let saveId, lbId;
  test('a person saves a Look and files it; the Lookbook moves to the top', async () => {
    const hero = await lookId('amira-soft-tailoring');
    [{ id: saveId }] = await as(db, A, 'insert into public.saves (user_id, look_id) values ($1, $2) returning id', [A, hero]);
    [{ id: lbId }] = await as(db, A, `insert into public.lookbooks (owner_id, name, updated_at) values ($1, 'Workwear', now() - interval '1 day') returning id`, [A]);
    await as(db, A, 'insert into public.lookbook_items (lookbook_id, save_id) values ($1, $2)', [lbId, saveId]);
    const [lb] = await U(db, 'select updated_at > now() - interval \'1 minute\' as fresh from public.lookbooks where id = $1', [lbId]);
    assert.equal(lb.fresh, true);
  });
  test('saving the same thing twice is rejected', async () => {
    const hero = await lookId('amira-soft-tailoring');
    await rejects(as(db, A, 'insert into public.saves (user_id, look_id) values ($1, $2)', [A, hero]), /duplicate key/);
  });
  test('a save must be exactly one of Look or Product', async () => {
    await rejects(as(db, A, 'insert into public.saves (user_id) values ($1)', [A]), /check constraint/);
  });
  test('saves and private Lookbooks are invisible to others and to anonymous visitors', async () => {
    assert.equal((await as(db, B, 'select * from public.saves')).length, 0);
    assert.equal((await as(db, null, 'select * from public.saves')).length, 0);
    assert.equal((await as(db, B, 'select * from public.lookbooks where id = $1', [lbId])).length, 0);
    assert.equal((await as(db, B, 'select * from public.lookbook_contents($1)', [lbId])).length, 0);
  });
  test('public Lookbooks show their contents but never the underlying saves', async () => {
    await as(db, A, 'update public.lookbooks set is_private = false where id = $1', [lbId]);
    assert.equal((await as(db, B, 'select * from public.lookbooks where id = $1', [lbId])).length, 1);
    assert.equal((await as(db, B, 'select * from public.lookbook_contents($1)', [lbId])).length, 1);
    assert.equal((await as(db, B, 'select * from public.lookbook_items')).length, 0);
  });
  test("nobody can file someone else's save, or file into someone else's Lookbook", async () => {
    const [{ id: bLb }] = await as(db, B, `insert into public.lookbooks (owner_id, name) values ($1, 'Mine') returning id`, [B]);
    await rejects(as(db, B, 'insert into public.lookbook_items (lookbook_id, save_id) values ($1, $2)', [bLb, saveId]), /row-level security/);
    const [{ id: bSave }] = await as(db, B, 'insert into public.saves (user_id, product_id) values ($1, $2) returning id', [B, await productId('noor-poplin-shirt')]);
    await rejects(as(db, B, 'insert into public.lookbook_items (lookbook_id, save_id) values ($1, $2)', [lbId, bSave]), /row-level security/);
  });
  test('nobody can save on behalf of someone else', async () => {
    await rejects(as(db, B, 'insert into public.saves (user_id, product_id) values ($1, $2)', [A, await productId('orro-penny-loafers')]), /row-level security/);
  });
  test('removing a save removes it from every Lookbook (the one-Save rule)', async () => {
    await as(db, A, 'delete from public.saves where id = $1', [saveId]);
    assert.equal((await U(db, 'select count(*)::int n from public.lookbook_items where save_id = $1', [saveId]))[0].n, 0);
  });
});

describe('profiles, follows, blocks', () => {
  test('people edit their own profile but cannot make themselves creators', async () => {
    await as(db, A, `update public.profiles set display_name = 'Aya S.' where id = $1`, [A]);
    await rejects(as(db, A, 'update public.profiles set is_creator = true where id = $1', [A]), /permission denied/);
    const changed = await as(db, B, `update public.profiles set display_name = 'hacked' where id = $1 returning id`, [A]);
    assert.equal(changed.length, 0);
  });
  test('handles are lowercase and unique', async () => {
    await as(db, A, `update public.profiles set handle = 'aya.s' where id = $1`, [A]);
    await rejects(as(db, B, `update public.profiles set handle = 'aya.s' where id = $1`, [B]), /duplicate key/);
    await rejects(as(db, B, `update public.profiles set handle = 'AYA.S' where id = $1`, [B]), /check constraint/);
  });
  test('following yourself is rejected; the Following feed shows followed creators only', async () => {
    await rejects(as(db, A, 'insert into public.follows (follower_id, creator_id) values ($1, $1)', [A]), /check constraint/);
    const lina = (await U(db, `select id from public.profiles where handle = 'linamansour'`))[0].id;
    await as(db, B, 'insert into public.follows (follower_id, creator_id) values ($1, $2)', [B, lina]);
    assert.equal((await as(db, B, 'select * from public.get_feed(50, null, null, true)')).length, 2);
  });
  test("blocking a creator removes their Looks from that person's feed only", async () => {
    const amira = (await U(db, `select id from public.profiles where handle = 'amira.saleh'`))[0].id;
    await as(db, B, 'insert into public.blocks (blocker_id, blocked_id) values ($1, $2)', [B, amira]);
    // 13 published Looks, four of them Amira's.
    assert.equal((await as(db, B, 'select * from public.get_feed(50)')).length, 9);
    assert.equal((await as(db, A, 'select * from public.get_feed(50)')).length, 13);
    assert.equal((await as(db, null, 'select * from public.get_feed(50)')).length, 13);
  });
  test('reports are private to the reporter', async () => {
    await as(db, A, `insert into public.reports (reporter_id, look_id, reason) values ($1, $2, 'spam')`, [A, await lookId('omar-underpass')]);
    assert.equal((await as(db, A, 'select * from public.reports')).length, 1);
    assert.equal((await as(db, B, 'select * from public.reports')).length, 0);
  });
});

describe('content and catalogue integrity', () => {
  test('drafts are visible only to their creator', async () => {
    const [{ id }] = await as(db, A, `insert into public.looks (creator_id, image_path, width, height) values ($1::uuid, $1::text || '/d.jpg', 1080, 1350) returning id`, [A]);
    assert.equal((await as(db, A, 'select id from public.looks where id = $1', [id])).length, 1);
    assert.equal((await as(db, B, 'select id from public.looks where id = $1', [id])).length, 0);
    await rejects(as(db, B, `insert into public.look_pieces (look_id, position, slot, label, x, y) values ($1, 1, 'top', 'TOP', 0.5, 0.5)`, [id]), /row-level security/);
  });
  test('publishing requires a publish date; hotspots must sit inside the image', async () => {
    await rejects(as(db, A, `insert into public.looks (creator_id, image_path, width, height, status) values ($1, 'x', 1, 1, 'published')`, [A]), /check constraint/);
    const [{ id }] = await as(db, A, `insert into public.looks (creator_id, image_path, width, height) values ($1, 'y', 1, 1) returning id`, [A]);
    await rejects(as(db, A, `insert into public.look_pieces (look_id, position, slot, label, x, y) values ($1, 1, 'top', 'TOP', 1.2, 0.5)`, [id]), /check constraint/);
  });
  test('the app cannot write to the catalogue; the pipeline (service role) can', async () => {
    const id = await productId('orro-penny-loafers');
    const changed = await as(db, A, 'update public.products set price_minor = 1 where id = $1 returning id', [id]);
    assert.equal(changed.length, 0);
    await as(db, 'service', `update public.products set stock = 'low' where id = $1`, [id]);
    assert.equal((await U(db, 'select stock from public.products where id = $1', [id]))[0].stock, 'low');
  });
  test('outbound clicks: anyone can log their own, nobody can read them from the app', async () => {
    const pid = await productId('orro-penny-loafers');
    await as(db, null, `insert into public.outbound_clicks (product_id, surface) values ($1, 'piece_sheet')`, [pid]);
    await as(db, A, `insert into public.outbound_clicks (user_id, product_id, surface) values ($1, $2, 'product_detail')`, [A, pid]);
    await rejects(as(db, null, `insert into public.outbound_clicks (user_id, product_id, surface) values ($1, $2, 'piece_sheet')`, [A, pid]), /row-level security/);
    assert.equal((await as(db, A, 'select * from public.outbound_clicks')).length, 0);
  });
});

describe('storage', () => {
  test('uploads go only into your own folder', async () => {
    await as(db, A, `insert into storage.objects (bucket_id, name) values ('looks', $1 || '/new.jpg')`, [A]);
    await rejects(as(db, A, `insert into storage.objects (bucket_id, name) values ('looks', $1 || '/new.jpg')`, [B]), /row-level security/);
    await rejects(as(db, null, `insert into storage.objects (bucket_id, name) values ('looks', 'anon/x.jpg')`), /row-level security/);
  });
});

describe('who a Look is for', () => {
  // Their own people, so earlier tests' follows and blocks cannot bleed in.
  let C, F, S, everyone, followers, onlyMe;
  const post = (audience) =>
    as(db, C, `insert into public.looks (creator_id, image_path, width, height, status, published_at, audience)
               values ($1::uuid, $1::text || '/' || $2 || '.jpg', 1080, 1350, 'published', now(), $2::public.look_audience) returning id`,
      [C, audience]).then((rows) => rows[0].id);
  const sees = async (who, id) => (await as(db, who, 'select id from public.looks where id = $1', [id])).length === 1;
  const inFeed = async (who, id) => (await as(db, who, 'select id from public.get_feed(50)')).some((r) => r.id === id);

  before(async () => {
    C = await createUser(db, 'creator@test.dev');
    F = await createUser(db, 'follower@test.dev');
    S = await createUser(db, 'stranger@test.dev');
    [everyone, followers, onlyMe] = [await post('everyone'), await post('followers'), await post('only_me')];
    await as(db, F, 'insert into public.follows (follower_id, creator_id) values ($1, $2)', [F, C]);
  });

  test('a Look is for everyone unless its creator says otherwise', async () => {
    const [{ audience }] = await as(db, C, `insert into public.looks (creator_id, image_path, width, height) values ($1::uuid, $1::text || '/plain.jpg', 1, 1) returning audience`, [C]);
    assert.equal(audience, 'everyone');
  });
  test('everyone: anonymous visitors, strangers and followers all see it', async () => {
    for (const who of [null, S, F, C]) assert.equal(await sees(who, everyone), true);
  });
  test('followers: only followers and the creator see it', async () => {
    assert.equal(await sees(null, followers), false);
    assert.equal(await sees(S, followers), false);
    assert.equal(await sees(F, followers), true);
    assert.equal(await sees(C, followers), true);
  });
  test('only me: nobody but the creator sees it', async () => {
    for (const who of [null, S, F]) assert.equal(await sees(who, onlyMe), false);
    assert.equal(await sees(C, onlyMe), true);
  });
  test('the feed follows the audience, and never carries an Only me Look', async () => {
    assert.equal(await inFeed(null, everyone), true);
    assert.equal(await inFeed(S, followers), false);
    assert.equal(await inFeed(F, followers), true);
    for (const who of [null, S, F, C]) assert.equal(await inFeed(who, onlyMe), false);
  });
  test('pieces are as private as their Look', async () => {
    await as(db, C, `insert into public.look_pieces (look_id, position, slot, label, x, y) values ($1, 1, 'top', 'TOP', 0.5, 0.5)`, [followers]);
    assert.equal((await as(db, S, 'select id from public.look_pieces where look_id = $1', [followers])).length, 0);
    assert.equal((await as(db, F, 'select id from public.look_pieces where look_id = $1', [followers])).length, 1);
  });
  test('nobody can save a Look that is not meant for them', async () => {
    await rejects(as(db, S, 'insert into public.saves (user_id, look_id) values ($1, $2)', [S, followers]), /row-level security/);
    await as(db, F, 'insert into public.saves (user_id, look_id) values ($1, $2)', [F, followers]);
  });
  test('a public Lookbook never lists a Look its viewer may not see', async () => {
    const [{ id: save }] = await as(db, F, 'select id from public.saves where look_id = $1', [followers]);
    const [{ id: lb }] = await as(db, F, `insert into public.lookbooks (owner_id, name, is_private) values ($1, 'Open', false) returning id`, [F]);
    await as(db, F, 'insert into public.lookbook_items (lookbook_id, save_id) values ($1, $2)', [lb, save]);
    assert.equal((await as(db, F, 'select * from public.lookbook_contents($1)', [lb])).length, 1);
    assert.equal((await as(db, S, 'select * from public.lookbook_contents($1)', [lb])).length, 0);
    assert.equal((await as(db, null, 'select * from public.lookbook_contents($1)', [lb])).length, 0);
  });
  test("a Look's photo is as private as the Look", async () => {
    const file = `${C}/followers.jpg`;
    await as(db, C, `insert into storage.objects (bucket_id, name) values ('looks', $1)`, [file]);
    const read = async (who) => (await as(db, who, `select name from storage.objects where bucket_id = 'looks' and name = $1`, [file])).length === 1;
    assert.equal(await read(null), false);
    assert.equal(await read(S), false);
    assert.equal(await read(F), true);
    assert.equal(await read(C), true);
    assert.equal((await U(db, `select public from storage.buckets where id = 'looks'`))[0].public, false);
  });
  test('a creator can read their own upload before the Look exists; others cannot', async () => {
    const file = `${C}/unposted.jpg`;
    await as(db, C, `insert into storage.objects (bucket_id, name) values ('looks', $1)`, [file]);
    assert.equal((await as(db, C, `select name from storage.objects where name = $1`, [file])).length, 1);
    assert.equal((await as(db, F, `select name from storage.objects where name = $1`, [file])).length, 0);
  });
  test('avatars stay public', async () => {
    await as(db, C, `insert into storage.objects (bucket_id, name) values ('avatars', $1 || '/avatar.jpg')`, [C]);
    assert.equal((await as(db, null, `select name from storage.objects where bucket_id = 'avatars' and name = $1 || '/avatar.jpg'`, [C])).length, 1);
  });
  test('only the creator changes the audience, and it takes effect at once; unfollowing loses a Followers Look', async () => {
    await as(db, C, `update public.looks set audience = 'only_me' where id = $1`, [everyone]);
    assert.equal(await sees(S, everyone), false);
    // Only the creator chooses: a stranger's change touches nothing.
    assert.equal((await as(db, S, `update public.looks set audience = 'everyone' where id = $1 returning id`, [followers])).length, 0);
    await as(db, F, 'delete from public.follows where follower_id = $1 and creator_id = $2', [F, C]);
    assert.equal(await sees(F, followers), false);
  });
  test('blocking hides every audience, even to a follower', async () => {
    await as(db, F, 'insert into public.follows (follower_id, creator_id) values ($1, $2)', [F, C]);
    await as(db, F, 'insert into public.blocks (blocker_id, blocked_id) values ($1, $2)', [F, C]);
    assert.equal(await sees(F, followers), false);
  });
});

describe('links: where Visit site goes', () => {
  let W;
  before(async () => {
    W = await createUser(db, 'links@test.dev');
  });
  test('seeded Looks and creators carry their links', async () => {
    const [look] = await U(db, 'select link from public.looks where id = $1', [await lookId('amira-soft-tailoring')]);
    assert.equal(look.link, 'https://amirasaleh.example.com/soft-tailoring');
    const [amira] = await U(db, `select website from public.profiles where handle = 'amira.saleh'`);
    assert.equal(amira.website, 'https://amirasaleh.example.com');
  });
  test('a Look may carry a web link, or none', async () => {
    const [{ link }] = await as(db, W, `insert into public.looks (creator_id, image_path, width, height, link) values ($1::uuid, $1::text || '/l.jpg', 1, 1, 'https://shop.example.com/coat?c=1') returning link`, [W]);
    assert.equal(link, 'https://shop.example.com/coat?c=1');
    await as(db, W, `insert into public.looks (creator_id, image_path, width, height) values ($1::uuid, $1::text || '/n.jpg', 1, 1)`, [W]);
  });
  test('anything that is not a web address is refused', async () => {
    for (const bad of ['javascript:alert(1)', 'ftp://files.example.com/a', 'https://localhost', 'example.com/no-scheme', 'https://exa mple.com']) {
      await rejects(as(db, W, `insert into public.looks (creator_id, image_path, width, height, link) values ($1::uuid, $1::text || '/b.jpg', 1, 1, $2)`, [W, bad]), /check constraint/, bad);
    }
  });
  test('people set their own website, not anyone else’s', async () => {
    await as(db, W, `update public.profiles set website = 'https://me.example.com' where id = $1`, [W]);
    assert.equal((await U(db, 'select website from public.profiles where id = $1', [W]))[0].website, 'https://me.example.com');
    const changed = await as(db, A, `update public.profiles set website = 'https://evil.example.com' where id = $1 returning id`, [W]);
    assert.equal(changed.length, 0);
    await rejects(as(db, W, `update public.profiles set website = 'data:text/html,hi' where id = $1`, [W]), /check constraint/);
  });
});

describe('account deletion', () => {
  test('anonymous callers cannot call it', async () => {
    await rejects(as(db, null, 'select public.delete_my_account()'), /permission denied/);
  });
  test('deleting your account removes your profile, saves, Lookbooks and follows', async () => {
    await as(db, B, 'select public.delete_my_account()');
    for (const [table, col] of [['profiles', 'id'], ['saves', 'user_id'], ['lookbooks', 'owner_id'], ['follows', 'follower_id'], ['blocks', 'blocker_id']]) {
      assert.equal((await U(db, `select count(*)::int n from public.${table} where ${col} = $1`, [B]))[0].n, 0, table);
    }
    assert.equal((await U(db, 'select count(*)::int n from auth.users where id = $1', [B]))[0].n, 0);
  });
});
