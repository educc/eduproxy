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
.directive("fileread", [function () {
	return {
	    scope: {
	        method:'&fileread'
	    },
	    link: function (scope, element, attributes) {
	        element.bind("change", function (changeEvent) {
	            var reader = new FileReader();
	            var name = changeEvent.target.files[0].name;
	            reader.onload = function (loadEvent) {
	                var fn = scope.method();
	                fn(name, loadEvent.target.result);
	            }
	            reader.readAsDataURL(changeEvent.target.files[0]);
	        });
	    }
	}
}])
.controller("MainController",["$http","socket",function($http, socket){
	var me = this;

	me.data = [];
	me.proxy = "";
	me.hasDummy = false;
	me.showDialog = false;
	me.tramaSend = "";
	me.selectedPath = '';
	me.protocol = '';

	socket.on('message', function(data){
		var row = JSON.parse(data);
		me.data.splice(0,0,row);
		if( me.data.length > 50){
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

	me.getNameForDummyBtn = function(){
		return me.hasDummy? 'remove Dummy': 'set Dummy Content';
	}

	me.loadServer = function(){ 
		$http.get("/proxy/config")
			.success(function(res){
				me.proxy = res.data.host + ":" + res.data.port; 
				me.protocol = res.data.protocol;
			});
	}

	me.changeServer = function(){ 
		var parts = me.proxy.split(":");
		var obj = {
			$host : parts[0],
			$port: parts[1],
			$protocol: me.protocol
		};
		$http.post("/proxy/config", obj)
			.success(function(res){
				if( res.success ){
					me.loadServer();
					alert("ok");
				}
			});
	}

	me.saveDummy = function(filename, data){
		console.log(filename);
		console.log(data);
		var obj = {'data':data}
		$http.post("/dummy/set", JSON.stringify(obj))
			.success(function(res){
				if( res.success ){
					alert("Nuevo dummy content para cada petición");
					me.hasDummy = true;
				}
			});
	}

	me.removeDummy = function(){	
		$http.get("/dummy/delete")
			.success(function(res){
				if( res.sucess){
					alert("Se ha quitado el dummy content de forma satisfactoria");
					me.hasDummy = false;
				}else{
					alert(res.message || 'error');
				}
			});		
	}

	me.hasDummyOnServer = function(){		
		$http.get("/dummy/get")
			.success(function(res){
				me.hasDummy = res.success;
			});
	}

	me.openDialog = function(href){
		me.showDialog = true;
		me.selectedPath = href;
		$http.get(href)
			.success(function(res){
				me.tramaSend = res;
			});		
	}

	me.closeDialog = function(){
		me.showDialog = false;
		me.tramaSend = "";
	}

	me.resend = function(){
		var data = { data: me.tramaSend, file: me.selectedPath}
		$http.post('/proxy/resend', JSON.stringify(data))
			.success(function(res){
				console.log(res);
				if( res.success){
					me.closeDialog();
				}else{
					alert("error");
				}
			});	
	}

	me.deleteAll = function(){
		$http.get('/delete')
			.success(function(res){ 
				if( res.success ){
					me.data = [];
				}else{
					alert("error");
				}
			});	
	}

	me.loadServer();
	me.hasDummyOnServer();
	me.load();
}]);