require('dotenv').config()
var http = require('http');
var request = require('request')
var fs = require('fs');
var router = require('./router'); //simplerouter
var utils = require('./utils');
var users = require('./users');
var iow = require('./iowrapper');
const path = require('path');

STATIC_PATH = __dirname + "/static"
STATIC_PATH_RQ = STATIC_PATH + "/request"
STATIC_PATH_RS = STATIC_PATH + "/response"
FILENAME_DUMMY_CONTENT = "dummy.data"

var port = process.env.PORT || 3000

function dataForCliente(filename, userDir){
	var parts = filename.split(/-/g);
	return {
		date: parts[0],
		action: parts[1],
		rq: "/static/request/" + userDir + "/" + filename,
		rs: "/static/response/" + userDir + "/" + filename
	};
}

function proxy(ip, reqbody, userdir, req, res=undefined){
	
	users.userByIp(ip, user => {
		if( user === undefined ){
			console.log("user not found")
			if(res){ res.end("ERROR 500: No proxy set") }
		}else{
			var filename = utils.getFilename(reqbody)
			var dirRequest = STATIC_PATH_RQ + "/" + userdir
			var absPathRequest = dirRequest + "/" + filename;
			var dirResponse = STATIC_PATH_RS + "/" + userdir;
			var absPathResponse =  dirResponse + "/" + filename;
			var absPathDummyFile = dirRequest + "/" + FILENAME_DUMMY_CONTENT;
			var absUrlFile = absPathRequest + ".params";
			utils.write(absPathRequest, dirRequest, reqbody)


			if( fs.existsSync(absPathDummyFile) ){ //TODO:just for test
				var dummyContent = fs.readFileSync(absPathDummyFile, {"encoding":"utf-8"})
				if(res){ res.end(dummyContent) }
				utils.write(absPathResponse, dirResponse, dummyContent)
				iow.sendDataByIp(dataForCliente(filename, userdir), ip); 
			}else{
				//TODO: change this
				var myurl = user.protocol + '://' + user.host + ":" + user.port + req.url; 
				params = {
					url: myurl,
					headers: req.headers,
					method: req.method, 
					body: reqbody,
				}
				params2 = {
					url: req.url,
					headers: req.headers,
					method: req.method, 
				}
				utils.write(absUrlFile, dirRequest, JSON.stringify(params2)) 
				request(params,function(error,response,proxybody){
					if(res){ res.end(proxybody) }
					
					utils.write(absPathResponse, dirResponse, proxybody)
					iow.sendDataByIp(dataForCliente(filename, userdir), ip);
				});
			}
			
		}
	});
}

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
			result.data = {
				host: user.host,
				port: user.port,
				protocol: user.protocol
			}
		} 
	    res.setHeader('Content-Type', 'application/json');
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
			return dataForCliente(filename, userDir)
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
router.get('/delete', (req,res) =>{ 
	var ip = utils.reqToIp(req);
	var userdir = utils.ipToDir(ip);
	var dirRequest = STATIC_PATH_RQ + "/" + userdir;

	fs.readdir(dirRequest, (err, files) => {
	  if (err){
		console.log(err);
		return;
	  }

	  for (var i in files) {
	  	const file = files[i]; 
	    fs.unlink(path.join(dirRequest, file), err => {
	      if (err)  console.log(err);
	    });
	  }
	});
	res.end(JSON.stringify({ success: true }))
})
router.post('/dummy/set', (req,res)=>{
	router.onBody(req,res,(reqbody)=>{
		var obj = JSON.parse(reqbody)

		if( !(obj.data.startsWith("data:text/plain;base64,") || obj.data.startsWith('data:text/xml;base64,')) ){
			obj = { success: false, message:"Solo se permite archivos text/plain o text/xml" } 
			res.setHeader('Content-Type', 'application/json');
			res.end(JSON.stringify(obj));
			return;
		}
		var idx = obj.data.indexOf('base64,');
		var aux = obj.data.substring(idx+7);
		obj.data = (Buffer.from(aux, 'base64')).toString('utf-8'); 

		var filename = utils.getFilename(obj.data)
		var userdir = utils.getUserdir(req)
		var dirRequest = STATIC_PATH_RQ + "/" + userdir
		var absPathDummyFile = dirRequest + "/" + FILENAME_DUMMY_CONTENT;

		res.setHeader('Content-Type', 'application/json');
		res.end(JSON.stringify({success:true})); 
		utils.write(absPathDummyFile, dirRequest, obj.data)
	});
})
router.get('/dummy/get', (req,res)=>{
	var userdir = utils.getUserdir(req);
	var dirRequest = STATIC_PATH_RQ + "/" + userdir;
	var absPathDummyFile = dirRequest + "/" + FILENAME_DUMMY_CONTENT;

	fs.exists(absPathDummyFile, exists=>{
		res.setHeader('Content-Type', 'application/json');
		res.end(JSON.stringify({success:exists}));
	});
})
router.get('/dummy/delete', (req,res)=>{
	var userdir = utils.getUserdir(req);
	var dirRequest = STATIC_PATH_RQ + "/" + userdir;
	var absPathDummyFile = dirRequest + "/" + FILENAME_DUMMY_CONTENT;

	fs.unlink(absPathDummyFile, function(err){
		var isSuccess = true;
		if(err){ isSuccess = false; }
		res.setHeader('Content-Type', 'application/json');
		res.end(JSON.stringify({success:isSuccess})); 
	});
})
router.post('/proxy/resend', (req,res)=>{ 
	router.onBody(req,res,(reqbody)=>{
		var data = JSON.parse(reqbody);

		if( data['file'] === undefined || !data.file.startsWith('/static/request/')){
			res.setHeader('Content-Type', 'application/json');
			res.end(JSON.stringify({success:false, message:"No satisface el formato"})); 
			return;
		}
		var file = data.file.substring(15);
		var absPath = STATIC_PATH_RQ + file + ".params";

		if( !fs.existsSync(absPath) ){ 
			res.setHeader('Content-Type', 'application/json');
			res.end(JSON.stringify({success:false, message:"No existe el archivo para reconstruir petición"})); 
			return;
		}
 
		res.setHeader('Content-Type', 'application/json');
		res.end(JSON.stringify({success:true}));

 		var customReq = JSON.parse(fs.readFileSync(absPath, {"encoding":"utf-8"})); 
		var ip = utils.reqToIp(req);
 		var userdir = utils.getUserdir(req); 
 		proxy(ip, data.data, userdir, customReq);
	});
})
router.proxyForward(function (req, res) {
	router.onBody(req,res,(reqbody)=>{
		var ip = utils.reqToIp(req);
 		var userdir = utils.getUserdir(req);
 		proxy(ip, reqbody, userdir, req, res)
	});
})


if (!fs.existsSync(STATIC_PATH_RQ)){
	fs.mkdirSync(STATIC_PATH_RQ);
}
if (!fs.existsSync(STATIC_PATH_RS)){
	fs.mkdirSync(STATIC_PATH_RS);
}
	
var httpServer = http.createServer(function (request, response) { 
	router.handle(request,response) 
}).listen(port);
iow.setServer(httpServer);
console.log('Server running at http://127.0.0.1:' + port);
