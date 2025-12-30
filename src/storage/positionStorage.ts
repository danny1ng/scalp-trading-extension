import { PositionSize, PositionSizeSet, Exchange } from '@/types';

const STORAGE_KEY_PREFIX = 'scalp_positions_';

export class PositionStorage {
  static async getPositions(exchange: Exchange, ticker: string): Promise<PositionSize[]> {
    const key = `${STORAGE_KEY_PREFIX}${exchange}_${ticker}`;

    try {
      const result = await chrome.storage.local.get(key);
      if (result[key]) {
        return result[key] as PositionSize[];
      }
    } catch (error) {
      console.error('Error loading positions:', error);
    }

    return this.getDefaultPositions();
  }

  static async savePositions(
    exchange: Exchange,
    ticker: string,
    positions: PositionSize[]
  ): Promise<void> {
    const key = `${STORAGE_KEY_PREFIX}${exchange}_${ticker}`;

    try {
      await chrome.storage.local.set({ [key]: positions });
      console.log(`Positions saved for ${exchange}:${ticker}`, positions);
    } catch (error) {
      console.error('Error saving positions:', error);
    }
  }

  static async getAllPositionSets(): Promise<PositionSizeSet[]> {
    try {
      const result = await chrome.storage.local.get(null);
      const sets: PositionSizeSet[] = [];

      for (const [key, value] of Object.entries(result)) {
        if (key.startsWith(STORAGE_KEY_PREFIX)) {
          const [, exchange, ticker] = key.split('_');
          sets.push({
            exchange: exchange as Exchange,
            ticker,
            positions: value as PositionSize[],
          });
        }
      }

      return sets;
    } catch (error) {
      console.error('Error loading all position sets:', error);
      return [];
    }
  }

  static async deletePositions(exchange: Exchange, ticker: string): Promise<void> {
    const key = `${STORAGE_KEY_PREFIX}${exchange}_${ticker}`;

    try {
      await chrome.storage.local.remove(key);
      console.log(`Positions deleted for ${exchange}:${ticker}`);
    } catch (error) {
      console.error('Error deleting positions:', error);
    }
  }

  static getDefaultPositions(): PositionSize[] {
    return [
      { id: '1', label: 'Pos 1', size: 0 },
      { id: '2', label: 'Pos 2', size: 0 },
      { id: '3', label: 'Pos 3', size: 0 },
      { id: '4', label: 'Pos 4', size: 0 },
      { id: '5', label: 'Pos 5', size: 0 },
    ];
  }

  static async getCurrentActivePosition(): Promise<number | null> {
    try {
      const result = await chrome.storage.local.get('active_position_index');
      return (result.active_position_index as number) ?? 0;
    } catch (error) {
      console.error('Error loading active position:', error);
      return 0;
    }
  }

  static async setActivePosition(index: number): Promise<void> {
    try {
      await chrome.storage.local.set({ active_position_index: index });
    } catch (error) {
      console.error('Error saving active position:', error);
    }
  }
}
