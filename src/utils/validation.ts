import { File as FormFile } from 'formidable'

export const isValidFile = (file: FormFile): boolean => {
  // const allowedTypes = ['image/jpeg', 'image/png'] // Add your file types
  // return allowedTypes.includes(file.mimetype ?? '') && file.size > 0

  return true
}