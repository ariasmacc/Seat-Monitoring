import React from 'react';
import {
  BarChart as BarIcon,
  TrendingUp,
  Clock,
  Users,
  Award,
  Calendar
} from 'lucide-react';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';

import type { Seat } from '../App';

interface SeatAnalyticsProps {
  seats: Seat[];
  peakData?: any[]; // [FIX] Idinagdag natin 'to para tanggapin ang prop
}


// Internal Card component to prevent import errors
const Card = ({ className, children }: { className?: string, children: React.ReactNode }) => (
  <div className={`rounded-xl border shadow-sm ${className || ''}`}>
    {children}
  </div>
);

export function SeatAnalytics({ seats }: SeatAnalyticsProps) {
  // ------------------------------
  // TOTAL TIME
  // ------------------------------
  const totalAvailable = seats.reduce((sum, seat) => sum + seat.availableMinutes, 0);
  const totalOccupied = seats.reduce((sum, seat) => sum + seat.occupiedMinutes, 0);

  // ------------------------------
  // MOST OCCUPIED SEAT
  // ------------------------------
  const longestOccupiedSeat = seats.reduce(
    (max, seat, index) =>
      seat.occupiedMinutes > (max.seat?.occupiedMinutes || 0)
        ? { seat, index: index + 1 }
        : max,
    { seat: null as Seat | null, index: 0 }
  );

  // ------------------------------
  // SEAT COMPARISON CHART DATA
  // ------------------------------
  const seatComparisonData = seats.map((seat, index) => ({
    name: `Seat ${index + 1}`,
    available: parseFloat(seat.availableMinutes.toFixed(1)),
    occupied: parseFloat(seat.occupiedMinutes.toFixed(1)),
  }));

  // ------------------------------
  // TOTAL TIME PIE CHART DATA
  // ------------------------------
  const totalTimeData = [
    { name: 'Available', value: parseFloat(totalAvailable.toFixed(1)), color: '#10b981' },
    { name: 'Occupied', value: parseFloat(totalOccupied.toFixed(1)), color: '#ef4444' },
  ];

  // ------------------------------
  // REAL PEAK HOURS COMPUTATION (SYSTEM DATE BASED)
  // ------------------------------
  const computeRealPeakHours = () => {
    const now = new Date();
    
    // Initialize 24 hours (0-23) with 0 counts
    const hourlyStats: Record<number, { occupied: number; total: number }> = {};
    for (let i = 0; i < 24; i++) {
      hourlyStats[i] = { occupied: 0, total: 0 };
    }

    // Iterate through all seats
    seats.forEach(seat => {
      if (!seat.occupancyHistory) return;

      seat.occupancyHistory.forEach(entry => {
        const entryDate = new Date(entry.timestamp);

        // FILTER: Check if the entry happened TODAY (System Date)
        const isToday = 
          entryDate.getDate() === now.getDate() &&
          entryDate.getMonth() === now.getMonth() &&
          entryDate.getFullYear() === now.getFullYear();

        if (isToday) {
          const hour = entryDate.getHours(); // Gets hour from 0-23 based on local system time
          
          hourlyStats[hour].total += 1;
          
          if (entry.status === 'occupied') {
            hourlyStats[hour].occupied += 1;
          }
        }
      });
    });

    // Helper for formatting label (e.g., 13 -> "1PM")
    const formatHourLabel = (h: number) => {
      if (h === 0) return "12AM";
      if (h < 12) return `${h}AM`;
      if (h === 12) return "12PM";
      return `${h - 12}PM`;
    };

    // Convert to array for Recharts
    const chartData = Object.keys(hourlyStats).map(key => {
      const hour = parseInt(key);
      const data = hourlyStats[hour];

      // Calculate percentage for this specific hour
      const percentage = data.total > 0 
        ? (data.occupied / data.total) * 100 
        : 0;

      return {
        hourValue: hour,
        hourLabel: formatHourLabel(hour),
        occupancy: parseFloat(percentage.toFixed(1)),
        samples: data.total // Good for debugging: knowing how many data points exist per hour
      };
    });

    return chartData.sort((a, b) => a.hourValue - b.hourValue);
  };

  const peakHoursData = computeRealPeakHours();
  
  // Check if we actually have data for today to conditionally show a message
  const hasDataForToday = peakHoursData.some(d => d.samples > 0);

  // ------------------------------
  // RETURN UI
  // ------------------------------
  return (
    <div className="space-y-6">

      {/* KEY METRICS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

        <Card className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 border-purple-500/30 backdrop-blur p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-purple-500/30">
              <Award className="w-5 h-5 text-purple-300" />
            </div>
            <p className="text-sm text-purple-200">Most Occupied</p>
          </div>
          <p className="text-white">Seat {longestOccupiedSeat.index}</p>
          <p className="text-sm text-purple-300 mt-1">
            {longestOccupiedSeat.seat?.occupiedMinutes.toFixed(1)} minutes
          </p>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 border-blue-500/30 backdrop-blur p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-blue-500/30">
              <Clock className="w-5 h-5 text-blue-300" />
            </div>
            <p className="text-sm text-blue-200">Total Available Time</p>
          </div>
          <p className="text-white">{totalAvailable.toFixed(1)} min</p>
          <p className="text-sm text-blue-300 mt-1">Across all seats</p>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500/20 to-orange-600/20 border-orange-500/30 backdrop-blur p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-orange-500/30">
              <Clock className="w-5 h-5 text-orange-300" />
            </div>
            <p className="text-sm text-orange-200">Total Occupied Time</p>
          </div>
          <p className="text-white">{totalOccupied.toFixed(1)} min</p>
          <p className="text-sm text-orange-300 mt-1">Across all seats</p>
        </Card>

        <Card className="bg-gradient-to-br from-pink-500/20 to-pink-600/20 border-pink-500/30 backdrop-blur p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-pink-500/30">
              <TrendingUp className="w-5 h-5 text-pink-300" />
            </div>
            <p className="text-sm text-pink-200">Occupancy Rate</p>
          </div>
          <p className="text-white">
            {((totalOccupied / (totalAvailable + totalOccupied)) * 100 || 0).toFixed(1)}%
          </p>
          <p className="text-sm text-pink-300 mt-1">Overall utilization</p>
        </Card>
      </div>

      {/* CHARTS SECTION */}
      <div className="grid lg:grid-cols-2 gap-6">

        {/* SEAT TIME COMPARISON */}
        <Card className="bg-white/5 border-white/10 backdrop-blur p-6">
          <div className="flex items-center gap-2 mb-6">
            <BarIcon className="w-5 h-5 text-blue-400" />
            <h3 className="text-white">Seat Time Comparison</h3>
          </div>

          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={seatComparisonData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff15" />
              <XAxis dataKey="name" stroke="#94a3b8" tick={{ fill: '#94a3b8' }} />
              <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8' }} />
              <Tooltip contentStyle={{
                backgroundColor: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '8px',
                color: '#fff'
              }} />
              <Bar dataKey="available" fill="#10b981" radius={[4, 4, 0, 0]} name="Available (min)" />
              <Bar dataKey="occupied" fill="#ef4444" radius={[4, 4, 0, 0]} name="Occupied (min)" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* TOTAL TIME PIE CHART */}
        <Card className="bg-white/5 border-white/10 backdrop-blur p-6">
          <div className="flex items-center gap-2 mb-6">
            <Users className="w-5 h-5 text-purple-400" />
            <h3 className="text-white">Total Time Distribution</h3>
          </div>

          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={totalTimeData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                dataKey="value"
              >
                {totalTimeData.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>

              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  color: '#fff'
                }}
                formatter={(value: number) => `${value} min`}
              />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        {/* PEAK HOURS CHART - REALTIME & SYSTEM DATE BASED */}
        <Card className="bg-white/5 border-white/10 backdrop-blur p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-green-400" />
              <h3 className="text-white">Peak Occupancy (Today)</h3>
            </div>
            <span className="text-xs text-slate-400">
              Based on {new Date().toLocaleDateString()}
            </span>
          </div>

          {!hasDataForToday ? (
            <div className="flex flex-col items-center justify-center h-[300px] text-slate-400 border border-dashed border-slate-700 rounded-lg">
              <Clock className="w-10 h-10 mb-2 opacity-50" />
              <p>No data recorded for today yet.</p>
              <p className="text-sm text-slate-500">Occupancy will appear here as detection runs.</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={peakHoursData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff15" />
                <XAxis 
                  dataKey="hourLabel" 
                  stroke="#94a3b8" 
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                  interval={2} // Show every 2nd label to avoid clutter
                />
                <YAxis 
                  stroke="#94a3b8" 
                  tick={{ fill: '#94a3b8' }} 
                  domain={[0, 100]} 
                  label={{ value: '% Occupied', angle: -90, position: 'insideLeft', fill: '#64748b' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                  formatter={(value: number) => [`${value}%`, 'Occupancy']}
                  labelFormatter={(label) => `Time: ${label}`}
                />
                <Line
                  type="monotone"
                  dataKey="occupancy"
                  stroke="#8b5cf6"
                  strokeWidth={3}
                  dot={{ fill: '#8b5cf6', r: 4 }}
                  activeDot={{ r: 6 }}
                  animationDuration={1000}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>
    </div>
  );
}