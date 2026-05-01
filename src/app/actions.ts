"use server";

import { fetchAssets } from "./api/clips";

export async function loadMoreAssets(cursor: string | null) {
  return fetchAssets({ cursor });
}
