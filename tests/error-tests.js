/* eslint-env mocha */
import { Random } from 'meteor/random'
import { assert } from 'chai'
import { errorHandler } from '../lib/utils/error'

class Res {
  status (httpStatus) {
    this.httpStatus = httpStatus
  }

  set (options) {
    this.options = options
  }

  send (body) {
    this.body = body
  }

  json (body) {
    this.body = JSON.stringify(body)
  }
}

describe('errorHandler', function () {
  it('writes the error into a result body', function () {
    const res = new Res()

    const error = Random.id()
    const description = Random.id()
    const uri = Random.id()
    const status = Random.id()
    const state = Random.id()

    const originalError = new Error()
    originalError.name = error
    originalError.code = status

    errorHandler(res, {
      error,
      description,
      uri,
      status,
      state,
      originalError,
      debug: false
    })

    const { httpStatus } = res
    assert.equal(httpStatus, status)

    const { options } = res
    assert.deepEqual(options, { 'Content-Type': 'application/json' })

    const expectedBody = {
      error,
      error_description: description,
      error_uri: uri,
      state
    }
    const { body } = res
    assert.deepEqual(JSON.parse(body), expectedBody)
  })
})
