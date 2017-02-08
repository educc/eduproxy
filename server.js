require('dotenv').config()
var http = require('http');
var request = require('request')
var fs = require('fs');
var router = require('./router'); //simplerouter
var utils = require('./utils');
var users = require('./users');


STATIC_PATH = __dirname + "/static"
STATIC_PATH_RQ = STATIC_PATH + "/request"
STATIC_PATH_RS = STATIC_PATH + "/response"

router.static("/static")
router.get('/', (req,res)=>{
	fs.readFile('./static/index.html', 'utf8', (err, html) =>{
		res.end(html,'utf-8')
	})
})
router.get('/proxy/config',(req,res)=>{
	var ip = utils.reqToIp(req)

	users.userByIp(ip, user => {
		var result = { data: { proxy:"" } }
		if( user !== undefined ){ 
			result.data.proxy = user.host + ":" + user.port
		} 
	    res.setHeader('Content-Type', 'application/json');
	    res.setHeader('Cache-Control', 'no-cache');
	    res.end(JSON.stringify(result));
	})
})
router.post('/proxy/config',(req,res)=>{
	router.onBody(req,res,(body)=>{
		var obj = JSON.parse(body)
		obj.$ip = utils.reqToIp(req)
		users.saveProxyToUser(obj, result => { 
			obj = { success: result===null? true:false } 
			res.setHeader('Content-Type', 'application/json');
			res.end(JSON.stringify(obj));
		})
	});
})
router.get('/proxy/requests', function (req, res) {
	//data { date, action, rq, rs }
	var absuserDir = STATIC_PATH_RQ + "/" + utils.getUserdir(req)
	utils.listDir(absuserDir, (err,files)=>{
		var result = { data: [] };
		var userDir = utils.getUserdir(req);
		result.data = files.map(filename=>{
			var parts = filename.split(/-/g);
			return {
				date: parts[0],
				action: parts[1],
				rq: "/static/request/" + userDir + "/" + filename,
				rs: "/static/response/" + userDir + "/" + filename
			};
		});
	    res.setHeader('Content-Type', 'application/json');
	    res.end(JSON.stringify(result));
	})
})
router.get('/favicon.ico', (req,res) =>{ 
	res.writeHead(301, {
		Location: '/static/favicon.ico'
	});
	res.end(); 
})
router.proxyForward(function (req, res) {
	router.onBody(req,res,(reqbody)=>{
		var ip = utils.reqToIp(req);

		users.userByIp(ip, user => {
			if( user === undefined ){
				console.log("user not found")
				res.end("ERROR 500: No proxy set")
			}else{
				var contentType = req.headers['content-type']
				var filename = utils.getFilename(reqbody)
				filename += utils.getExtension(contentType)
				var userdir = utils.getUserdir(req)
				var dirRequest = STATIC_PATH_RQ + "/" + userdir
				var absPathRequest = dirRequest + "/" + filename;
				var dirResponse = STATIC_PATH_RS + "/" + userdir;
				var absPathResponse =  dirResponse + "/" + filename;

				utils.write(absPathRequest, dirRequest, reqbody)

				//TODO: change this
				var myurl = 'http://' + user.host + ":" + user.port + req.url;
				request({
					url: myurl,
					headers: req.headers,
					method: req.method,
					body: reqbody
				},function(error,rsProxy,proxybody){
					for(var key in rsProxy.headers){
						var value = rsProxy.headers[key];
						res.setHeader(key,value);
					}
					utils.write(absPathResponse, dirResponse, proxybody)
					res.end(proxybody)
				});
			}
		});
	});
})
var port = process.env.PORT || 3000;
if (!fs.existsSync(STATIC_PATH_RQ)){
	fs.mkdirSync(STATIC_PATH_RQ);
}
if (!fs.existsSync(STATIC_PATH_RS)){
	fs.mkdirSync(STATIC_PATH_RS);
}
http.createServer(function (request, response) { 
	router.handle(request,response) 
}).listen(port);
console.log('Server running at http://127.0.0.1:' + port);