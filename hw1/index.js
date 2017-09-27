var net = require('net');
var fs = require('fs');

var server = net.createServer(function(socket) {

	socket.setEncoding("utf-8");
	socket.setKeepAlive(false);
	socket.on("data", function(data){
		handleRequest(socket, data);
	});
	socket.on('end', function() {
    console.log('client disconnected');
  	});

	socket.on("error", function(err){
		console.log("socket error, print err stack");
		console.log(err);
	});
});

server.on('error', function(err){
	console.log("server error, print err stack");
	console.log(err.stack);
});

server.on('data', function(conn){
	console.log(conn);
});

server.listen(9000, function(){
	console.log("server listen on port 9000");
});

function handleRequest(socket, data){
	if(typeof data === "undefined"){
		return
	}
	var response = "";
	var reqInfo = data.split('\n')[0].split(" ");
	var reqMethod = reqInfo[0];
	var reqUrl = reqInfo[1];
	var reqProtocol = reqInfo[2];
	if(!reqProtocol) {
		response = "HTTP/1.1 400 BAD REQUEST\r\nConnection : close\r\n\r\n";
		socket.end(response);
	} else {
		var protocolInfo = reqProtocol.split("/");

		if(protocolInfo[0] != "HTTP" || !(parseFloat(protocolInfo[1]) == 1.0 || parseFloat(protocolInfo[1]) == 1.1)) {
			response = "HTTP/1.1 400 BAD REQUEST\r\nConnection : close\r\n\r\n";
			socket.end(response);
		} else if (!(reqMethod == "GET" || reqMethod == "POST")) {
			response = "HTTP/1.1 501 NOT IMPLEMENTED\r\nConnection : close\r\n\r\n";
			socket.end(response);
		} else {
			var request = data.split("\n").slice(1).join("\n");
			var reqObj = parseRequest(request);
			var urlObj = parseURL(reqUrl);
			if(urlObj.path == "/style") {
				handleStyleRequest(socket);
			} else if(urlObj.path == "/background"){
				handleBackgroundRequest(socket);
			} else if(urlObj.path == "/hello-world"){
				if(reqMethod == "GET") {
					handleHelloWorldGetRequest(socket, false);
				} else {
					if(reqObj["Content-Type"].trim() === "application/x-www-form-urlencoded"){
						handleHelloWorldPostRequest(socket, reqObj);
					} else {
						response = "HTTP/1.1 400 BAD REQUEST\r\nConnection : close\r\n\r\n";
						socket.end(response);
					}
					// socket.end();
				}
			} else if(urlObj.path == "/info" && reqMethod == "GET") {
				handleInfoRequest(socket, urlObj);
			} else if(urlObj.path == "/"){
				handleHelloWorldGetRequest(socket, true);
			} else {
				response = "HTTP/1.1 400 NOT FOUND\r\nConnection : close\r\n\r\n";
				socket.end(response);
			}
		}


	}
}


function handleInfoRequest(socket, urlObj){
	var queries = urlObj.query.split("&");
	var response = ""
	var body = "No Data";
	for (var i = 0; i < queries.length; i++) {
		var form = queries[i].split("=");
		if(form[0] == "type"){
			if(form[1] == "time"){
				body = new Date().toString();
			} else if(form[1] == "random") {
				body = Math.random().toString();
			}
		}
	}
	response = "HTTP/1.1 200 OK\r\nConnection : close\r\nContent-Type : text/plain"+"\r\n\r\n"+body;
	socket.end(response);

}

function handleStyleRequest(socket){
	var response = "";
	fs.readFile('style.css', function(err, data){
		var bodySize = data.byteLength;
		data.toString("utf-8");
		response = "HTTP/1.1 200 OK\r\nConnection : close\r\nContent-Type : text/css\r\nContent-Size : "+bodySize+"\r\n\r\n"+data;
		socket.end(response);
	});
}

function handleBackgroundRequest(socket) {
	var response = "";
	fs.readFile('background.jpg', function(err, data){
		var bodySize = data.byteLength;
		response = "HTTP/1.1 200 OK\r\nConnection : close\r\nContent-Type : image/jpg\r\nContent-Size : "+bodySize+"\r\n\r\n";
		socket.write(response);
		socket.write(data);
		socket.end();
	});
}

function handleHelloWorldGetRequest(socket, isRedirect) {
	var response = "";
	if(isRedirect){
		response = "HTTP/1.1 302 FOUND\r\nConnection : close\r\nContent-Type : html\r\nContent-Size : ";
	} else {
	  response = "HTTP/1.1 200 OK\r\nConnection : close\r\nContent-Type : html\r\nContent-Size : ";
	}
	fs.readFile('hello-world.html', function(err, data){
		var bodySize = data.byteLength;
		data = data.toString("utf-8");
		data = data.replace("__HELLO__", "World");
		response = response+bodySize+"\r\n\r\n"+data;
		socket.end(response);
	});
}

function handleHelloWorldPostRequest(socket, reqObj) {
	var response = "";
	var name = "";
	reqObj.Body = reqObj.Body.split("+").join(" ");
	var bodyRequest = reqObj.Body.split("=");
	for (var i = 0; i < bodyRequest.length; i++) {
		if(bodyRequest[i] == "name"){
			name = bodyRequest[i+1];
			i = bodyRequest.length;
		}
	}
	fs.readFile('hello-world.html', function(err, data){
		data = data.toString("utf-8");
		data = data.replace("__HELLO__", name);
		var bodySize = data.byteLength;
		response = "HTTP/1.1 200 OK\r\nConnection : close\r\nContent-Type : html\r\nContent-Size : "+bodySize+"\r\n\r\n"+data;
		socket.end(response);
	});
}

function parseRequest(requestString) {
	var requestObj = {};
	var requestInfo = requestString.split("\n");

	for (var i = 0; i < requestInfo.length; i++) {
		if(requestInfo[i].length == 1){
			requestObj.Body = requestInfo[i+1];
		}
		var pair = requestInfo[i].split(":");
		if(pair.length == 2){
			requestObj[pair[0]] = pair[1].substring(1, pair[1].length);
		}
	}
	return requestObj;
}

function parseURL(urlString){
	var urlObj = {}
	var urlInfo = urlString.split("?");
	urlObj.path = urlInfo[0];
	urlObj.query = urlInfo[1];
	return urlObj;
}
