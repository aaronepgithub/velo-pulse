import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, useParams } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Bike, 
  Wrench, 
  TrendingUp, 
  History, 
  AlertTriangle, 
  CheckCircle2, 
  ChevronRight,
  Activity as ActivityIcon,
  Calendar,
  Zap,
  Gauge,
  Menu,
  X,
  Sparkles,
  BrainCircuit,
  Clock,
  Heart,
  Timer,
  Trophy
} from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";
import { motion, AnimatePresence } from 'motion/react';
import { fitnessApi } from './services/fitnessService';
import { 
  ChainUsage, 
  BikeUsage, 
  ActivitiesResponse, 
  BikeMaintenance,
  Activity,
  SegmentReport,
  SpeedTrends,
  PowerTrends,
  ActivityDetails,
  RankingInfo
} from './types';
import { cn } from './lib/utils';
// Utilities
export const formatDisplayDate = (dateStr: string | undefined, full = false) => {
  if (!dateStr) return '';
  
  // If it's a standard activity.formatted_date: YYYY-MM-DD HH:MM
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})$/);
  let date: Date;
  
  if (match) {
    const [_, year, month, day, hour, minute] = match;
    date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute));
  } else {
    // If it's ISO, remove 'Z' to treat as literal local time if 'Z' is present
    const cleanDateStr = dateStr.includes('T') ? dateStr.replace('Z', '') : dateStr;
    date = new Date(cleanDateStr);
  }

  if (isNaN(date.getTime())) return dateStr;

  return date.toLocaleString('en-US', { 
    weekday: full ? 'long' : undefined, 
    year: 'numeric', 
    month: full ? 'long' : 'short', 
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
};

// Components
const Sidebar = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
  const location = useLocation();
  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Bike Comparison', path: '/comparison', icon: Bike },
    { name: 'Bike Usage', path: '/usage', icon: Gauge },
    { name: 'Maintenance', path: '/maintenance', icon: Wrench },
    { name: 'Trends', path: '/trends', icon: TrendingUp },
    { name: 'AI Coach', path: '/coach', icon: Sparkles },
    { name: 'Activities', path: '/activities', icon: History },
  ];

  return (
    <>
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <div className={cn(
        "bg-slate-900 text-slate-100 h-screen fixed left-0 top-0 flex flex-col border-r border-slate-800 z-50 transition-transform duration-300 lg:translate-x-0 w-64",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-6 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <ActivityIcon className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">VeloPulse</h1>
          </div>
          <button onClick={onClose} className="lg:hidden p-2 text-slate-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => {
                  if (window.innerWidth < 1024) onClose();
                }}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
                  isActive 
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20" 
                    : "text-slate-400 hover:bg-slate-800 hover:text-slate-100"
                )}
              >
                <item.icon className={cn("w-5 h-5", isActive ? "text-white" : "group-hover:text-slate-100")} />
                <span className="font-medium">{item.name}</span>
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-slate-800">
          <div className="bg-slate-800/50 rounded-xl p-4">
            <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-2">User Profile</p>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center text-xs font-bold">AE</div>
              <div className="overflow-hidden">
                <p className="text-sm font-medium truncate">Aaron E-P</p>
                <p className="text-xs text-slate-500 truncate">aaronep@gmail.com</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

