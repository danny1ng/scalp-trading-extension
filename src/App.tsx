import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PositionSizeSelector } from '@/components/PositionSizeSelector';
import { Exchange } from '@/types';
import { TrendingUp, Settings } from 'lucide-react';

function App() {
  const [currentExchange, setCurrentExchange] = useState<Exchange>('lighter');
  const [currentTicker, setCurrentTicker] = useState<string>('BTC-USD');

  useEffect(() => {
    detectCurrentPage();
  }, []);

  const detectCurrentPage = async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.url) {
      if (tab.url.includes('lighter.xyz')) {
        setCurrentExchange('lighter');
        const match = tab.url.match(/\/trade\/([^\/]+)/);
        if (match) setCurrentTicker(match[1]);
      } else if (tab.url.includes('bitget.com')) {
        setCurrentExchange('bitget');
        const match = tab.url.match(/\/([A-Z]+USDT)/);
        if (match) setCurrentTicker(match[1]);
      }
    }
  };

  return (
    <div className="w-[400px] min-h-[500px] bg-background text-foreground p-4">
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            <h1 className="text-lg font-bold">Scalp Trading</h1>
          </div>
          <Settings className="w-4 h-4 text-muted-foreground" />
        </div>

        <Tabs defaultValue="positions" className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="positions" className="flex-1">
              Positions
            </TabsTrigger>
            <TabsTrigger value="history" className="flex-1">
              History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="positions" className="space-y-4 mt-4">
            <div className="bg-card rounded-lg p-4 border border-border">
              <PositionSizeSelector exchange={currentExchange} ticker={currentTicker} />
            </div>

            <div className="bg-muted/50 rounded-lg p-3 space-y-2 text-xs">
              <h4 className="font-semibold text-foreground">Quick Guide:</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Click chart → Place BUY order</li>
                <li>• Shift + Click → Place SELL order</li>
                <li>• Select active position above</li>
                <li>• Sizes saved per exchange/ticker</li>
              </ul>
            </div>
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            <div className="bg-card rounded-lg p-4 border border-border min-h-[200px] flex items-center justify-center">
              <p className="text-muted-foreground text-sm">
                Order history coming soon...
              </p>
            </div>
          </TabsContent>
        </Tabs>

        <div className="text-center text-xs text-muted-foreground pt-2 border-t border-border">
          v1.0.0 • Check console for order logs
        </div>
      </div>
    </div>
  );
}

export default App;
