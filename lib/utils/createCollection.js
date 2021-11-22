import { Mongo } from "meteor/mongo"

const cache = new Map()

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
