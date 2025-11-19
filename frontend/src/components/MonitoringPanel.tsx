import { useEffect, useState } from 'react';
import { Card } from './ui/card';
import { SeatGrid } from './SeatGrid';
import { SeatAnalytics } from './SeatAnalytics';
import { Video, LayoutGrid, BarChart3, Download } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Button } from './ui/button';
import type { Seat } from '../App';

const BACKEND_URL = 'http://localhost:5000';

export function MonitoringPanel() {
  const [seats, setSeats] = useState<Seat[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Function para mag-fetch ng kumpletong data (Status + History)
  const fetchSeatData = () => {
    fetch(`${BACKEND_URL}/api/seats`) // Ginamit natin ang /api/seats kasi andito yung JSON data
      .then(res => res.json())
      .then((data: any[]) => {
        const formattedSeats = data.map((s) => {
            // Logic para isama ang "pending" time kung hindi pa nagpapalit ng status
            // Ang 'lastStatusChange' sa JSON ay ISO string, convert natin sa Date object
            const lastChange = new Date(s.lastStatusChange).getTime();
            const now = Date.now();
            const elapsedMinutes = (now - lastChange) / 1000 / 60;

            return {
                ...s, // Spread existing props (kasama na dito ang occupancyHistory)
                // Idagdag ang elapsed time sa current total para real-time ang feeling
                availableMinutes: s.status === 'available' 
                    ? (s.availableMinutes || 0) + elapsedMinutes 
                    : (s.availableMinutes || 0),
                occupiedMinutes: s.status === 'occupied' 
                    ? (s.occupiedMinutes || 0) + elapsedMinutes 
                    : (s.occupiedMinutes || 0),
            };
        });
        setSeats(formattedSeats);
        setError(null);
      })
      .catch(err => {
        console.error("Fetch error:", err);
        // Huwag masyadong aggressive mag set ng error para hindi kumurap ang UI
        // setError("Cannot connect to Backend"); 
      });
  };

  useEffect(() => {
    // Initial fetch
    fetchSeatData();

    // Poll every 1 second
    const interval = setInterval(fetchSeatData, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleDownloadReport = () => {
    window.open(`${BACKEND_URL}/download_report`, '_blank');
  };

  if (error) return <div className="text-red-400 text-center p-10">{error}</div>;

  return (
    <div className="flex flex-col gap-6 h-[calc(100vh-150px)] w-full overflow-hidden">
      
      {/* TOP: VIDEO */}
      <div className="flex-none h-[40%] min-h-[250px]">
        <Card className="bg-white/5 border-white/10 backdrop-blur overflow-hidden h-full flex flex-col">
            <div className="p-3 border-b border-white/5 flex items-center justify-between bg-black/20 shrink-0">
                <div className="flex items-center gap-2">
                    <Video className="w-4 h-4 text-green-400" />
                    <h3 className="text-white font-medium text-sm">Live Detection</h3>
                </div>
                <span className="text-[10px] text-green-400 bg-green-400/10 px-2 rounded">LIVE</span>
            </div>
            <div className="relative flex-grow bg-black flex items-center justify-center overflow-hidden">
                <img src={`${BACKEND_URL}/video_feed`} className="w-full h-full object-contain" alt="Detection Feed" />
            </div>
        </Card>
      </div>

      {/* BOTTOM: TABS */}
      <div className="flex-grow overflow-hidden">
        <Tabs defaultValue="status" className="h-full flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <TabsList className="bg-white/5 border border-white/10">
              <TabsTrigger value="status" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                <LayoutGrid className="w-4 h-4 mr-2" />
                Seat Status
              </TabsTrigger>
              <TabsTrigger value="analytics" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">
                <BarChart3 className="w-4 h-4 mr-2" />
                Analytics
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="status" className="flex-grow overflow-y-auto pr-2 custom-scrollbar mt-0">
            <Card className="bg-white/5 border-white/10 p-4">
                <SeatGrid seats={seats} />
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="flex-grow overflow-y-auto pr-2 custom-scrollbar mt-0">
             <div className="mb-4 flex justify-end">
                <Button onClick={handleDownloadReport} variant="outline" className="border-green-500/30 text-green-400 hover:bg-green-500/10">
                    <Download className="w-4 h-4 mr-2" /> Download Report
                </Button>
             </div>
             {/* Tinanggal na natin ang peakData prop kasi nasa loob na ng 'seats' ang history */}
            <SeatAnalytics seats={seats} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}