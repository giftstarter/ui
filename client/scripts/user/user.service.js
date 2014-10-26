/**
 * Created by stuart on 6/25/14.
 */

GiftStarterApp.service('UserService', ['$http','$rootScope','$cookieStore',
    '$window','FacebookService','TwitterService','GooglePlusService',
    'Analytics', UserService]);

function UserService($http,  $rootScope,  $cookieStore,  $window,
                     FacebookService,  TwitterService,  GooglePlusService,
                     Analytics) {
    this.uid = -1;
    this.loggedIn = false;
    this.name = '';
    this.profileImageUrl  = '';
    this.isStripeCustomer = false;
    this.loginService = '';
    this.onMailinList = false;
    this.email = '';
    this.referrer = {};
    this.hasPitchedIn = false;

    var self = this;

    this.getUser = function(uid, callback) {
        Analytics.track("user", "user fetch initiated");
        $http({method: 'GET', url: '/users/' + uid + '.json'})
            .success(statFetchSuccess)
            .error(Analytics.track("user", "user fetch failed"));

        function statFetchSuccess(response) {
            Analytics.track("user", "user fetch succeeded");
            callback(response);
        }
    };

    this.registerLogin = function(uid, profileImageUrl, token,
                                  onMailingList, name, has_pitched_in) {
        Analytics.track('login', uid);
        self.uid = uid;
        self.token = token;
        self.name = name;
        self.profileImageUrl = profileImageUrl;
        self.loggedIn = true;
        self.onMailingList = onMailingList;
        self.hasPitchedIn = has_pitched_in;

        $cookieStore.put('uid', uid);
        $cookieStore.put('token', token);

        $rootScope.$broadcast('login-success');
    };

    this.logout = function() {
        if (self.loginService === 'facebook') {
            FacebookService.logout();
        } else if (self.loginService === 'twitter') {
            TwitterService.logout();
        } else if (self.loginService === 'googleplus') {
            GooglePlusService.logout();
        }
        self.registerLogout();
    };

    this.registerLogout = function() {
        self.loggedIn = false;
        self.uid = -1;
        self.profileImageUrl = '';

        $cookieStore.remove('uid');
        $cookieStore.remove('token');

        $rootScope.$broadcast('logout-success');
    };

    $rootScope.$on('facebook-login-success', facebookLoggedIn);
    function facebookLoggedIn () {
        Analytics.track('user', 'logged in with facebook');
        self.loginService = 'facebook';
        self.registerLogin(FacebookService.uid, FacebookService.usr_img,
            FacebookService.token, FacebookService.subscribed,
            FacebookService.name, FacebookService.has_pitched_in);
    }
    $rootScope.$on('twitter-login-success', twitterLoggedIn);
    function twitterLoggedIn () {
        Analytics.track('user', 'logged in with twitter');
        self.loginService = 'twitter';
        self.registerLogin(TwitterService.uid, TwitterService.usr_img,
            TwitterService.token, TwitterService.subscribed,
            TwitterService.name, TwitterService.has_pitched_in);
    }
    $rootScope.$on('googleplus-login-success', googleplusLoggedIn);
    function googleplusLoggedIn () {
        Analytics.track('user', 'logged in with googleplus');
        self.loginService = 'googleplus';
        self.registerLogin(GooglePlusService.uid,
            GooglePlusService.usr_img, GooglePlusService.token,
            GooglePlusService.subscribed, GooglePlusService.name,
            GooglePlusService.has_pitched_in);
    }

    $rootScope.$on('facebook-logout-success', self.registerLogout);
    $rootScope.$on('twitter-logout-success', self.registerLogout);
    $rootScope.$on('googleplus-logout-success', self.registerLogout);

    if ($cookieStore.get('uid')) {
        // base64 decode the name - for unicode chars in names
        $window.loginDeets[4] =  decodeURIComponent(escape(atob($window.loginDeets[4])));
        self.registerLogin.apply(this, $window.loginDeets);
        self.loginService = {f: 'facebook', t:'twitter', g:'googleplus'}[$cookieStore.get('uid')[0]];
    }
}
