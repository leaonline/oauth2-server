import { Mongo } from 'meteor/mongo'

/**
 * References to created collections, in-mem
 * @private
 */
const cache = new Map()

/**
 * If the given collection is already created or cached, returns the collection
 * or creates a new one.
 * @param passedCollection {Mongo.Collection|undefined}
 * @param collectionName {string}
 * @return {Mongo.Collection}
 */
export const createCollection = (passedCollection, collectionName) => {
  if (passedCollection) {
    return passedCollection
  }

  if (!cache.has(collectionName)) {
    const collection = new Mongo.Collection(collectionName)
    cache.set(collectionName, collection)
  }

  return cache.get(collectionName)
}
