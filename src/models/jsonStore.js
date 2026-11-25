import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

/**
 * Atomic JSON persistence store using a serialized promise queue
 * and write-to-temp + POSIX atomic rename (`archivo.tmp.<uuid>` -> `fs.rename`).
 */
export class JsonStore {
  /**
   * @param {string} filePath Absolute or relative path to the target JSON file.
   * @param {unknown} defaultData Default value returned when file does not exist yet.
   */
  constructor(filePath, defaultData = {}) {
    if (!filePath || typeof filePath !== 'string') {
      throw new TypeError('JsonStore requiere un filePath válido.');
    }
    this.filePath = path.resolve(filePath);
    this.defaultData = structuredClone(defaultData);
    this._queue = Promise.resolve();
  }

  /**
   * Ensures parent directory exists before writing.
   */
  async _ensureParentDir() {
    const dir = path.dirname(this.filePath);
    await fs.mkdir(dir, { recursive: true });
  }

  /**
   * Reads raw file without waiting on the external queue (safe inside queued mutations).
   */
  async _readUnlocked() {
    try {
      const raw = await fs.readFile(this.filePath, 'utf8');
      if (!raw.trim()) {
        return structuredClone(this.defaultData);
      }
      return JSON.parse(raw);
    } catch (err) {
      if (err && err.code === 'ENOENT') {
        return structuredClone(this.defaultData);
      }
      throw err;
    }
  }

  /**
   * Writes JSON payload to a unique temporary file in the same directory
   * and atomically renames it over the target path.
   */
  async _writeAtomic(data) {
    await this._ensureParentDir();
    const tmpPath = `${this.filePath}.tmp.${crypto.randomUUID()}`;
    const payload = `${JSON.stringify(data, null, 2)}\n`;

    try {
      await fs.writeFile(tmpPath, payload, { encoding: 'utf8', mode: 0o600 });
      await fs.rename(tmpPath, this.filePath);
    } catch (err) {
      await fs.unlink(tmpPath).catch(() => {});
      throw err;
    }
  }

  /**
   * Enqueues an async task so concurrent writes never interleave or corrupt data.
   */
  _enqueue(task) {
    const nextRun = this._queue.then(() => task(), () => task());
    this._queue = nextRun.catch(() => {});
    return nextRun;
  }

  /**
   * Reads the latest committed JSON state (waits for pending writes first).
   */
  async read() {
    await this._queue.catch(() => {});
    return this._readUnlocked();
  }

  /**
   * Atomically replaces the JSON store content.
   */
  async write(data) {
    return this._enqueue(async () => {
      const snapshot = structuredClone(data);
      await this._writeAtomic(snapshot);
      return structuredClone(snapshot);
    });
  }

  /**
   * Atomically reads, mutates, and persists the JSON store inside the serialized lock.
   * @param {(currentData: any) => any | Promise<any>} mutator
   */
  async update(mutator) {
    return this._enqueue(async () => {
      const current = await this._readUnlocked();
      const updated = await mutator(current);
      const nextState = updated !== undefined ? updated : current;
      await this._writeAtomic(nextState);
      return structuredClone(nextState);
    });
  }
}

export default JsonStore;
