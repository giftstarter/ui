/**
 * Copyright (C) GiftStarter, inc. - All Rights Reserved.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

GiftStarterApp.controller('LoginPopoverController', ['$scope', '$http', '$cookieStore', 'UserService',
    'PopoverService','GiftStartService','TwitterService','FacebookService',
    '$location','GooglePlusService','Analytics','AppStateService', 'emailLoginService', '$routeParams', '$timeout',
    LoginPopoverController]);


function LoginPopoverController($scope, $http, $cookieStore, UserService,  PopoverService,
                                GiftStartService,  TwitterService,
                                FacebookService,  $location, GooglePlusService,
                                Analytics,  AppStateService, emailLoginService, $routeParams, $timeout) {

    $scope.loggedIn = UserService.loggedIn;

    $scope.emailFormModel = {
        isLogin: true,
        isLoginCreate: false,
        isForgotPassword: false,
        isEmailLogin: false,
        isReset: false,
        emailname: '',
        email: '',
        emailConfirm: '',
        password: '',
        passwordConfirm: '',
        message: '',
        loginInProgress: false,
        createInProgress: false,
        resetInProgress: false,
        getPwInProgress: false,
        showOk: false
    };

    var mode = ($routeParams.resetCode) ? 'reset' : 'login',
        loginUrl = '';

    var loadingComplete = function () {
        $scope.emailFormModel.loginInProgress = false;
        $scope.emailFormModel.getPwInProgress = false;
        $scope.emailFormModel.createInProgress = false;
        $scope.emailFormModel.resetInProgress = false;
    };

    var resetForm = function () {
        if ($scope.emailLoginForm) {
            $scope.emailLoginForm.$setPristine();
            $scope.emailFormModel.message = '';
        }

    };

    var confirmPasswordCheck = function () {
        if ($scope.emailFormModel.password === $scope.emailFormModel.passwordConfirm) {
            $scope.emailLoginForm.$setValidity('confirmPassword', true);
        } else {
            $scope.emailLoginForm.$setValidity('confirmPassword', false);
        }
    }

    $scope.emailFormActions = {
        createLoginMode: function (event) {
            $scope.emailFormModel.isLoginCreate = true;
            $scope.emailFormModel.isForgotPassword = false;
            $scope.emailFormModel.isLogin = false;
            $scope.emailFormModel.isReset = false;
            resetForm();
            event && event.preventDefault();
        },
        forgotPasswordMode: function (event) {
            $scope.emailFormModel.isLoginCreate = false;
            $scope.emailFormModel.isForgotPassword = true;
            $scope.emailFormModel.isLogin = false;
            $scope.emailFormModel.isReset = false;
            resetForm();
            event && event.preventDefault();
        },
        loginMode: function (event) {
            $scope.emailFormModel.isLoginCreate = false;
            $scope.emailFormModel.isForgotPassword = false;
            $scope.emailFormModel.isLogin = true;
            $scope.emailFormModel.isReset = false;
            resetForm();
            event && event.preventDefault();
        },
        resetMode: function () {
            $scope.emailFormModel.isEmailLogin = true;
            $scope.emailFormModel.isLoginCreate = false;
            $scope.emailFormModel.isForgotPassword = false;
            $scope.emailFormModel.isLogin = false;
            $scope.emailFormModel.isReset = true;
            resetForm();
        },
        submit: function () {
            if ($scope.emailLoginForm.$valid) {
                AppStateService.setPath($location.path());
                emailLoginService.login(
                    mode,
                    $scope.emailFormModel.emailname,
                    $scope.emailFormModel.email,
                    $scope.emailFormModel.password,
                    $routeParams.resetCode).
                    then(function (okMsg) {
                        if (mode === 'create' || mode === 'reset') {

                            if (mode === 'reset') {
                                $scope.emailFormModel.message = okMsg;
                            }

                            $timeout(function () {
                                // Automatic log in
                                $scope.emailFormActions.login();
                                $scope.emailFormActions.submit();

                                $scope.emailFormModel.resetInProgress = false;
                                $scope.emailFormModel.createInProgress = false;
                            }, 1000);
                        } else if (mode === 'forgotPassword') {
                            $scope.emailFormModel.message = okMsg;
                            $scope.emailFormModel.showOk = true;
                        }

                        $scope.emailFormModel.loginInProgress = false;
                        $scope.emailFormModel.getPwInProgress = false;
                    }, function (errMsg) {
                        $scope.emailFormModel.message = errMsg;
                        loadingComplete();
                    });

                console.log("submitting " + mode);
            }
        },
        createLogin: function () {
            Analytics.track('user', 'create email login');
            mode = 'create';

            confirmPasswordCheck();

            if ($scope.emailFormModel.email.toLowerCase() === $scope.emailFormModel.emailConfirm.toLowerCase()) {
                $scope.emailLoginForm.$setValidity('confirmEmail', true);
            } else {
                $scope.emailLoginForm.$setValidity('confirmEmail', false);
            }

            if ($scope.emailLoginForm.$valid) {
                $scope.emailFormModel.createInProgress = true;
            }
        },
        forgotPassword: function () {
            Analytics.track('user', 'forgot login password');
            mode = 'forgotPassword';
            if ($scope.emailLoginForm.$valid) {
                $scope.emailFormModel.getPwInProgress = true;
            }
        },
        reset: function () {
            Analytics.track('user', 'reset login password');
            mode = 'reset';

            confirmPasswordCheck();

            if ($scope.emailLoginForm.$valid) {
                $scope.emailFormModel.resetInProgress = true;
            }
        },
        login: function () {
            Analytics.track('user', 'login attempt with email');
            mode = 'login';
            if ($scope.emailLoginForm.$valid) {
                $scope.emailFormModel.loginInProgress = true;
            }
        }
    };

    if (mode === 'reset') {
        $scope.emailFormActions.resetMode();
    }

    // Check if user is logged in already
    if (UserService.loggedIn) {loginComplete()}


    // Send user to social login site
    function completeLogin(socialService) {
        Analytics.track('user', 'login attempt with ' + socialService);
        AppStateService.setPath($location.path());
        console && console.log && console.log("Setting path", AppStateService.path);
        switch (socialService) {
            case "facebook": FacebookService.login(); break;
            case "twitter": TwitterService.login(); break;
            case "googleplus": GooglePlusService.login(); break;
        }
    }

    //move staged giftstart from browser to server
    function doLogin(socialService) {
        if(AppStateService.get('staged_giftstart')) {
            console && console.log && console.log("staged-create: " + AppStateService.get('staged_giftstart')['staging_uuid']);
            $http.post('/giftstart/create.json', AppStateService.get('staged_giftstart'))
                .success(function (response) {
                    AppStateService.remove('staged_giftstart');
                    completeLogin(socialService);
                })
                .error(function () {
                    console && console.log && console.log("Error while staging GiftStart; retrying...");
                    doLogin(socialService);
                });

        } else {
            completeLogin(socialService);
        }
    }

    // If they aren't, they'll need to log in
    $scope.facebookLogin = function () {doLogin("facebook")};
    $scope.twitterLogin = function() {doLogin("twitter");};
    $scope.googleLogin  = function() {doLogin("googleplus");};

    $scope.hidePopover = PopoverService.hidePopover;

    function loginComplete() {
        Analytics.track('user', 'login succeeded');
        if (/\/create(\/|$)/.test($location.path())) {
            //give login time to propagate
            setTimeout(GiftStartService.createGiftStart,500);
            setTimeout(PopoverService.hidePopover,2500);
        } else if (($location.path().search('giftstart?') != -1) && PopoverService.contributeLogin) {
            PopoverService.contributeLogin = false;
            PopoverService.nextPopover();
        } else {
            PopoverService.hidePopover();
        }
    }

    TwitterService.getAuthUrl();

    $scope.$on('login-success', loginComplete);

}
