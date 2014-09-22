__author__ = 'stuart'

from google.appengine.ext import ndb


class PitchIn(ndb.Model):
    uid = ndb.StringProperty(required=True)
    gsid = ndb.StringProperty(required=True)
    giftstart_url_title = ndb.StringProperty()
    name = ndb.StringProperty(required=True)
    email = ndb.StringProperty(required=True)
    img_url = ndb.StringProperty(required=True)
    note = ndb.StringProperty(required=True)
    parts = ndb.IntegerProperty(repeated=True)
    timestamp = ndb.DateTimeProperty(auto_now=True)
    last_four = ndb.StringProperty(required=True)
    stripe_charge_id = ndb.StringProperty(required=True)
    stripe_charge_json = ndb.JsonProperty(required=True)

    def ext_dictify(self):
        return {
            'uid': self.uid,
            'name': self.name,
            'img': self.img_url,
            'gsid': self.gsid,
            'note': self.note,
            'parts': self.parts,
            'timestamp': self.timestamp.strftime("%s"),
            'giftstart_url_title': self.giftstart_url_title,
        }