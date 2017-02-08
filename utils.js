var fs = require('fs');

var UTILS = {};
(function(utils){
	utils.MAX_LIST_FILES = 50;
 

	utils.listDir = function(abspath, callback){

		if (!fs.existsSync(abspath)){
	    	fs.mkdirSync(abspath);
		}
		
		fs.readdir(abspath, (err,files) =>{
			var re = /\d+-\w+-\d+\..*/g;
			var i = 0; 
			files = files.reverse();
			filterFiles = files.filter(filename => {
				return re.test(filename) && i++ < utils.MAX_LIST_FILES;
			})
			callback(err,filterFiles)
		})
	}

	utils.reqToIp = function(req){
		return req.headers['x-forwarded-for'] || req.connection.remoteAddress;
	}
	utils.ipToDir = function(ip){  
		ip = ip.replace(/:/g, "_");
		return ip;
	}
	utils.getUserdir = function(req){
		var userDir = utils.reqToIp(req)
		userDir = utils.ipToDir(userDir)
		return userDir;
	}
	utils.getFilename = function(content){  
		var filename = (new Date()).getTime().toString()
		filename += "-"
		filename += utils._getNameFromTpxml(content)
		filename += "-"
		filename += utils.rand().toString()
		return filename
	}
	utils.getExtension = function(contentType = ""){
		var ext = ".txt"
		if( contentType.indexOf('html') != -1){
			ext = ".html"
		}else if( contentType.indexOf('xml') != -1){
			ext = ".html"
		}else if( contentType.indexOf('json') != -1){
			ext = ".json"
		}
		return ext
	}
	utils._getNameFromTpxml = function(content){  
		var actionName = "Unknow";
	    var idxAction = content.indexOf("<action")
	 
	    if( idxAction > -1){
			var idxEnd = content.indexOf(">",idxAction)
	        if( idxEnd > -1){
	            var sub = content.substring(idxAction,idxEnd)
	            var shouldCat = false
	            var thename = ""

	            for (var i in sub) {
	            	var c = sub[i]
	            	if( c == '"'){
	                    shouldCat = true
	                    continue
	                }
	                if( shouldCat ){ thename += c; }
	            }
	                
	            actionName = thename
	       	}
	    }else {
	    	if( content.indexOf("<IFX") > -1 ){
	    		action = "IFX"
	    	}
	    }
	    return actionName
	}
	utils.rand = function rand(){
		return Math.round(Math.random()*(Math.pow(10,10)));
	}

	utils.write = function (abspath, dir, content) {
		fs.access(dir, err => {
			if (err) {
				fs.mkdir(dir,err=>{
					if(err){
						console.log(err)
						return;
					}

					fs.writeFile(abspath,content,err=>{
						if (err) console.error(err);
					})
				})
			}else{
				fs.writeFile(abspath,content,err=>{
					if (err) console.error(err);
				})	
			}
		})
	} 
})(UTILS || {})


module.exports = UTILS;