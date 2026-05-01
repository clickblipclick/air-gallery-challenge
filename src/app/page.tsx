import { fetchBoards } from "./api/boards";
import { fetchAssets } from "./api/clips";
import { Section } from "./Section";
import { AssetGallery } from "./AssetGallery";
import { BoardList } from "./BoardList";
import { SelectionProvider } from "./SelectionContext";
import { AssetsProvider } from "./AssetsProvider";
import { DnDProvider } from "./DnDProvider";
import { SelectionBar } from "./SelectionBar";

export default async function Home() {
  const { data: boards, total: boardTotal } = await fetchBoards();
  const {
    data: { clips: assets, total: clipsTotal },
    pagination,
  } = await fetchAssets({
    cursor: null,
  });

  return (
    <SelectionProvider>
      <AssetsProvider
        initialAssets={assets}
        initialCursor={pagination.cursor}
        initialHasMore={pagination.hasMore}
      >
        <DnDProvider>
          <main className="flex flex-col gap-8 py-8">
            <Section title={`${boardTotal} Boards`}>
              <BoardList boards={boards} />
            </Section>
            <Section title={`${clipsTotal} Assets`}>
              <AssetGallery />
            </Section>
          </main>
          <SelectionBar />
        </DnDProvider>
      </AssetsProvider>
    </SelectionProvider>
  );
}
