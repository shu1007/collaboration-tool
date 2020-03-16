let peerConnection = null;
let textForSendSdp = document.getElementById("text_for_send_sdp");
let textToReceiveSdp = document.getElementById("text_for_receive_sdp");
let dataChannel = null;
let syncText = document.getElementById("text_sync");
const dataChannelOptions = {
  ordered: false, // 順序を保証しない
  maxRetransmitTime: 3000 // ミリ秒
};

// --- prefix -----
RTCPeerConnection =
  window.RTCPeerConnection ||
  window.webkitRTCPeerConnection ||
  window.mozRTCPeerConnection;
RTCSessionDescription =
  window.RTCSessionDescription ||
  window.webkitRTCSessionDescription ||
  window.mozRTCSessionDescription;

// ----- hand signaling ----
function onSdpText() {
  let text = textToReceiveSdp.value;
  if (peerConnection) {
    console.log("Received answer text...");
    let answer = new RTCSessionDescription({
      type: "answer",
      sdp: text
    });
    setAnswer(answer);
  } else {
    console.log("Received offer text...");
    let offer = new RTCSessionDescription({
      type: "offer",
      sdp: text
    });
    setOffer(offer);
  }
  textToReceiveSdp.value = "";
}

function sendSdp(sessionDescription) {
  console.log("---sending sdp ---");
  textForSendSdp.value = sessionDescription.sdp;
  textForSendSdp.focus();
  textForSendSdp.select();
}

function sendText() {
  if (dataChannel) {
    console.log("send text.");
    dataChannel.send(syncText.value);
  }
}

// ---------------------- connection handling -----------------------
function prepareNewConnection() {
  let pc_config = {
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
  };
  let peer = new RTCPeerConnection(pc_config);

  // --- on get local ICE candidate
  peer.onicecandidate = function(evt) {
    if (evt.candidate) {
      console.log(evt.candidate);

      // Trickle ICE の場合は、ICE candidateを相手に送る
      // Vanilla ICE の場合には、何もしない
    } else {
      console.log("empty ice event");

      // Trickle ICE の場合は、何もしない
      // Vanilla ICE の場合には、ICE candidateを含んだSDPを相手に送る
      sendSdp(peer.localDescription);
    }
  };

  return peer;
}

function makeOffer() {
  peerConnection = prepareNewConnection();
  dataChannel = peerConnection.createDataChannel("myLabel", dataChannelOptions);
  initDataChannel();

  peerConnection
    .createOffer()
    .then(function(sessionDescription) {
      console.log("createOffer() succsess in promise");
      return peerConnection.setLocalDescription(sessionDescription);
    })
    .then(function() {
      console.log("setLocalDescription() succsess in promise");

      // -- Trickle ICE の場合は、初期SDPを相手に送る --
      // -- Vanilla ICE の場合には、まだSDPは送らない --
      //sendSdp(peerConnection.localDescription);
    })
    .catch(function(err) {
      console.error(err);
    });
}

function setOffer(sessionDescription) {
  if (peerConnection) {
    console.error("peerConnection alreay exist!");
  }
  peerConnection = prepareNewConnection();
  // DataChannelの接続を監視
  peerConnection.ondatachannel = function(evt) {
    // evt.channelにDataChannelが格納されているのでそれを使う
    dataChannel = evt.channel;
    initDataChannel();
  };
  peerConnection
    .setRemoteDescription(sessionDescription)
    .then(function() {
      console.log("setRemoteDescription(offer) succsess in promise");
      makeAnswer();
    })
    .catch(function(err) {
      console.error("setRemoteDescription(offer) ERROR: ", err);
    });
}

function makeAnswer() {
  console.log("sending Answer. Creating remote session description...");
  if (!peerConnection) {
    console.error("peerConnection NOT exist!");
    return;
  }

  peerConnection
    .createAnswer()
    .then(function(sessionDescription) {
      console.log("createAnswer() succsess in promise");
      return peerConnection.setLocalDescription(sessionDescription);
    })
    .then(function() {
      console.log("setLocalDescription() succsess in promise");

      // -- Trickle ICE の場合は、初期SDPを相手に送る --
      // -- Vanilla ICE の場合には、まだSDPは送らない --
      //sendSdp(peerConnection.localDescription);
    })
    .catch(function(err) {
      console.error(err);
    });
}

function setAnswer(sessionDescription) {
  if (!peerConnection) {
    console.error("peerConnection NOT exist!");
    return;
  }

  peerConnection
    .setRemoteDescription(sessionDescription)
    .then(function() {
      console.log("setRemoteDescription(answer) succsess in promise");
    })
    .catch(function(err) {
      console.error("setRemoteDescription(answer) ERROR: ", err);
    });
}

// start PeerConnection
function connect() {
  if (!peerConnection) {
    console.log("make Offer");
    makeOffer();
  } else {
    console.warn("peer already exist.");
  }
}

// close PeerConnection
function hangUp() {
  if (peerConnection) {
    console.log("Hang up.");
    peerConnection.close();
    peerConnection = null;
    syncText.value = "";
    textForSendSdp.value = "";
    textToReceiveSdp.value = "";
  } else {
    console.warn("peer NOT exist.");
  }
}

function initDataChannel() {
  dataChannel.onerror = function(error) {
    console.log("Data Channel Error:", error);
  };
  dataChannel.onmessage = function(event) {
    console.log("Got Data Channel Message:");
    syncText.value = event.data;
  };

  dataChannel.onopen = function() {
    console.log("Data Channel open");
    // dataChannel.send("Hello World!");
  };

  dataChannel.onclose = function() {
    console.log("The Data Channel is Closed");
  };
}
