import {
  SegmentReport,
  SpeedTrends,
  PowerTrends,
  ChainUsage,
  BikeUsage,
  ActivitiesResponse
} from '../types';

const BASE_URL = '/api/v1';

export const fitnessApi = {
  getSegmentReport: async (): Promise<SegmentReport> => {
    const response = await fetch(`${BASE_URL}/segment-report`);
    if (!response.ok) throw new Error('Failed to fetch segment report');
    return response.json();
  },

  getSpeedTrends: async (): Promise<SpeedTrends> => {
    const response = await fetch(`${BASE_URL}/speed-trends`);
    if (!response.ok) throw new Error('Failed to fetch speed trends');
    return response.json();
  },

  getPowerTrends: async (): Promise<PowerTrends> => {
    const response = await fetch(`${BASE_URL}/power-trends`);
    if (!response.ok) throw new Error('Failed to fetch power trends');
    return response.json();
  },

  getChainUsage: async (): Promise<ChainUsage> => {
    const response = await fetch(`${BASE_URL}/chain-usage`);
    if (!response.ok) throw new Error('Failed to fetch chain usage');
    return response.json();
  },

  getBicycleUsage: async (): Promise<BikeUsage> => {
    const response = await fetch(`${BASE_URL}/bicycle-usage`);
    if (!response.ok) throw new Error('Failed to fetch bicycle usage');
    return response.json();
  },

  getActivities: async (page = 1, perPage = 25): Promise<ActivitiesResponse> => {
    const response = await fetch(`${BASE_URL}/activities?page=${page}&per_page=${perPage}`);
    if (!response.ok) throw new Error('Failed to fetch activities');
    return response.json();
  }
};
