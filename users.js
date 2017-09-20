var sqlite3 = require('sqlite3').verbose(); 

var MYDB = {};
(function(THIS){
	THIS.db = new sqlite3.Database('data.db');

	THIS.userByIp = function(ip, callback){
		ip = THIS._scapeIp(ip)

		THIS.db.serialize(function() {  
			var sql = "select * from users where ip = ?";
			THIS.db.get(sql, [ip], function(err, row) {
				callback(row);
			});
		});
	}

	THIS.saveProxyToUser = function(obj, callback){ 
		THIS.userByIp(obj.$ip,user =>{
			obj.$ip = THIS._scapeIp(obj.$ip)

			if( user === undefined ){ 
				var sql = "insert into users (ip,host,port, protocol) values ($ip,$host,$port, $protocol)"; 
				THIS.db.run(sql, obj, callback);
			}else{
				newobj = {$id: user.id, $host:obj.$host, $port: obj.$port, $protocol:obj.$protocol};
				var sql = "update users set host=$host, port=$port, protocol=$protocol where id=$id";
				THIS.db.run(sql, newobj, callback);
			}
		})
	}

	THIS._scapeIp = function(ip){
		ip = ip.replace(/:/g,'_')
		return ip.replace(/\./g,'_')
	}

})(MYDB || {});
module.exports = MYDB;