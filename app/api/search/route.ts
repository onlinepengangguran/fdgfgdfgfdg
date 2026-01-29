import { NextResponse } from "next/server"
import { fetchStaticData } from "@/app/lib/fetchStaticData"
import { setCorsHeaders } from "@/app/lib/cors"
import { processTitle } from "@/app/lib/titleProcessor"

export const revalidate = 86400 // Revalidate every 24 hours (1 day)

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get("q")
  const page = Number.parseInt(searchParams.get("page") || "1")
  const perPage = Number.parseInt(searchParams.get("per_page") || "100")

  if (!query) {
    const errorResponse = NextResponse.json({ error: "Search query is required" }, { status: 400 })
    return setCorsHeaders(errorResponse)
  }

  try {
    const data = await fetchStaticData()
    
    // Memisahkan query menjadi array kata-kata
    const keywords = query.toLowerCase().split(/\s+/).filter(Boolean)
    
    // Membuat Set untuk menyimpan filecode yang sudah ditemukan agar tidak ada duplikat
    const seenFileCodes = new Set<string>()
    
    // Mencari hasil untuk setiap kata kunci
    const searchResults = data
      .filter((file: any) => {
        const titleLower = file.title.toLowerCase()
        // Hanya menyertakan file yang belum dilihat dan cocok dengan salah satu kata kunci
        return !seenFileCodes.has(file.filecode) && 
               keywords.some(keyword => titleLower.includes(keyword))
      })
      // Sort by relevance: number of keyword matches in title (descending)
      .sort((a: any, b: any) => {
        const aTitle = a.title.toLowerCase()
        const bTitle = b.title.toLowerCase()
        const fullQuery = query.toLowerCase()

        const aFullMatch = aTitle.includes(fullQuery)
        const bFullMatch = bTitle.includes(fullQuery)

        if (aFullMatch && !bFullMatch) return -1
        if (!aFullMatch && bFullMatch) return 1

        const aMatches = keywords.filter(keyword => aTitle.includes(keyword)).length
        const bMatches = keywords.filter(keyword => bTitle.includes(keyword)).length
        return bMatches - aMatches
      })
      .map((file: any) => {
        // Menambahkan filecode ke Set setelah diproses
        seenFileCodes.add(file.filecode)
        return {
          single_img: file.single_img,
          length: file.length,
          views: file.views,
          title: processTitle(file.title),
          file_code: file.filecode,
          uploaded: file.uploaded,
          splash_img: file.splash_img,
        }
      })

    const startIndex = (page - 1) * perPage
    const endIndex = startIndex + perPage
    const paginatedResults = searchResults.slice(startIndex, endIndex)

    const response = NextResponse.json({
      server_time: new Date().toISOString().replace("T", " ").substr(0, 19),
      status: 200,
      msg: "OK",
      total_videos: searchResults.length,
      result: paginatedResults,
    })

    const corsResponse = setCorsHeaders(response)
    corsResponse.headers.set('Cache-Control', 'public, max-age=86400, stale-while-revalidate=3600')
    return corsResponse
  } catch (error) {
    const errorResponse = NextResponse.json({ error: "Failed to fetch data" }, { status: 500 })
    const corsErrorResponse = setCorsHeaders(errorResponse)
    corsErrorResponse.headers.set('Cache-Control', 'public, max-age=86400, stale-while-revalidate=3600')
    return corsErrorResponse
  }
}

export async function OPTIONS() {
  return setCorsHeaders(new NextResponse(null, { status: 200 }))
}

