import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { PositionSize, Exchange } from '@/types';
import { PositionStorage } from '@/storage/positionStorage';
import { cn } from '@/lib/utils';

interface PositionSizeSelectorProps {
  exchange: Exchange;
  ticker: string;
}

export function PositionSizeSelector({ exchange, ticker }: PositionSizeSelectorProps) {
  const [positions, setPositions] = useState<PositionSize[]>([]);
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadPositions();
    loadActivePosition();
  }, [exchange, ticker]);

  const loadPositions = async () => {
    setIsLoading(true);
    const savedPositions = await PositionStorage.getPositions(exchange, ticker);
    setPositions(savedPositions);
    setIsLoading(false);
  };

  const loadActivePosition = async () => {
    const index = await PositionStorage.getCurrentActivePosition();
    if (index !== null) {
      setActiveIndex(index);
    }
  };

  const handlePositionChange = async (id: string, newSize: string) => {
    const size = parseFloat(newSize) || 0;
    const updatedPositions = positions.map((pos) =>
      pos.id === id ? { ...pos, size } : pos
    );
    setPositions(updatedPositions);
    await PositionStorage.savePositions(exchange, ticker, updatedPositions);
  };

  const handleActivate = async (index: number) => {
    setActiveIndex(index);
    await PositionStorage.setActivePosition(index);
    console.log(`Active position set to index ${index}, size: ${positions[index].size}`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Position Sizes</h3>
          <span className="text-xs text-muted-foreground">
            {exchange} - {ticker}
          </span>
        </div>
        <div className="grid grid-cols-5 gap-2">
          {positions.map((position, index) => (
            <div key={position.id} className="space-y-1">
              <Button
                variant={activeIndex === index ? 'default' : 'outline'}
                size="sm"
                className={cn(
                  'w-full h-8 text-xs',
                  activeIndex === index && 'ring-2 ring-primary'
                )}
                onClick={() => handleActivate(index)}
              >
                {position.label}
              </Button>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={position.size || ''}
                onChange={(e) => handlePositionChange(position.id, e.target.value)}
                placeholder="0"
                className="h-8 text-xs text-center"
              />
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
          <span className="text-xs text-muted-foreground">Active:</span>
          <span className="text-xs font-bold text-primary">
            {positions[activeIndex]?.label} - {positions[activeIndex]?.size || 0}
          </span>
        </div>
      </div>
    </div>
  );
}
