angular.module('eduproxyapp',[])
.controller("MainController",["$http",function($http){
	var me = this;

	me.data = [];
	me.proxy = "";

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