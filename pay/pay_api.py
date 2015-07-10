""" Handle payment requests and serve pitchin data for giftstarts via JSON POST"""
__author__ = 'GiftStarter'

import webapp2
from google.appengine.ext import ndb
from pay import pay_core
from gs_user.User import User
import json
import yaml
import stripe
import logging
from storage import image_cache
import base64
import uuid


stripe.api_key = yaml.load(open('secret.yaml'))['stripe_auth']['app_secret']


class PayHandler(webapp2.RequestHandler):
    """ Handle payment requests and serve pitchin data for giftstarts via JSON POST"""

    @ndb.toplevel
    def post(self):
        data = json.loads(self.request.body)

        if data['action'] == 'pitch-in':
            try:
                payment = data['payment']
                if data.get('fingerprint'):
                    result = pay_core.pay_with_fingerprint(data.get('fingerprint'),
                                                           data['uid'],
                                                           payment['gsid'],
                                                           payment['parts'],
                                                           payment['note'],
                                                           payment['subscribe'],)
                else:
                    result = pay_core.pitch_in(data['uid'], payment['gsid'],
                                               payment['parts'],
                                               payment['emailAddress'],
                                               payment['firstname'],
                                               payment['lastname'],
                                               payment['note'],
                                               payment['stripeResponse'],
                                               payment['cardData'],
                                               payment['subscribe'],
                                               payment.get('saveCreditCard', False))
                    if 'error' in result.keys():
                        self.response.set_status(400)
                self.response.write(json.dumps(result))
            except KeyError as x:
                def get_err_msg(key):
                    return {
                        'firstname': 'Please provide your first name',
                        'lastname': 'Please provide your last name',
                        'emailAddress': 'Please provide your email address',
                        'fingerprint': 'Please select a card',
                        'cardData': 'Please enter your credit card information',
                        'number':'Please enter your credit card number',
                        'expiry':'Please enter your credit card expiry',
                        'cvc':'Please enter your credit card CVC',
                        'zip':'Please enter your zip code'
                    }[key]
                self.response.write(json.dumps({'payment-error':get_err_msg(x.message)}))

        elif data['action'] == 'pitch-in-note-update':
            result = None
            if 'payment' in data:
                payment = data['payment']
                logging.info("setting note for payment "+payment['gsid'])
                result = pay_core.set_note_for_pitchin(data['uid'], payment['gsid'],
                                           payment['parts'], payment['note'],
                                           name=payment['firstName'] if 'firstName' in payment else None)
            else:
                pitchin = data['pitchin']
                logging.info("setting note for pitchin "+pitchin['gsid'])
                result = pay_core.set_note_for_pitchin(data['uid'], pitchin['gsid'],
                                           pitchin['parts'], pitchin['note'],
                                           name=pitchin['name'] if 'name' in pitchin else None, img_url=pitchin['img'] if 'img' in pitchin else None)
                if 'img' in pitchin:
                    self.update_user_profile_image_if_never_set(data['uid'], pitchin['img'])
            self.response.write(json.dumps(None if result is None else result.ext_dictify()))

        elif data['action'] == 'pitch-in-img-update':
            payment = data['payment']
            imgUrl = data['imgurl']
            uid = data['uid']
            logging.info("setting image for "+payment['gsid'])
            result = pay_core.set_img_for_pitchin(uid, payment['gsid'],
                                       payment['parts'], imgUrl)
            self.update_user_profile_image_if_never_set(uid, imgUrl)
            self.response.write(json.dumps(result if result is None else result.ext_dictify()))

        elif data['action'] == 'pitch-in-img-upload':
            content_type = data['contenttype'].split('/')
            if content_type[0] != 'image':
                logging.warning("Received image upload that was not image")
                self.response.set_status(400, 'Invalid content-type {0}, must be '
                                              'image'.format(content_type[0]))
            elif content_type[1] != 'jpeg' and \
                            content_type[1] != 'jpg' and \
                            content_type[1] != 'png':
                logging.warning("Received profile image upload with invalid "
                                "content type")
                self.response.set_status(400, 'Invalid image encoding, only jpg '
                                              'and png are acceptable')
            else:
                try:
                    image_data = data['imgdata'].split('base64,')[1]
                    extension = image_cache.extract_extension_from_content(
                        base64.b64decode(image_data))
                    base64data = ','.join(data['imgdata'].split(',')[1:])
                    img_data = base64data.decode('base64', 'strict')
                    fname = str(uuid.uuid4())
                    img_url = image_cache.save_picture_to_gcs(fname + extension,
                                                              'u/', img_data)
                    logging.info("saved image to "+img_url)
                    self.response.write(img_url)
                except TypeError as e:
                    logging.error(e)
                    logging.warning("Received pitchin image with invalid data")
                    self.response.set_status(400, "Invalid image data")

        elif data['action'] == 'get-pitch-ins':
            pitchin_dicts = pay_core.get_pitch_in_dicts(data['gsid'])
            self.response.write(json.dumps(pitchin_dicts))

    def update_user_profile_image_if_never_set(self, uid, imgUrl):
        # if user has never set a profile image, use the one from this pitchin
        try:
            users = User.query(User.uid == uid).fetch()
            if len(users):
                u = users[0]
                if u.is_system_default_profile_image:
                    u.set_cached_profile_image_url(imgUrl)
                    u.put()
        except Exception as x:
            logging.error(
                "Unable to set profile image for {0}: {3}".format(uid, x))


api = webapp2.WSGIApplication(
    [('/pay', PayHandler),
     ], debug=True)
