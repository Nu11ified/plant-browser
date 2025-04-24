import React, { useState, useCallback, useRef, useMemo } from 'react';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '../ui/dialog';
import { Skeleton } from '../ui/skeleton';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../ui/select';
import { Switch } from '../ui/switch';
import { fetchPlants, fetchPlantDetails } from '../../lib/perenual';
import type { Plant, PlantDetails, PlantListResponse } from '../../lib/perenual';
import { useWindowVirtualizer, elementScroll } from '@tanstack/react-virtual';
import { useInfiniteQuery } from '@tanstack/react-query';
import type { Virtualizer, VirtualizerOptions } from '@tanstack/react-virtual';
import { toast } from 'sonner';

// --- Custom debounce hook ---
function useDebouncedValue<T>(value: T, delay: number) {
  const [debounced, setDebounced] = useState(value);
  React.useEffect(() => {
    const handler = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debounced;
}

// --- Smooth scroll function ---
function easeInOutQuint(t: number) {
  return t < 0.5 ? 16 * t * t * t * t * t : 1 + 16 * --t * t * t * t * t;
}

const FAVORITES_KEY = 'plant_favorites';
function useFavorites() {
  const [favorites, setFavorites] = useState<number[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]');
    } catch {
      return [];
    }
  });
  React.useEffect(() => {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  }, [favorites]);
  const toggleFavorite = (id: number) => {
    setFavorites(favs => favs.includes(id) ? favs.filter(f => f !== id) : [...favs, id]);
  };
  return { favorites, toggleFavorite };
}

const CYCLE_OPTIONS = [
  { value: 'any', label: 'Any Cycle' },
  { value: 'perennial', label: 'Perennial' },
  { value: 'annual', label: 'Annual' },
  { value: 'biennial', label: 'Biennial' },
  { value: 'biannual', label: 'Biannual' },
];
const WATERING_OPTIONS = [
  { value: 'any', label: 'Any Watering' },
  { value: 'frequent', label: 'Frequent' },
  { value: 'average', label: 'Average' },
  { value: 'minimum', label: 'Minimum' },
  { value: 'none', label: 'None' },
];
const SUNLIGHT_OPTIONS = [
  { value: 'any', label: 'Any Sunlight' },
  { value: 'full_shade', label: 'Full Shade' },
  { value: 'part_shade', label: 'Part Shade' },
  { value: 'sun-part_shade', label: 'Sun/Part Shade' },
  { value: 'full_sun', label: 'Full Sun' },
];
const HARDINESS_OPTIONS = [
  { value: 'any', label: 'Any Zone' },
  ...Array.from({ length: 13 }, (_, i) => ({ value: String(i + 1), label: `Zone ${i + 1}` })),
];

