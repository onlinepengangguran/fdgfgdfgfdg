import { promises as fs } from 'fs'
import path from 'path'

const DATA_DIR = path.join(process.cwd(), 'public/data')
const LIST_DIR = path.join(DATA_DIR, 'list')
const DETAIL_DIR = path.join(DATA_DIR, 'detail')
const INDEX_DIR = path.join(DATA_DIR, 'index')

// In-memory cache untuk meta dan halaman list
let metaCache: any = null
let listPageCache: Map<number, any> = new Map()

/**
 * Mengambil detail file berdasarkan file_code
 * Load per-request, bukan preload semua
 */
export async function getFileDetail(fileCode: string) {
  try {
    const prefix = fileCode.substring(0, 2)
    const filePath = path.join(DETAIL_DIR, prefix, `${fileCode}.json`)
    const content = await fs.readFile(filePath, 'utf-8')
    return JSON.parse(content)
  } catch (error) {
    console.error(`Failed to fetch detail for ${fileCode}:`, error)
    return null
  }
}

/**
 * Mengambil list data dengan pagination
 * Menggunakan data_page_X.json yang sudah ter-paginate
 */
export async function getListData(page: number) {
  try {
    if (listPageCache.has(page)) {
      return listPageCache.get(page)
    }

    const filePath = path.join(LIST_DIR, `${page}.json`)
    const content = await fs.readFile(filePath, 'utf-8')
    const data = JSON.parse(content)
    
    // Cache hasil
    listPageCache.set(page, data)
    return data
  } catch (error) {
    console.error(`Failed to fetch list page ${page}:`, error)
    return { data: [], page, per_page: 200, total: 0, total_pages: 0 }
  }
}

/**
 * Mengambil search index untuk prefix tertentu
 * Gunakan untuk search functionality
 */
export async function getSearchIndex(prefix: string) {
  try {
    // Coba file prefix dulu (misal: aa.json)
    try {
      const filePath = path.join(INDEX_DIR, `${prefix}.json`)
      const content = await fs.readFile(filePath, 'utf-8')
      return JSON.parse(content)
    } catch {
      // Jika tidak ada file, mungkin folder (misal: ab/)
      // Untuk sekarang return empty array
      return []
    }
  } catch (error) {
    console.error(`Failed to fetch search index for ${prefix}:`, error)
    return []
  }
}

/**
 * Mengambil metadata (total files, per_page, dll)
 */
export async function getMeta() {
  try {
    if (metaCache) {
      return metaCache
    }

    const filePath = path.join(DATA_DIR, 'meta.json')
    const content = await fs.readFile(filePath, 'utf-8')
    metaCache = JSON.parse(content)
    return metaCache
  } catch (error) {
    console.error('Failed to fetch meta:', error)
    return { total: 0, per_page: 200 }
  }
}

/**
 * Helper untuk search di file-file index
 * Ini adalah alternatif jika tidak pakai file index
 * tapi tetap lebih optimal daripada load semua detail
 */
export async function searchInAllPages(query: string, maxResults = 100) {
  try {
    const meta = await getMeta()
    const totalPages = meta.total_pages || 137
    
    const keywords = query.toLowerCase().split(/\s+/).filter(Boolean)
    const results: any[] = []
    const seenFileCodes = new Set<string>()

    // Limit pencarian ke beberapa halaman pertama untuk performa
    const pagesToSearch = Math.min(totalPages, 10)

    for (let page = 1; page <= pagesToSearch && results.length < maxResults; page++) {
      const pageData = await getListData(page)
      const items = pageData.data || []

      for (const item of items) {
        if (seenFileCodes.has(item.file_code)) continue

        const titleLower = item.title.toLowerCase()
        const isMatch = keywords.some(keyword => titleLower.includes(keyword))

        if (isMatch) {
          seenFileCodes.add(item.file_code)
          results.push(item)
          if (results.length >= maxResults) break
        }
      }
    }

    // Sort by relevance
    results.sort((a, b) => {
      const aTitle = a.title.toLowerCase()
      const bTitle = b.title.toLowerCase()
      const fullQuery = query.toLowerCase()

      const aFullMatch = aTitle.includes(fullQuery)
      const bFullMatch = bTitle.includes(fullQuery)

      if (aFullMatch && !bFullMatch) return -1
      if (!aFullMatch && bFullMatch) return 1

      const aMatches = keywords.filter(k => aTitle.includes(k)).length
      const bMatches = keywords.filter(k => bTitle.includes(k)).length
      return bMatches - aMatches
    })

    return results
  } catch (error) {
    console.error('Failed to search:', error)
    return []
  }
}
