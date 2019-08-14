/* global Accounts */
import { Meteor } from 'meteor/meteor'
import { WebApp } from 'meteor/webapp'
import { Model } from './model'

const bind = fn => bind(fn)
const oauthserver = Npm.require('oauth2-server')
// WebApp.rawConnectHandlers.use app
// JsonRoutes.Middleware.use app

class OAuth2Server {
  constructor (config) {
    if (config == null) { config = {} }
    this.config = config
    this.model = new Model(this.config)
    this.app = WebApp.connectHandlers

    this.oauth = oauthserver({
      model: this.model,
      grants: [ 'authorization_code', 'refresh_token' ],
      debug: this.config.debug
    })

    this.publishAuhorizedClients()
    this.initRoutes()

    return this
  }

  publishAuhorizedClients () {
    return Meteor.publish('authorizedOAuth', function () {
      if ((this.userId == null)) {
        return this.ready()
      }

      return Meteor.users.find(
        { _id: this.userId }
        , {
          fields: {
            'oauth.authorizedClients': 1
          }
        }
      )

      return (typeof user !== 'undefined' && user !== null)
    })
  }

  initRoutes () {
    const self = this
    const debugMiddleware = function (req, res, next) {
      if (self.config.debug === true) {
        console.log('[OAuth2Server]', req.method, req.url)
      }
      return next()
    }

    // Transforms requests which are POST and aren't "x-www-form-urlencoded" content type
    // and they pass the required information as query strings
    const transformRequestsNotUsingFormUrlencodedType = function (req, res, next) {
      if (!req.is('application/x-www-form-urlencoded') && (req.method === 'POST')) {
        if (self.config.debug === true) {
          console.log('[OAuth2Server]', 'Transforming a request to form-urlencoded with the query going to the body.')
        }
        req.headers[ 'content-type' ] = 'application/x-www-form-urlencoded'
        req.body = Object.assign({}, req.body, req.query)
      }
      return next()
    }

    this.app.use('/oauth/token', debugMiddleware, transformRequestsNotUsingFormUrlencodedType, this.oauth.grant())

    this.app.use('/oauth/authorize', debugMiddleware, bind(function (req, res, next) {
      const client = self.model.Clients.findOne({ active: true, clientId: req.query.client_id })
      if ((client == null)) {
        return res.redirect('/oauth/error/404')
      }

      if (![].concat(client.redirectUri).includes(req.query.redirect_uri)) {
        return res.redirect('/oauth/error/invalid_redirect_uri')
      }

      return next()
    }))

    this.app.use('/oauth/authorize', debugMiddleware, bind(function (req, res, next) {
      if ((req.body.token == null)) {
        return res.sendStatus(401).send('No token')
      }

      const user = Meteor.users.findOne({
        'services.resume.loginTokens.hashedToken': Accounts._hashLoginToken(req.body.token)
      })

      if ((user == null)) {
        return res.sendStatus(401).send('Invalid token')
      }

      req.user =
        { id: user._id }

      return next()
    }))

    this.app.use('/oauth/authorize', debugMiddleware, this.oauth.authCodeGrant(function (req, next) {
      if (req.body.allow === 'yes') {
        Meteor.users.update(req.user.id, { $addToSet: { 'oauth.authorizedClients': this.clientId } })
      }

      return next(null, req.body.allow === 'yes', req.user)
    }))

    return this.app.use('/oauth/*', this.oauth.errorHandler())
  }
}
