import { WebApp } from 'meteor/webapp'
import { info } from './utils/console'
import bodyParser from 'body-parser'

/**
 * @private
 */
const server = WebApp.connectHandlers
server.use(bodyParser.urlencoded({ extended: false }))

/**
 * Wrapped `WebApp` with express-style get/post and default use routes.
 * @see https://docs.meteor.com/packages/webapp.html
 * @type {{get: get, post: post, use: use}}
 */
const app = {
  /**
   * Creates a get route for a given handler
   * @param url {string}
   * @param handler {function}
   */
  get (url, handler) {
    server.use(url, function (req, res, next) {
      if (req.method.toLowerCase() === 'get') {
        handler.call(this, req, res, next)
      } else {
        next()
      }
    })
  },
  /**
   * Creates a post route for a given handler.
   * If headers' content-type does not equal to `application/x-www-form-urlencoded`
   * then it will be transformed accordingly.
   *
   * @param url {string}
   * @param handler {function}
   */
  post (url, handler) {
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
  },

  /**
   * Default wrapper around `WebApp.use`
   * @param args
   */
  use (...args) {
    server.use(...args)
  }
}

export { app }
