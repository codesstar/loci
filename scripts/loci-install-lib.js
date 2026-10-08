'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const START = /<!-- loci:start v\d+ -->/g;
const END = '<!-- loci:end -->';
function replaceBlock(before, block) {
  const starts = [...before.matchAll(START)], ends = before.split(END).length - 1;
  if (starts.length !== ends || starts.length > 1) throw new Error('Malformed/duplicate Loci instruction markers; preserve the file and repair explicitly.');
  if (!starts.length) return before.trimEnd() + (before.trim() ? '\n\n' : '') + block;
  const start = starts[0].index, end = before.indexOf(END);
  if (end < start) throw new Error('Reversed Loci instruction markers.');
  return before.slice(0, start) + block.trimEnd() + before.slice(end + END.length);
}
function migrateRoot(before, block) {
  before = before.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
  const signatures = require('./loci-legacy-signatures.json');
  // Only remove a byte-for-byte known shipping rulebook; preserve user additions.
  for (const { length, sha256 } of signatures) {
    if (hash(before.slice(0, length)) === sha256) {
      before = before.slice(length).replace(/<!-- loci:project:start v\d+ -->[\s\S]*?<!-- loci:project:end -->/g, '').trim();
      break;
    }
  }
  if (/MANDATORY FIRST ACTION|Persistence \(Synapse\)/.test(before)) throw new Error('Customized legacy root rulebook: back it up and reconcile it with LOCI-RULES.md before upgrading; refusing to leave conflicting rules.');
  return replaceBlock(before, block);
}
function state(file) {
  if (!fs.existsSync(file)) return { exists: false };
  const stat = fs.lstatSync(file);
  if (!stat.isFile() || stat.isSymbolicLink()) throw new Error(`Expected regular file: ${file}`);
  return { exists: true, hash: hash(fs.readFileSync(file)), mode: stat.mode };
}
class Transaction {
  constructor(brain, home, operation) {
    this.roots = [path.resolve(brain), path.resolve(home)];
    this.dir = path.join(brain, '.loci/backups', `${new Date().toISOString().replace(/[:.]/g, '-')}-${operation}-${crypto.randomBytes(3).toString('hex')}`);
    this.entries = [];
    this.safe(this.dir);
    fs.mkdirSync(this.dir, { recursive: true });
  }
  safe(file) {
    file = path.resolve(file);
    const root = this.roots.filter(r => file === r || file.startsWith(r + path.sep)).sort((a,b) => b.length-a.length)[0];
    if (!root) throw new Error(`Write outside installation roots: ${file}`);
    // Never follow user-created links out of a managed directory.
    if (fs.existsSync(root) && fs.lstatSync(root).isSymbolicLink()) throw new Error(`Refusing symlink installation root: ${root}`);
    let current = root;
    for (const part of path.relative(root, file).split(path.sep).filter(Boolean)) {
      current = path.join(current, part);
      let stat;
      try { stat = fs.lstatSync(current); } catch (error) { if (error.code !== 'ENOENT') throw error; }
      if (stat?.isSymbolicLink()) throw new Error(`Refusing to overwrite a symlink: ${current}`);
    }
    return file;
  }
  capture(file) {
    file = this.safe(file);
    if (this.entries.some(e => e.file === file)) return;
    const before = state(file), backup = String(this.entries.length);
    if (before.exists) fs.copyFileSync(file, path.join(this.dir, backup));
    this.entries.push({ file, before, backup });
    this.save();
  }
  recordAfter(file) {
    const entry = this.entries.find(e => e.file === path.resolve(file));
    if (entry) entry.after = state(file);
    this.save();
  }
  write(file, content) {
    this.safe(file);
    const buffer = Buffer.isBuffer(content) ? content : Buffer.from(content);
    if (fs.existsSync(file) && fs.readFileSync(file).equals(buffer)) return;
    this.capture(file);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const temporary = file + `.loci-tmp-${process.pid}`;
    fs.writeFileSync(temporary, buffer);
    if (fs.existsSync(file)) fs.chmodSync(temporary, fs.statSync(file).mode);
    try { fs.renameSync(temporary, file); } finally { if (fs.existsSync(temporary)) fs.unlinkSync(temporary); }
    this.recordAfter(file);
  }
  remove(file) {
    this.safe(file);
    if (!fs.existsSync(file)) return;
    this.capture(file); fs.unlinkSync(file); this.recordAfter(file);
  }
  save() { fs.writeFileSync(path.join(this.dir, 'transaction.json'), JSON.stringify({ roots: this.roots, entries: this.entries }, null, 2)); }
  finish() { this.save(); }
  rollback(checkChanges = false) {
    if (checkChanges) for (const e of this.entries) {
      this.safe(e.file);
      const current = state(e.file);
      if (!e.after || current.exists !== e.after.exists || current.hash !== e.after.hash || current.mode !== e.after.mode) throw new Error(`Changed since upgrade; refusing rollback: ${e.file}`);
    }
    for (const e of [...this.entries].reverse()) {
      this.safe(e.file);
      if (e.before.exists) { fs.mkdirSync(path.dirname(e.file), { recursive: true }); fs.copyFileSync(path.join(this.dir, e.backup), e.file); fs.chmodSync(e.file, e.before.mode); }
      else if (fs.existsSync(e.file)) fs.unlinkSync(e.file);
    }
  }
  static restore(dir) {
    const stored = JSON.parse(fs.readFileSync(path.join(dir, 'transaction.json'), 'utf8'));
    const tx = Object.create(Transaction.prototype);
    Object.assign(tx, stored, { dir });
    tx.rollback(true);
  }
}
module.exports = { Transaction, replaceBlock, migrateRoot, hash };
