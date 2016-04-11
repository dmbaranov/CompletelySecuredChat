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
    this.messagesBox = $('#messagesBox');
    this.isTyping = '';

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

    this.isTyping = false;

    this.peer.on('connection', this.connect.bind(this));
    this.peer.on('error', function (err) {
      console.log('Error: ' + err);
    });

    //StartingWindow
    $('#startingWindow').modal('show');
    $('#generateKey').click(this.generateRSAKeys.bind(this));
    $('#companionPublicKey').on('input', this.setCompanionRSAKey.bind(this));
    $('#userName').on('input', this.renderStartingWindow.bind(this));
    $('#startingWindowContinueButton').click(function () {
      $('#startingWindow').modal('hide');
      $('#makeConnectionWindow').modal('show');
      $('#pid').html(__self.peer.id);
      __self.userName = $('#userName').val();
    });

    //MakeConnectionWindow
    $('#connect').click(this.onConnectClick.bind(this));
    $('#connectionID').on('input', this.renderConnectionWindow);
    $('#connect').click((function () {
      $('#makeConnectionWindow').modal('hide');
      $('#awaitingWindow').modal('show');
    }).bind(this));

    //MainWindow
    $('#sendMessageButton').click(this.sendMessage.bind(this));
    $('#messageText').keypress(function (e) {
      if(e.which == 13) {
        $('#sendMessageButton').trigger('click');
      }
      __self.sendTypingState();
    });

    /*$('#startingWindow').modal('hide');
    $('#makeConnectionWindow').modal('hide');*/
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
        console.log('Someone has left');
        delete __self.connectedPeers[c.peer];
      });
    }
    if(Object.keys(this.connection).length == 0) {
      this.connectedPeers[c.peer] = 1;
      this.connection = c;
    }
    $('#awaitingWindow').modal('hide');
    $('#makeConnectionWindow').modal('hide');
  };

  Chat.prototype.onConnectClick = function () {
    var __self = this;
    var RequestedPeer = $('#connectionID').val()
    if(!this.connectedPeers[RequestedPeer]) {
      var c = this.peer.connect(RequestedPeer, {
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
    var msg = $('#messageText').val();
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