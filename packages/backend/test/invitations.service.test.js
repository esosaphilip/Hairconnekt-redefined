const test = require('node:test');
const assert = require('node:assert/strict');

require('ts-node/register/transpile-only');
require('reflect-metadata');

const crypto = require('crypto');
const bcrypt = require('bcrypt');
const {
  InvitationsService,
} = require('../src/invitations/invitations.service');
const { InvitationStatus } = require('../src/entities/invitation.entity');
const { UserRole } = require('../src/entities/user.entity');

const {
  BadRequestException,
  ConflictException,
  GoneException,
  InternalServerErrorException,
  NotFoundException,
} = require('@nestjs/common');

function sha256Hex(s) {
  return crypto.createHash('sha256').update(s).digest('hex').toLowerCase();
}

function mockRepo(getOpts) {
  const store = new Map();
  return {
    _store: store,
    _withDeleted: getOpts?._withDeleted,
    findOne: async (opts) => {
      if (!opts) return undefined;
      const w = opts.where;
      if (!w) return undefined;
      const whereList = Array.isArray(w) ? w : [w];
      for (const row of store.values()) {
        if (!getOpts?._withDeleted && !opts.withDeleted && row.deletedAt) continue;
        for (const clause of whereList) {
          const keys = Object.keys(clause);
          let ok = true;
          for (const k of keys) {
            if (clause[k] === undefined) continue;
            if (k === 'email') {
              const want = String(clause[k]).toLowerCase();
              if (String(row.email ?? '').toLowerCase() !== want) { ok = false; break; }
            } else if (Array.isArray(clause[k])) {
              if (!clause[k].includes(row[k])) { ok = false; break; }
            } else {
              if (row[k] !== clause[k]) { ok = false; break; }
            }
          }
          if (ok) return { ...row };
        }
      }
      return undefined;
    },
    find: async (opts) => {
      const rows = Array.from(store.values());
      if (opts?.where) {
        const w = opts.where;
        const keys = Object.keys(w);
        return rows.filter(row => {
          for (const k of keys) {
            if (w[k] === undefined) continue;
            if (k === 'email') {
              const want = String(w[k]).toLowerCase();
              if (String(row.email ?? '').toLowerCase() !== want) return false;
            } else if (row[k] !== w[k]) return false;
          }
          return true;
        }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      }
      return rows;
    },
    create: (data) => ({ ...data }),
    save: async (rowOrEntity) => {
      const row = { ...rowOrEntity };
      const id = row.id ?? crypto.randomUUID();
      row.id = id;
      row.createdAt = row.createdAt ?? new Date();
      row.updatedAt = new Date();
      store.set(id, row);
      return { ...row };
    },
    remove: async (row) => {
      store.delete(row.id);
      return row;
    },
    update: async (_id, _patch) => {},
    softDelete: async () => {},
    createQueryBuilder: () => ({
      addSelect: () => { throw new Error('not used'); },
      getOne: () => undefined,
    }),
  };
}

function mockDataSource(useTxn) {
  return {
    createQueryRunner: () => {
      let txOpen = false;
      let released = false;
      const committed = { value: false };
      const rolledBack = { value: false };
      const manager = {
        getRepository: (EntityClass) => {
          // Return whatever mocks the caller passed into test mocks repos via _txRepos.
          if (useTxn?._txRepos) {
            const key = EntityClass && EntityClass.name ? EntityClass.name : 'default';
            return useTxn._txRepos[key] ?? mockRepo();
          }
          return mockRepo();
        },
      };
      return {
        connect: async () => { txOpen = true; },
        startTransaction: async () => { if (!txOpen) throw new Error('not connected'); },
        commitTransaction: async () => { committed.value = true; txOpen = false; },
        rollbackTransaction: async () => { rolledBack.value = true; txOpen = false; },
        release: async () => { released = true; },
        manager,
        _inspect: () => ({ committed: committed.value, rolledBack: rolledBack.value, released }),
      };
    },
  };
}

function mockAudit() {
  const events = [];
  return {
    _events: events,
    record: async (evt) => { events.push(evt); },
  };
}

function mockAdmin(fields = {}) {
  return {
    id: fields.id ?? crypto.randomUUID(),
    email: fields.email ?? 'admin@hairconnekt.de',
    firstName: fields.firstName ?? 'Eseosa',
    lastName: fields.lastName ?? 'Admin',
    role: UserRole.ADMIN,
  };
}

test('createInvitation: stores SHA-256 hash of unique raw token, never returns raw in invitation record', async (t) => {
  const inviteRepo = mockRepo();
  const userRepo = mockRepo();
  const audit = mockAudit();
  const svc = new InvitationsService(inviteRepo, userRepo, mockRepo(), audit, mockDataSource(null));

  const { invitation, rawToken } = await svc.createInvitation(mockAdmin(), ' invited-user@example.COM ');

  assert.ok(/^[A-Za-z0-9_-]{40,}$/.test(rawToken), 'raw token base64url');
  assert.equal(invitation.email, 'invited-user@example.com', 'email lower-cased and trimmed');
  assert.equal(invitation.status, InvitationStatus.PENDING);
  assert.equal(invitation.role, UserRole.ADMIN);
  assert.equal(invitation.tokenHash, sha256Hex(rawToken), 'stored hash matches SHA256 of raw');
  assert.ok(!('rawToken' in invitation), 'invitation object never includes rawToken');
  assert.ok(new Date(invitation.expiresAt).getTime() > Date.now() + 6 * 24 * 3600 * 1000, 'expires within ~7 days');
});

test('createInvitation: second pending invite to same email => 409 Conflict', async () => {
  const inviteRepo = mockRepo();
  const userRepo = mockRepo();
  const audit = mockAudit();
  const svc = new InvitationsService(inviteRepo, userRepo, mockRepo(), audit, mockDataSource(null));
  await svc.createInvitation(mockAdmin(), 'dupe@example.com');
  await assert.rejects(
    () => svc.createInvitation(mockAdmin(), 'DUPE@example.com'),
    (err) => err instanceof ConflictException,
    'duplicate pending should throw Conflict',
  );
});

test('createInvitation: existing admin user on same email => 409 Conflict', async () => {
  const inviteRepo = mockRepo();
  const userRepo = mockRepo();
  const audit = mockAudit();
  const user = await userRepo.save({
    email: 'existing-admin@example.com',
    role: UserRole.ADMIN,
    firstName: 'Old', lastName: 'Admin',
  });
  assert.ok(user.id);
  const svc = new InvitationsService(inviteRepo, userRepo, mockRepo(), audit, mockDataSource(null));
  await assert.rejects(
    () => svc.createInvitation(mockAdmin(), 'existing-admin@example.com'),
    (err) => err instanceof ConflictException,
    'existing admin email rejected',
  );
});

test('createInvitation: email send failure => invite row auto-revoked, error re-thrown', async () => {
  const inviteRepo = mockRepo();
  const userRepo = mockRepo();
  const audit = mockAudit();
  process.env.ADMIN_APP_URL = 'http://localhost:5173';
  const mailer = require('../src/common/email/mailer');
  const origSend = mailer.sendEmail;
  try {
    mailer.sendEmail = async () => { throw new InternalServerErrorException('Brevo offline'); };
    const svc = new InvitationsService(inviteRepo, userRepo, mockRepo(), audit, mockDataSource(null));
    await assert.rejects(
      () => svc.createInvitation(mockAdmin(), 'rollback@example.com'),
      /Brevo offline/,
    );
    const after = (await inviteRepo.find()).find(i => i.email === 'rollback@example.com');
    assert.ok(after, 'row saved before email failure');
    assert.equal(after.status, InvitationStatus.REVOKED, 'email failure revokes pending invite');
  } finally {
    mailer.sendEmail = origSend;
  }
});

test('revokePendingInvitation: pending -> revoked OK; non-pending -> BadRequest; missing -> NotFound', async () => {
  const inviteRepo = mockRepo();
  const userRepo = mockRepo();
  const audit = mockAudit();
  const svc = new InvitationsService(inviteRepo, userRepo, mockRepo(), audit, mockDataSource(null));
  const { invitation } = await svc.createInvitation(mockAdmin(), 'a@example.com');
  const { invitation: inv2 } = await svc.createInvitation(mockAdmin(), 'b@example.com');
  inv2.status = InvitationStatus.ACCEPTED;
  await inviteRepo.save(inv2);

  const revoked = await svc.revokePendingInvitation(invitation.id);
  assert.equal(revoked.status, InvitationStatus.REVOKED);

  await assert.rejects(
    () => svc.revokePendingInvitation(inv2.id),
    (err) => err instanceof BadRequestException,
  );
  await assert.rejects(
    () => svc.revokePendingInvitation(crypto.randomUUID()),
    (err) => err instanceof NotFoundException,
  );
});

test('verifyPublic: returns {email,role} only, never internal IDs', async () => {
  const inviteRepo = mockRepo();
  const userRepo = mockRepo();
  const audit = mockAudit();
  const svc = new InvitationsService(inviteRepo, userRepo, mockRepo(), audit, mockDataSource(null));
  const { rawToken, invitation } = await svc.createInvitation(mockAdmin(), 'verify@example.com');
  const info = await svc.verifyPublic(rawToken);
  assert.deepEqual(info, { email: invitation.email, role: UserRole.ADMIN });
  assert.ok(!('id' in info), 'verify never leaks invitation id');
});

test('accept flow: creates user with hashed pwd, marks accepted; re-accept => 410 Gone (single-use)', async () => {
  const inviteRepo = mockRepo();
  const userRepo = mockRepo();
  const refreshRepo = mockRepo();
  const audit = mockAudit();
  const dataSource = mockDataSource({ _txRepos: { User: userRepo, Invitation: inviteRepo } });
  const svc = new InvitationsService(inviteRepo, userRepo, refreshRepo, audit, dataSource);
  const { rawToken } = await svc.createInvitation(mockAdmin(), 'new-admin@example.com');
  const before = await userRepo.findOne({ where: { email: 'new-admin@example.com' } });
  assert.equal(before, undefined, 'no user before accept');

  const { user, invitation } = await svc.acceptInvitation(rawToken, 'TestPass123!');
  assert.equal(user.email, 'new-admin@example.com');
  assert.equal(user.role, UserRole.ADMIN);
  assert.equal(user.isActive, true);
  assert.equal(user.isEmailVerified, true);
  assert.ok(await bcrypt.compare('TestPass123!', user.passwordHash), 'password hash valid bcrypt');
  assert.equal(invitation.status, InvitationStatus.ACCEPTED);
  assert.ok(invitation.acceptedAt, 'acceptedAt set');

  await assert.rejects(
    () => svc.acceptInvitation(rawToken, 'TestPass123!'),
    (err) => err instanceof GoneException,
    'single-use: re-accept throws Gone',
  );
});

test('accept flow: revoked/expired/unknown tokens => 404/410', async () => {
  const inviteRepo = mockRepo();
  const userRepo = mockRepo();
  const refreshRepo = mockRepo();
  const audit = mockAudit();
  const svc = new InvitationsService(inviteRepo, userRepo, refreshRepo, audit, mockDataSource({ _txRepos: { User: userRepo, Invitation: inviteRepo } }));

  // 1. Unknown hash => 404 NotFound
  await assert.rejects(
    () => svc.acceptInvitation('does-not-exist-token-xyz123', 'TestPass123!'),
    (err) => err instanceof NotFoundException,
  );

  // 2. Revoked => 410 Gone
  const { invitation: rev, rawToken: revTok } = await svc.createInvitation(mockAdmin(), 'rev@example.com');
  rev.status = InvitationStatus.REVOKED;
  await inviteRepo.save(rev);
  await assert.rejects(
    () => svc.acceptInvitation(revTok, 'TestPass123!'),
    (err) => err instanceof GoneException,
  );

  // 3. Expired => 410 Gone + mutates status to EXPIRED lazily
  const { invitation: exp, rawToken: expTok } = await svc.createInvitation(mockAdmin(), 'exp@example.com');
  exp.expiresAt = new Date(Date.now() - 1000 * 60 * 60 * 24); // -1 day
  await inviteRepo.save(exp);
  try { await svc.acceptInvitation(expTok, 'TestPass123!'); } catch (_) {}
  const expiredAfter = await inviteRepo.findOne({ where: { id: exp.id } });
  assert.equal(expiredAfter.status, InvitationStatus.EXPIRED, 'lazy mark expired');
});

test('ADMIN_APP_URL guard: no env in NODE_ENV=production => 500 InternalServerError', async () => {
  const inviteRepo = mockRepo();
  const userRepo = mockRepo();
  const audit = mockAudit();
  const svc = new InvitationsService(inviteRepo, userRepo, mockRepo(), audit, mockDataSource(null));
  const prevEnv = process.env.NODE_ENV;
  const prevUrl = process.env.ADMIN_APP_URL;
  try {
    process.env.NODE_ENV = 'production';
    delete process.env.ADMIN_APP_URL;
    const err = await (async () => { try { await svc.createInvitation(mockAdmin(), 'env-guard@example.com'); return null; } catch (e) { return e; } })();
    assert.ok(err instanceof InternalServerErrorException);
    assert.match(String(err.message), /ADMIN_APP_URL/);
  } finally {
    process.env.NODE_ENV = prevEnv;
    if (prevUrl !== undefined) process.env.ADMIN_APP_URL = prevUrl;
  }
});
