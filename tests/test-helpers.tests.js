import { assert } from 'chai'
import { Mongo } from 'meteor/mongo'

export const assertCollection = (name) => {
  const collection = Mongo.getCollection(name)
  assert.isDefined(collection)
  assert.instanceOf(collection, Mongo.Collection)
}