export default function PlantBrowser() {
  // --- State ---
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebouncedValue(searchInput, 400);
  const [selectedPlant, setSelectedPlant] = useState<PlantDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [showFavorites, setShowFavorites] = useState(false);
  const [cycle, setCycle] = useState('any');
  const [watering, setWatering] = useState('any');
  const [sunlight, setSunlight] = useState('any');
  const [edible, setEdible] = useState(false);
  const [poisonous, setPoisonous] = useState(false);
  const [indoor, setIndoor] = useState(false);
  const [hardiness, setHardiness] = useState('any');
  const { favorites, toggleFavorite } = useFavorites();
  const listRef = useRef<HTMLDivElement | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);

  // --- Infinite Query ---
  const {
    status,
    data,
    error,
    isFetching,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
  } = useInfiniteQuery({
    queryKey: [
      'plants',
      debouncedSearch,
      cycle,
      watering,
      sunlight,
      edible,
      poisonous,
      indoor,
      hardiness,
    ],
    queryFn: async ({ pageParam = 1 }) => {
      toast('Fetching plants from API...');
      try {
        const res = await fetchPlants({
          page: pageParam,
          q: debouncedSearch,
          cycle: cycle === 'any' ? undefined : cycle,
          watering: watering === 'any' ? undefined : watering,
          sunlight: sunlight === 'any' ? undefined : sunlight,
          edible: edible ? true : undefined,
          poisonous: poisonous ? true : undefined,
          indoor: indoor ? true : undefined,
          hardiness: hardiness === 'any' ? undefined : hardiness,
        });
        if (!res.data || res.data.length === 0) {
          toast.error('No plants found for the current filters.', { description: 'Try adjusting your search or filters.' });
        }
        return res;
      } catch (err: any) {
        toast.error('API Error', { description: err?.message || 'Failed to fetch plants.' });
        throw err;
      }
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.current_page < lastPage.last_page) {
        return lastPage.current_page + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
  });

  // --- Data flattening and filtering ---
  const allPlants = useMemo(
    () => (data ? data.pages.flatMap((d) => (d as PlantListResponse).data) : []),
    [data]
  );
  const filteredPlants = useMemo(
    () => (showFavorites ? allPlants.filter((p) => favorites.includes(p.id)) : allPlants),
    [allPlants, showFavorites, favorites]
  );

  // --- Window Virtualizer ---
  const virtualizer = useWindowVirtualizer({
    count: hasNextPage ? filteredPlants.length + 1 : filteredPlants.length,
    estimateSize: () => 112,
    overscan: 8,
    scrollMargin: listRef.current?.offsetTop ?? 0,
    scrollToFn: useCallback((offset: number, options: { adjustments?: number; behavior?: ScrollBehavior }, instance: Virtualizer<Window, Element>) => {
      const duration = 700;
      const start = window.scrollY;
      const startTime = Date.now();
      const canSmooth = options.behavior === 'smooth';
      function run() {
        const now = Date.now();
        const elapsed = now - startTime;
        const progress = easeInOutQuint(Math.min(elapsed / duration, 1));
        const interpolated = start + (offset - start) * progress;
        elementScroll(interpolated, { ...options, behavior: options.behavior as any }, instance as any);
        if (elapsed < duration) {
          requestAnimationFrame(run);
        } else {
          elementScroll(offset, { ...options, behavior: options.behavior as any }, instance as any);
        }
      }
      requestAnimationFrame(run);
    }, []),
  });

  // --- Infinite scroll trigger ---
  React.useEffect(() => {
    const [lastItem] = [...virtualizer.getVirtualItems()].reverse();
    if (!lastItem) return;
    if (
      lastItem.index >= filteredPlants.length - 1 &&
      hasNextPage &&
      !isFetchingNextPage
    ) {
      fetchNextPage();
    }
  }, [hasNextPage, fetchNextPage, filteredPlants.length, isFetchingNextPage, virtualizer.getVirtualItems()]);

  // --- Scroll to top button visibility ---
  React.useEffect(() => {
    const onScroll = () => {
      setShowScrollTop(window.scrollY > 200);
    };
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // --- Plant details modal ---
  const openDetails = useCallback(async (plant: Plant) => {
    setDetailsLoading(true);
    setSelectedPlant(null);
    try {
      const details = await fetchPlantDetails(plant.id);
      setSelectedPlant(details);
    } finally {
      setDetailsLoading(false);
    }
  }, []);

  // --- UI ---
  const fadeInClass =
    'transition-opacity duration-500 ease-in opacity-0 will-change-auto animate-fadein';

  return (
    <div className="max-w-3xl mx-auto py-8">
      {/* Modern header */}
      <header className="mb-8 flex flex-col items-center gap-2">
        <div className="flex items-center gap-2">
          <span className="text-4xl">🌱</span>
          <span className="text-2xl font-bold tracking-tight">Plant Browser</span>
        </div>
        <p className="text-muted-foreground text-center max-w-xl">
          Discover, search, and favorite plants from a massive database. Powered by Perenual API.
        </p>
      </header>
      {/* Sticky glassy search bar */}
      <div className="sticky top-0 z-10 mb-2 bg-white/80 dark:bg-zinc-900/80 backdrop-blur border-b border-zinc-200 dark:border-zinc-800 shadow-sm rounded-xl flex flex-col sm:flex-row gap-2 p-3">
        <Input
          placeholder="Search plants..."
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          className="flex-1"
          aria-label="Search plants"
        />
        <Button variant="outline" onClick={() => setSearchInput('')}>Clear</Button>
        <Button
          variant={showFavorites ? 'default' : 'outline'}
          onClick={() => setShowFavorites(f => !f)}
          aria-pressed={showFavorites}
        >
          {showFavorites ? '★ Favorites' : '☆ Favorites'}
        </Button>
      </div>
      {/* Filter bar */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
        <Select value={cycle} onValueChange={setCycle}>
          <SelectTrigger className="min-w-[120px]">
            <SelectValue placeholder="Cycle" />
          </SelectTrigger>
          <SelectContent>
            {CYCLE_OPTIONS.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={watering} onValueChange={setWatering}>
          <SelectTrigger className="min-w-[120px]">
            <SelectValue placeholder="Watering" />
          </SelectTrigger>
          <SelectContent>
            {WATERING_OPTIONS.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sunlight} onValueChange={setSunlight}>
          <SelectTrigger className="min-w-[120px]">
            <SelectValue placeholder="Sunlight" />
          </SelectTrigger>
          <SelectContent>
            {SUNLIGHT_OPTIONS.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={hardiness} onValueChange={setHardiness}>
          <SelectTrigger className="min-w-[120px]">
            <SelectValue placeholder="Hardiness" />
          </SelectTrigger>
          <SelectContent>
            {HARDINESS_OPTIONS.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-1 px-2">
          <Switch checked={edible} onCheckedChange={setEdible} id="edible" />
          <label htmlFor="edible" className="text-xs">Edible</label>
        </div>
        <div className="flex items-center gap-1 px-2">
          <Switch checked={poisonous} onCheckedChange={setPoisonous} id="poisonous" />
          <label htmlFor="poisonous" className="text-xs">Poisonous</label>
        </div>
        <div className="flex items-center gap-1 px-2">
          <Switch checked={indoor} onCheckedChange={setIndoor} id="indoor" />
          <label htmlFor="indoor" className="text-xs">Indoor</label>
        </div>
      </div>
      {/* Plant list (window virtualizer) */}
      <div ref={listRef} className="List" style={{ position: 'relative', minHeight: '70vh' }}>
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {status === 'pending' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-28 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : filteredPlants.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No plants found.</div>
          ) : (
            virtualizer.getVirtualItems().map((virtualRow) => {
              const isLoaderRow = virtualRow.index > filteredPlants.length - 1;
              const plant = filteredPlants[virtualRow.index];
              return (
                <div
                  key={virtualRow.key}
                  className={fadeInClass + ' opacity-100'}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start - (virtualizer.options.scrollMargin || 0)}px)`
                  }}
                >
                  {isLoaderRow ? (
                    hasNextPage ? 'Loading more...' : 'Nothing more to load'
                  ) : (
                    <Card
                      className="flex items-center gap-4 p-4 m-2 cursor-pointer hover:bg-muted transition rounded-xl shadow-sm"
                      onClick={() => openDetails(plant)}
                      tabIndex={0}
                      aria-label={`View details for ${plant.common_name}`}
                    >
                      <div className="flex-shrink-0 w-16 h-16 flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 rounded shadow">
                        {plant.default_image?.small_url ? (
                          <img
                            src={plant.default_image.small_url}
                            alt={plant.common_name}
                            className="w-16 h-16 object-cover rounded"
                            loading="lazy"
                          />
                        ) : (
                          <span className="text-xs text-muted-foreground">No Image</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-lg line-clamp-1">{plant.common_name || 'Unknown Plant'}</div>
                        <div className="text-muted-foreground text-sm line-clamp-1">{plant.scientific_name?.join(', ')}</div>
                      </div>
                      <Button
                        variant={favorites.includes(plant.id) ? 'default' : 'outline'}
                        size="icon"
                        onClick={e => { e.stopPropagation(); toggleFavorite(plant.id); }}
                        aria-label={favorites.includes(plant.id) ? 'Unfavorite' : 'Favorite'}
                      >
                        {favorites.includes(plant.id) ? '★' : '☆'}
                      </Button>
                    </Card>
                  )}
                </div>
              );
            })
          )}
        </div>
        {/* Floating scroll to top button */}
        {showScrollTop && (
          <Button
            className="fixed bottom-8 right-8 z-20 shadow-lg rounded-full bg-white/80 dark:bg-zinc-900/80 backdrop-blur border border-zinc-200 dark:border-zinc-800"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            aria-label="Scroll to top"
          >
            ⬆️
          </Button>
        )}
      </div>
      {/* Plant details modal */}
      <Dialog open={!!selectedPlant || detailsLoading} onOpenChange={() => setSelectedPlant(null)}>
        <DialogContent className="max-w-2xl">
          {detailsLoading || !selectedPlant ? (
            <div className="space-y-4">
              <Skeleton className="h-8 w-1/2" />
              <Skeleton className="h-6 w-1/3" />
              <Skeleton className="h-60 w-full rounded-xl" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ) : (
            <>
              <DialogTitle className="text-2xl font-bold mb-1">{selectedPlant.common_name}</DialogTitle>
              <DialogDescription className="mb-2 text-base">
                {selectedPlant.scientific_name?.join(', ')}
              </DialogDescription>
              <img
                src={selectedPlant.default_image?.regular_url || ''}
                alt={selectedPlant.common_name}
                className="w-full h-60 object-cover rounded-xl mb-4 shadow"
              />
              <div className="text-sm whitespace-pre-line mb-2">{selectedPlant.description}</div>
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mb-2">
                {selectedPlant.sunlight?.length && <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 rounded">☀️ {selectedPlant.sunlight.join(', ')}</span>}
                {selectedPlant.watering && <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 rounded">💧 {selectedPlant.watering}</span>}
                {selectedPlant.cycle && <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 rounded">🌱 {selectedPlant.cycle}</span>}
                {selectedPlant.family && <span className="px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 rounded">🌳 {selectedPlant.family}</span>}
                {selectedPlant.edible_fruit && <span className="px-2 py-1 bg-pink-100 dark:bg-pink-900/30 rounded">🍎 Edible Fruit</span>}
                {selectedPlant.medicinal && <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 rounded">🩺 Medicinal</span>}
                {selectedPlant.poisonous_to_humans && <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 rounded">☠️ Poisonous</span>}
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {selectedPlant.other_name?.map((name, i) => (
                  <span key={i} className="px-2 py-1 bg-zinc-100 dark:bg-zinc-800/50 rounded text-xs">{name}</span>
                ))}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
} 