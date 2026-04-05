export interface SegmentEffort {
  average_cadence: number;
  average_hr: number;
  average_watts: number;
  date: string;
  elapsed_time: number;
  gear: string;
  is_estimated: boolean;
  rank: number;
}

export interface SegmentReport {
  [bucket: string]: {
    [segmentName: string]: SegmentEffort[];
  };
}

export interface SpeedTrendEffort {
  date: string;
  elapsed_time: number;
  segment_name: string;
  speed: number;
  timestamp: number;
}

export interface SpeedTrendGear {
  description: string;
  prediction: string;
  efforts: SpeedTrendEffort[];
  trendline: number[];
}

export interface SpeedTrendSummaryPerformance {
  average_speed: number;
  gear: string;
}

export interface SpeedTrendBucket {
  segments: string[];
  gears: {
    [bikeName: string]: SpeedTrendGear;
  };
  summary: {
    fastest_gear: string;
    performance: SpeedTrendSummaryPerformance[];
  };
}

export interface SpeedTrends {
  [bucket: string]: SpeedTrendBucket;
}

export interface PowerTrendMonth {
  avg_power: number;
  month: string;
  num_efforts: number;
}

export interface PowerTrends {
  [bucket: string]: {
    segments: string[];
    data: PowerTrendMonth[];
  };
}

export interface BikeMaintenance {
  chain_target_id: string | null;
  id: string;
  last_chain_replacement: string;
  last_chain_wax: string;
  miles_last_year: number;
  miles_since_replacement: number;
  miles_since_wax: number;
  name: string;
}

export interface ChainUsage {
  all_bikes: string[];
  main_bikes: BikeMaintenance[];
  trainer_bikes: BikeMaintenance[];
}

export interface MonthUsage {
  activities: number;
  distance: number;
}

export interface YearUsage {
  months: {
    [month: string]: MonthUsage;
  };
  total_activities: number;
  total_distance: number;
}

export interface BikeUsage {
  [bikeName: string]: {
    all_time_total_activities: number;
    all_time_total_distance: number;
    years: {
      [year: string]: YearUsage;
    };
  };
}

export interface Activity {
  average_heartrate: number;
  date_iso: string;
  detected_gear_name: string;
  distance: number;
  distance_miles: number;
  formatted_date: string;
  gear_name: string;
  id: number;
  moving_time: number;
  moving_time_str: string;
  name: string;
  start_date_local: string;
}

export interface ActivitiesResponse {
  page: number;
  per_page: number;
  total_activities: number;
  total_pages: number;
  activities: Activity[];
}
