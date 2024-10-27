const debug_pathnames = false
const pathnames_lock = new Map<string, boolean>()

export const pathnames = {
  /**
   * check if the key is locked
   * @param key 
   */
  check: (key: string) => {
    if (pathnames_lock.has(key)) {
      if (debug_pathnames) console.log('checked pathnames lock, it exists: ' + key)
      return true
    } else {
      if (debug_pathnames) console.log('checked pathnames lock, it does not exist: ' + key)
      return false
    }
  },
  /**
   * adds the key to the lock, throws if the key is already locked
   * @param key 
   */
  add: (key: string): boolean => {
    if (pathnames_lock.has(key)) {
      if (debug_pathnames) console.error('pathnames lock tried to set an existing key: ' + key)
      return false
    }
    if (debug_pathnames) console.log('added to pathnames lock: ' + key)
    pathnames_lock.set(key, true)
    return true
  },
  /**
   * frees the key from the lock
   * @param key 
   */
  free: (key: string) => {
    if (pathnames_lock.delete(key)) {
      if (debug_pathnames) console.log('removed from pathnames lock: ' + key)
      return true
    } else {
      if (debug_pathnames) console.error('failed to remove from pathnames lock, the key doesn\'t exist!: ' + key)
      return false
    }
  },
}
