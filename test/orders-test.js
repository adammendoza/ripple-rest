var _         = require('lodash');
var assert    = require('assert');
var ripple    = require('ripple-lib');
var testutils = require('./testutils');
var fixtures  = require('./fixtures').orders;
var errors    = require('./fixtures').errors;
var addresses = require('./fixtures').addresses;
var utils     = require('./../lib/utils');

const HEX_CURRENCY = '0158415500000000C1F76FF6ECB0BAC600000000';
const ISSUER = 'rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B'
const VALUE = '0.00000001'

const DEFAULT_LIMIT = 200;
const LIMIT = 100;

const MARKER = '29F992CC252056BF690107D1E8F2D9FBAFF29FF107B62B1D1F4E4E11ADF2CC73';
const NEXT_MARKER = '0C812C919D343EAE789B29E8027C62C5792C22172D37EA2B2C0121D2381F80E1';
const LEDGER = 9592219;
const LEDGER_HASH = 'FD22E2A8D665A01711C0147173ECC0A32466BA976DE697E95197933311267BE8';

suite('get orders', function() {
  var self = this;

  setup(testutils.setup.bind(self));
  teardown(testutils.teardown.bind(self));

  test('/accounts/:account/orders', function(done) {
    self.wss.once('request_account_offers', function(message, conn) {
      assert.strictEqual(message.command, 'account_offers');
      assert.strictEqual(message.account, addresses.VALID);
      assert.strictEqual(message.ledger_index, 'validated');
      assert.strictEqual(message.limit, DEFAULT_LIMIT);
      conn.send(fixtures.accountOrdersResponse(message,{
        ledger: LEDGER,
        marker: NEXT_MARKER,
        limit: DEFAULT_LIMIT
      }));
    });

    self.app
    .get('/v1/accounts/' + addresses.VALID + '/orders')
    .expect(testutils.checkStatus(200))
    .expect(testutils.checkHeaders)
    .expect(testutils.checkBody(fixtures.RESTAccountOrdersResponse({
        ledger: LEDGER,
        marker: NEXT_MARKER,
        limit: DEFAULT_LIMIT
    })))
    .end(done);
  });

  test('/accounts/:account/orders -- with limit=all', function(done) {
    self.wss.on('request_account_offers', function(message, conn) {
      if (message.ledger_index === 'validated') {
        assert.strictEqual(message.command, 'account_offers');
        assert.strictEqual(message.account, addresses.VALID);
        assert.strictEqual(message.ledger_index, 'validated');
        assert.strictEqual(message.marker, void(0));
        assert.notEqual(message.limit, 'all');
        conn.send(fixtures.accountOrdersResponse(message,{
          ledger: LEDGER,
          marker: NEXT_MARKER
        }));
      } else {
        assert.strictEqual(message.command, 'account_offers');
        assert.strictEqual(message.account, addresses.VALID);
        assert.strictEqual(message.ledger_index, LEDGER);
        assert.strictEqual(message.marker, NEXT_MARKER);
        assert.notEqual(message.limit, 'all');
        conn.send(fixtures.accountOrdersResponse(message,{
          ledger: LEDGER,
          marker: void(0)
        }));
      }
    });

    self.app
    .get('/v1/accounts/' + addresses.VALID + '/orders?limit=all')
    .expect(testutils.checkStatus(200))
    .expect(testutils.checkHeaders)
    .end(function(err, res) {
      if (err) return done(err);

      assert.strictEqual(res.body.orders.length, 34);
      assert.strictEqual(res.body.limit, void(0));
      assert.strictEqual(res.body.marker, void(0));
      assert.strictEqual(res.body.ledger, LEDGER);
      assert.strictEqual(res.body.validated, true);

      done();

    });
  });


  test('/accounts/:account/orders -- with invalid ledger', function(done) {
    self.wss.once('request_account_offers', function(message, conn) {
      assert.strictEqual(message.command, 'account_offers');
      assert.strictEqual(message.account, addresses.VALID);
      assert.strictEqual(message.ledger_index, 'validated');
      conn.send(fixtures.accountOrdersResponse(message));
    });

    self.app
    .get('/v1/accounts/' + addresses.VALID + '/orders?ledger=foo')
    .expect(testutils.checkStatus(200))
    .expect(testutils.checkHeaders)
    .expect(testutils.checkBody(fixtures.RESTAccountOrdersResponse()))
    .end(done);
  });

  test('/accounts/:account/orders -- with ledger (sequence)', function(done) {
    self.wss.once('request_account_offers', function(message, conn) {
      assert.strictEqual(message.command, 'account_offers');
      assert.strictEqual(message.account, addresses.VALID);
      assert.strictEqual(message.ledger_index, LEDGER);
      conn.send(fixtures.accountOrdersResponse(message, {
        marker: NEXT_MARKER,
        ledger: LEDGER
      }));
    });

    self.app
    .get('/v1/accounts/' + addresses.VALID + '/orders?ledger=' + LEDGER)
    .expect(testutils.checkStatus(200))
    .expect(testutils.checkHeaders)
    .expect(testutils.checkBody(fixtures.RESTAccountOrdersResponse({
      marker: NEXT_MARKER,
      ledger: LEDGER
    })))
    .end(done);
  });

  test('/accounts/:account/orders -- with ledger (hash)', function(done) {
    self.wss.once('request_account_offers', function(message, conn) {
      assert.strictEqual(message.command, 'account_offers');
      assert.strictEqual(message.account, addresses.VALID);
      assert.strictEqual(message.ledger_hash, LEDGER_HASH);
      conn.send(fixtures.accountOrdersResponse(message, {
        marker: NEXT_MARKER,
        ledger: LEDGER
      }));
    });

    self.app
    .get('/v1/accounts/' + addresses.VALID + '/orders?ledger=' + LEDGER_HASH)
    .expect(testutils.checkStatus(200))
    .expect(testutils.checkHeaders)
    .expect(testutils.checkBody(fixtures.RESTAccountOrdersResponse({
      marker: NEXT_MARKER,
      ledger: LEDGER
    })))
    .end(done);
  });

  test('/accounts/:account/orders -- with invalid marker', function(done) {
    self.wss.once('request_account_offers', function(message, conn) {
      assert(false);
    });

    self.app
    .get('/v1/accounts/' + addresses.VALID + '/orders?marker=abcd')
    .expect(testutils.checkStatus(500))
    .expect(testutils.checkHeaders)
    .expect(testutils.checkBody(errors.RESTLedgerMissingWithMarker))
    .end(done);
  });

  test('/accounts/:account/orders -- with valid marker and invalid limit', function(done) {
    self.wss.once('request_account_offers', function(message, conn) {
      assert(false);
    });

    self.app
    .get('/v1/accounts/' + addresses.VALID + '/orders?marker=' + MARKER + '&limit=foo')
    .expect(testutils.checkStatus(500))
    .expect(testutils.checkHeaders)
    .expect(testutils.checkBody(errors.RESTLedgerMissingWithMarker))
    .end(done);
  });

  test('/accounts/:account/orders -- with valid marker and valid limit', function(done) {
    self.wss.once('request_account_offers', function(message, conn) {
      assert(false);
    });

    self.app
    .get('/v1/accounts/' + addresses.VALID + '/orders?marker=' + MARKER + '&limit=' + LIMIT)
    .expect(testutils.checkStatus(500))
    .expect(testutils.checkHeaders)
    .expect(testutils.checkBody(errors.RESTLedgerMissingWithMarker))
    .end(done);
  });

  test('/accounts/:account/orders -- with valid marker and valid ledger', function(done) {
    self.wss.once('request_account_offers', function(message, conn) {
      assert.strictEqual(message.command, 'account_offers');
      assert.strictEqual(message.account, addresses.VALID);
      assert.strictEqual(message.ledger_index, LEDGER);
      assert.strictEqual(message.marker, MARKER);
      conn.send(fixtures.accountOrdersResponse(message, {
        marker: NEXT_MARKER,
        ledger: LEDGER
      }));
    });

    self.app
    .get('/v1/accounts/' + addresses.VALID + '/orders?marker=' + MARKER + '&ledger=' + LEDGER)
    .expect(testutils.checkStatus(200))
    .expect(testutils.checkHeaders)
    .expect(testutils.checkBody(fixtures.RESTAccountOrdersResponse({
      marker: NEXT_MARKER,
      ledger: LEDGER
    })))
    .end(done);
  });

  test('/accounts/:account/orders -- valid ledger and valid limit', function(done) {
    self.wss.once('request_account_offers', function(message, conn) {
      assert.strictEqual(message.command, 'account_offers');
      assert.strictEqual(message.account, addresses.VALID);
      assert.strictEqual(message.ledger_index, 9592219);
      assert.strictEqual(message.limit, LIMIT);
      conn.send(fixtures.accountOrdersResponse(message, {
        marker: NEXT_MARKER,
        ledger: LEDGER
      }));
    });

    self.app
    .get('/v1/accounts/' + addresses.VALID + '/orders?ledger=' + LEDGER + '&limit=' + LIMIT)
    .expect(testutils.checkStatus(200))
    .expect(testutils.checkHeaders)
    .expect(testutils.checkBody(fixtures.RESTAccountOrdersResponse({
      marker: NEXT_MARKER,
      ledger: LEDGER
    })))
    .end(done);
  });

  test('/accounts/:account/orders -- with valid marker, valid limit, and invalid ledger', function(done) {
    self.wss.once('request_account_offers', function(message, conn) {
      assert(false);
    });

    self.app
    .get('/v1/accounts/' + addresses.VALID + '/orders?marker=' + MARKER + '&limit=' + LIMIT + '&ledger=foo')
    .expect(testutils.checkStatus(500))
    .expect(testutils.checkHeaders)
    .expect(testutils.checkBody(errors.RESTLedgerMissingWithMarker))
    .end(done);
  });

  test('/accounts/:account/orders -- with valid marker, valid limit, and ledger=validated', function(done) {
    self.wss.once('request_account_offers', function(message, conn) {
      assert(false);
    });

    self.app
    .get('/v1/accounts/' + addresses.VALID + '/orders?marker=' + MARKER + '&limit=' + LIMIT + '&ledger=validated')
    .expect(testutils.checkStatus(500))
    .expect(testutils.checkHeaders)
    .expect(testutils.checkBody(errors.RESTLedgerMissingWithMarker))
    .end(done);
  });

  test('/accounts/:account/orders -- with valid marker, valid limit, and ledger=current', function(done) {
    self.wss.once('request_account_offers', function(message, conn) {
      assert(false);
    });

    self.app
    .get('/v1/accounts/' + addresses.VALID + '/orders?marker=' + MARKER + '&limit=' + LIMIT + '&ledger=current')
    .expect(testutils.checkStatus(500))
    .expect(testutils.checkHeaders)
    .expect(testutils.checkBody(errors.RESTLedgerMissingWithMarker))
    .end(done);
  });

  test('/accounts/:account/orders -- with valid marker, valid limit, and ledger=closed', function(done) {
    self.wss.once('request_account_offers', function(message, conn) {
      assert(false);
    });

    self.app
    .get('/v1/accounts/' + addresses.VALID + '/orders?marker=' + MARKER + '&limit=' + LIMIT + '&ledger=closed')
    .expect(testutils.checkStatus(500))
    .expect(testutils.checkHeaders)
    .expect(testutils.checkBody(errors.RESTLedgerMissingWithMarker))
    .end(done);
  });

  test('/accounts/:account/orders -- with valid marker, valid limit, and valid ledger', function(done) {
    self.wss.once('request_account_offers', function(message, conn) {
      assert.strictEqual(message.command, 'account_offers');
      assert.strictEqual(message.account, addresses.VALID);
      assert.strictEqual(message.ledger_index, 9592219);
      assert.strictEqual(message.limit, LIMIT);
      assert.strictEqual(message.marker, MARKER);
      conn.send(fixtures.accountOrdersResponse(message, {
        marker: NEXT_MARKER
      }));
    });

    self.app
    .get('/v1/accounts/' + addresses.VALID + '/orders?marker=' + MARKER + '&limit=' + LIMIT + '&ledger=' + LEDGER)
    .expect(testutils.checkStatus(200))
    .expect(testutils.checkHeaders)
    .expect(testutils.checkBody(fixtures.RESTAccountOrdersResponse({
      marker: NEXT_MARKER
    })))
    .end(done);
  });

  test('/accounts/:account/orders -- invalid account', function(done) {
    self.wss.once('request_account_offers', function(message, conn) {
      assert(false, 'Should not request account lines');
    });

    self.app
    .get('/v1/accounts/' + addresses.INVALID + '/orders')
    .expect(testutils.checkStatus(400))
    .expect(testutils.checkHeaders)
    .expect(testutils.checkBody(errors.RESTInvalidAccount))
    .end(done);
  });
});

