import { fetchBoards } from "./api/boards";
import { fetchAssets } from "./api/clips";
import { Section } from "./Section";
import { AssetGallery } from "./AssetGallery";

export default async function Home() {
  const { data: boards } = await fetchBoards();
  const {
    data: { clips: assets },
  } = await fetchAssets({ cursor: null });

  return (
    <main className="flex flex-col gap-8 py-8">
      <Section title="Boards">
        <ul className="flex flex-wrap gap-2">
          {boards.map((board) => (
            <li
              className="aspect-square w-48 h-48 relative flex p-2 border rounded-md overflow-hidden"
              key={board.id}
            >
              <img
                src={board.thumbnails?.[0]}
                alt={board.title}
                className="object-cover absolute inset-0"
              />
              <span className="absolute inset-0 flex items-end justify-start p-4 pb-3 bg-gradient-to-t from-black/80 via-black/30 to-transparent text-white">
                {board.title}
              </span>
            </li>
          ))}
        </ul>
      </Section>
      <Section title="Assets">
        <AssetGallery assets={assets} />
      </Section>
    </main>
  );
}
