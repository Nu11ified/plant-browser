// Perenual API utility for plant browsing/search
// Docs: https://perenual.com/docs/api

const API_KEY = import.meta.env.VITE_API_KEY;
if (!API_KEY) {
  throw new Error('API_KEY is not set in environment variables.');
}
const BASE_URL = 'https://perenual.com/api/v2';

export interface PlantImage {
  image_id: number;
  license: number;
  license_name: string;
  license_url: string;
  original_url: string;
  regular_url: string;
  medium_url: string;
  small_url: string;
  thumbnail: string;
}

export interface Plant {
  id: number;
  common_name: string;
  scientific_name: string[];
  other_name: string[] | null;
  family: string | null;
  genus: string;
  default_image?: PlantImage;
}

export interface PlantListResponse {
  data: Plant[];
  to: number;
  per_page: number;
  current_page: number;
  from: number;
  last_page: number;
  total: number;
}

export interface PlantDetails extends Plant {
  description?: string;
  origin?: string;
  type?: string;
  dimensions?: any;
  cycle?: string;
  watering?: string;
  sunlight?: string[];
  pruning_month?: string[];
  pruning_count?: any;
  seeds?: number;
  attracts?: string[];
  propagation?: string[];
  hardiness?: any;
  hardiness_location?: any;
  flowers?: boolean;
  flowering_season?: string;
  soil?: string[];
  pest_susceptibility?: string[];
  cones?: boolean;
  fruits?: boolean;
  edible_fruit?: boolean;
  fruiting_season?: string;
  harvest_season?: string;
  harvest_method?: string;
  leaf?: boolean;
  edible_leaf?: boolean;
  growth_rate?: string;
  maintenance?: string;
  medicinal?: boolean;
  poisonous_to_humans?: boolean;
  poisonous_to_pets?: boolean;
  drought_tolerant?: boolean;
  salt_tolerant?: boolean;
  thorny?: boolean;
  invasive?: boolean;
  rare?: boolean;
  tropical?: boolean;
  cuisine?: boolean;
  indoor?: boolean;
  care_level?: string;
  other_images?: PlantImage[];
  // extended fields
  xWateringQuality?: string[];
  xWateringPeriod?: string[];
  xWateringAvgVolumeRequirement?: any[];
  xWateringDepthRequirement?: any[];
  xWateringBasedTemperature?: { unit: string; min: number; max: number };
  xWateringPhLevel?: { min: number; max: number };
  xSunlightDuration?: { min: string; max: string; unit: string };
}

// Disease
export interface DiseaseImage {
  license: number;
  license_name: string;
  license_url: string;
  original_url: string;
  regular_url: string;
  medium_url: string;
  small_url: string;
  thumbnail: string;
}
export interface Disease {
  id: number;
  common_name: string;
  scientific_name: string;
  other_name: string[] | null;
  family: string | null;
  description: string | null;
  solution: string | null;
  host: string[];
  images: DiseaseImage[];
}
export interface DiseaseListResponse {
  data: Disease[];
  to: number;
  per_page: number;
  current_page: number;
  from: number;
  last_page: number;
  total: number;
}

// Care Guide
export interface CareGuideSection {
  id: number;
  type: string;
  description: string;
}
export interface CareGuide {
  id: number;
  species_id: number;
  common_name: string;
  scientific_name: string[];
  section: CareGuideSection[];
}
export interface CareGuideListResponse {
  data: CareGuide[];
  to: number;
  per_page: number;
  current_page: number;
  from: number;
  last_page: number;
  total: number;
}

// Hardiness Map
export interface HardinessMapResponse {
  full_url: string;
  full_iframe: string;
}

// Fetch a paginated list of plants, with optional search query
export async function fetchPlants({
  page = 1,
  q = '',
  order = '',
  edible,
  poisonous,
  cycle,
  watering,
  sunlight,
  indoor,
  hardiness,
}: {
  page?: number;
  q?: string;
  order?: string;
  edible?: boolean;
  poisonous?: boolean;
  cycle?: string;
  watering?: string;
  sunlight?: string;
  indoor?: boolean;
  hardiness?: string;
} = {}): Promise<PlantListResponse> {
  const params = new URLSearchParams({
    key: API_KEY,
    page: String(page),
  });
  if (q) params.append('q', q);
  if (order) params.append('order', order);
  if (edible !== undefined) params.append('edible', edible ? '1' : '0');
  if (poisonous !== undefined) params.append('poisonous', poisonous ? '1' : '0');
  if (cycle) params.append('cycle', cycle);
  if (watering) params.append('watering', watering);
  if (sunlight) params.append('sunlight', sunlight);
  if (indoor !== undefined) params.append('indoor', indoor ? '1' : '0');
  if (hardiness) params.append('hardiness', hardiness);

  const url = `${BASE_URL}/species-list?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch plant list');
  return res.json();
}

// Fetch plant details by ID
export async function fetchPlantDetails(id: number): Promise<PlantDetails> {
  const url = `${BASE_URL}/species/details/${id}?key=${API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch plant details');
  return res.json();
}

// Fetch disease list (optionally by id, page, or query)
export async function fetchDiseaseList({
  id,
  page = 1,
  q = '',
}: {
  id?: number;
  page?: number;
  q?: string;
} = {}): Promise<DiseaseListResponse> {
  const params = new URLSearchParams({
    key: API_KEY,
    page: String(page),
  });
  if (id !== undefined) params.append('id', String(id));
  if (q) params.append('q', q);
  const url = `https://perenual.com/api/pest-disease-list?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch disease list');
  return res.json();
}

// Fetch care guide list (optionally by species_id, page, q, or type)
export async function fetchCareGuideList({
  species_id,
  page = 1,
  q = '',
  type = '',
}: {
  species_id?: number;
  page?: number;
  q?: string;
  type?: string;
} = {}): Promise<CareGuideListResponse> {
  const params = new URLSearchParams({
    key: API_KEY,
    page: String(page),
  });
  if (species_id !== undefined) params.append('species_id', String(species_id));
  if (q) params.append('q', q);
  if (type) params.append('type', type);
  const url = `https://perenual.com/api/species-care-guide-list?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch care guide list');
  return res.json();
}

// Fetch hardiness map for a species
export async function fetchHardinessMap({
  species_id,
}: {
  species_id: number;
}): Promise<HardinessMapResponse> {
  const params = new URLSearchParams({
    key: API_KEY,
    species_id: String(species_id),
  });
  const url = `https://perenual.com/api/hardiness-map?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch hardiness map');
  return res.json();
} 