suite('post orders', function() {
  var self = this;

  setup(testutils.setup.bind(self));
  teardown(testutils.teardown.bind(self));

  test('/orders -- with validated true, validated submit response, and transaction verified response', function(done) {
    var lastLedger = self.app.remote._ledger_current_index;
    var hash = testutils.generateHash();

    self.wss.once('request_account_info', function(message, conn) {
      assert.strictEqual(message.command, 'account_info');
      assert.strictEqual(message.account, addresses.VALID);
      conn.send(fixtures.accountInfoResponse(message));
    });

    self.wss.once('request_submit', function(message, conn) {
      assert.strictEqual(message.command, 'submit');
      conn.send(fixtures.requestSubmitResponse(message, {
        hash: hash
      }));

      process.nextTick(function () {
        conn.send(fixtures.submitTransactionVerifiedResponse({
          hash: hash
        }));
      });
    });

    self.app
    .post('/v1/accounts/' + addresses.VALID + '/orders?validated=true')
    .send(fixtures.order())
    .expect(testutils.checkStatus(200))
    .expect(testutils.checkHeaders)
    .expect(testutils.checkBody(fixtures.RESTSubmitTransactionResponse({
      state: 'validated',
      hash: hash,
      last_ledger: lastLedger
    })))
    .end(done);
  });

  test('/orders -- with taker_gets hex currency', function(done) {
    var lastLedger = self.app.remote._ledger_current_index;
    var hash = testutils.generateHash();

    var options = {
      hash: hash,
      last_ledger: lastLedger,
      taker_gets: {
        currency: HEX_CURRENCY,
        issuer: ISSUER,
        value: VALUE
      }
    };

    self.wss.once('request_account_info', function(message, conn) {
      assert.strictEqual(message.command, 'account_info');
      assert.strictEqual(message.account, addresses.VALID);
      conn.send(fixtures.accountInfoResponse(message));
    });

    self.wss.once('request_submit', function (message, conn) {
      var so = new ripple.SerializedObject(message.tx_blob).to_json();
      assert.strictEqual(so.TakerGets.value, VALUE);
      assert.strictEqual(so.TakerGets.currency, HEX_CURRENCY);
      assert.strictEqual(so.TakerGets.issuer, ISSUER);
      assert.strictEqual(message.command, 'submit');

      conn.send(fixtures.requestSubmitResponse(message, options));
    });


    self.app
    .post('/v1/accounts/' + addresses.VALID + '/orders')
    .send(fixtures.order({
      taker_gets: options.taker_gets
    }))
    .expect(testutils.checkStatus(200))
    .expect(testutils.checkHeaders)
    .end(function(err, res) {
      if (err) return done(err);

      assert.strictEqual(res.body.order.taker_gets.currency, HEX_CURRENCY);
      assert.strictEqual(res.body.order.taker_gets.value, VALUE);
      assert.strictEqual(res.body.order.taker_gets.issuer, ISSUER);

      done();
    });
  });

  test('/orders -- with taker_pays hex currency', function(done) {
    var lastLedger = self.app.remote._ledger_current_index;
    var hash = testutils.generateHash();

    var options = {
      hash: hash,
      last_ledger: lastLedger,
      taker_pays: {
        currency: HEX_CURRENCY,
        issuer: ISSUER,
        value: VALUE
      }
    };

    self.wss.once('request_account_info', function(message, conn) {
      assert.strictEqual(message.command, 'account_info');
      assert.strictEqual(message.account, addresses.VALID);
      conn.send(fixtures.accountInfoResponse(message));
    });

    self.wss.once('request_submit', function (message, conn) {
      var so = new ripple.SerializedObject(message.tx_blob).to_json();
      assert.strictEqual(so.TakerPays.value, VALUE);
      assert.strictEqual(so.TakerPays.currency, HEX_CURRENCY);
      assert.strictEqual(so.TakerPays.issuer, ISSUER);
      assert.strictEqual(message.command, 'submit');

      conn.send(fixtures.requestSubmitResponse(message, options));
    });

    self.app
    .post('/v1/accounts/' + addresses.VALID + '/orders')
    .send(fixtures.order({ 
      taker_pays: options.taker_pays
    }))
    .expect(testutils.checkStatus(200))
    .expect(testutils.checkHeaders)
    .end(function(err, res) {
      if (err) return done(err);

      assert.strictEqual(res.body.order.taker_pays.currency, HEX_CURRENCY);
      assert.strictEqual(res.body.order.taker_pays.value, VALUE);
      assert.strictEqual(res.body.order.taker_pays.issuer, ISSUER);

      done();
    });
  });

  test('/orders -- with validated true and ledger sequence too high error', function(done) {
    self.wss.once('request_account_info', function(message, conn) {
      assert.strictEqual(message.command, 'account_info');
      assert.strictEqual(message.account, addresses.VALID);
      conn.send(fixtures.accountInfoResponse(message));
    });

    self.wss.once('request_submit', function(message, conn) {
      assert.strictEqual(message.command, 'submit');
      conn.send(fixtures.ledgerSequenceTooHighResponse(message));
      testutils.closeLedgers(conn);
    });

    self.app
    .post('/v1/accounts/' + addresses.VALID + '/orders?validated=true')
    .send(fixtures.order())
    .expect(testutils.checkBody(errors.RESTResponseLedgerSequenceTooHigh))
    .expect(testutils.checkStatus(500))
    .expect(testutils.checkHeaders)
    .end(done);
  });

  test('/orders -- with validated true and invalid secret', function(done) {
    self.wss.once('request_account_info', function(message, conn) {
      assert.strictEqual(message.command, 'account_info');
      assert.strictEqual(message.account, addresses.VALID);
      conn.send(fixtures.accountInfoResponse(message));
    });

    self.wss.once('request_submit', function(message, conn) {
      assert(false)
    });

    self.app
    .post('/v1/accounts/' + addresses.VALID + '/orders?validated=true')
    .send(fixtures.order({
      secret: 'foo'
    }))
    .expect(testutils.checkStatus(500))
    .expect(testutils.checkHeaders)
    .expect(testutils.checkBody(errors.RESTInvalidSecret))
    .end(done);
  });

  test('/orders -- with validated false and valid submit response', function(done) {
    var lastLedger = self.app.remote._ledger_current_index;
    var hash = testutils.generateHash();

    self.wss.once('request_account_info', function(message, conn) {
      assert.strictEqual(message.command, 'account_info');
      assert.strictEqual(message.account, addresses.VALID);
      conn.send(fixtures.accountInfoResponse(message));
    });

    self.wss.once('request_submit', function(message, conn) {
      assert.strictEqual(message.command, 'submit');
      conn.send(fixtures.requestSubmitResponse(message, {
        hash: hash
      }));

      process.nextTick(function () {
        conn.send(fixtures.submitTransactionVerifiedResponse({
          hash: hash
        }));
      });
    });

    self.app
    .post('/v1/accounts/' + addresses.VALID + '/orders?validated=false')
    .send(fixtures.order())
    .expect(testutils.checkStatus(200))
    .expect(testutils.checkHeaders)
    .expect(testutils.checkBody(fixtures.RESTSubmitTransactionResponse({
      hash: hash,
      last_ledger: lastLedger
    })))
    .end(done);
  });

  test('/orders -- with validated false and invalid secret', function(done) {
    self.wss.once('request_account_info', function(message, conn) {
      assert.strictEqual(message.command, 'account_info');
      assert.strictEqual(message.account, addresses.VALID);
      conn.send(fixtures.accountInfoResponse(message));
    });

    self.wss.once('request_submit', function(message, conn) {
      assert(false, 'should not submit request');
    });

    self.app
    .post('/v1/accounts/' + addresses.VALID + '/orders?validated=false')
    .send(fixtures.order({
      secret: 'foo'
    }))
    .expect(testutils.checkStatus(500))
    .expect(testutils.checkHeaders)
    .expect(testutils.checkBody(errors.RESTInvalidSecret))
    .end(done);
  });

  test('/orders -- with valid parameters', function(done) {
    var lastLedger = self.app.remote._ledger_current_index;
    var hash = testutils.generateHash();

    self.wss.once('request_account_info', function(message, conn) {
      assert.strictEqual(message.command, 'account_info');
      assert.strictEqual(message.account, addresses.VALID);
      conn.send(fixtures.accountInfoResponse(message));
    });

    self.wss.once('request_submit', function(message, conn) {
      var so = new ripple.SerializedObject(message.tx_blob).to_json();
      assert.strictEqual(message.command, 'submit');
      assert.strictEqual(so.Account, addresses.VALID);
      assert.strictEqual(so.TransactionType, 'OfferCreate');
      assert.deepEqual(so.TakerPays, {
        value: '100',
        currency: 'USD',
        issuer: addresses.ISSUER
      });
      assert.deepEqual(so.TakerGets, {
        value: '100',
        currency: 'USD',
        issuer: addresses.ISSUER
      });

      conn.send(fixtures.requestSubmitResponse(message, {
        hash: hash
      }));
    });

    self.app
    .post('/v1/accounts/' + addresses.VALID + '/orders')
    .send(fixtures.order())
    .expect(testutils.checkStatus(200))
    .expect(testutils.checkHeaders)
    .expect(testutils.checkBody(fixtures.RESTSubmitTransactionResponse({
      hash: hash,
      last_ledger: lastLedger
    })))
    .end(done);
  });

  test('/orders -- with type sell', function(done) {
    var lastLedger = self.app.remote._ledger_current_index;
    var hash = testutils.generateHash();

    self.wss.once('request_account_info', function(message, conn) {
      assert.strictEqual(message.command, 'account_info');
      assert.strictEqual(message.account, addresses.VALID);
      conn.send(fixtures.accountInfoResponse(message));
    });

    self.wss.once('request_submit', function(message, conn) {
      var so = new ripple.SerializedObject(message.tx_blob).to_json();
      assert.strictEqual(message.command, 'submit');
      assert((so.Flags & ripple.Transaction.flags.OfferCreate.Sell) > 0);

      conn.send(fixtures.requestSubmitResponse(message, {
        hash: hash
      }));
    });

    self.app
    .post('/v1/accounts/' + addresses.VALID + '/orders')
    .send(fixtures.order({
      type: 'sell'
    }))
    .expect(testutils.checkStatus(200))
    .expect(testutils.checkHeaders)
    .expect(testutils.checkBody(fixtures.RESTSubmitTransactionResponse({
      hash: hash,
      last_ledger: lastLedger
    })))
    .end(done);
  });

  test('/orders -- with passive true', function(done) {
    var lastLedger = self.app.remote._ledger_current_index;
    var hash = testutils.generateHash();

    self.wss.once('request_account_info', function(message, conn) {
      assert.strictEqual(message.command, 'account_info');
      assert.strictEqual(message.account, addresses.VALID);
      conn.send(fixtures.accountInfoResponse(message));
    });

    self.wss.once('request_submit', function(message, conn) {
      var so = new ripple.SerializedObject(message.tx_blob).to_json();
      assert.strictEqual(message.command, 'submit');
      assert((so.Flags & ripple.Transaction.flags.OfferCreate.Passive) > 0);

      conn.send(fixtures.requestSubmitResponse(message, {
        hash: hash
      }));
    });

    self.app
    .post('/v1/accounts/' + addresses.VALID + '/orders')
    .send(fixtures.order({
      passive: true
    }))
    .expect(testutils.checkStatus(200))
    .expect(testutils.checkHeaders)
    .expect(testutils.checkBody(fixtures.RESTSubmitTransactionResponse({
      hash: hash,
      last_ledger: lastLedger
    })))
    .end(done);
  });

  test('/orders -- with fill_or_kill true', function(done) {
    var lastLedger = self.app.remote._ledger_current_index;
    var hash = testutils.generateHash();

    self.wss.once('request_account_info', function(message, conn) {
      assert.strictEqual(message.command, 'account_info');
      assert.strictEqual(message.account, addresses.VALID);
      conn.send(fixtures.accountInfoResponse(message));
    });

    self.wss.once('request_submit', function(message, conn) {
      var so = new ripple.SerializedObject(message.tx_blob).to_json();
      assert.strictEqual(message.command, 'submit');
      assert((so.Flags & ripple.Transaction.flags.OfferCreate.FillOrKill) > 0);

      conn.send(fixtures.requestSubmitResponse(message, {
        hash: hash
      }));
    });

    self.app
    .post('/v1/accounts/' + addresses.VALID + '/orders')
    .send(fixtures.order({
      fill_or_kill: true
    }))
    .expect(testutils.checkStatus(200))
    .expect(testutils.checkHeaders)
    .expect(testutils.checkBody(fixtures.RESTSubmitTransactionResponse({
      hash: hash,
      last_ledger: lastLedger
    })))
    .end(done);
  });

  test('/orders -- with immediate_or_cancel true', function(done) {
    var lastLedger = self.app.remote._ledger_current_index;
    var hash = testutils.generateHash();

    self.wss.once('request_account_info', function(message, conn) {
      assert.strictEqual(message.command, 'account_info');
      assert.strictEqual(message.account, addresses.VALID);
      conn.send(fixtures.accountInfoResponse(message));
    });

    self.wss.once('request_submit', function(message, conn) {
      var so = new ripple.SerializedObject(message.tx_blob).to_json();
      assert.strictEqual(message.command, 'submit');
      assert((so.Flags & ripple.Transaction.flags.OfferCreate.ImmediateOrCancel) > 0);

      conn.send(fixtures.requestSubmitResponse(message, {
        hash: hash
      }));
    });

    self.app
    .post('/v1/accounts/' + addresses.VALID + '/orders')
    .send(fixtures.order({
      immediate_or_cancel: true
    }))
    .expect(testutils.checkStatus(200))
    .expect(testutils.checkHeaders)
    .expect(testutils.checkBody(fixtures.RESTSubmitTransactionResponse({
      hash: hash,
      last_ledger: lastLedger
    })))
    .end(done);
  });

  test('/orders -- with passive false', function(done) {
    var lastLedger = self.app.remote._ledger_current_index;
    var hash = testutils.generateHash();

    self.wss.once('request_account_info', function(message, conn) {
      assert.strictEqual(message.command, 'account_info');
      assert.strictEqual(message.account, addresses.VALID);
      conn.send(fixtures.accountInfoResponse(message));
    });

    self.wss.once('request_submit', function(message, conn) {
      var so = new ripple.SerializedObject(message.tx_blob).to_json();
      assert.strictEqual(message.command, 'submit');
      assert.strictEqual(so.Flags & ripple.Transaction.flags.OfferCreate.Passive, 0);

      conn.send(fixtures.requestSubmitResponse(message, {
        hash: hash
      }));
    });

    self.app
    .post('/v1/accounts/' + addresses.VALID + '/orders')
    .send(fixtures.order({
      passive: false
    }))
    .expect(testutils.checkStatus(200))
    .expect(testutils.checkHeaders)
    .expect(testutils.checkBody(fixtures.RESTSubmitTransactionResponse({
      hash: hash,
      last_ledger: lastLedger
    })))
    .end(done);
  });

  test('/orders -- with fill_or_kill false', function(done) {
    var lastLedger = self.app.remote._ledger_current_index;
    var hash = testutils.generateHash();

    self.wss.once('request_account_info', function(message, conn) {
      assert.strictEqual(message.command, 'account_info');
      assert.strictEqual(message.account, addresses.VALID);
      conn.send(fixtures.accountInfoResponse(message));
    });

    self.wss.once('request_submit', function(message, conn) {
      var so = new ripple.SerializedObject(message.tx_blob).to_json();
      assert.strictEqual(message.command, 'submit');
      assert.strictEqual(so.Flags & ripple.Transaction.flags.OfferCreate.FillOrKill, 0);

      conn.send(fixtures.requestSubmitResponse(message, {
        hash: hash
      }));
    });

    self.app
    .post('/v1/accounts/' + addresses.VALID + '/orders')
    .send(fixtures.order({
      fill_or_kill: false
    }))
    .expect(testutils.checkStatus(200))
    .expect(testutils.checkHeaders)
    .expect(testutils.checkBody(fixtures.RESTSubmitTransactionResponse({
      hash: hash,
      last_ledger: lastLedger
    })))
    .end(done);
  });

  test('/orders -- with immediate_or_cancel false', function(done) {
    var lastLedger = self.app.remote._ledger_current_index;
    var hash = testutils.generateHash();

    self.wss.once('request_account_info', function(message, conn) {
      assert.strictEqual(message.command, 'account_info');
      assert.strictEqual(message.account, addresses.VALID);
      conn.send(fixtures.accountInfoResponse(message));
    });

    self.wss.once('request_submit', function(message, conn) {
      var so = new ripple.SerializedObject(message.tx_blob).to_json();
      assert.strictEqual(message.command, 'submit');
      assert.strictEqual(so.Flags & ripple.Transaction.flags.OfferCreate.ImmediateOrCancel, 0);

      conn.send(fixtures.requestSubmitResponse(message, {
        hash: hash
      }));
    });

    self.app
    .post('/v1/accounts/' + addresses.VALID + '/orders')
    .send(fixtures.order({
      immediate_or_cancel: false
    }))
    .expect(testutils.checkStatus(200))
    .expect(testutils.checkHeaders)
    .expect(testutils.checkBody(fixtures.RESTSubmitTransactionResponse({
      hash: hash,
      last_ledger: lastLedger
    })))
    .end(done);
  });

  test('/orders -- with invalid passive', function(done) {
    self.wss.once('request_account_info', function(message, conn) {
      assert(false, 'should not request account info');
    });

    self.wss.once('request_submit', function(message, conn) {
      assert(false, 'should not submit request');
    });

    self.app
    .post('/v1/accounts/' + addresses.VALID + '/orders')
    .send(fixtures.order({
      passive: 'test'
    }))
    .expect(testutils.checkStatus(400))
    .expect(testutils.checkHeaders)
    .expect(testutils.checkBody(errors.RESTErrorResponse({
      type: 'invalid_request',
      error: 'Parameter must be a boolean: passive'
    })))
    .end(done);
  });

  test('/orders -- with invalid immediate_or_cancel', function(done) {
    self.wss.once('request_account_info', function(message, conn) {
      assert(false, 'should not request account info');
    });

    self.wss.once('request_submit', function(message, conn) {
      assert(false, 'should not submit request');
    });

    self.app
    .post('/v1/accounts/' + addresses.VALID + '/orders')
    .send(fixtures.order({
      immediate_or_cancel: 'test'
    }))
    .expect(testutils.checkStatus(400))
    .expect(testutils.checkHeaders)
    .expect(testutils.checkBody(errors.RESTErrorResponse({
      type: 'invalid_request',
      error: 'Parameter must be a boolean: immediate_or_cancel'
    })))
    .end(done);
  });

  test('/orders -- with invalid fill_or_kill', function(done) {
    self.wss.once('request_account_info', function(message, conn) {
      assert(false, 'should not request account info');
    });

    self.wss.once('request_submit', function(message, conn) {
      assert(false, 'should not submit request');
    });

    self.app
    .post('/v1/accounts/' + addresses.VALID + '/orders')
    .send(fixtures.order({
      fill_or_kill: 'test'
    }))
    .expect(testutils.checkStatus(400))
    .expect(testutils.checkHeaders)
    .expect(testutils.checkBody(errors.RESTErrorResponse({
      type: 'invalid_request',
      error: 'Parameter must be a boolean: fill_or_kill'
    })))
    .end(done);
  });

  test('/orders -- with xrp taker gets', function(done) {
    var lastLedger = self.app.remote._ledger_current_index;
    var hash = testutils.generateHash();

    self.wss.once('request_account_info', function(message, conn) {
      assert.strictEqual(message.command, 'account_info');
      assert.strictEqual(message.account, addresses.VALID);
      conn.send(fixtures.accountInfoResponse(message));
    });

    self.wss.once('request_submit', function(message, conn) {
      var so = new ripple.SerializedObject(message.tx_blob).to_json();
      assert.strictEqual(message.command, 'submit');
      assert.strictEqual(so.Account, addresses.VALID);
      assert.strictEqual(so.TransactionType, 'OfferCreate');
      assert.deepEqual(so.TakerGets, '100000000000');

      conn.send(fixtures.requestSubmitResponse(message, {
        hash: hash,
        taker_gets: '100000000000'
      }));
    });

    self.app
    .post('/v1/accounts/' + addresses.VALID + '/orders')
    .send(fixtures.order({
      taker_gets: {
        currency: 'XRP',
        value: '100000',
        issuer: ''
      }
    }))
    .expect(testutils.checkBody(fixtures.RESTSubmitTransactionResponse({
      hash: hash,
      last_ledger: lastLedger,
      taker_gets: {
        currency: 'XRP',
        value: '100000',
        issuer: ''
      }
    })))
    .expect(testutils.checkStatus(200))
    .expect(testutils.checkHeaders)
    .end(done);
  });

  test('/orders -- with xrp taker pays', function(done) {
    var lastLedger = self.app.remote._ledger_current_index;
    var hash = testutils.generateHash();

    self.wss.once('request_account_info', function(message, conn) {
      assert.strictEqual(message.command, 'account_info');
      assert.strictEqual(message.account, addresses.VALID);
      conn.send(fixtures.accountInfoResponse(message));
    });

    self.wss.once('request_submit', function(message, conn) {
      var so = new ripple.SerializedObject(message.tx_blob).to_json();
      assert.strictEqual(message.command, 'submit');
      assert.strictEqual(so.Account, addresses.VALID);
      assert.strictEqual(so.TransactionType, 'OfferCreate');
      assert.deepEqual(so.TakerPays, '100000000000');

      conn.send(fixtures.requestSubmitResponse(message, {
        hash: hash,
        taker_pays: '100000000000'
      }));
    });

    self.app
    .post('/v1/accounts/' + addresses.VALID + '/orders')
    .send(fixtures.order({
      taker_pays: {
        currency: 'XRP',
        value: '100000'
      }
    }))
    .expect(testutils.checkStatus(200))
    .expect(testutils.checkHeaders)
    .expect(testutils.checkBody(fixtures.RESTSubmitTransactionResponse({
      hash: hash,
      last_ledger: lastLedger,
      taker_pays: {
        currency: 'XRP',
        value: '100000',
        issuer: ''
      }
    })))
    .end(done);
  });

  test('/orders -- with validated true and unfunded offer error', function(done) {
    var hash = testutils.generateHash();

    self.wss.once('request_account_info', function(message, conn) {
      assert.strictEqual(message.command, 'account_info');
      assert.strictEqual(message.account, addresses.VALID);
      conn.send(fixtures.accountInfoResponse(message));
    });

    self.wss.once('request_submit', function(message, conn) {
      assert.strictEqual(message.command, 'submit');
      conn.send(fixtures.rippledSubmitErrorResponse(message, {
        engine_result: 'tecUNFUNDED_OFFER',
        engine_result_code: 103,
        engine_result_message: 'Insufficient balance to fund created offer.',
        hash: hash
      }));

      process.nextTick(function() {
        conn.send(fixtures.unfundedOrderFinalizedResponse({
          hash: hash
        }))
      });
    });

    self.app
    .post('/v1/accounts/' + addresses.VALID + '/orders?validated=true')
    .send(fixtures.order())
    .expect(testutils.checkStatus(500))
    .expect(testutils.checkHeaders)
    .expect(testutils.checkBody(errors.RESTErrorResponse({
      type: 'transaction',
      error: 'tecUNFUNDED_OFFER',
      message: 'Insufficient balance to fund created offer.'
    })))
    .end(done);
  });

  test.only('/orders -- with ledger sequence too high response', function(done) {
    self.wss.once('request_account_info', function(message, conn) {
      assert.strictEqual(message.command, 'account_info');
      assert.strictEqual(message.account, addresses.VALID);
      conn.send(fixtures.accountInfoResponse(message));
    });

    self.wss.once('request_submit', function(message, conn) {
      assert.strictEqual(message.command, 'submit');
      conn.send(fixtures.ledgerSequenceTooHighResponse(message));
      testutils.closeLedgers(conn);
    });

    self.app
    .post('/v1/accounts/' + addresses.VALID + '/orders')
    .send(fixtures.order())
    .expect(testutils.checkBody(errors.RESTResponseLedgerSequenceTooHigh))
    .expect(testutils.checkStatus(200))
    .expect(testutils.checkHeaders)
    .end(done);
  });

  test('/orders -- with missing secret', function(done) {
    self.wss.once('request_account_info', function(message, conn) {
      assert(false, 'should not request account info');
    });

    self.wss.once('request_submit', function(message, conn) {
      assert(false, 'should not submit request');
    });

    self.app
    .post('/v1/accounts/' + addresses.VALID + '/orders')
    .send({})
    .expect(testutils.checkStatus(400))
    .expect(testutils.checkHeaders)
    .expect(testutils.checkBody(errors.RESTErrorResponse({
      type: 'invalid_request',
      error: 'Parameter missing: secret'
    })))
    .end(done);
  });

  test('/orders -- with invalid secret', function(done) {
    self.wss.once('request_account_info', function(message, conn) {
      assert.strictEqual(message.command, 'account_info');
      assert.strictEqual(message.account, addresses.VALID);
      conn.send(fixtures.accountInfoResponse(message));
    });

    self.wss.once('request_submit', function(message, conn) {
      assert(false, 'should not submit request');
    });

    self.app
    .post('/v1/accounts/' + addresses.VALID + '/orders')
    .send(fixtures.order({
        secret: 'foo'
    }))
    .expect(testutils.checkStatus(500))
    .expect(testutils.checkHeaders)
    .expect(testutils.checkBody(errors.RESTInvalidSecret))
    .end(done);
  });

  test('/orders -- with missing order object', function(done) {
    self.wss.once('request_account_info', function(message, conn) {
      assert(false, 'should not request account info');
    });

    self.wss.once('request_submit', function(message, conn) {
      assert(false, 'should not submit request');
    });

    self.app
    .post('/v1/accounts/' + addresses.VALID + '/orders')
    .send({
      secret: addresses.SECRET
    })
    .expect(testutils.checkStatus(400))
    .expect(testutils.checkHeaders)
    .expect(testutils.checkBody(errors.RESTErrorResponse({
      type: 'invalid_request',
      error: 'Missing parameter: order',
      message: 'Submission must have order object in JSON form'
    })))
    .end(done);
  });

  test('/orders -- with invalid order type', function(done) {
    self.wss.once('request_account_info', function(message, conn) {
      assert(false, 'should not request account info');
    });

    self.wss.once('request_submit', function(message, conn) {
      assert(false, 'should not submit request');
    });

    self.app
    .post('/v1/accounts/' + addresses.VALID + '/orders')
    .send(fixtures.order({
      type: 'test'
    }))
    .expect(testutils.checkStatus(400))
    .expect(testutils.checkHeaders)
    .expect(testutils.checkBody(errors.RESTErrorResponse({
      type: 'invalid_request',
      error: 'Parameter must be "buy" or "sell": type'
    })))
    .end(done);
  });

  test('/orders -- with invalid taker_gets', function(done) {
    self.wss.once('request_account_info', function(message, conn) {
      assert(false, 'should not request account info');
    });

    self.wss.once('request_submit', function(message, conn) {
      assert(false, 'should not submit request');
    });

    self.app
    .post('/v1/accounts/' + addresses.VALID + '/orders')
    .send(fixtures.order({
      taker_gets: 'test'
    }))
    .expect(testutils.checkStatus(400))
    .expect(testutils.checkHeaders)
    .expect(testutils.checkBody(errors.RESTErrorResponse({
      type: 'invalid_request',
      error: 'Parameter must be a valid Amount object: taker_gets'
    })))
    .end(done);
  });

  test('/orders -- with taker_gets with currency but no issuer', function(done) {
    self.wss.once('request_account_info', function(message, conn) {
      assert(false, 'should not request account info');
    });

    self.wss.once('request_submit', function(message, conn) {
      assert(false, 'should not submit request');
    });

    self.app
    .post('/v1/accounts/' + addresses.VALID + '/orders')
    .send(fixtures.order({
      taker_gets: {
        currency: 'USD',
        value: '100'
      }
    }))
    .expect(testutils.checkStatus(400))
    .expect(testutils.checkHeaders)
    .expect(testutils.checkBody(errors.RESTErrorResponse({
      type: 'invalid_request',
      error: 'Parameter must be a valid Amount object: taker_gets'
    })))
    .end(done);
  });

  test('/orders -- with invalid taker_pays', function(done) {
    self.wss.once('request_account_info', function(message, conn) {
      assert(false, 'should not request account info');
    });

    self.wss.once('request_submit', function(message, conn) {
      assert(false, 'should not submit request');
    });

    self.app
    .post('/v1/accounts/' + addresses.VALID + '/orders')
    .send(fixtures.order({
      taker_pays: 'test'
    }))
    .expect(testutils.checkStatus(400))
    .expect(testutils.checkHeaders)
    .expect(testutils.checkBody(errors.RESTErrorResponse({
      type: 'invalid_request',
      error: 'Parameter must be a valid Amount object: taker_pays'
    })))
    .end(done);
  });

  test('/orders -- with taker_pays with currency but no issuer', function(done) {
    self.wss.once('request_account_info', function(message, conn) {
      assert(false, 'should not request account info');
    });

    self.wss.once('request_submit', function(message, conn) {
      assert(false, 'should not submit request');
    });

    self.app
    .post('/v1/accounts/' + addresses.VALID + '/orders')
    .send(fixtures.order({
      taker_pays: {
        currency: 'USD',
        value: '100'
      }
    }))
    .expect(testutils.checkStatus(400))
    .expect(testutils.checkHeaders)
    .expect(testutils.checkBody(errors.RESTErrorResponse({
      type: 'invalid_request',
      error: 'Parameter must be a valid Amount object: taker_pays'
    })))
    .end(done);
  });
});

