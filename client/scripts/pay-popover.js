/**
 * Created by stuart on 4/21/14.
 */

GiftStarterApp.controller('PayPopoverController', [
            '$scope','GiftStartService','PopoverService','UserService',
    function($scope,  GiftStartService,  PopoverService,  UserService) {

        $scope.currentCharge = GiftStartService.giftStart.totalSelection;
        $scope.emailSubscribe = false;
        $scope.pitchingIn = false;
        $scope.userOnMailingList = UserService.onMailingList;

        $scope.hidePopover = PopoverService.hidePopover;

        $scope.stripeSubmit = function(status, response) {
            // Charge process!
            // 1. User submits card details in field
            // 2. Client app sends details to stripe
            // 3. Stripe validates details and sends response with card id
            // 4. Client app sends response with card id to server app
            // 5. Server app attempts to charge card, responds with result (success/fail)
            if(response.error) {
                $scope.pitchingIn = false;
                mixpanel.track("Payment form error");
                ga('send', 'event', 'pitch-in', 'payment form error');
                console.log("Card processing error, payment not made.");
                console.log(response);
            } else {
                // Got stripe token, attach it to the current giftstart payment
                mixpanel.track("Sending payment");
                ga('send', 'event', 'pitch-in', 'sending payment');
                console.log(response);
                GiftStartService.attachStripeResponse(response);
                GiftStartService.payment.emailAddress = $scope.email;
                GiftStartService.payment.subscribe = $scope.emailSubscribe;
                GiftStartService.sendPayment(function (data) {$scope.pitchingIn = false;});
            }
        };

        // TODO: Implement error reporting for cards that are rejected!
        $scope.$on('payment-success', function() {
            mixpanel.track("Payment succeeded");
            ga('send', 'event', 'pitch-in', 'payment success');
            PopoverService.nextPopover();
            $scope.pitchingIn = false;
        });

    }
]);

GiftStarterApp.directive('gsPayPopover',
    function() {return {restrict: 'E', templateUrl: '/templates/angular/pay-popover.html'}});
