let cachedData: any = null
let lastFetchTime = 0
const CACHE_DURATION = 24 * 60 * 60 * 1000 // 1 day in milliseconds

export async function fetchDataWithCache() {
  const currentTime = Date.now()

  if (cachedData && currentTime - lastFetchTime < CACHE_DURATION) {
    return cachedData
  }

  try {
    const response = await fetch("https://akulakasa.pages.dev/data.json")
    cachedData = await response.json()
    lastFetchTime = currentTime
    return cachedData
  } catch (error) {
    console.error("Failed to fetch data:", error)
    throw new Error("Failed to fetch data")
  }
}

