// src/lib/storage.ts
import { promises as fs } from 'fs';
import path from 'path';
import { ScheduledReportConfig } from '@/types/fudo';

const DATA_DIR = path.join(process.cwd(), 'data');
const SETTINGS_FILE = path.join(DATA_DIR, 'schedule-config.json');

const DEFAULT_CONFIG: ScheduledReportConfig = {
  id: 'default',
  enabled: false,
  targetPhone: '5493871234567',
  targetTime: '09:00',
  autoSelectAll: true,
  selectedSupplierIds: [],
  lastRunAt: null,
  lastRunStatus: null,
  lastRunMessage: null,
};

// In-memory fallback if filesystem is read-only (e.g. Vercel serverless without persistent volume)
let memoryConfigCache: ScheduledReportConfig | null = null;

async function ensureDataDir(): Promise<void> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch {
    // Directory might already exist or read-only
  }
}

export async function getScheduleConfig(): Promise<ScheduledReportConfig> {
  if (memoryConfigCache) {
    return memoryConfigCache;
  }

  try {
    await ensureDataDir();
    const data = await fs.readFile(SETTINGS_FILE, 'utf-8');
    const parsed = JSON.parse(data) as ScheduledReportConfig;
    memoryConfigCache = { ...DEFAULT_CONFIG, ...parsed };
    return memoryConfigCache;
  } catch {
    memoryConfigCache = { ...DEFAULT_CONFIG };
    return memoryConfigCache;
  }
}

export async function saveScheduleConfig(config: Partial<ScheduledReportConfig>): Promise<ScheduledReportConfig> {
  const current = await getScheduleConfig();
  const updated: ScheduledReportConfig = {
    ...current,
    ...config,
    id: current.id || 'default',
  };

  memoryConfigCache = updated;

  try {
    await ensureDataDir();
    await fs.writeFile(SETTINGS_FILE, JSON.stringify(updated, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[Storage] Could not write to filesystem, preserved in memory:', err);
  }

  return updated;
}
