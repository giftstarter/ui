__author__ = 'Stuart'

# Change execution path to project root
import os
os.chdir('/Users/Stuart/Projects/GiftStarter/app')

import unittest
import webapp2
import requests
from mock import MagicMock
import json
import main
from google.appengine.ext import testbed
import base64
import uuid
from giftstart import giftstart_api

example_giftstart = {
    'title': 'Gonna put ' + base64.b64decode('TWFyaW9uIERlc21hemnDqHJlcw==') +
             ' in the title also',
    'description': 'I will just say this is in honor of ' +
                   base64.b64decode('TWFyaW9uIERlc21hemnDqHJlcw=='),
    'product_url': 'http://yo.momma.com',
    'product_img_url': 'http://yo.momma.com/assets/venus.png',
    'product_price': 12300,
    'product_title': '$1.23 venus!',
    'sales_tax': 11,
    'shipping': 23,
    'service_fee': 9,
    'total_price': 12343,
    'columns': 3,
    'rows': 3,
    'shipping_state': 'WA',
    'shipping_zip': '98109',
    'gc_email': 'test@giftstarter.co',
}

from storage import image_cache
image_cache.cache_user_image_from_url = MagicMock()
image_cache.cache_user_image_from_url.return_value = 'lolurl'

fake_referrer = {
    'type': 'partner',
    'channel': 'test_channel',
    'uuid': str(uuid.uuid4())
}


class LoginTestHandler(unittest.TestCase):

    def setUp(self):
        self.testbed = testbed.Testbed()
        self.testbed.activate()
        self.testbed.init_datastore_v3_stub()
        self.testbed.init_memcache_stub()
        self.testbed.init_taskqueue_stub()

    def tearDown(self):
        self.testbed.deactivate()


    def test_login_facebook(self):
        self.assertTrue(False)

    def test_login_twitter(self):
        self.assertTrue(False)

    def test_login_googleplus(self):
        # Create campaign
        this_uuid = str(uuid.uuid4())
        request = webapp2.Request.blank('/giftstart/create.json')
        request.method = 'POST'
        request.body = json.dumps(dict(
            example_giftstart.items() +
            {'staging_uuid': this_uuid}.items()))
        response = request.get_response(giftstart_api.handler)
        url_title = json.loads(response.body)['giftstart_url_title']

        requests.post = MagicMock()
        requests.post.return_value = PostMock('google post')
        requests.Session.get = MagicMock()
        requests.Session.get.return_value = PostMock('google get')
        app_state = base64.urlsafe_b64encode(json.dumps({
            "path": "/giftstart/create",
            "staging_uuid": this_uuid,
            "referrer": fake_referrer
        }))

        request = webapp2.Request.blank('/')
        request.remote_addr = '1.1.1.1'
        login_kwargs = {'code': 'abcdefg',
                        'state': app_state}
        request.query_string = '/?code={code}&state={state}'\
            .format(**login_kwargs)
        response = request.get_response(main.app)
        self.assertEqual(1, requests.post.call_count,
                         "Should have POST'd details to google once")
        for param in ['code', 'client_id', 'client_secret', 'redirect_uri',
                      'grant_type']:
            self.assertIn(param, requests.post.call_args[1]['data'])

        self.assertEqual(302, response.status_code,
                         "Should have gotten 302 redirect, response was {0}"
                         .format(str(response)))
        self.assertIn(url_title, response.headers['Location'],
                      "Should have been redirected to {0}, was"
                      " redirected to {1}"
                      .format(url_title,
                              response.headers['Location']))


class PostMock:

    def __init__(self, type):
        self.body = json.dumps({
            "access_token": "1/fFAGRNJru1FTz70BzhT3Zg",
            "expires_in": 3920,
            "token_type": "Bearer"
        })
        self.content = json.dumps({
            "id": "abcd1234",
            "image": {"url": "img-url"},
            "access_token": "1/fFAGRNJru1FTz70BzhT3Zg",
            "expires_in": 3920,
            "token_type": "Bearer"
        })
