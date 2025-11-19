import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { CalibrationPanel } from './components/CalibrationPanel';
import { MonitoringPanel } from './components/MonitoringPanel';
import { Armchair } from 'lucide-react';

export interface Seat {
  id: string;
  x: number;
  y: number;
  status: 'available' | 'occupied';
  availableMinutes: number;
  occupiedMinutes: number;
  lastStatusChange: Date;
  occupancyHistory: {
    timestamp: Date;
    status: 'available' | 'occupied';
  }[];
}

export default function App() {
  const [seats, setSeats] = useState<Seat[]>([]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/20 backdrop-blur-xl">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600">
              <Armchair className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-white">Seat Management System</h1>
              <p className="text-sm text-slate-400">Real-time seat monitoring and analytics</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8">
        <Tabs defaultValue="calibration" className="w-full">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 bg-white/5 border border-white/10 p-1">
            <TabsTrigger 
              value="calibration"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white"
            >
              Calibration
            </TabsTrigger>
            <TabsTrigger 
              value="monitoring"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white"
            >
              Monitoring
            </TabsTrigger>
          </TabsList>

          <TabsContent value="calibration" className="mt-8">
            <CalibrationPanel seats={seats} setSeats={setSeats} />
          </TabsContent>

          <TabsContent value="monitoring" className="mt-8">
            <MonitoringPanel seats={seats} setSeats={setSeats} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
