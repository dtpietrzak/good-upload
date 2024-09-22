import fs from 'fs'
import path from 'path'

/**
 * Renames (moves) a file from the old path to the new path. If the rename operation fails due to being
 * across different devices (`EXDEV` error), it falls back to copying the file and then deleting the original.
 *
 * @param {string} oldPath - The current location of the file.
 * @param {string} newPath - The new location where the file should be moved.
 * @returns {Promise<string>} A promise that resolves to the new file path if the operation is successful.
 * @throws Will throw an error if the file at `oldPath` does not exist, or if any other error occurs during renaming, copying, or deleting.
 *
 * @example
 * rename('/path/to/source.txt', '/path/to/destination.txt')
 *   .then((newPath) => console.log(`File moved to: ${newPath}`))
 *   .catch((error) => console.error('Error moving file:', error));
 */
export const rename = async (oldPath: string, newPath: string): Promise<string> => {
  try {
    if (!fs.existsSync(oldPath)) {
      throw new Error(`File does not exist at path: ${oldPath}`)
    }
    await fs.promises.rename(oldPath, newPath)
  } catch (error: any) {
    if (error?.code === 'EXDEV') {
      // Cross-device file move, copy instead
      await fs.promises.copyFile(oldPath, newPath)
      await fs.promises.unlink(oldPath)
    } else {
      throw error
    }
  }
  return newPath
}

/**
 * Ensures that the directory exists. If it doesn't exist, it creates it.
 * 
 * @param {string} dirPath - The path of the directory to check or create.
 * @returns {Promise<void>}
 */
export const ensureDirectoryExists = async (dirPath: string): Promise<void> => {
  let fullPath: string

  try {
    // Resolve the full path
    fullPath = path.resolve(dirPath)
  } catch (error) {
    console.error(error)
    throw error
  }

  try {
    await fs.promises.access(fullPath)
    // directory does exist, so return
    return
  } catch (error: any) {
    if (error?.code === 'ENOENT') {
      // directory does not exist, so we create it
      await fs.promises.mkdir(fullPath, { recursive: true })
      return
    } else {
      // other errors should be thrown
      console.error(error)
      throw error
    }
  }
}