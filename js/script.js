(function () {
  var Chat = function () {
    this.worker = new Worker('worker.js');
    this.peer = {};
    this.connection = {};
    this.connectedPeers = {};
    this.pass = '';
    this.userPrivateRSAKey = ''
    this.userPublicRSAKey = '';
    this.companionPublicRSAKey = '';
    this.messagesBox = $('#messagesBox');
    this.isTyping = '';
    this.isMenuHidden = true;

    this.init();
  };

  Chat.prototype.init = function () {
    var __self = this;

    this.peer = new Peer({
      key: 'dkp6zru1riugcik9',
      debug: 3,
      logFunction: function() {
        var copy = Array.prototype.slice.call(arguments).join(' ');
        console.log(copy);
      }
    });

    this.isTyping = false;

    this.peer.on('open', function () {
      $('#pid').html(__self.peer.id);
    });
    this.peer.on('connection', this.connect.bind(this));
    this.peer.on('error', function (err) {
      console.log('Error: ' + err);
    });



    $('#menuButton').click(this.onMenuClick.bind(this));

    $('#generateKey').click(this.generateRSAKeys.bind(this));
    $('#chatBoxMyKeyButton').click(function () {
      $('#chatBoxMyKey').fadeOut(400, function () {
        $('#chatBoxCompanionKey').fadeIn(400);
      });
    });

    $('#chatBoxCompanionKeyButton').click(function () {
      __self.setCompanionRSAKey();
      $('#chatBoxCompanionKey').fadeOut(400, function () {
        $('#chatBoxMenuConnection').fadeIn(400);
      });
    });
    $('#companionPublicKey').on('input', this.renderCompanionKey.bind(this));

    $('#connectionID').on('input', this.renderConnection.bind(this));
    $('#buttonConnect').click(function () {
      __self.onConnectClick();
      $('#connectionStatus').html('Подключение...');
      $('#connectionStatus').removeClass('chat-box__menu-status--not-connected chat-box__menu-status--connected').addClass('chat-box__menu-status--awaiting');
    });

    $('#sendMessageButton').click(this.sendMessage.bind(this));
    $('#messageText').keypress(function (e) {
      if(e.which == 13) {
        $('#sendMessageButton').trigger('click');
      }
    });
    $('#messageText').on('input', this.sendTypingState.bind(this));





    /*//StartingWindow
    $('#startingWindow').modal('show');
    $('#generateKey').click(this.generateRSAKeys.bind(this));
    $('#companionPublicKey').on('input', this.setCompanionRSAKey.bind(this));
    $('#userName').on('input', this.renderStartingWindow.bind(this));
    $('#startingWindowContinueButton').click(function () {
      $('#startingWindow').modal('hide');
      $('#makeConnectionWindow').modal('show');
      //$('#pid').html(__self.peer.id);
      __self.userName = $('#userName').val().replace(/</g, "&lt;").replace(/>/g, "&gt;");
    });

    //MakeConnectionWindow
    $('#connect').click(this.onConnectClick.bind(this));
    $('#connectionID').on('input', this.renderConnectionWindow);
    $('#connect').click((function () {
      $('#makeConnectionWindow').modal('hide');
      $('#awaitingWindow').modal('show');
    }).bind(this));

    //MainWindow
    $('#menuButton').click(this.onMenuClick.bind(this));
    $('#sendMessageButton').click(this.sendMessage.bind(this));
    $('#messageText').keypress(function (e) {
      if(e.which == 13) {
        $('#sendMessageButton').trigger('click');
      }
    });
    $('#messageText').on('input', this.sendTypingState.bind(this));*/

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
    //use new Worker(js/worker.js)

    this.pass = this.generatePassword();
    this.userPrivateRSAKey = cryptico.generateRSAKey(this.pass, 512);
    this.userPublicRSAKey = cryptico.publicKeyString(this.userPrivateRSAKey);
    this.renderMyKey();
  };

  Chat.prototype.setCompanionRSAKey = function () {
    this.companionPublicRSAKey = $('#companionPublicKey').val().replace(/</g, "&lt;").replace(/>/g, "&gt;");
  };

  Chat.prototype.connect = function (c) {
    $('#messageText').prop('disabled', false);
    $('#sendMessageButton').prop('disabled', false);
    $('#connectionStatus').html('Подключен');
    $('#connectionStatus').removeClass('chat-box__menu-status--not-connected chat-box__menu-status--awaiting').addClass('chat-box__menu-status--connected');
    $('#chatBoxMenuConnection').fadeOut(400);

    var __self = this;
    if (c.label != 'chat') {
    }
    else {
      //Handle received messages
      c.on('data', function (data) {

        var wrapper = document.createElement('div'),
            messageElem = document.createElement('div');
        var tData = JSON.parse(data),
            msg = '',
            boxHeight = document.querySelector('#messagesBox').scrollHeight;

        msg = cryptico.decrypt(tData.cipher, __self.userPrivateRSAKey).plaintext;
        msg = Base64.decode(msg);


        if(msg == '{{<currentUserIsTyping>}}') {
          $('#typingState').fadeIn('slow');
        }
        else if(msg == '{{<currentUserHasStoppedTyping>}}') {
          $('#typingState').fadeOut('slow');
        }
        else {
          wrapper.classList.add('chat-box__message-wrapper');
          messageElem.classList.add('chat-box__message', 'guest-message')
          messageElem.innerHTML = cryptico.decrypt(tData.cipher, __self.userPrivateRSAKey).plaintext;
          messageElem.innerHTML = msg;

          wrapper.appendChild(messageElem);
          __self.messagesBox.append(wrapper);

          __self.messagesBox.scrollTop(boxHeight);
        }

        console.log('Received: ' + data);
      });
      c.on('close', function () {
        console.log('Companion has left');
        __self.connection = {};
        delete __self.connectedPeers[c.peer];
        $('#messageText').prop('disabled', true);
        $('#connectionStatus').html('Собеседник вышел');
        $('#connectionStatus').removeClass('chat-box__menu-status--connected chat-box__menu-status--awaiting').addClass('chat-box__menu-status--not-connected');
      });
    }
    if(Object.keys(this.connection).length == 0) {
      this.connectedPeers[c.peer] = 1;
      this.connection = c;
    }
  };

  Chat.prototype.onConnectClick = function () {
    var __self = this;
    var RequestedPeer = $('#connectionID').val().replace(/</g, "&lt;").replace(/>/g, "&gt;");;
    if(!this.connectedPeers[RequestedPeer]) {
      var c = this.peer.connect(RequestedPeer, {
        label: 'chat',
        serialization: 'none',
        metadata: {message: 'hi i want to chat with you!'}
      });

      c.on('open', function () {
        $('#messageText').prop('disabled', false);
        $('#sendMessageButton').prop('disabled', false);
        $('#connectionStatus').html('Подключен');
        $('#connectionStatus').removeClass('chat-box__menu-status--not-connected chat-box__menu-status--awaiting').addClass('chat-box__menu-status--connected');
        __self.connect(c);
      });
      c.on('error', function (err) {
        console.log(err);
      });
    }
    this.connectedPeers[RequestedPeer] = 1;
  };

  Chat.prototype.sendMessage = function (e) {
    e.preventDefault();

    var boxHeight = document.querySelector('#messagesBox').scrollHeight,
        time = new Date(),
        hours = time.getHours() < 10 ? ('0' + time.getHours()) : time.getHours(),
        minutes = time.getMinutes() < 10 ? ('0' + time.getMinutes()) : time.getMinutes()
        seconds = time.getSeconds() < 10 ? ('0' + time.getSeconds()) : time.getSeconds()
    //var msg = '[' + hours + ':' + minutes + ':' + seconds +'] ' + this.userName + ': ' + $('#messageText').val(),
    var msg = $('#messageText').val().replace(/</g, "&lt;").replace(/>/g, "&gt;");
    var wrapper = document.createElement('div'),
        messageElem = document.createElement('div');
    wrapper.classList.add('chat-box__message-wrapper');
    messageElem.classList.add('chat-box__message', 'my-message');

    messageElem.innerHTML = msg;
    msg = Base64.encode(msg);
    msg = cryptico.encrypt(msg, this.companionPublicRSAKey);

    wrapper.appendChild(messageElem);
    this.messagesBox.append(wrapper);

    this.connection.send(JSON.stringify(msg));
    $('#messageText').val('');
    this.sendTypingState();
    this.messagesBox.scrollTop(boxHeight);
    console.log('Send: ' + JSON.stringify(msg));
  };

  Chat.prototype.sendTypingState = function () {
    if($('#messageText').val().length > 0 && this.isTyping == false) {
      var msg = '{{<currentUserIsTyping>}}';
      msg = Base64.encode(msg);
      msg = cryptico.encrypt(msg, this.companionPublicRSAKey);
      this.connection.send(JSON.stringify(msg));

      this.isTyping = true;
    }
    else if($('#messageText').val().length == 0){
      var msg = '{{<currentUserHasStoppedTyping>}}';
      msg = Base64.encode(msg);
      msg = cryptico.encrypt(msg, this.companionPublicRSAKey);
      this.connection.send(JSON.stringify(msg));

      this.isTyping = false;
    }
  };

  Chat.prototype.onMenuClick = function () {
    var toLeft = this.isMenuHidden ? '0' : '100%';
    console.log(toLeft);
    $('#chatboxMenu').animate({
      left: toLeft
    }, 500);

    this.isMenuHidden = !this.isMenuHidden;
  }

  Chat.prototype.renderMyKey = function () {
    $('#myPublicKey').html(this.userPublicRSAKey);
    $('#chatBoxMyKeyButton').prop('disabled', false);
  };

  Chat.prototype.renderCompanionKey = function () {
    if($('#companionPublicKey').val().length > 0) {
      $('#chatBoxCompanionKeyButton').prop('disabled', false);
    }
    else {
      $('#chatBoxCompanionKeyButton').prop('disabled', true);
    }
  };

  Chat.prototype.renderConnection = function () {
    if($('#connectionID').val().length > 0) {
      $('#buttonConnect').prop('disabled', false);
    }
    else {
      $('#buttonConnect').prop('disabled', true);
    }
  }

  window.peerjschat = new Chat();

})();