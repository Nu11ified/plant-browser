import React, { useState, useCallback, useEffect } from 'react';
import { Card, CardContent } from '../ui/card';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '../ui/dialog';
import { Skeleton } from '../ui/skeleton';
import { fetchPlants, fetchPlantDetails } from '../../lib/perenual';
import type { Plant, PlantDetails } from '../../lib/perenual';
import { useVirtualizer } from '@tanstack/react-virtual';
// TODO: If types are missing, run: npm i -D @tanstack/react-virtual

const FAVORITES_KEY = 'plant_favorites';

function useFavorites() {
  const [favorites, setFavorites] = useState<number[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]');
    } catch {
      return [];
    }
  });
  useEffect(() => {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  }, [favorites]);
  const toggleFavorite = (id: number) => {
    setFavorites(favs => favs.includes(id) ? favs.filter(f => f !== id) : [...favs, id]);
  };
  return { favorites, toggleFavorite };
}

export default function PlantBrowser() {
  const [plants, setPlants] = useState<Plant[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [selectedPlant, setSelectedPlant] = useState<PlantDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const { favorites, toggleFavorite } = useFavorites();
  const parentRef = React.useRef<HTMLDivElement>(null);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setPlants([]);
      setPage(1);
      setHasMore(true);
      setSearch(searchInput);
    }, 400);
    return () => clearTimeout(handler);
  }, [searchInput]);

  // Fetch plants
  useEffect(() => {
    let ignore = false;
    async function load() {
      setLoading(true);
      try {
        const res = await fetchPlants({ page, q: search });
        if (!ignore) {
          setPlants(prev => page === 1 ? res.data : [...prev, ...res.data]);
          setHasMore(page < res.last_page);
        }
      } catch {
        // handle error
      } finally {
        setLoading(false);
      }
    }
    load();
    return () => { ignore = true; };
  }, [page, search]);

  // Virtualizer
  const rowVirtualizer = useVirtualizer({
    count: plants.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 96,
    overscan: 8,
  });

  // Infinite scroll
  useEffect(() => {
    const el = parentRef.current;
    if (!el) return;
    const onScroll = () => {
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 300 && hasMore && !loading) {
        setPage(p => p + 1);
      }
    };
    el.addEventListener('scroll', onScroll);
    return () => el.removeEventListener('scroll', onScroll);
  }, [hasMore, loading]);

  // Plant details modal
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

  return (
    <div className="max-w-3xl mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6 text-center">🌱 Plant Browser</h1>
      <div className="flex gap-2 mb-4">
        <Input
          placeholder="Search plants..."
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          className="flex-1"
        />
        <Button variant="outline" onClick={() => setSearchInput('')}>Clear</Button>
      </div>
      <div
        ref={parentRef}
        className="relative h-[70vh] overflow-auto border rounded-lg bg-background"
      >
        <div style={{ height: rowVirtualizer.getTotalSize(), position: 'relative' }}>
          {rowVirtualizer.getVirtualItems().map((virtualRow: ReturnType<typeof rowVirtualizer.getVirtualItems>[number]) => {
            const plant = plants[virtualRow.index];
            return (
              <div
                key={plant?.id || virtualRow.index}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualRow.start}px)`
                }}
              >
                {plant ? (
                  <Card
                    className="flex items-center gap-4 p-4 m-2 cursor-pointer hover:bg-muted transition"
                    onClick={() => openDetails(plant)}
                  >
                    <img
                      src={plant.default_image?.small_url || ''}
                      alt={plant.common_name}
                      className="w-16 h-16 object-cover rounded shadow"
                      loading="lazy"
                    />
                    <div className="flex-1">
                      <div className="font-semibold text-lg">{plant.common_name}</div>
                      <div className="text-muted-foreground text-sm">{plant.scientific_name?.join(', ')}</div>
                    </div>
                    <Button
                      variant={favorites.includes(plant.id) ? 'default' : 'outline'}
                      size="icon"
                      onClick={e => { e.stopPropagation(); toggleFavorite(plant.id); }}
                      aria-label="Favorite"
                    >
                      {favorites.includes(plant.id) ? '★' : '☆'}
                    </Button>
                  </Card>
                ) : (
                  <Skeleton className="h-24 m-2 rounded" />
                )}
              </div>
            );
          })}
          {loading && (
            <div className="p-4">
              <Skeleton className="h-24 mb-2 rounded" />
              <Skeleton className="h-24 mb-2 rounded" />
            </div>
          )}
        </div>
      </div>
      <Dialog open={!!selectedPlant || detailsLoading} onOpenChange={() => setSelectedPlant(null)}>
        <DialogContent className="max-w-lg">
          {detailsLoading || !selectedPlant ? (
            <div className="space-y-4">
              <Skeleton className="h-8 w-1/2" />
              <Skeleton className="h-6 w-1/3" />
              <Skeleton className="h-40 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ) : (
            <>
              <DialogTitle>{selectedPlant.common_name}</DialogTitle>
              <DialogDescription className="mb-2">
                {selectedPlant.scientific_name?.join(', ')}
              </DialogDescription>
              <img
                src={selectedPlant.default_image?.regular_url || ''}
                alt={selectedPlant.common_name}
                className="w-full h-40 object-cover rounded mb-4"
              />
              <div className="text-sm whitespace-pre-line mb-2">{selectedPlant.description}</div>
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                {selectedPlant.sunlight?.length && <span>☀️ {selectedPlant.sunlight.join(', ')}</span>}
                {selectedPlant.watering && <span>💧 {selectedPlant.watering}</span>}
                {selectedPlant.cycle && <span>🌱 {selectedPlant.cycle}</span>}
                {selectedPlant.family && <span>🌳 {selectedPlant.family}</span>}
                {selectedPlant.edible_fruit && <span>🍎 Edible Fruit</span>}
                {selectedPlant.medicinal && <span>🩺 Medicinal</span>}
                {selectedPlant.poisonous_to_humans && <span>☠️ Poisonous</span>}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
} 