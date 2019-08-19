/* global Accounts */
import { Meteor } from 'meteor/meteor'
import { WebApp } from 'meteor/webapp'
import { Model } from './model'

const bind = fn => Meteor.bindEnvironment(fn)
const OAuthserver = Npm.require('oauth2-server')
const { Request } = OAuthserver
const { Response } = OAuthserver

const getDebugMiddleWare = instance => (req, res, next) => {
  if (instance.debug === true) {
    console.log('[OAuth2Server]', req.method, req.url)
  }
  return next()
}

export const OAuth2Server = class OAuth2Server {
  constructor ({ serverOptions, model, routes, debug }) {
    this.config = { serverOptions, model, routes }
    this.model = new Model(model)
    this.app = WebApp.rawConnectHandlers
    this.debug = debug

    const oauthOptions = Object.assign({ model: this.model }, serverOptions)
    this.oauth = new OAuthserver(oauthOptions)

    this.publishAuhorizedClients()
    this.initRoutes(routes)
    return this
  }

  publishAuhorizedClients () {
    return Meteor.publish('authorizedOAuth', function () {
      if ((this.userId == null)) {
        return this.ready()
      }
      return Meteor.users.find({ _id: this.userId }, { fields: { 'oauth.authorizedClients': 1 } })
    })
  }

  tokenHandler (options) {
    return function (req, res, next) {
      let request = new Request(req)
      let response = new Response(res)
      return this.oauth.token(request, response, options)
        .then(function (token) {
          res.locals.oauth = { token: token }
          next()
        })
        .catch(function (err) {
          // handle error condition
          console.error(err)
        })
    }
  }

  authorizeHandler (options) {
    return function (req, res, next) {
      let request = new Request(req)
      let response = new Response(res)
      return this.oauth.authorize(request, response, options)
        .then(function (code) {
          res.locals.oauth = { code: code }
          next()
        })
        .catch(function (err) {
          // handle error condition
          console.error(err)
        })
    }
  }

  authenticateHandler (options) {
    return function (req, res, next) {
      let request = new Request(req)
      let response = new Response(res)
      return this.oauth.authenticate(request, response, options)
        .then(function (token) {
          res.locals.oauth = { token: token }
          next()
        })
        .catch(function (err) {
          // handle error condition
          console.error(err)
        })
    }
  }

  authenticatedRoute (route, fn) {
    return this.app.use(route, getDebugMiddleWare(this), this.authenticateHandler(), fn)
  }

  initRoutes ({ accessTokenUrl = '/oauth/token', authorizeUrl = '/oauth/authorize', errorUrl = '/oauth/error', fallbackUrl = '/oauth/*', errorHandler = err => console.error(err), } = {}) {
    const self = this

    const debugMiddleware = getDebugMiddleWare(self)

    // Transforms requests which are POST and aren't "x-www-form-urlencoded" content type
    // and they pass the required information as query strings
    const transformRequestsNotUsingFormUrlencodedType = function (req, res, next) {
      if (!req.is('application/x-www-form-urlencoded') && (req.method === 'POST')) {
        if (self.debug === true) {
          console.log('[OAuth2Server]', 'Transforming a request to form-urlencoded with the query going to the body.')
        }
        req.headers[ 'content-type' ] = 'application/x-www-form-urlencoded'
        req.body = Object.assign({}, req.body, req.query)
      }
      return next()
    }

    this.app.use(accessTokenUrl, debugMiddleware, this.tokenHandler())

    this.app.use(authorizeUrl, debugMiddleware, bind(function (req, res, next) {
      const client = self.model.Clients.findOne({ active: true, clientId: req.query.client_id })
      if ((client == null)) {
        return res.redirect(`${errorUrl}/404`)
      }

      if (![].concat(client.redirectUri).includes(req.query.redirect_uri)) {
        return res.redirect('/oauth/error/invalid_redirect_uri')
      }

      return next()
    }))

    this.app.use(authorizeUrl, debugMiddleware, bind(function (req, res, next) {
      if ((!req.body.token)) {
        return res.sendStatus(401).send('No token')
      }

      const user = Meteor.users.findOne({
        'services.resume.loginTokens.hashedToken': Accounts._hashLoginToken(req.body.token)
      })

      if ((user == null)) {
        return res.sendStatus(401).send('Invalid token')
      }

      req.user = { id: user._id }
      return next()
    }))

    this.app.use(authorizeUrl, debugMiddleware, this.authorizeHandler(), bind(function (req, next) {
      if (req.body.allow === 'yes') {
        Meteor.users.update(req.user.id, { $addToSet: { 'oauth.authorizedClients': this.clientId } })
      }

      return next(null, req.body.allow === 'yes', req.user)
    }))

    return this.app.use(fallbackUrl, errorHandler)
  }
}
