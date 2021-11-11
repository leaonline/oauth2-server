import { Mongo } from 'meteor/mongo'

const modelNames = [
  'getAuthorizationCode',
  'getClient',
  'getRefreshToken',
  'revokeAuthorizationCode',
  'saveAuthorizationCode',
  'saveRefreshToken',
  'saveToken',
  'getAccessToken'
]

export const isModelInstance = model => {
  return model && Object.keys(model).some(property => modelNames.includes(property))
}

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
