var oauthModule = require('./oauth')
  , OAuth = require('oauth').OAuth;

var etrade = module.exports = 
oauthModule.submodule('etrade')
  .definit( function () {
    this.oauth = new OAuth(
        this.oauthHost() + this.requestTokenPath()
      , this.oauthHost() + this.accessTokenPath()
      , this.consumerKey()
      , this.consumerSecret()
      , '1.0', 'oob', 'HMAC-SHA1', null,
      // null
      {
            Accept: 'application/json', // so we get json responses
            Connection: 'close'
      //     , 'User-Agent': 'Node authentication'
          // 'x-li-format': 'json'
        }
      );
  })

  .apiHost('https://etwssandbox.etrade.com/')
  .configurable({
    apiFetchUser: "the API path to fetch the user data after authentication"
  })
  .oauthHost('https://etws.etrade.com')

  .requestTokenPath('/oauth/request_token')
  .authorizePath('/e/t/etws/authorize')
  .accessTokenPath('/oauth/access_token')

  .entryPath('/auth/etrade')
  .callbackPath('/auth/etrade/callback')

  .redirectToProviderAuth( function (res, token) {
    this.redirect(res, 'https://us.etrade.com' + this.authorizePath() + '?key=' + this.consumerKey() + '&token=' + token);
  })

  .fetchOAuthUser( function (accessToken, accessTokenSecret, params) {
    var promise = this.Promise();
    this.oauth.get(this.apiHost() + this.apiFetchUser(), accessToken, accessTokenSecret, function (err, data, res) {
      if (err) {
        err.extra = {data: data, res: res};
        return promise.fail(err);
      }
      var oauthUser = JSON.parse(data);
      if(oauthUser['json.accountListResponse'] && oauthUser['json.accountListResponse'].response){
        // extract results
        oauthUser = oauthUser['json.accountListResponse'].response;
      }
      promise.fulfill(oauthUser);
    });
    return promise;
  })
  .moduleErrback( function (err, seqValues) {
    console.log('GOT ETRADE OAUTH ERROR');
    // console.log('sv:' + JSON.stringify(seqValues));
    // for(var k in err) {
    //   console.log('key:' + k);
    // }
    // for(var k in seqValues) {
    //   console.log('skey:' + k);
    // }
    // for(var k in err.extra) {
    //   console.log('ekey:' + k);
    // }
    console.log('err.statusCode:' + JSON.stringify(err.statusCode));
    console.log('err.data:' + JSON.stringify(err.data));
    // console.log('err.extra:' + JSON.stringify(err.extra));
    if (err instanceof Error) {
      var next = seqValues.next;
      return next(err);
    } else if (err.extra) {
      var externalResponse = err.extra.res,
        serverResponse = seqValues.res;
      serverResponse.writeHead(
        externalResponse.statusCode,
        externalResponse.headers);
      serverResponse.end(err.extra.data);
    } else if (err.statusCode) {
      var serverResponse2 = seqValues.res;
      serverResponse2.writeHead(err.statusCode);
      serverResponse2.end(err.data);
    } else {
      console.error(err);
      throw new Error('Unsupported error type');
    }
  });
