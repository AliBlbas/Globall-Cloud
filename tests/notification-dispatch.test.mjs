import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const functionPath = join(root, 'supabase/functions/notification-dispatch/index.ts');
const migrationPath = join(root, 'supabase/migrations/20260818093000_add_notification_dispatch_worker_boundary.sql');

assert.ok(existsSync(functionPath), 'notification-dispatch function must exist');
assert.ok(existsSync(migrationPath), 'notification worker boundary migration must exist');

const source = readFileSync(functionPath, 'utf8');
const migration = readFileSync(migrationPath, 'utf8');

assert.match(source, /NOTIFICATION_WORKER_SECRET/, 'worker secret guard is required');
assert.match(source, /x-notification-worker-secret/, 'worker header guard is required');
assert.match(source, /claim_notification_outbox_external/, 'external outbox claim RPC is required');
assert.match(source, /complete_notification_outbox/, 'outbox completion RPC is required');
assert.match(source, /channel === 'in_app'/, 'in-app delivery must remain supported');
assert.match(source, /channel === 'email'/, 'email delivery channel must be explicit');
assert.match(source, /channel === 'whatsapp'/, 'WhatsApp delivery channel must be explicit');
assert.match(source, /channel === 'sms'/, 'SMS delivery channel must be explicit');
assert.match(source, /if \(existing\.data\?\.length\) return/, 'in-app duplicate delivery must be idempotent');
assert.match(source, /if \(req\.method !== 'POST'\)/, 'worker must reject non-POST requests');

assert.match(migration, /channel in \('email', 'whatsapp', 'sms'\)/, 'external claim must exclude in-app rows');
assert.match(migration, /for update skip locked/i, 'claim must be concurrency-safe');
assert.match(migration, /revoke all on function public\.claim_notification_outbox_external/i, 'external claim must be revoked from public roles');
assert.match(migration, /grant execute on function public\.claim_notification_outbox_external\(integer\)\s+to service_role/i, 'external claim must be service-role only');
assert.match(migration, /revoke all on function public\.claim_notification_outbox_channel/i, 'channel claim must be revoked from public roles');
assert.doesNotMatch(migration, /grant execute on function public\.claim_notification_outbox_external\(integer\)\s+to (public|anon|authenticated)/i, 'external claim must not be granted to client roles');

console.log('notification-dispatch contract tests: PASS');
