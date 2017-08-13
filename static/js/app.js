angular.module('eduproxyapp',[])
.factory('socket',['$rootScope', function ($rootScope) {
  var socket = io();
  return {
    on: function (eventName, callback) {
      socket.on(eventName, function () {  
        var args = arguments;
        $rootScope.$apply(function () {
          callback.apply(socket, args);
        });
      });
    },
    emit: function (eventName, data, callback) {
      socket.emit(eventName, data, function () {
        var args = arguments;
        $rootScope.$apply(function () {
          if (callback) {
            callback.apply(socket, args);
          }
        });
      })
    }
  }
}])
.controller("MainController",["$http","socket",function($http, socket){
	var me = this;

	me.data = [];
	me.proxy = "";

	socket.on('message', function(data){
		var row = JSON.parse(data);
		me.data.splice(0,0,row);
		if( me.data.length() > 50){
			me.data.pop();
		}
	});

	me.load = function(){
		$http.get("/proxy/requests")
			.success(function(res){
				me.data = res.data;
				console.log(res);
			});
	};

	me.loadServer = function(){ 
		$http.get("/proxy/config")
			.success(function(res){
				me.proxy = res.data.proxy; 
			});
	}

	me.changeServer = function(){ 
		var parts = me.proxy.split(":");
		var obj = {
			$host : parts[0],
			$port: parts[1]
		};
		$http.post("/proxy/config", obj)
			.success(function(res){
				if( res.success ){
					me.loadServer();
					alert("ok");
				}
			});
	}

	me.loadServer();
	me.load();
}]);