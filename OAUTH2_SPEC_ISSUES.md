# OAuth2 Specification Compliance Issues

This document details the identified deviations from the OAuth2 specification
(RFC 6749 / RFC 6750) found in this implementation.

## Critical Issues

### 1. `expires_in` returns a Date instead of seconds

**File:** `lib/oauth.js:483`
**Spec:** RFC 6749 Section 5.1

The `expires_in` field in the token response MUST be the lifetime in seconds
of the access token as an integer. The current implementation returns
`token.accessTokenExpiresAt`, which is a `Date` object.

```js
// Current (non-compliant)
expires_in: token.accessTokenExpiresAt

// Expected (RFC 6749 §5.1)
expires_in: Math.floor((token.accessTokenExpiresAt - Date.now()) / 1000)
```

---

### 2. User ID leaked in authorization code redirect

**File:** `lib/oauth.js:425-431`
**Spec:** RFC 6749 Section 4.1.2

The authorization response MUST only contain `code` and `state` (if provided
by the client). The current implementation adds a `user` parameter to the
redirect query string, leaking internal user information to the client.

```js
// Current (non-compliant)
const query = new URLSearchParams({
  code: code.authorizationCode,
  user: req.user.id,       // Not part of the spec
  state: req.body.state
})
```

---

### 3. `getRefreshToken` returns an incompatible format

**File:** `lib/model/meteor-model.js:156-158`
**Spec:** `@node-oauth/oauth2-server` model specification

The `saveRefreshToken` method stores `{ refreshToken, clientId, userId, expires }`,
but `getRefreshToken` is expected to return:

```js
{
  refreshToken: String,
  client: { id: String },        // Currently stored as clientId
  user: { id: String },           // Currently stored as userId
  refreshTokenExpiresAt: Date     // Currently stored as expires
}
```

This mismatch likely causes refresh token grant failures.

---

### 4. `revokeToken` operates on the wrong collection

**File:** `lib/model/meteor-model.js:160-163`

The `revokeToken` method removes documents from the `AccessTokens` collection
using the refresh token value. It should revoke the refresh token from the
`RefreshTokens` collection. Additionally, the `@node-oauth/oauth2-server`
expects `revokeToken` to return the token object with an updated
`refreshTokenExpiresAt` rather than deleting the record entirely.

```js
// Current (incorrect)
export const revokeToken = async (token) => {
  const result = await collections.AccessTokens.removeAsync({
    refreshToken: token.refreshToken
  })
  return !!result
}
```

---

## Medium Issues

### 5. Token endpoint always returns `unauthorized_client` on error

**File:** `lib/oauth.js:486-493`
**Spec:** RFC 6749 Section 5.2

The catch block on the token endpoint hardcodes the error type as
`unauthorized_client`, regardless of the actual error. RFC 6749 Section 5.2
defines specific error codes that should be used depending on the failure:
`invalid_request`, `invalid_client`, `invalid_grant`, `unauthorized_client`,
`unsupported_grant_type`, `invalid_scope`.

```js
// Current (non-compliant)
catch (err) {
  return errorHandler(res, {
    error: 'unauthorized_client', // Always the same error
    ...
  })
}
```

---

### 6. HTTP 415 used for `unsupported_response_type`

**File:** `lib/oauth.js:228-233`
**Spec:** RFC 6749 Section 4.1.2.1

The implementation returns HTTP 415 (Unsupported Media Type) when the
`response_type` is invalid. HTTP 415 relates to content type negotiation and
has no relation to OAuth2. Furthermore, if the `redirect_uri` is valid, the
`unsupported_response_type` error should be returned via redirect to the
client, not as a direct HTTP response.

---

### 7. `scope` missing from the token response

**File:** `lib/oauth.js:480-485`
**Spec:** RFC 6749 Section 5.1

If the granted scope differs from the requested scope, the `scope` parameter
is REQUIRED in the token response. The current implementation never includes
`scope` in the response body.

```js
// Current
.json({
  access_token: token.accessToken,
  token_type: 'bearer',
  expires_in: token.accessTokenExpiresAt,
  refresh_token: token.refreshToken
  // Missing: scope
})
```

---

## Low Issues

### 8. `state` included in redirect even when not sent by client

**File:** `lib/oauth.js:425-429`
**Spec:** RFC 6749 Section 4.1.2

When the client does not include `state` in the authorization request, the
`URLSearchParams` constructor serializes it as `state=undefined` in the
redirect URL. RFC 6749 states that `state` is REQUIRED in the response only
if it was present in the client request.

---

### 9. `verifyScope` requires exact match instead of subset check

**File:** `lib/model/model.js:194`
**Spec:** RFC 6749 Section 3.3

The current implementation requires an exact match between the token scope
and the requested scope. In standard OAuth2, the verification should check
whether the required scope is a subset of the granted scope.

```js
// Current (exact match)
return accessToken.scope.sort().join(',') === scope.sort().join(',')

// Expected (subset check)
return scope.every(s => accessToken.scope.includes(s))
```

---

### 10. `allowEmptyState` contradicts validation schema

**File:** `lib/validation/requiredAuthorizeGetParams.js:11`
**Spec:** RFC 6749 Section 10.12

The default configuration sets `allowEmptyState: false`, which implies that
`state` is mandatory (recommended by the spec to prevent CSRF attacks).
However, the validation schema defines `state: Match.Maybe(String)`,
allowing `undefined` values. These two settings are contradictory.
