/* eslint-env mocha */
import { assert } from 'meteor/practicalmeteor:chai'
import { validate } from '../lib/validation'

describe('validation', function () {
  describe('validate', function () {
    it('returns false if one of the params is falsey', function () {
      [
        validate(),
        validate(null, {}),
        validate({}, null),
        validate(undefined, {}),
        validate({}, undefined)
      ].forEach(value => assert.isFalse(value))
    })

    it('returns true if the params math', function () {
      [
        validate({}, {}),
        validate({ a: 'a' }, { a: String }),
        validate({ b: 1 }, { b: Number }),
        validate({ c: new Date() }, { c: Date }),
        validate({ d: true }, { d: Boolean })
      ].forEach(value => assert.isTrue(value))
    })
  })
})
