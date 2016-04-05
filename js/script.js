(function () {
  var Chat = function () {
    this.peer = {};
    this.connection = {};
    this.connectedPeers = {};
    this.pass = '';
    this.userPrivateRSAKey = ''
    this.userPublicRSAKey = '';
    this.companionPublicRSAKey = '';
    this.requestedPeer = '';

    this.init();
  };

  Chat.prototype.init = function () {
    var __self = this;

    this.peer = new Peer({
      key: 'x7fwx2kavpy6tj4i',
      debug: 3,
      logFunction: function() {
        var copy = Array.prototype.slice.call(arguments).join(' ');
        console.log(copy);
      }
    });

    this.peer.on('connection', this.connect.bind(this));
    this.peer.on('error', function (err) {
      console.log('Error: ' + err);
    });

    $('#startingWindow').modal('show');
    $('.generate-key').click(this.generateRSAKeys.bind(this));
    $('#connect').click(this.onConnectClick.bind(this));
    $('#sendMessageButton').click(this.sendMessage.bind(this));
    $('#companionPublicKey').keydown(this.setCompanionRSAKey.bind(this));
    $('#startingWindowContinueButton').click(function () {
      $('#startingWindow').modal('hide');
      $('#makeConnectionWindow').modal('show');
      $('#pid').html(__self.peer.id);
    });
    $('#requestedPeer').keydown(this.renderConnectionWindow);
    $('#connect').click((function () {
      $('#makeConnectionWindow').modal('hide');
      $('#awaitingWindow').modal('show');
      this.requestedPeer = $('#connectionID').val()
    }).bind(this));
  };

  Chat.prototype.generatePassword = function () {
    var alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
        result = '';
    for(var i = 0; i < 24; i++) {
      result += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
    }

    return result;
  };

  Chat.prototype.generateRSAKeys = function () {
    this.pass = this.generatePassword();
    this.userPrivateRSAKey = cryptico.generateRSAKey(this.pass, 512);
    this.userPublicRSAKey = cryptico.publicKeyString(this.userPrivateRSAKey);
    this.renderStartingWindow();
  };

  Chat.prototype.setCompanionRSAKey = function () {
    this.companionPublicRSAKey = $('#companionPublicKey').val();
    this.renderStartingWindow();
  };

  Chat.prototype.connect = function (c) {
    var __self = this;
    if(c.label == 'chat') {
      c.on('data', function (data) {
        console.log('Received: ' + data);
      });
      c.on('close', function () {
        console.log('Someone has left');
        delete __self.connectedPeers[c.peer];
      });
    }
    this.connectedPeers[c.peer] = 1;
    this.connection = c;
    $('#awaitingWindow').modal('hide');
    $('#makeConnectionWindow').modal('hide');
  };

  Chat.prototype.onConnectClick = function () {
    var __self = this;
    var tempRequestedPeer = $('#connectionID').val()
    if(!this.connectedPeers[tempRequestedPeer]) {
      var c = this.peer.connect(tempRequestedPeer, {
        label: 'chat',
        serialization: 'none',
        metadata: {message: 'hi i want to chat with you!'}
      });

      c.on('open', function () {
        __self.connect(c);
      });
      c.on('error', function (err) {
        console.log(err);
      });
    }
    this.connectedPeers[tempRequestedPeer] = 1;
  };

  Chat.prototype.sendMessage = function (e) {
    e.preventDefault();

    var msg = $('#messageText').val();
    this.connection.send(msg);
  }

  Chat.prototype.eachActiveConnection = function (fn) {

  }

  Chat.prototype.renderStartingWindow = function () {
    /*$('#creatorPublicKey').html(this.userPublicRSAKey);
    if($('#companionPublicKey').val().length > 1 && this.userPublicRSAKey.length > 1) {
      $('#startingWindowContinueButton').prop('disabled', false);
    }
    else {
    $('#startingWindowContinueButton').prop('disabled', true);
    }*/
  };

  Chat.prototype.renderConnectionWindow = function () {
    /*if($('#connectionID').val().length > 1) {
      $('#connect').prop('disabled', false);
    }
    else {
      $('#connect').prop('disabled', true);
    }*/
  };

  window.peerjschat = new Chat();

})();