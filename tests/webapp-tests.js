/* eslint-env mocha */
import { Meteor } from 'meteor/meteor'
import { HTTP } from 'meteor/jkuester:http'
import { Random } from 'meteor/random'
import { assert } from 'chai'
import { app } from '../lib/webapp'

const toUrl = path => Meteor.absoluteUrl(path)

const finish = (res, done, err) => {
  res.writeHead(200)
  res.end()
  done(err)
}

describe('webapp', function () {
  it('creates a GET route using .get', function (done) {
    const route = Random.id()
    const test = Random.id()
    const url = toUrl(route)

    app.get(`/${route}`, function (req, res, next) {
      try {
        assert.equal(req.query.test, test)
        finish(res, done)
      } catch (e) {
        finish(res, done, e)
      }
    })

    HTTP.get(url, {
      params: { test }
    })
  })

  it('creates a GET route which is not reachable via POST request', function (done) {
    const route = Random.id()
    const test = Random.id()
    const url = toUrl(route)

    app.get(`/${route}`, function (req, res, next) {
      finish(res, done, new Error('expected GET route to not be callable via POST request'))
    })

    app.post(`/${route}`, function (req, res) {
      finish(res, done)
    })

    HTTP.post(url, {
      params: { test }
    })
  })

  it('creates a POST route using .post', function (done) {
    const route = Random.id()
    const test = Random.id()
    const url = toUrl(route)

    app.post(`/${route}`, function (req, res, next) {
      try {
        assert.equal(req.body.test, test)
        finish(res, done)
      } catch (e) {
        finish(res, done, e)
      }
    })

    HTTP.post(url, {
      params: { test }
    })
  })

  it('creates a POST route which is not reachable via GET request', function (done) {
    const route = Random.id()
    const url = toUrl(route)

    app.post(`/${route}`, function (req, res, next) {
      finish(res, done, new Error('expected GET route to not be callable via POST request'))
    })

    app.get(`/${route}`, function (req, res) {
      finish(res, done)
    })

    HTTP.get(url)
  })

  it('creates a POST AND GET route using .use', function (done) {
    const route = Random.id()
    const url = toUrl(route)

    const finished = { get: false, post: false }
    const checkDone = method => {
      finished[method] = true
      return (finished.get && finished.post)
    }

    app.use(`/${route}`, function (req, res, next) {
      if (checkDone(req.method.toLowerCase())) {
        return finish(res, done)
      } else {
        return next()
      }
    })

    HTTP.get(url)
    Meteor.setTimeout(function () {
      HTTP.post(url)
    }, 500)
  })
})
