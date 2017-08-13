var fs = require('fs');
var path = require('path');

var MODULE = {};
(function (THIS) {
	THIS.routes = []
	THIS.notFoundCallback = undefined;
	THIS.homeCallback = undefined;
	THIS.proxyForward = undefined;

	THIS.handle = function(request, response){
		var found = false;
		for(var i in THIS.routes){
			var item = THIS.routes[i]

			if( request.method == 'GET' && request.url == '/'){
				THIS.homeCallback(request, response)
				var found = true;
				break;
			}

			if( request.method == 'GET' && request.url.startsWith('/socket.io') ){
				break;
			}

			if( request.method == item.method ){
				if(request.url.startsWith(item.path))	{
					item.fn(request, response)
					var found = true;
					break;
				}
			}
		}

		if( !found && THIS.proxyForward !== undefined ){
			THIS.proxyForward(request, response)
		}
	}

	THIS.static = function(mypath){
		THIS.get(mypath, THIS._handleStaticFiles)
	}

	THIS.proxyForward = function(callback){
		THIS.proxyForward = callback;
	}

	THIS.get = function(mypath, callback){
		if( mypath == '/'){
			THIS.homeCallback = callback;
			return;
		}
		THIS.routes.push({ path: mypath, fn: callback, method: 'GET'})
	}

	THIS.post = function(mypath,callback){
		THIS.routes.push({ path: mypath, fn: callback, method: 'POST'})
	}

	THIS.onBody = function(request, response, callback){
		var body = [];
		request.on('error', function(err) {
			console.error(err);
		}).on('data', function(chunk) {
			body.push(chunk);
		}).on('end', function() {
			body = Buffer.concat(body).toString();
			callback(body);
		});
	}

	THIS._handleStaticFiles = function(request, response){ 

	    var filePath = '.' + request.url;
	    if (filePath == './')
	        filePath = './index.html';

	    var extname = path.extname(filePath);
	    var contentType = 'text/html';
	    switch (extname) {
	        case '.js':
	            contentType = 'text/javascript';
	            break;
	        case '.css':
	            contentType = 'text/css';
	            break;
	        case '.json':
	            contentType = 'application/json';
	            break;
	        case '.png':
	            contentType = 'image/png';
	            break;      
	        case '.jpg':
	            contentType = 'image/jpg';
	            break;
	        case '.wav':
	            contentType = 'audio/wav';
	            break;
	        case '.xml':
	            contentType = 'text/xml';
	            break;
	    }

	    fs.readFile(filePath, function(error, content) {
	        if (error) {
	            if(error.code == 'ENOENT'){
	                fs.readFile('./404.html', function(error, content) {
	                    response.writeHead(200, { 'Content-Type': contentType });
	                    response.end(content, 'utf-8');
	                });
	            }
	            else {
	                response.writeHead(500);
	                response.end('Sorry, check with the site admin for error: '+error.code+' ..\n');
	                response.end(); 
	            }
	        }
	        else {
	            response.writeHead(200, { 'Content-Type': contentType });
	            response.end(content, 'utf-8');
	        }
	    });
	}
})(MODULE || {});

module.exports = MODULE;