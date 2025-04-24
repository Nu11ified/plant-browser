import PlantBrowser from "../components/PlantBrowser/PlantBrowser";

export function meta() {
  return [
    { title: "Plant Browser | Modern Botany App" },
    { name: "description", content: "Browse, search, and favorite plants with a beautiful, modern UI." },
  ];
}

export default function PlantsPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 dark:from-zinc-900 dark:to-green-950 py-8">
      <div className="container mx-auto px-4">
        <PlantBrowser />
      </div>
    </main>
  );
} 