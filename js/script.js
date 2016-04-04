(function () {
  var Chat = function () {
    this.pass = '';
    this.userPrivateRSAKey = ''
    this.userPublicRSAKey = '';
    this.companionPublicRSAKey = '';
    this.connectionID = '';

    this.init();
  }

  Chat.prototype.init = function () {

    $('#startingWindow').modal('show');
    $('.generate-key').click(this.generateRSAKeys.bind(this));
    $('#companionPublicKey').keydown(this.setCompanionRSAKey.bind(this));
    $('#startingContinue').click(function () {
      $('#startingContinue').modal('hide');
      $('#makeConnectionWindow').modal('show');
    });
    $('#connectionID').keydown(this.renderConnectionWindow);
    $('#connect').click((function () {
      $('#makeConnectionWindow').modal('hide');
      $('#awaitingWindow').modal('show');
      this.connectionID = $('#connectionID').val();
      this.connect();
    }).bind(this));
  }

  Chat.prototype.generatePassword = function () {
    var alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
        result = '';
    for(var i = 0; i < 24; i++) {
      result += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
    }

    return result;
  }

  Chat.prototype.generateRSAKeys = function () {
    this.pass = this.generatePassword();
    this.userPrivateRSAKey = cryptico.generateRSAKey(this.pass, 512);
    this.userPublicRSAKey = cryptico.publicKeyString(this.userPrivateRSAKey);
    this.renderStartingWindow();
  }

  Chat.prototype.setCompanionRSAKey = function () {
    this.companionPublicRSAKey = $('#companionPublicKey').val();
    this.renderStartingWindow();
  }

  Chat.prototype.connect = function () {
    var requestedPeer = this.connectionID;
    if (!connectedPeers[requestedPeer]) {
      // Create 2 connections, one labelled chat and another labelled file.
      var c = peer.connect(requestedPeer, {
        label: 'chat',
        serialization: 'none',
        metadata: {message: 'hi i want to chat with you!'}
      });
      c.on('open', function() {
        connect(c);
      });
      c.on('error', function(err) { alert(err); });
      var f = peer.connect(requestedPeer, { label: 'file', reliable: true });
      f.on('open', function() {
        connect(f);
      });
      f.on('error', function(err) { alert(err); });
    }
    connectedPeers[requestedPeer] = 1;
  }

  Chat.prototype.renderStartingWindow = function () {
    $('#creatorPublicKey').html(this.userPublicRSAKey);
    if($('#companionPublicKey').val().length > 1 && this.userPublicRSAKey.length > 1) {
      $('#startingContinue').prop('disabled', false);
    }
    else {
      $('#startingContinue').prop('disabled', true);
    }
  }

  Chat.prototype.renderConnectionWindow = function () {
    if($('#connectionID').val().length > 1) {
      $('#connect').prop('disabled', false);
    }
    else {
      $('#connect').prop('disabled', true);
    }
  }

  window.peerjschat = new Chat();

})();