const Dashboard = () => {
  const [chainUsage, setChainUsage] = useState<ChainUsage | null>(null);
  const [activities, setActivities] = useState<ActivitiesResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [chain, acts] = await Promise.all([
          fitnessApi.getChainUsage(),
          fitnessApi.getActivities(1, 5)
        ]);
        setChainUsage(chain);
        setActivities(acts);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <div className="flex items-center justify-center h-full">Loading dashboard...</div>;

  const maintenanceAlerts = chainUsage?.main_bikes.filter(bike => 
    bike.miles_since_replacement > 2000 || bike.miles_since_wax > 200
  ) || [];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header>
        <h2 className="text-3xl font-bold text-slate-900">Welcome back, Aaron</h2>
        <p className="text-slate-500">Here's what's happening with your fitness and gear.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Maintenance Status */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Wrench className="w-5 h-5 text-blue-600" />
              Maintenance Status
            </h3>
            <Link to="/maintenance" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
              View all <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          
          <div className="space-y-4">
            {chainUsage?.main_bikes?.map(bike => (
              <div key={bike.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center",
                    bike.miles_since_replacement > 2000 ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600"
                  )}>
                    <Bike className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">{bike.name}</p>
                    <p className="text-xs text-slate-500">Last wax: {bike.last_chain_wax}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-900">{Math.round(bike.miles_since_replacement)} mi</p>
                  <p className="text-xs text-slate-500">on current chain</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="space-y-6">
          <div className="bg-blue-600 rounded-2xl p-6 text-white shadow-lg shadow-blue-200">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-blue-500 rounded-lg">
                <Calendar className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider opacity-80">Last 365 Days</span>
            </div>
            <p className="text-3xl font-bold mb-1">
              {(chainUsage?.main_bikes || []).reduce((acc, b) => acc + (b.miles_last_year || 0), 0).toLocaleString()}
            </p>
            <p className="text-sm opacity-80">Total miles tracked</p>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Maintenance Alerts</h3>
            {maintenanceAlerts.length > 0 ? (
              <div className="space-y-3">
                {maintenanceAlerts.map(bike => (
                  <div key={bike.id} className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg border border-amber-100">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                    <div>
                      <p className="text-sm font-bold text-amber-900">{bike.name}</p>
                      <p className="text-xs text-amber-700">
                        {bike.miles_since_wax > 200 ? "Chain needs waxing" : "Chain replacement approaching"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-4 text-slate-400">
                <CheckCircle2 className="w-8 h-8 mb-2 text-green-500" />
                <p className="text-sm">All gear is in top shape!</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Activities */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <History className="w-5 h-5 text-blue-600" />
            Recent Activities
          </h3>
          <Link to="/activities" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
            View all <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                <th className="pb-4 px-2">Activity</th>
                <th className="pb-4 px-2">Date</th>
                <th className="pb-4 px-2">Distance</th>
                <th className="pb-4 px-2">Gear</th>
                <th className="pb-4 px-2 text-right">Avg Power</th>
                <th className="pb-4 px-2 text-right">Avg HR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {activities?.activities?.map(activity => (
                <tr key={activity.id} className="group hover:bg-slate-50 transition-colors">
                  <td className="py-4 px-2">
                    <Link to={`/activity/${activity.id}`} className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                      {activity.name}
                    </Link>
                  </td>
                  <td className="py-4 px-2 text-sm text-slate-500">{activity.formatted_date}</td>
                  <td className="py-4 px-2 text-sm font-medium text-slate-700">{activity.distance_miles.toFixed(1)} mi</td>
                  <td className="py-4 px-2">
                    <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-medium">
                      {activity.gear_name}
                    </span>
                  </td>
                  <td className="py-4 px-2 text-sm text-right font-medium text-slate-700">{activity.average_watts ? `${Math.round(activity.average_watts)}W` : '--'}</td>
                  <td className="py-4 px-2 text-sm text-right text-slate-500">{activity.average_heartrate ? `${Math.round(activity.average_heartrate)} bpm` : '--'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// Placeholder components for other routes
const Comparison = () => {
  const [segmentReport, setSegmentReport] = useState<SegmentReport | null>(null);
  const [speedTrends, setSpeedTrends] = useState<SpeedTrends | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedBucket, setSelectedBucket] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [report, trends] = await Promise.all([
          fitnessApi.getSegmentReport(),
          fitnessApi.getSpeedTrends()
        ]);
        setSegmentReport(report);
        setSpeedTrends(trends);
        if (Object.keys(trends).length > 0) {
          setSelectedBucket(Object.keys(trends)[0]);
        }
      } catch (error) {
        console.error("Error fetching comparison data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <div className="flex items-center justify-center h-full">Loading comparison data...</div>;

  const currentBucketData = selectedBucket ? speedTrends?.[selectedBucket] : null;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header>
        <h2 className="text-3xl font-bold text-slate-900">Bike Comparison</h2>
        <p className="text-slate-500">Analyze how your different bikes perform across various terrain types.</p>
      </header>

      <div className="flex flex-wrap gap-2">
        {Object.keys(speedTrends || {}).map(bucket => (
          <button
            key={bucket}
            onClick={() => setSelectedBucket(bucket)}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-medium transition-all",
              selectedBucket === bucket
                ? "bg-blue-600 text-white shadow-md"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            )}
          >
            {bucket}
          </button>
        ))}
      </div>

      {currentBucketData && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Performance Summary */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
              <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                <Gauge className="w-5 h-5 text-blue-600" />
                Speed Performance
              </h3>
              <div className="space-y-6">
                {currentBucketData?.summary?.performance?.map((perf, idx) => (
                  <div key={perf.gear} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-bold text-slate-700">{perf.gear}</span>
                      <span className="text-slate-500 font-medium">{perf.average_speed.toFixed(2)} mph</span>
                    </div>
                    <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(perf.average_speed / currentBucketData.summary.performance[0].average_speed) * 100}%` }}
                        className={cn(
                          "h-full rounded-full",
                          idx === 0 ? "bg-blue-600" : "bg-slate-400"
                        )}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-8 p-4 bg-blue-50 rounded-xl border border-blue-100">
                <p className="text-sm text-blue-900">
                  <span className="font-bold">Fastest Gear:</span> {currentBucketData.summary.fastest_gear}
                </p>
              </div>
            </div>

            {/* Gear Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Object.entries(currentBucketData?.gears || {}).map(([gearName, details]: [string, any]) => (
                <div key={gearName} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                  <h4 className="font-bold text-slate-900 mb-2">{gearName}</h4>
                  <p className="text-sm text-slate-500 mb-4">{details.description}</p>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Prediction</p>
                    <p className="text-sm text-slate-700">{details.prediction}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Segments in this bucket */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 h-fit">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <ActivityIcon className="w-5 h-5 text-blue-600" />
              Analyzed Segments
            </h3>
            <ul className="space-y-3">
              {currentBucketData?.segments?.map(segment => (
                <li key={segment} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl text-sm text-slate-700 font-medium border border-slate-100">
                  <div className="w-2 h-2 rounded-full bg-blue-400" />
                  {segment}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};
const BikeCard = ({ bike }: { bike: BikeMaintenance, key?: any }) => {
  const waxProgress = Math.min((bike.miles_since_wax / 200) * 100, 100);
  const chainProgress = Math.min((bike.miles_since_replacement / 2000) * 100, 100);

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-600">
            <Bike className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-bold text-slate-900">{bike.name}</h4>
            <p className="text-xs text-slate-500">ID: {bike.id}</p>
          </div>
        </div>
        {bike.miles_since_replacement > 2000 || bike.miles_since_wax > 200 ? (
          <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-bold flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Attention Required
          </span>
        ) : (
          <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Optimal
          </span>
        )}
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-600 font-medium">Chain Wax</span>
            <span className={cn(
              "font-bold",
              bike.miles_since_wax > 200 ? "text-amber-600" : "text-slate-900"
            )}>
              {Math.round(bike.miles_since_wax)} / 200 mi
            </span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div 
              className={cn("h-full transition-all duration-500", bike.miles_since_wax > 200 ? "bg-amber-500" : "bg-blue-500")}
              style={{ width: `${waxProgress}%` }}
            />
          </div>
          <p className="text-xs text-slate-400">Last waxed on {bike.last_chain_wax}</p>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-600 font-medium">Chain Life</span>
            <span className={cn(
              "font-bold",
              bike.miles_since_replacement > 2000 ? "text-red-600" : "text-slate-900"
            )}>
              {Math.round(bike.miles_since_replacement)} / 2000 mi
            </span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div 
              className={cn("h-full transition-all duration-500", bike.miles_since_replacement > 2000 ? "bg-red-500" : "bg-blue-500")}
              style={{ width: `${chainProgress}%` }}
            />
          </div>
          <p className="text-xs text-slate-400">Last replaced on {bike.last_chain_replacement}</p>
        </div>
      </div>

      <div className="pt-4 border-t border-slate-100 grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Yearly Distance</p>
          <p className="text-lg font-bold text-slate-900">{(bike.miles_last_year || 0).toLocaleString()} mi</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Status</p>
          <p className="text-sm font-medium text-slate-600">Active</p>
        </div>
      </div>
    </div>
  );
};

const Maintenance = () => {
  const [chainUsage, setChainUsage] = useState<ChainUsage | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await fitnessApi.getChainUsage();
        setChainUsage(data);
      } catch (error) {
        console.error("Error fetching maintenance data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <div className="flex items-center justify-center h-full">Loading maintenance data...</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header>
        <h2 className="text-3xl font-bold text-slate-900">Maintenance Tracking</h2>
        <p className="text-slate-500">Keep your gear running smoothly with precise usage tracking.</p>
      </header>

      <section>
        <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
          <Bike className="w-6 h-6 text-blue-600" />
          Primary Bikes
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {chainUsage?.main_bikes?.map(bike => (
            <BikeCard key={bike.id} bike={bike} />
          ))}
        </div>
      </section>

      {chainUsage?.trainer_bikes && chainUsage.trainer_bikes.length > 0 && (
        <section>
          <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
            <Zap className="w-6 h-6 text-amber-500" />
            Trainer Setup
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {chainUsage?.trainer_bikes?.map(bike => (
              <BikeCard key={bike.id} bike={bike} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend,
  AreaChart,
  Area
} from 'recharts';

const Trends = () => {
  const [powerTrends, setPowerTrends] = useState<PowerTrends | null>(null);
  const [speedTrends, setSpeedTrends] = useState<SpeedTrends | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedBucket, setSelectedBucket] = useState<string | null>(null);
  const [selectedBike, setSelectedBike] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [pTrends, sTrends] = await Promise.all([
          fitnessApi.getPowerTrends(),
          fitnessApi.getSpeedTrends()
        ]);
        setPowerTrends(pTrends);
        setSpeedTrends(sTrends);
        
        if (Object.keys(pTrends).length > 0) {
          const firstBucket = Object.keys(pTrends)[0];
          setSelectedBucket(firstBucket);
          
          const bucketSpeedData = sTrends[firstBucket];
          if (bucketSpeedData && Object.keys(bucketSpeedData.gears).length > 0) {
            setSelectedBike(Object.keys(bucketSpeedData.gears)[0]);
          }
        }
      } catch (error) {
        console.error("Error fetching trends data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedBucket && speedTrends) {
      const bucketSpeedData = speedTrends[selectedBucket];
      if (bucketSpeedData && Object.keys(bucketSpeedData.gears).length > 0) {
        if (!selectedBike || !bucketSpeedData.gears[selectedBike]) {
          setSelectedBike(Object.keys(bucketSpeedData.gears)[0]);
        }
      }
    }
  }, [selectedBucket, speedTrends]);

  if (loading) return <div className="flex items-center justify-center h-full">Loading trends data...</div>;

  const currentPowerBucket = selectedBucket ? powerTrends?.[selectedBucket] : null;
  const currentSpeedBucket = selectedBucket ? speedTrends?.[selectedBucket] : null;

  const powerChartData = currentPowerBucket?.data?.map(d => ({
    ...d,
    month: d.month.split('-').reverse().join('/')
  })) || [];

  // Process speed data to get monthly averages per bike
  const processSpeedData = () => {
    if (!currentSpeedBucket) return [];
    
    const monthlyData: { [month: string]: { [bike: string]: { totalSpeed: number, count: number } } } = {};
    
    Object.entries(currentSpeedBucket.gears).forEach(([bikeName, gearData]: [string, any]) => {
      gearData.efforts.forEach((effort: any) => {
        const month = effort.date.substring(0, 7); // YYYY-MM
        if (!monthlyData[month]) monthlyData[month] = {};
        if (!monthlyData[month][bikeName]) monthlyData[month][bikeName] = { totalSpeed: 0, count: 0 };
        
        monthlyData[month][bikeName].totalSpeed += effort.speed;
        monthlyData[month][bikeName].count += 1;
      });
    });
    
    return Object.entries(monthlyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, bikes]) => {
        const entry: any = { month: month.split('-').reverse().join('/') };
        Object.entries(bikes).forEach(([bikeName, stats]) => {
          entry[bikeName] = Number((stats.totalSpeed / stats.count).toFixed(2));
        });
        return entry;
      });
  };

  const speedChartData = processSpeedData();
  const filteredSpeedChartData = speedChartData.filter(d => selectedBike && d[selectedBike] !== undefined);
  
  const bikeNames = currentSpeedBucket ? Object.keys(currentSpeedBucket.gears) : [];
  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
  const selectedBikeIdx = bikeNames.indexOf(selectedBike || "");
  const selectedBikeColor = selectedBikeIdx !== -1 ? colors[selectedBikeIdx % colors.length] : '#3b82f6';

  const calculateTrend = (bikeName: string) => {
    const bikeData = speedChartData
      .filter(d => d[bikeName] !== undefined)
      .map(d => d[bikeName]);
      
    if (bikeData.length < 2) return null;
    
    const current = bikeData[bikeData.length - 1];
    const previous = bikeData[bikeData.length - 2];
    
    const diff = current - previous;
    const percent = (diff / previous) * 100;
    
    return {
      current: current.toFixed(2),
      diff: diff.toFixed(2),
      percent: percent.toFixed(1),
      increasing: diff > 0
    };
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header>
        <h2 className="text-3xl font-bold text-slate-900">Performance Trends</h2>
        <p className="text-slate-500">Track your power output and speed progression over time across different bikes.</p>
      </header>

      <div className="flex flex-wrap gap-2">
        {Object.keys(powerTrends || {}).map(bucket => (
          <button
            key={bucket}
            onClick={() => setSelectedBucket(bucket)}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-medium transition-all",
              selectedBucket === bucket
                ? "bg-blue-600 text-white shadow-md"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            )}
          >
            {bucket}
          </button>
        ))}
      </div>

      {selectedBucket && (
        <div className="space-y-8">
          {/* Power Chart */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-500" />
                  Average Power Output
                </h3>
                <p className="text-sm text-slate-500">Top 3 efforts averaged per month</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Current Bucket</p>
                <p className="text-sm font-bold text-slate-900">{selectedBucket}</p>
              </div>
            </div>

            <div className="h-[300px] md:h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={powerChartData}>
                  <defs>
                    <linearGradient id="colorPower" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="month" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                    unit="W"
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#fff', 
                      borderRadius: '12px', 
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="avg_power" 
                    name="Avg Power"
                    stroke="#3b82f6" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorPower)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Speed Trends Chart */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
              <div>
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <Gauge className="w-5 h-5 text-blue-600" />
                  Monthly Speed Trends
                </h3>
                <p className="text-sm text-slate-500">Average speed per bike across analyzed segments</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {bikeNames.map((bike, idx) => (
                  <button
                    key={bike}
                    onClick={() => setSelectedBike(bike)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border",
                      selectedBike === bike
                        ? "bg-slate-900 text-white border-slate-900 shadow-md"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                    )}
                  >
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: colors[idx % colors.length] }} />
                    {bike}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-[300px] md:h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={filteredSpeedChartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="month" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                    unit=" mph"
                    domain={['auto', 'auto']}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#fff', 
                      borderRadius: '12px', 
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                    }}
                  />
                  {selectedBike && (
                    <Line
                      type="monotone"
                      dataKey={selectedBike}
                      name={selectedBike}
                      stroke={selectedBikeColor}
                      strokeWidth={3}
                      dot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
                      activeDot={{ r: 6, strokeWidth: 0 }}
                      connectNulls={true}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Speed Trend Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {bikeNames.map((bike, idx) => {
              const trend = calculateTrend(bike);
              if (!trend) return null;
              const isSelected = selectedBike === bike;
              return (
                <button 
                  key={bike} 
                  onClick={() => setSelectedBike(bike)}
                  className={cn(
                    "bg-white rounded-2xl p-6 shadow-sm border transition-all text-left",
                    isSelected ? "border-blue-500 ring-1 ring-blue-500" : "border-slate-200 hover:border-slate-300"
                  )}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${colors[idx % colors.length]}15`, color: colors[idx % colors.length] }}>
                        <Bike className="w-5 h-5" />
                      </div>
                      <h4 className="font-bold text-slate-900">{bike}</h4>
                    </div>
                    <div className={cn(
                      "flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold",
                      trend.increasing ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                    )}>
                      {trend.increasing ? <TrendingUp className="w-3 h-3" /> : <TrendingUp className="w-3 h-3 rotate-180" />}
                      {trend.percent}%
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Current Avg Speed</p>
                    <p className="text-2xl font-bold text-slate-900">
                      {trend.current} <span className="text-sm font-normal text-slate-500">mph</span>
                    </p>
                    <p className="text-xs text-slate-500">
                      {trend.increasing ? 'Increased' : 'Decreased'} by {Math.abs(Number(trend.diff))} mph since last effort
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
              <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">Peak Power (Avg)</p>
              <p className="text-2xl font-bold text-slate-900">
                {powerChartData.length > 0 ? Math.max(...powerChartData.map(d => d.avg_power)).toFixed(1) : '0.0'} W
              </p>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
              <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">Total Efforts</p>
              <p className="text-2xl font-bold text-slate-900">
                {powerChartData.reduce((acc, d) => acc + d.num_efforts, 0)}
              </p>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
              <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">Months Tracked</p>
              <p className="text-2xl font-bold text-slate-900">{powerChartData.length}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
const ActivityDetailView = () => {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<ActivityDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [detectingGear, setDetectingGear] = useState(false);

  const fetchData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const details = await fitnessApi.getActivityDetails(id);
      setData(details);
    } catch (error) {
      console.error("Error fetching activity details:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDetectGear = async () => {
    if (!id) return;
    setDetectingGear(true);
    try {
      const result = await fitnessApi.detectGearForActivity(id);
      if (result.success) {
        await fetchData();
      } else {
        alert(result.message || "Failed to detect gear. Please ensure the FIT file is available in Dropbox.");
      }
    } catch (error) {
      console.error("Error detecting gear:", error);
      alert("An error occurred while detecting gear.");
    } finally {
      setDetectingGear(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  if (loading) return <div className="flex items-center justify-center h-full">Loading activity details...</div>;
  if (!data) return <div className="text-center py-12">Activity not found</div>;

  const { activity, efforts } = data;

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return [h, m, s].map(v => v.toString().padStart(2, '0')).join(':');
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const RankingBadge = ({ label, ranking }: { label: string, ranking: RankingInfo | null }) => {
    if (!ranking) return null;
    const isTop10 = ranking.rank <= 10;
    const isPR = ranking.rank === 1;

    return (
      <div className="flex flex-row sm:flex-col justify-between items-center sm:items-start sm:gap-1 p-2 sm:p-0 bg-slate-50 sm:bg-transparent rounded-lg sm:rounded-none">
        <span className="text-[10px] text-slate-400 uppercase font-bold tracking-tight">{label}</span>
        <div className={cn(
          "px-2 py-0.5 rounded text-[11px] sm:text-xs font-bold w-fit",
          isPR ? "bg-amber-100 text-amber-700 border border-amber-200" :
          isTop10 ? "bg-blue-100 text-blue-700 border border-blue-200" :
          "bg-slate-200 text-slate-600 border border-slate-300"
        )}>
          {ranking.rank} / {ranking.total}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <Link to="/activities" className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1 mb-2">
            <ChevronRight className="w-4 h-4 rotate-180" /> Back to History
          </Link>
          <h2 className="text-3xl font-bold text-slate-900">{activity.name}</h2>
          <p className="text-slate-500 font-medium">{formatDisplayDate(activity.formatted_date || activity.start_date_local, true)}</p>
        </div>
        <div className="flex flex-wrap items-end gap-4">
          <button
            onClick={handleDetectGear}
            disabled={detectingGear}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all border shadow-sm",
              detectingGear 
                ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed" 
                : "bg-white text-blue-600 border-blue-100 hover:bg-blue-50 hover:border-blue-200"
            )}
          >
            {detectingGear ? (
              <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            {detectingGear ? 'Analyzing...' : 'Detect Gear & Metrics'}
          </button>
          <div className="flex flex-wrap gap-4">
          <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Distance</p>
            <p className="text-xl font-bold text-slate-900">{activity.distance_miles.toFixed(2)} <span className="text-sm font-normal text-slate-500">mi</span></p>
          </div>
          <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Moving Time</p>
            <p className="text-xl font-bold text-slate-900">{activity.moving_time_str}</p>
          </div>
          {activity.average_watts && (
            <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm" title="Average Power">
              <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Avg Power</p>
              <p className="text-xl font-bold text-slate-900">{Math.round(activity.average_watts)} <span className="text-sm font-normal text-slate-500">W</span></p>
            </div>
          )}
          {activity.average_heartrate && (
            <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm" title="Average Heart Rate">
              <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Avg HR</p>
              <p className="text-xl font-bold text-slate-900">{Math.round(activity.average_heartrate)} <span className="text-sm font-normal text-slate-500">bpm</span></p>
            </div>
          )}
          {activity.average_cadence && (
            <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm" title="Average Cadence">
              <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Avg Cadence</p>
              <p className="text-xl font-bold text-slate-900">{Math.round(activity.average_cadence)} <span className="text-sm font-normal text-slate-500">rpm</span></p>
            </div>
          )}
          {activity.norm_power && (
            <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm border-l-4 border-l-blue-500" title="Normalized Power">
              <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Norm Power</p>
              <p className="text-xl font-bold text-slate-900">{Math.round(activity.norm_power)} <span className="text-sm font-normal text-slate-500">W</span></p>
            </div>
          )}
          {activity.best_5s && (
            <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm border-l-4 border-l-orange-500" title="Best 5-Second Power">
              <div className="flex items-center gap-1">
                <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Best 5s</p>
                <Trophy className="w-3 h-3 text-orange-500" />
              </div>
              <p className="text-xl font-bold text-slate-900">{Math.round(activity.best_5s)} <span className="text-sm font-normal text-slate-500">W</span></p>
            </div>
          )}
          {activity.best_30s && (
            <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm border-l-4 border-l-orange-400" title="Best 30-Second Power">
              <div className="flex items-center gap-1">
                <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Best 30s</p>
                <Trophy className="w-3 h-3 text-orange-400" />
              </div>
              <p className="text-xl font-bold text-slate-900">{Math.round(activity.best_30s)} <span className="text-sm font-normal text-slate-500">W</span></p>
            </div>
          )}
          {activity.best_5min && (
            <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm border-l-4 border-l-amber-500" title="Best 5-Minute Power">
              <div className="flex items-center gap-1">
                <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Best 5m</p>
                <Trophy className="w-3 h-3 text-amber-500" />
              </div>
              <p className="text-xl font-bold text-slate-900">{Math.round(activity.best_5min)} <span className="text-sm font-normal text-slate-500">W</span></p>
            </div>
          )}
          {activity.best_20min && (
            <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm border-l-4 border-l-amber-400" title="Best 20-Minute Power">
              <div className="flex items-center gap-1">
                <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Best 20m</p>
                <Trophy className="w-3 h-3 text-amber-400" />
              </div>
              <p className="text-xl font-bold text-slate-900">{Math.round(activity.best_20min)} <span className="text-sm font-normal text-slate-500">W</span></p>
            </div>
          )}
          {activity.best_1h && (
            <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm border-l-4 border-l-yellow-500" title="Best 1-Hour Power">
              <div className="flex items-center gap-1">
                <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Best 1h</p>
                <Trophy className="w-3 h-3 text-yellow-500" />
              </div>
              <p className="text-xl font-bold text-slate-900">{Math.round(activity.best_1h)} <span className="text-sm font-normal text-slate-500">W</span></p>
            </div>
          )}
        </div>
      </div>
    </header>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
        <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-blue-600" />
          Segment Efforts & Rankings
        </h3>
        
        <div className="overflow-x-auto -mx-6 px-6">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                <th className="pb-4 px-4 min-w-[180px]">Segment</th>
                <th className="pb-4 px-4">Stats</th>
                <th className="pb-4 px-4 min-w-[150px]">Rankings</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {efforts.map((effort) => (
                <tr key={effort.id} className="group hover:bg-slate-50 transition-colors">
                  <td className="py-6 px-4">
                    <p className="font-bold text-slate-900 leading-tight mb-1">{effort.segment_name}</p>
                    <p className="text-[11px] text-slate-400 font-medium">Segment Distance: {(effort.distance_miles || (effort.distance ? effort.distance / 1609.34 : 0)).toFixed(2)} mi</p>
                  </td>
                  <td className="py-6 px-4">
                    <div className="flex flex-wrap items-center gap-y-2 gap-x-4">
                      <div className="flex items-center gap-1.5" title="Time">
                        <Timer className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-sm font-bold text-slate-700">{effort.time_str || formatTime(effort.elapsed_time)}</span>
                      </div>
                      {effort.average_watts && (
                        <div className="flex items-center gap-1.5" title="Power">
                          <Zap className="w-3.5 h-3.5 text-amber-500" />
                          <span className="text-sm font-bold text-slate-700">{Math.round(effort.average_watts)}<span className="text-[10px] font-normal text-slate-400 ml-0.5">W</span></span>
                        </div>
                      )}
                      {effort.average_speed && (
                        <div className="flex items-center gap-1.5" title="Speed">
                          <Gauge className="w-3.5 h-3.5 text-blue-500" />
                          <span className="text-sm font-bold text-slate-700">{effort.average_speed.toFixed(1)}<span className="text-[10px] font-normal text-slate-400 ml-0.5">mph</span></span>
                        </div>
                      )}
                      {effort.average_heartrate && (
                        <div className="flex items-center gap-1.5" title="Heart Rate">
                          <Heart className="w-3.5 h-3.5 text-red-500" />
                          <span className="text-sm font-bold text-slate-700">{Math.round(effort.average_heartrate)}<span className="text-[10px] font-normal text-slate-400 ml-0.5">bpm</span></span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="py-6 px-4">
                    <div className="flex flex-col gap-2 min-w-[140px]">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                        <RankingBadge label="All Time" ranking={effort.rankings.all_time} />
                        <RankingBadge label="This Year" ranking={effort.rankings.this_year} />
                        <RankingBadge label="Same Gear" ranking={effort.rankings.same_gear} />
                        <RankingBadge label="Gear Year" ranking={effort.rankings.same_gear_this_year} />
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const Activities = () => {
  const [data, setData] = useState<ActivitiesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fitnessApi.getActivities(page);
        setData(res);
      } catch (error) {
        console.error("Error fetching activities:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [page]);

  if (loading && !data) return <div className="flex items-center justify-center h-full">Loading activities...</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Activity History</h2>
          <p className="text-slate-500">A complete log of your cycling activities and gear usage.</p>
        </div>
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-2 rounded-lg border border-slate-200 bg-white disabled:opacity-50 hover:bg-slate-50 transition-colors"
          >
            <ChevronRight className="w-5 h-5 rotate-180" />
          </button>
          <span className="text-sm font-bold text-slate-700 px-4">
            Page {page} of {data?.total_pages || 1}
          </span>
          <button
            onClick={() => setPage(p => Math.min(data?.total_pages || 1, p + 1))}
            disabled={page === data?.total_pages}
            className="p-2 rounded-lg border border-slate-200 bg-white disabled:opacity-50 hover:bg-slate-50 transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </header>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                <th className="py-4 px-6">Activity</th>
                <th className="py-4 px-6">Date</th>
                <th className="py-4 px-6">Distance</th>
                <th className="py-4 px-6">Moving Time</th>
                <th className="py-4 px-6">Gear</th>
                <th className="py-4 px-6 text-right">Avg Power</th>
                <th className="py-4 px-6 text-right">Avg HR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {data?.activities?.map(activity => (
                <tr key={activity.id} className="group hover:bg-slate-50 transition-colors">
                  <td className="py-4 px-6">
                    <Link to={`/activity/${activity.id}`} className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                      {activity.name}
                    </Link>
                  </td>
                  <td className="py-4 px-6 text-sm text-slate-500">{formatDisplayDate(activity.formatted_date)}</td>
                  <td className="py-4 px-6 text-sm font-medium text-slate-700">{activity.distance_miles.toFixed(1)} mi</td>
                  <td className="py-4 px-6 text-sm text-slate-500">{activity.moving_time_str}</td>
                  <td className="py-4 px-6">
                    <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-medium">
                      {activity.gear_name}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-sm text-right font-medium text-slate-700">{activity.average_watts ? `${Math.round(activity.average_watts)}W` : '--'}</td>
                  <td className="py-4 px-6 text-sm text-right text-slate-500">{activity.average_heartrate ? `${Math.round(activity.average_heartrate)} bpm` : '--'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {loading && (
          <div className="py-8 text-center text-slate-400 text-sm italic">
            Refreshing data...
          </div>
        )}
      </div>
    </div>
  );
};

const BikeUsageView = () => {
  const [bikeUsage, setBikeUsage] = useState<BikeUsage | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await fitnessApi.getBicycleUsage();
        setBikeUsage(data);
      } catch (error) {
        console.error("Error fetching bike usage:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <div className="flex items-center justify-center h-full">Loading bike usage data...</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header>
        <h2 className="text-3xl font-bold text-slate-900">Bike Usage</h2>
        <p className="text-slate-500">A detailed breakdown of your riding distance and frequency per bike.</p>
      </header>

      <div className="grid grid-cols-1 gap-8">
        {Object.entries(bikeUsage || {}).map(([bikeName, data]: [string, any]) => (
          <div key={bikeName} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                  <Bike className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">{bikeName}</h3>
                  <p className="text-sm text-slate-500">All-time stats</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-blue-600">{(data.all_time_total_distance || 0).toLocaleString()} mi</p>
                <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">{data.all_time_total_activities} Activities</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Object.entries(data.years).sort((a, b) => Number(b[0]) - Number(a[0])).map(([year, yearData]: [string, any]) => (
                <div key={year} className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-900 text-lg">{year}</h4>
                    <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-1 rounded">
                      {yearData.total_distance.toLocaleString()} mi
                    </span>
                  </div>
                  
                  <div className="space-y-2">
                    <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Monthly Breakdown</p>
                    <div className="space-y-1">
                      {Object.entries(yearData.months).sort((a, b) => b[0].localeCompare(a[0])).map(([month, monthData]: [string, any]) => (
                        <div key={month} className="flex justify-between items-center text-sm">
                          <span className="text-slate-600">{new Date(month + '-01').toLocaleString('default', { month: 'short' })}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-slate-400 text-xs">{monthData.activities} acts</span>
                            <span className="font-medium text-slate-900">{monthData.distance.toFixed(1)} mi</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const AICoach = () => {
  const [goal, setGoal] = useState<'endurance' | 'vo2max'>('endurance');
  const [duration, setDuration] = useState<14 | 21>(14);
  const [plan, setPlan] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const generatePlan = async () => {
    setLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Generate a ${duration}-day cycling training plan focused on increasing ${goal === 'endurance' ? 'endurance and aerobic base' : 'VO2 max and high-intensity power'}.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              days: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    day: { type: Type.INTEGER },
                    title: { type: Type.STRING },
                    activity: { type: Type.STRING },
                    duration: { type: Type.STRING },
                    intensity: { type: Type.STRING },
                    notes: { type: Type.STRING }
                  },
                  required: ["day", "title", "activity", "duration", "intensity"]
                }
              }
            },
            required: ["title", "description", "days"]
          }
        }
      });

      if (response.text) {
        setPlan(JSON.parse(response.text));
      }
    } catch (error) {
      console.error("Error generating training plan:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header>
        <h2 className="text-3xl font-bold text-slate-900">AI Training Coach</h2>
        <p className="text-slate-500">Get a personalized training plan to reach your cycling goals.</p>
      </header>

      <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <div className="space-y-4">
            <label className="text-sm font-bold text-slate-400 uppercase tracking-wider">Select Your Goal</label>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setGoal('endurance')}
                className={cn(
                  "p-4 rounded-xl border-2 transition-all text-left space-y-2",
                  goal === 'endurance' 
                    ? "border-blue-600 bg-blue-50" 
                    : "border-slate-100 hover:border-slate-200"
                )}
              >
                <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", goal === 'endurance' ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-400")}>
                  <TrendingUp className="w-5 h-5" />
                </div>
                <p className="font-bold text-slate-900">Endurance</p>
                <p className="text-xs text-slate-500">Focus on long rides and aerobic base building.</p>
              </button>
              <button
                onClick={() => setGoal('vo2max')}
                className={cn(
                  "p-4 rounded-xl border-2 transition-all text-left space-y-2",
                  goal === 'vo2max' 
                    ? "border-purple-600 bg-purple-50" 
                    : "border-slate-100 hover:border-slate-200"
                )}
              >
                <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", goal === 'vo2max' ? "bg-purple-600 text-white" : "bg-slate-100 text-slate-400")}>
                  <Zap className="w-5 h-5" />
                </div>
                <p className="font-bold text-slate-900">VO2 Max</p>
                <p className="text-xs text-slate-500">High intensity intervals to boost your top-end power.</p>
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-sm font-bold text-slate-400 uppercase tracking-wider">Plan Duration</label>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setDuration(14)}
                className={cn(
                  "p-4 rounded-xl border-2 transition-all text-left space-y-2",
                  duration === 14 
                    ? "border-slate-900 bg-slate-50" 
                    : "border-slate-100 hover:border-slate-200"
                )}
              >
                <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", duration === 14 ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-400")}>
                  <Calendar className="w-5 h-5" />
                </div>
                <p className="font-bold text-slate-900">14 Days</p>
                <p className="text-xs text-slate-500">A quick 2-week block to sharpen your fitness.</p>
              </button>
              <button
                onClick={() => setDuration(21)}
                className={cn(
                  "p-4 rounded-xl border-2 transition-all text-left space-y-2",
                  duration === 21 
                    ? "border-slate-900 bg-slate-50" 
                    : "border-slate-100 hover:border-slate-200"
                )}
              >
                <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", duration === 21 ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-400")}>
                  <Clock className="w-5 h-5" />
                </div>
                <p className="font-bold text-slate-900">21 Days</p>
                <p className="text-xs text-slate-500">A full 3-week cycle for significant adaptation.</p>
              </button>
            </div>
          </div>
        </div>

        <button
          onClick={generatePlan}
          disabled={loading}
          className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold text-lg shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Generating Your Plan...
            </>
          ) : (
            <>
              <BrainCircuit className="w-6 h-6" />
              Generate Training Plan
            </>
          )}
        </button>
      </div>

      {plan && (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-700">
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200">
            <h3 className="text-2xl font-bold text-slate-900 mb-2">{plan.title}</h3>
            <p className="text-slate-500 mb-8">{plan.description}</p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {plan.days.map((day: any) => (
                <div key={day.day} className="bg-slate-50 rounded-2xl p-6 border border-slate-100 flex flex-col h-full">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-bold bg-slate-900 text-white px-2 py-1 rounded">Day {day.day}</span>
                    <span className={cn(
                      "text-xs font-bold px-2 py-1 rounded",
                      day.intensity.toLowerCase().includes('high') ? "bg-red-100 text-red-700" :
                      day.intensity.toLowerCase().includes('mod') ? "bg-amber-100 text-amber-700" :
                      "bg-green-100 text-green-700"
                    )}>
                      {day.intensity}
                    </span>
                  </div>
                  <h4 className="font-bold text-slate-900 mb-2">{day.title}</h4>
                  <div className="flex items-center gap-2 text-sm text-slate-500 mb-4">
                    <Clock className="w-4 h-4" />
                    {day.duration}
                  </div>
                  <p className="text-sm text-slate-600 mb-4 flex-1">{day.activity}</p>
                  {day.notes && (
                    <div className="mt-auto pt-4 border-t border-slate-200">
                      <p className="text-xs text-slate-400 italic">Coach's Note: {day.notes}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <Router basename={import.meta.env.DEV ? '/' : '/velo-pulse/'}>
      <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row">
        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
        
        {/* Mobile Header */}
        <div className="lg:hidden bg-slate-900 text-white p-4 flex items-center justify-between sticky top-0 z-30 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <ActivityIcon className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">VeloPulse</h1>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 text-slate-400 hover:text-white"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>

        <main className="flex-1 lg:ml-64 p-4 md:p-8 max-w-7xl mx-auto w-full">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/comparison" element={<Comparison />} />
            <Route path="/usage" element={<BikeUsageView />} />
            <Route path="/maintenance" element={<Maintenance />} />
            <Route path="/trends" element={<Trends />} />
            <Route path="/coach" element={<AICoach />} />
            <Route path="/activities" element={<Activities />} />
            <Route path="/activity/:id" element={<ActivityDetailView />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}
