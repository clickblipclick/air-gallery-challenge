import { fetchBoards } from "./api/boards";
import { fetchAssets } from "./api/clips";
import { Section } from "./Section";
import { AssetGallery } from "./AssetGallery";
import { BoardList } from "./BoardList";
import { SelectionProvider } from "./SelectionContext";

export default async function Home() {
  const { data: boards } = await fetchBoards();
  const {
    data: { clips: assets },
  } = await fetchAssets({ cursor: null });

  return (
    <SelectionProvider>
      <main className="flex flex-col gap-8 py-8">
        <Section title="Boards">
          <BoardList boards={boards} />
        </Section>
        <Section title="Assets">
          <AssetGallery assets={assets} />
        </Section>
      </main>
    </SelectionProvider>
  );
}
