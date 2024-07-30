/* eslint-env mocha */
import { assert, expect } from 'chai'
import { Random } from 'meteor/random'
import { validateParams } from '../lib/validation/validateParams'
import { UserValidation } from '../lib/validation/UserValidation'

describe('validation', function () {
  describe('validate', function () {
    it('returns false if one of the params is falsey', function () {
      [
        validateParams(),
        validateParams(null, {}),
        validateParams({}, null),
        validateParams(undefined, {}),
        validateParams({}, undefined)
      ].forEach(value => assert.isFalse(value))
    })

    it('returns true if the params math', function () {
      [
        validateParams({}, {}),
        validateParams({ a: 'a' }, { a: String }),
        validateParams({ b: 1 }, { b: Number }),
        validateParams({ c: new Date() }, { c: Date }),
        validateParams({ d: true }, { d: Boolean })
      ].forEach(value => assert.isTrue(value))
    })
  })

  describe('UserValidation', function () {
    let instanceId

    beforeEach(function () {
      instanceId = Random.id()
    })
    describe(UserValidation.register.name, function () {
      it('throws if key is not an instance with instanceId', function () {
        expect(() => UserValidation.register({})).to.throw('Match error: Expected string, got undefined in field instanceId')
      })
      it('throws if fct ist not a function', function () {
        expect(() => UserValidation.register({ instanceId })).to.throw('Match error: Expected function, got undefined')
      })
    })
    describe(UserValidation.isValid.name, function () {
      it('returns true if not registered (skips)', async function () {
        const instance = { instanceId }
        expect(await UserValidation.isValid({})).to.equal(true)
        expect(await UserValidation.isValid(instance)).to.equal(true)
      })
      it('returns true if registered and handler passes', async function () {
        const instance = { instanceId }
        const handler = () => true
        UserValidation.register(instance, handler)
        expect(await UserValidation.isValid(instance)).to.equal(true)
      })
      it('returns false if registered and handler denies', async function () {
        const instance = { instanceId }
        const handler = () => false
        UserValidation.register(instance, handler)
        expect(await UserValidation.isValid(instance)).to.equal(false)
      })
    })
  })
})
