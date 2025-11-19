import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Armchair, Clock } from 'lucide-react';
import type { Seat } from '../App';

interface SeatGridProps {
  seats: Seat[];
}

export function SeatGrid({ seats }: SeatGridProps) {
  const occupiedCount = seats.filter(s => s.status === 'occupied').length;
  const availableCount = seats.filter(s => s.status === 'available').length;

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 border-blue-500/30 backdrop-blur p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-200">Total Seats</p>
              <p className="text-white mt-1">{seats.length}</p>
            </div>
            <div className="p-3 rounded-lg bg-blue-500/30">
              <Armchair className="w-6 h-6 text-blue-300" />
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/20 to-green-600/20 border-green-500/30 backdrop-blur p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-200">Available</p>
              <p className="text-white mt-1">{availableCount}</p>
            </div>
            <div className="p-3 rounded-lg bg-green-500/30">
              <Armchair className="w-6 h-6 text-green-300" />
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-red-500/20 to-red-600/20 border-red-500/30 backdrop-blur p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-red-200">Occupied</p>
              <p className="text-white mt-1">{occupiedCount}</p>
            </div>
            <div className="p-3 rounded-lg bg-red-500/30">
              <Armchair className="w-6 h-6 text-red-300" />
            </div>
          </div>
        </Card>
      </div>

      {/* Individual Seats */}
      <Card className="bg-white/5 border-white/10 backdrop-blur p-6">
        <h3 className="text-white mb-6">Seat Status</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {seats.map((seat, index) => (
            <Card
              key={seat.id}
              className={`p-5 transition-all duration-300 ${
                seat.status === 'occupied'
                  ? 'bg-gradient-to-br from-red-500/20 to-red-600/20 border-red-500/30'
                  : 'bg-gradient-to-br from-green-500/20 to-green-600/20 border-green-500/30'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    seat.status === 'occupied' ? 'bg-red-500/30' : 'bg-green-500/30'
                  }`}>
                    <Armchair className={`w-5 h-5 ${
                      seat.status === 'occupied' ? 'text-red-300' : 'text-green-300'
                    }`} />
                  </div>
                  <div>
                    <p className="text-white">Seat {index + 1}</p>
                    <p className="text-xs text-slate-400">ID: {seat.id.slice(-6)}</p>
                  </div>
                </div>
                <Badge
                  className={
                    seat.status === 'occupied'
                      ? 'bg-red-500/30 text-red-300 border-red-500/50'
                      : 'bg-green-500/30 text-green-300 border-green-500/50'
                  }
                >
                  {seat.status}
                </Badge>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Available
                  </span>
                  <span className="text-green-300">
                    {seat.availableMinutes.toFixed(1)} min
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Occupied
                  </span>
                  <span className="text-red-300">
                    {seat.occupiedMinutes.toFixed(1)} min
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </Card>
    </div>
  );
}
