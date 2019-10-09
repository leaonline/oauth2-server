import { Mongo } from "meteor/mongo"
import { assert } from 'meteor/practicalmeteor:chai'

export const assertCollection = name => {
  const collection = Mongo.Collection.get(name)
  assert.isDefined(collection)
  assert.equal(collection.constructor.name, 'Collection')
}
