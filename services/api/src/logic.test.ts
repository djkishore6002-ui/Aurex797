import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { computeAttendance, issueCertificateIfEligible } from './routes/workshops';

// Reinit DB for tests (in-memory)
import { DatabaseSync } from 'node:sqlite';
// Replace the db module's db for isolation is complex; instead, use unique IDs.
import { initDb, db } from './db';
initDb();

describe('Core business logic', () => {
  it('certificate requires >=90% attendance (deterministic rule)', () => {
    // Fresh user/workshop/session
    const uid = 'u_test1', wid = 'w_test1', sid = 'ws_test1';
    db.prepare('INSERT OR REPLACE INTO users (id,email,password_hash,name,role) VALUES (?,?,?,?,?)').run(uid, 't@t.com', 'h', 'T', 'learner');
    db.prepare('INSERT OR REPLACE INTO workshops (id,title,description,instructor_id,organizer_id,meeting_url,capacity,published) VALUES (?,?,?,?,?,?,?,1)')
      .run(wid, 'Test', 'Test desc', uid, uid, 'https://meet', 10);
    db.prepare('INSERT OR REPLACE INTO workshop_sessions (id,workshop_id,start_time,end_time,duration_minutes,required_minutes) VALUES (?,?,?,?,?,?)')
      .run(sid, wid, new Date().toISOString(), new Date().toISOString(), 60, 54);
    db.prepare('DELETE FROM attendance WHERE user_id=? AND session_id=?').run(uid, sid);

    // 40 min attended < 54 required => pct ≈ 74% => not eligible
    db.prepare('INSERT INTO attendance (id,user_id,session_id,workshop_id,duration_minutes,status) VALUES (?,?,?,?,?,?)')
      .run('att_1', uid, sid, wid, 40, 'partial');
    assert.equal(computeAttendance(uid, wid) < 90, true);

    // update to full attendance
    db.prepare('UPDATE attendance SET duration_minutes=60 WHERE user_id=? AND session_id=?').run(uid, sid);
    assert.equal(computeAttendance(uid, wid) >= 90, true);
    assert.equal(computeAttendance(uid, wid), 100);
  });

  it('attendance percentage is rounded to 1 decimal and based on required minutes', () => {
    const uid = 'u_test2', wid = 'w_test2';
    db.prepare('INSERT OR REPLACE INTO users (id,email,password_hash,name,role) VALUES (?,?,?,?,?)').run(uid, 't2@t.com','h','T2','learner');
    db.prepare('INSERT OR REPLACE INTO workshops (id,title,description,instructor_id,organizer_id,meeting_url,capacity,published) VALUES (?,?,?,?,?,?,?,1)')
      .run(wid,'W2','desc',uid,uid,'https://x',10);
    db.prepare('INSERT OR REPLACE INTO workshop_sessions (id,workshop_id,start_time,end_time,duration_minutes,required_minutes) VALUES (?,?,?,?,?,?)')
      .run('ws_t2a', wid, new Date().toISOString(), new Date().toISOString(), 100, 90);
    db.prepare('DELETE FROM attendance WHERE user_id=?').run(uid);
    db.prepare('INSERT INTO attendance (id,user_id,session_id,workshop_id,duration_minutes,status) VALUES (?,?,?,?,?,?)')
      .run('att_2a', uid, 'ws_t2a', wid, 45, 'partial');
    const pct = computeAttendance(uid, wid);
    // attended 45 of 90 required => 50%
    assert.equal(pct, 50);
  });

  it('attendance cannot exceed 100%', () => {
    const uid = 'u_test3', wid = 'w_test3';
    db.prepare('INSERT OR REPLACE INTO users (id,email,password_hash,name,role) VALUES (?,?,?,?,?)').run(uid,'t3@t.com','h','T3','learner');
    db.prepare('INSERT OR REPLACE INTO workshops (id,title,description,instructor_id,organizer_id,meeting_url,capacity,published) VALUES (?,?,?,?,?,?,?,1)')
      .run(wid,'W3','desc',uid,uid,'https://x',10);
    db.prepare('INSERT OR REPLACE INTO workshop_sessions (id,workshop_id,start_time,end_time,duration_minutes,required_minutes) VALUES (?,?,?,?,?,?)')
      .run('ws_t3a', wid, new Date().toISOString(), new Date().toISOString(), 60, 54);
    db.prepare('DELETE FROM attendance WHERE user_id=?').run(uid);
    db.prepare('INSERT INTO attendance (id,user_id,session_id,workshop_id,duration_minutes,status) VALUES (?,?,?,?,?,?)')
      .run('att_3a', uid, 'ws_t3a', wid, 999, 'present');
    assert.equal(computeAttendance(uid, wid), 100);
  });

  it('certificate issuance is deterministic and does not issue below 90%', () => {
    const uid = 'u_test4', wid = 'w_test4';
    db.prepare('INSERT OR REPLACE INTO users (id,email,password_hash,name,role) VALUES (?,?,?,?,?)').run(uid,'t4@t.com','h','T4','learner');
    db.prepare('INSERT OR REPLACE INTO workshops (id,title,description,instructor_id,organizer_id,meeting_url,capacity,published) VALUES (?,?,?,?,?,?,?,1)')
      .run(wid,'W4','desc',uid,uid,'https://x',10);
    db.prepare('INSERT OR REPLACE INTO workshop_sessions (id,workshop_id,start_time,end_time,duration_minutes,required_minutes) VALUES (?,?,?,?,?,?)')
      .run('ws_t4a', wid, new Date().toISOString(), new Date().toISOString(), 100, 90);
    db.prepare('DELETE FROM attendance WHERE user_id=?').run(uid);
    db.prepare('DELETE FROM certificates WHERE user_id=? AND workshop_id=?').run(uid, wid);
    db.prepare('INSERT INTO attendance (id,user_id,session_id,workshop_id,duration_minutes,status) VALUES (?,?,?,?,?,?)')
      .run('att_4a', uid, 'ws_t4a', wid, 80, 'partial');
    const r = issueCertificateIfEligible(uid, wid);
    assert.equal(r, null); // 80/90 ≈88.9% <90
    db.prepare('UPDATE attendance SET duration_minutes=90 WHERE id=?').run('att_4a');
    const r2 = issueCertificateIfEligible(uid, wid);
    assert.ok(r2);
    assert.ok(r2.cert_number.startsWith('AURX-'));
  });
});
