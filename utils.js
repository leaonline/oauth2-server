import { Mongo } from "meteor/mongo"

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

export const createCollection = (passedCollection, collectionName) => {
  const existingCollection = Mongo.Collection.get(collectionName)
  if (existingCollection) {
    return existingCollection
  }
  if (passedCollection) {
    return passedCollection
  }
  return new Mongo.Collection(collectionName)
}