suite('delete orders', function() {
  var self = this;

  setup(testutils.setup.bind(self));
  teardown(testutils.teardown.bind(self));

  test('/orders/:sequence -- with validated true, validated submit response, and transaction verified response', function(done) {
    var lastLedger = self.app.remote._ledger_current_index;
    var hash = testutils.generateHash();

    self.wss.once('request_account_info', function(message, conn) {
      assert.strictEqual(message.command, 'account_info');
      assert.strictEqual(message.account, addresses.VALID);
      conn.send(fixtures.accountInfoResponse(message));
    });

    self.wss.once('request_submit', function(message, conn) {
      var so = new ripple.SerializedObject(message.tx_blob).to_json();
      assert.strictEqual(message.command, 'submit');
      assert.strictEqual(so.TransactionType, 'OfferCancel');
      assert.strictEqual(so.OfferSequence, 99);
      conn.send(fixtures.requestCancelResponse(message, {
        hash: hash
      }));

      process.nextTick(function() {
        conn.send(fixtures.cancelTransactionVerifiedResponse({
          hash: hash
        }))
      });
    });

    self.app
    .del('/v1/accounts/' + addresses.VALID + '/orders/99?validated=true')
    .send({
      secret: addresses.SECRET
    })
    .expect(testutils.checkStatus(200))
    .expect(testutils.checkHeaders)
    .expect(testutils.checkBody(fixtures.RESTCancelTransactionResponse({
      hash: hash,
      last_ledger: lastLedger,
      state: 'validated'
    })))
    .end(done);
  });

  test('/orders/:sequence -- with validated true and ledger sequence too high error', function(done) {
    self.wss.once('request_account_info', function(message, conn) {
      assert.strictEqual(message.command, 'account_info');
      assert.strictEqual(message.account, addresses.VALID);
      conn.send(fixtures.accountInfoResponse(message));
    });

    self.wss.once('request_submit', function(message, conn) {
      assert.strictEqual(message.command, 'submit');
      conn.send(fixtures.ledgerSequenceTooHighResponse(message));
      testutils.closeLedgers(conn);
    });

    self.app
    .del('/v1/accounts/' + addresses.VALID + '/orders/99?validated=true')
    .send({
      secret: addresses.SECRET
    })
    .expect(testutils.checkBody(errors.RESTResponseLedgerSequenceTooHigh))
    .expect(testutils.checkStatus(500))
    .expect(testutils.checkHeaders)
    .end(done);
  });

  test('/orders/:sequence -- with validated true and invalid secret', function(done) {
    self.wss.once('request_account_info', function(message, conn) {
      assert.strictEqual(message.command, 'account_info');
      assert.strictEqual(message.account, addresses.VALID);
      conn.send(fixtures.accountInfoResponse(message));
    });

    self.wss.once('request_submit', function(message, conn) {
      assert(false)
    });

    self.app
    .del('/v1/accounts/' + addresses.VALID + '/orders/99?validated=true')
    .send(fixtures.order({
      secret: 'foo'
    }))
    .expect(testutils.checkStatus(500))
    .expect(testutils.checkHeaders)
    .expect(testutils.checkBody(errors.RESTInvalidSecret))
    .end(done);
  });

  test('/orders/:sequence -- with validated false and valid submit response', function(done) {
    var lastLedger = self.app.remote._ledger_current_index;
    var hash = testutils.generateHash();

    self.wss.once('request_account_info', function(message, conn) {
      assert.strictEqual(message.command, 'account_info');
      assert.strictEqual(message.account, addresses.VALID);
      conn.send(fixtures.accountInfoResponse(message));
    });

    self.wss.once('request_submit', function(message, conn) {
      assert.strictEqual(message.command, 'submit');
      conn.send(fixtures.requestCancelResponse(message, {
        hash: hash
      }));

      process.nextTick(function () {
        conn.send(fixtures.cancelTransactionVerifiedResponse({
          hash: hash
        }));
      });
    });

    self.app
    .del('/v1/accounts/' + addresses.VALID + '/orders/99?validated=false')
    .send({
      secret: addresses.SECRET
    })
    .expect(testutils.checkStatus(200))
    .expect(testutils.checkHeaders)
    .expect(testutils.checkBody(fixtures.RESTCancelTransactionResponse({
      hash: hash,
      last_ledger: lastLedger
    })))
    .end(done);
  });

  test('/orders/:sequence -- with validated false and ledger sequence too high error', function(done) {
    self.wss.once('request_account_info', function(message, conn) {
      assert.strictEqual(message.command, 'account_info');
      assert.strictEqual(message.account, addresses.VALID);
      conn.send(fixtures.accountInfoResponse(message));
    });

    self.wss.once('request_submit', function(message, conn) {
      assert.strictEqual(message.command, 'submit');
      conn.send(fixtures.ledgerSequenceTooHighResponse(message));
      testutils.closeLedgers(conn);
    });

    self.app
    .del('/v1/accounts/' + addresses.VALID + '/orders/99?validated=false')
    .send({
      secret: addresses.SECRET
    })
    .expect(testutils.checkBody(fixtures.RESTCancelTransactionResponse({
        last_ledger: 8819952,
        sequence: 2938,
        offer_sequence: void(0),
        fee: '0.000012',
        hash: 'AD922400CB1CE0876CA7203DBE0B1277D0D0EAC56A64F26CEC6C78D447EFEA5E'
      })))
    .expect(testutils.checkStatus(200))
    .expect(testutils.checkHeaders)
    .end(done);
  });

  test('/orders/:sequence -- with validated false and invalid secret', function(done) {
    self.wss.once('request_account_info', function(message, conn) {
      assert.strictEqual(message.command, 'account_info');
      assert.strictEqual(message.account, addresses.VALID);
      conn.send(fixtures.accountInfoResponse(message));
    });

    self.wss.once('request_submit', function(message, conn) {
      assert(false, 'should not submit request');
    });

    self.app
    .del('/v1/accounts/' + addresses.VALID + '/orders/99?validated=false')
    .send({
      secret: 'foo'
    })
    .expect(testutils.checkStatus(500))
    .expect(testutils.checkHeaders)
    .expect(testutils.checkBody(errors.RESTInvalidSecret))
    .end(done);
  });

  test('/orders/:sequence -- with valid parameters', function(done) {
    var lastLedger = self.app.remote._ledger_current_index;
    var hash = testutils.generateHash();

    self.wss.once('request_account_info', function(message, conn) {
      assert.strictEqual(message.command, 'account_info');
      assert.strictEqual(message.account, addresses.VALID);
      conn.send(fixtures.accountInfoResponse(message));
    });

    self.wss.once('request_submit', function(message, conn) {
      var so = new ripple.SerializedObject(message.tx_blob).to_json();
      assert.strictEqual(message.command, 'submit');
      assert.strictEqual(so.TransactionType, 'OfferCancel');
      assert.strictEqual(so.OfferSequence, 99);
      conn.send(fixtures.requestCancelResponse(message, {
        hash: hash
      }));
    });

    self.app
    .del('/v1/accounts/' + addresses.VALID + '/orders/99')
    .send({
      secret: addresses.SECRET
    })
    .expect(testutils.checkStatus(200))
    .expect(testutils.checkHeaders)
    .expect(testutils.checkBody(fixtures.RESTCancelTransactionResponse({
      hash: hash,
      last_ledger: lastLedger
    })))
    .end(done);
  });

  test('/orders/:sequence -- with bad sequence error', function(done) {
    var hash = testutils.generateHash();

    self.wss.once('request_account_info', function(message, conn) {
      assert.strictEqual(message.command, 'account_info');
      assert.strictEqual(message.account, addresses.VALID);
      conn.send(fixtures.accountInfoResponse(message));
    });

    self.wss.once('request_submit', function(message, conn) {
      var so = new ripple.SerializedObject(message.tx_blob).to_json();
      assert.strictEqual(message.command, 'submit');
      assert.strictEqual(so.TransactionType, 'OfferCancel');
      assert.strictEqual(so.OfferSequence, 99);
      conn.send(fixtures.rippledCancelErrorResponse(message, {
        engine_result: 'temBAD_SEQUENCE',
        engine_result_code: -283,
        engine_result_message: 'Malformed: Sequence is not in the past.',
        hash: hash
      }));
    });

    self.app
    .del('/v1/accounts/' + addresses.VALID + '/orders/99')
    .send({
      secret: addresses.SECRET
    })
    .expect(testutils.checkStatus(500))
    .expect(testutils.checkHeaders)
    .expect(testutils.checkBody(errors.RESTErrorResponse({
      type: 'transaction',
      error: 'temBAD_SEQUENCE',
      message: 'Malformed: Sequence is not in the past.'
    })))
    .end(done);
  });

  test('/orders/:sequence -- with ledger sequence too high error', function(done) {
    self.wss.once('request_account_info', function(message, conn) {
      assert.strictEqual(message.command, 'account_info');
      assert.strictEqual(message.account, addresses.VALID);
      conn.send(fixtures.accountInfoResponse(message));
    });

    self.wss.once('request_submit', function(message, conn) {
      var so = new ripple.SerializedObject(message.tx_blob).to_json();
      assert.strictEqual(message.command, 'submit');
      assert.strictEqual(so.TransactionType, 'OfferCancel');
      assert.strictEqual(so.OfferSequence, 99);

      conn.send(fixtures.ledgerSequenceTooHighResponse(message));

      testutils.closeLedgers(conn);
    });

    self.app
    .del('/v1/accounts/' + addresses.VALID + '/orders/99')
    .send({
      secret: addresses.SECRET
    })
    .expect(testutils.checkBody(errors.RESTResponseLedgerSequenceTooHigh))
    .expect(testutils.checkStatus(500))
    .expect(testutils.checkHeaders)
    .end(done);
  });

  test('/orders/:sequence -- with invalid sequence', function(done) {
    self.wss.once('request_account_info', function(message, conn) {
      assert(false, 'should not request account info');
    });

    self.wss.once('request_submit', function(message, conn) {
      assert(false, 'should not submit request');
    });

    self.app
    .del('/v1/accounts/' + addresses.VALID + '/orders/foo')
    .send({
      secret: addresses.SECRET
    })
    .expect(testutils.checkStatus(400))
    .expect(testutils.checkHeaders)
    .expect(testutils.checkBody(errors.RESTErrorResponse({
      type: 'invalid_request',
      error: 'Invalid parameter: sequence',
      message: 'Sequence must be a positive number'
    })))
    .end(done);
  });

  test('/orders/:sequence -- with missing secret', function(done) {
    self.wss.once('request_account_info', function(message, conn) {
      assert(false, 'should not request account info');
    });

    self.wss.once('request_submit', function(message, conn) {
      assert(false, 'should not submit request');
    });

    self.app
    .del('/v1/accounts/' + addresses.VALID + '/orders/99')
    .send({})
    .expect(testutils.checkStatus(400))
    .expect(testutils.checkHeaders)
    .expect(testutils.checkBody(errors.RESTErrorResponse({
      type: 'invalid_request',
      error: 'Parameter missing: secret'
    })))
    .end(done);
  });

  test('/orders/:sequence -- with invalid secret', function(done) {
    self.wss.once('request_account_info', function(message, conn) {
      assert.strictEqual(message.command, 'account_info');
      assert.strictEqual(message.account, addresses.VALID);
      conn.send(fixtures.accountInfoResponse(message));
    });

    self.wss.once('request_submit', function(message, conn) {
      assert(false, 'should not submit request');
    });

    self.app
    .del('/v1/accounts/' + addresses.VALID + '/orders/99')
    .send({
      secret: 'foo'
    })
    .expect(testutils.checkStatus(500))
    .expect(testutils.checkHeaders)
    .expect(testutils.checkBody(errors.RESTInvalidSecret))
    .end(done);
  });
});
