import fs from 'fs'
import path from 'path'

let cachedData: any[] | null = null

export async function fetchStaticData() {
  // Return cached data if available
  if (cachedData) {
    return cachedData
  }

  try {
    const dataPath = path.join(process.cwd(), 'public/data')
    const detailPath = path.join(dataPath, 'detail')
    
    const allFiles: any[] = []

    // Read all directories in detail folder (00-ff)
    const prefixes = fs.readdirSync(detailPath).filter(file => {
      const filePath = path.join(detailPath, file)
      return fs.statSync(filePath).isDirectory()
    }).sort()

    for (const prefix of prefixes) {
      const prefixPath = path.join(detailPath, prefix)
      const jsonFiles = fs.readdirSync(prefixPath).filter(file => file.endsWith('.json'))

      for (const jsonFile of jsonFiles) {
        const filePath = path.join(prefixPath, jsonFile)
        const fileContent = fs.readFileSync(filePath, 'utf-8')
        const fileData = JSON.parse(fileContent)
        allFiles.push(fileData)
      }
    }

    // Cache the data
    cachedData = allFiles

    return allFiles
  } catch (error) {
    console.error('Failed to fetch static data:', error)
    throw new Error('Failed to fetch static data')
  }
}
