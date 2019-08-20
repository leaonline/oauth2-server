/* global Accounts */
import { Meteor } from 'meteor/meteor'
import { WebApp } from 'meteor/webapp'
import { Model } from './model'

const bodyParser = Npm.require('body-parser')
const OAuthserver = Npm.require('oauth2-server')

const bind = fn => Meteor.bindEnvironment(fn)

const { Request } = OAuthserver
const { Response } = OAuthserver

WebApp.connectHandlers.use(bodyParser.urlencoded({ extended: false }))

const getDebugMiddleWare = instance => (req, res, next) => {
  if (instance.debug === true) {
    console.log('[OAuth2Server]', req.method, req.url, req.params, req.body)
  }
  return next()
}

export const OAuth2Server = class OAuth2Server {
  constructor ({ serverOptions, model, routes, debug }) {
    this.config = { serverOptions, model, routes }
    this.model = new Model(model)
    this.app = WebApp.connectHandlers
    this.debug = debug

    const oauthOptions = Object.assign({ model: this.model }, serverOptions)
    this.oauth = new OAuthserver(oauthOptions)

    this.publishAuhorizedClients()
    this.initRoutes(routes)
    return this
  }

  /**
   * Registers a new client app. Make sure that only users with permission (ie devs, admins) can call this function
   * @param title
   * @param homepage
   * @param description
   * @param privacyLink
   * @param redirectUris
   * @returns {}
   */
  registerClient ({ title, homepage, description, privacyLink, redirectUris }) {
    return this.model.createClient({ title, homepage, description, privacyLink, redirectUris })
  }

  publishAuhorizedClients () {
    return Meteor.publish('authorizedOAuth', function () {
      if ((this.userId == null)) {
        return this.ready()
      }
      return Meteor.users.find({ _id: this.userId }, { fields: { 'oauth.authorizedClients': 1 } })
    })
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
          res.writeHead(500)
          res.end(err)
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

    const route = (url, handler) => {
      this.app.use(url, debugMiddleware)
      this.app.use(url, handler)
    }

    route(accessTokenUrl, function (req, res, next) {
      console.log('access token handler')
      let request = new Request(req)
      let response = new Response(res)
      return this.oauth.token(request, response)
        .then(function (token) {
          console.log('token generated')
          console.log(token)
          res.locals.oauth = { token: token }
          next()
        })
        .catch(function (err) {
          // handle error condition
          console.error(err)
        })
    })

    route(authorizeUrl, bind(function (req, res, next) {
      console.log('authorize client', req.query.client_id)

      const client = self.model.getClient({ active: true, clientId: req.query.client_id })
      if (!client) {
        res.writeHead(404)
        return res.end()
        // return res.redirect(`${errorUrl}/404`)
      }

      if (![].concat(client.redirectUri).includes(req.query.redirect_uri)) {
        return res.redirect('/oauth/error/invalid_redirect_uri')
      }

      return next()
    }))

    route(authorizeUrl, bind(function (req, res, next) {
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

    route(authorizeUrl, bind(function (req, next) {
      if (req.body.allow === 'yes') {
        Meteor.users.update(req.user.id, { $addToSet: { 'oauth.authorizedClients': this.clientId } })
      }

      return next(null, req.body.allow === 'yes', req.user)
    }))

    route(fallbackUrl, errorHandler)
  }
}
