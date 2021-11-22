import { WebApp } from 'meteor/webapp'
import { info } from './utils/console'
import bodyParser from 'body-parser'

const server = WebApp.connectHandlers

server.use(bodyParser.urlencoded({ extended: false }))

const get = (url, handler) => {
  server.use(url, function (req, res, next) {
    if (req.method.toLowerCase() === 'get') {
      handler.call(this, req, res, next)
    } else {
      next()
    }
  })
}

const post = function (url, handler) {
  server.use(url, function (req, res, next) {
    if (req.method.toLowerCase() === 'post') {
      if (req.headers['content-type'] !== 'application/x-www-form-urlencoded') {
        // Transforms requests which are POST and aren't "x-www-form-urlencoded" content type
        // and they pass the required information as query strings
        info('Transforming a request to form-urlencoded with the query going to the body.')
        req.headers['content-type'] = 'application/x-www-form-urlencoded'
        req.body = Object.assign({}, req.body, req.query)
      }
      handler.call(this, req, res, next)
    } else {
      next()
    }
  })
}

const use = function (...args) {
  server.use(...args)
}

export const app = { get, post, use }
