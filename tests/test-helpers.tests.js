import { Mongo } from 'meteor/mongo'
import { assert } from 'chai'

export const assertCollection = name => {
  const collection = Mongo.Collection.get(name)
  assert.isDefined(collection)
  assert.instanceOf(collection, Mongo.Collection)
}
