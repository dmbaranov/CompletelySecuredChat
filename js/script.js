(function () {
  var Chat = function () {
    this.worker = new Worker('worker.js');
    this.peer = {};
    this.connection = {};
    this.connectedPeers = {};
    this.pass = '';
    this.userName = '';
    this.userPrivateRSAKey = ''
    this.userPublicRSAKey = '';
    this.companionPublicRSAKey = '';
    this.requestedPeer = '';
    this.messagesBox = $('#messagesBox');

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
    $('#generateKey').click(this.generateRSAKeys.bind(this));
    $('#connect').click(this.onConnectClick.bind(this));
    $('#sendMessageButton').click(this.sendMessage.bind(this));
    $('#startingWindowContinueButton').click(function () {
      $('#startingWindow').modal('hide');
      $('#makeConnectionWindow').modal('show');
      $('#pid').html(__self.peer.id);
      __self.userName = $('#userName').val();
    });
    $('#connect').click((function () {
      $('#makeConnectionWindow').modal('hide');
      $('#awaitingWindow').modal('show');
      this.requestedPeer = $('#connectionID').val()
    }).bind(this));

    $('#companionPublicKey').on('input', this.setCompanionRSAKey.bind(this));
    $('#userName').on('input', this.renderStartingWindow.bind(this));
    $('#connectionID').on('input', this.renderConnectionWindow);

    $('#startingWindow').modal('hide');
    $('#makeConnectionWindow').modal('hide');
  };

  Chat.prototype.generatePassword = function () {
    var alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*();.",
        result = '';
    for(var i = 0; i < 64; i++) {
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
    if (c.label != 'chat') {
    } else {
      //Handle received messages
      c.on('data', function (data) {
        var msg = document.createElement('div');
        var tData = JSON.parse(data);
        msg.classList.add('chat-box__message', 'guest-message');
        msg.innerHTML = cryptico.decrypt(tData.cipher, __self.userPrivateRSAKey).plaintext;
        __self.messagesBox.prepend(msg);
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

    window.scrollTo(0, 50);

    var time = new Date(),
        hours = time.getHours() < 10 ? ('0' + time.getHours()) : time.getHours(),
        minutes = time.getMinutes() < 10 ? ('0' + time.getMinutes()) : time.getMinutes()
        seconds = time.getSeconds() < 10 ? ('0' + time.getSeconds()) : time.getSeconds()
    //var msg = '[' + hours + ':' + minutes + ':' + seconds +'] ' + this.userName + ': ' + $('#messageText').val(),
    var msg = $('#messageText').val();
    var elem = document.createElement('div');

    elem.classList.add('chat-box__message', 'my-message');
    elem.innerHTML = msg;
    msg = cryptico.encrypt(msg, this.companionPublicRSAKey);

    this.messagesBox.prepend(elem);

    this.connection.send(JSON.stringify(msg));
    $('#messageText').val('');
    console.log('Send: ' + JSON.stringify(msg));
  }

  Chat.prototype.eachActiveConnection = function (fn) {

  }

  Chat.prototype.renderStartingWindow = function () {
    $('#creatorPublicKey').html(this.userPublicRSAKey);

    if($('#companionPublicKey').val().length > 0 && this.userPublicRSAKey.length > 0 && $('#userName').val().length > 0) {
      $('#startingWindowContinueButton').prop('disabled', false);
    }
    else {
    $('#startingWindowContinueButton').prop('disabled', true);
    }
  };

  Chat.prototype.renderConnectionWindow = function () {
    if($('#connectionID').val().length > 0) {
      $('#connect').prop('disabled', false);
    }
    else {
      $('#connect').prop('disabled', true);
    }
  };

  window.peerjschat = new Chat();

})();