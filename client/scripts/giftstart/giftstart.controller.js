/**
 * Copyright (C) GiftStarter, inc. - All Rights Reserved.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

GiftStarterApp.controller('GiftStartController', [
            '$scope','GiftStartService','$location','$interval',
            'FacebookService','TwitterService','GooglePlusService','Analytics',
            'ProductService', 'UserService', 'AppStateService', '$window', '$document', 'PopoverService','LocalStorage',
    GiftStartController]);

function GiftStartController($scope,  GiftStartService,  $location,  $interval,
         FacebookService,  TwitterService,  GooglePlusService,  Analytics,
         ProductService, UserService, AppStateService, $window, $document, PopoverService, LocalStorage) {

    Analytics.track('campaign', 'controller created');

    $scope.giftStart = GiftStartService.giftStart;
    $scope.pitchIns = GiftStartService.pitchIns;
    $scope.secondsLeft = 0;

    $scope.newTitle = $scope.giftStart.title;
    $scope.newDescription = $scope.giftStart.description;
    $scope.editingTitle = false;
    $scope.editingDescription = false;
    $scope.campaignEditable = UserService.uid == $scope.giftStart.gift_champion_uid;
    $scope.pitchInsInitialized = false;
    $scope.pitchinButtonHoverMessage = 'Click on some grid pieces first!';

    $scope.isMobile = device.mobile();
    $scope.newUser = !UserService.hasPitchedIn;
    $scope.loggedIn = UserService.loggedIn;

    $scope.productMessage = '';

    $scope.isSavingForLater = false;

    $scope.showLoginBox = false;

    if ($scope.giftStart.gc_name) {
        $scope.newGcName = $scope.giftStart.gc_name;
    } else {
        $scope.newGcName = UserService.name;
    }

    // Remove old giftstart scheme if present (it messes up login)
    if ($location.search()['gs-id']) {
        $location.search('gs-id', null);
    }

    $scope.mailSubject = encodeURIComponent("Join us on a gift together");
    $scope.mailBody= function() {
        $location.search('re', btoa(JSON.stringify({
            type: 'consumer',
            uid: UserService.uid,
            channel: 'email',
            uuid: 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
                var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            })
        })));
        var url = encodeURIComponent("I thought you might be interested in pitching in on this GiftStarter campaign:\n\n" + $location.absUrl());
        $location.search('re', null);
        return url;
    };

    // Check if we should fetch a giftstart
    if($location.path().length > 11) {
        if (GiftStartService.giftStart.gsid == undefined) {
            var url_title = $location.path().split('/')[2];
            GiftStartService.fetchGiftStart(url_title);
        }
    }

    $scope.fundingBarProgress = function() {
        return (GiftStartService.giftStart.funded /
            GiftStartService.giftStart.total_price * 100).toString() + '%';
    };

    $scope.pitchinBarProgress = function() {
        return ((GiftStartService.giftStart.funded +
            GiftStartService.giftStart.totalSelection) /
            GiftStartService.giftStart.total_price * 100).toString() + '%';
    };

    $document.bind('keyup keydown', function(event) {
        if(event.ctrlKey && event.keyCode === 80) {
            window.open('/pdfify?page=' + $location.path().slice(1) + '/print');
            event.preventDefault();
            return false;
        }
    });

    $scope.$on('pitch-ins-initialized', function() {
        $scope.pitchInsInitialized = true;
    });

    $scope.$on('pitch-ins-updated', function() {
        $scope.pitchIns = GiftStartService.pitchIns;
    });

    $scope.$on('selection-changed', function() {
        if (GiftStartService.giftStart.totalSelection > 0) {
            $scope.pitchinButtonHoverMessage = '';
        } else {
            $scope.pitchinButtonHoverMessage = 'Click on some parts first!';
        }
    });

    var syncPitchInsTimer = $interval(function(){GiftStartService.syncPitchIns("GiftStartService");}, 1000, false);

    // Synchronize parts on mouse activity
    $scope.mouseActivityCallback = function(source) {
        GiftStartService.syncPitchIns(source);
    };
    $scope.pitchInHoverCallback = function() {
        GiftStartService.syncPitchIns('pitch-in-hover')};

    $scope.pitchIn = function() {
        // Ensure they have selected more than $0 of the gift to pitch in
        if (GiftStartService.giftStart.totalSelection > 0) {
            Analytics.track('pitchin', 'pitchin button clicked');
            if (UserService.loggedIn) {
                PopoverService.setPopover('pay');
            } else {
                PopoverService.contributeLogin = true;
                AppStateService.set('contributeLogin', true);
                PopoverService.setPopover('login');
            }
        } else {console && console.log && console.log("Nothing selected!")}
    };

    function restartPitchin() {
        if (AppStateService.get('contributeLogin')) {
            AppStateService.remove('contributeLogin');
            $scope.pitchIn();
        }
    }

    $scope.campaignComplete = function() {
        return (GiftStartService.giftStart.funded /
            GiftStartService.giftStart.total_price > 0.9975);
    };

    $scope.updateSecondsLeft = function() {
        if (($scope.secondsLeft < 0) || ($scope.campaignComplete())) {
            $scope.countdown = "Campaign Complete";
            GiftStartService.disableParts();
        } else {
            $scope.secondsLeft -= 1;

            var days = Math.floor($scope.secondsLeft / 86400).toFixed(0);
            var hours = Math.floor(($scope.secondsLeft / 3600) % 24).toFixed(0);

            $scope.countdown = days + " days, " + hours + " hours";
        }
    };

    function startSecondsLeftTimer() {
        $scope.secondsLeftTimer = $interval($scope.updateSecondsLeft, 1000);
    }
    function stopSecondsLeftTime() {
        $scope.secondsLeftTimer.cancel();
        $scope.secondsLeftTimer = null;
    }

    $scope.saveProdForLater = function() {
        $scope.isSavingForLater = true;
        var saver = ProductService.saveForLater(
            'GiftStartService',
            GiftStartService.giftStart.product_url,
            GiftStartService.giftStart.price,
            GiftStartService.giftStart.product_title,
            '',
            GiftStartService.giftStart.product_img_url
        );
        if(saver) {
            saver.success(function (response) {
                $scope.productMessage = "The gift has been saved to your <a href='/users/"+UserService.uid+"'>profile</a>."
                $scope.isSavingForLater = false;
            })
            .error(function (response) {
                $scope.productMessage = "An error occurred while saving the product: " + response['error'];
                $scope.isSavingForLater = false;
            });
        } else {
            $scope.isSavingForLater = false;
        }
    };

    $scope.giftstartThisUrl = function() {
        return '/create?' + urlSerialize({
                product_url: GiftStartService.giftStart.product_url,
                title: GiftStartService.giftStart.product_title,
                price: GiftStartService.giftStart.price,
                img_url: GiftStartService.giftStart.product_img_url,
                source: 'GiftStarter'
            });
    };

    var urlSerialize = function(obj) {
        var str = [];
        for(var p in obj)
            if (obj.hasOwnProperty(p)) {
                str.push(encodeURIComponent(p) + "=" +
                encodeURIComponent(obj[p]));
            }
        return str.join("&");
    };


    $scope.emailShare = function() {
        Analytics.track('campaign', 'email share from campaign');
        if (device.desktop()) {
            PopoverService.setPopover('email-share');
        } else {
            $window.location.href = "mailto:?subject=" + $scope.mailSubject +
                "&body=" + $scope.mailBody();
        }
    };

    $scope.facebookShare = function() {
        Analytics.track('campaign', 'facebook share from campaign');
        FacebookService.inviteFriends(UserService.uid);
    };
    $scope.twitterShare = function() {
        Analytics.track('campaign', 'twitter share from campaign');
        TwitterService.share(UserService.uid);
    };
    $scope.googlePlusShare = function() {
        Analytics.track('campaign', 'googleplus share from campaign');
        GooglePlusService.share(UserService.uid);
    };

    $scope.productLinkClicked = function(){
        Analytics.track('campaign', 'product link clicked');
    };

    $scope.goToUserPage = function(uid) {
        Analytics.track('client', 'go to user page from comments');
        GiftStartService.goToUserPage(uid);
    };

    $scope.toPDFPage = function() {
        window.open('/pdfify?page=' + $location.path().slice(1) + '/print');
    };

    $scope.$on('login-success', function() {
        $scope.campaignEditable = UserService.uid === $scope.giftStart.gift_champion_uid;
        $scope.newUser = !UserService.hasPitchedIn;
    });
    $scope.$on('logout-success', function() {
        $scope.campaignEditable = UserService.uid === $scope.giftStart.gift_champion_uid;
    });

    $scope.showOverlay = GiftStartService.showOverlay;
    $scope.hideOverlay = GiftStartService.hideOverlay;

    var imageInput = angular.element(document.getElementById('campaign-image-input'));
    $scope.updateImage = function() {
        var maxImageSize = 2*1024*1024; // 2 MB
        var acceptableFileTypes = ['image/jpeg', 'image/png'];
        if (imageInput[0].files[0]) {
            if (imageInput[0].files[0].size > maxImageSize) {
                alert("Oops!  Images must be smaller than 2 MB.");
            } else if (acceptableFileTypes.indexOf(imageInput[0].files[0].type) == -1) {
                alert("Oops!  Only jpeg and png images are allowed!  You chose a " + imageInput[0].files[0].type + ".");
            } else {
                var reader = new FileReader();
                reader.onload = function (event) {
                    var img_data = event.target.result;
                    $scope.newImage = {data: img_data,
                        filename: imageInput[0].files[0].name};
                };
                reader.readAsDataURL(imageInput[0].files[0]);
            }
        }
    };

    $scope.updateCampaign = function() {
        GiftStartService.updateCampaign($scope.newTitle, $scope.newDescription,
            $scope.newImage, $scope.newGcName);
        $scope.editMode = false;
    };

    if (GiftStartService.giftStart.gsid != undefined) {
        // Start timer update ticker
        $scope.secondsLeft = GiftStartService.giftStart.deadline -
            (new Date()).getTime()/1000;
        startSecondsLeftTimer();
    }

    // Update this giftstart when the service updates it
    $scope.$on('giftstart-loaded', function() {
        $scope.giftStart = GiftStartService.giftStart;
        $scope.secondsLeft = GiftStartService.giftStart.deadline -
            (new Date()).getTime()/1000;
        startSecondsLeftTimer();
    });
    $scope.$on('giftstart-updated', function() {
        $scope.giftStart = GiftStartService.giftStart;
        startSecondsLeftTimer();
    });

    function loginChanged() {
        $scope.campaignEditable =
            UserService.uid == $scope.giftStart.gift_champion_uid;
    }

    function loggedIn() {
        $scope.loggedIn = true;
        loginChanged();
    }

    function loggedOut() {
        $scope.loggedIn = false;
        loginChanged();
    }

    $scope.$on('login-success', loggedIn);
    $scope.$on('logout-success', loggedOut);

    $scope.$on('giftstart-loaded', restartPitchin);

    imageInput.bind('change', $scope.updateImage);

    $scope.$on("$destroy", function() {
        if (syncPitchInsTimer) {
            $interval.cancel(syncPitchInsTimer);
        }
    });

}
