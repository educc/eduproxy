var utils = require('./utils')

var MODULE = {};
(function(THIS){
	THIS.io = null;
	THIS.message = "message";

	THIS.setServer = function(httpServer){ 
		THIS.io = require('socket.io')(httpServer);
		THIS.io.on('connection', function(socket){ 
		  //socket.emit('message', 'test message');  
		});
	}

	THIS.findSocketByIp = function(ipClient){  
		for( var key in THIS.io.sockets.sockets){
		  	var socket = THIS.io.sockets.sockets[key];
		  	
		  	ipsocket = utils.reqToIp(socket.request);
			if( ipClient === ipsocket ){
				return socket;
			}
		} 
		return null;
	}

	THIS.sendDataByIp = function(data, ip){
		var socket = THIS.findSocketByIp(ip);
		if( socket != null){
			socket.emit(THIS.message, JSON.stringify(data));
		}
	}

})(MODULE || {});

module.exports = MODULE;