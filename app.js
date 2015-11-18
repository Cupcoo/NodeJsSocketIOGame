//引入程序包
var express = require('express')
    , path = require('path')
    , app = express()
    , server = require('http').createServer(app)
    , io = require('socket.io').listen(server);

var morgan = require('morgan');
app.use(morgan('dev'));
var favicon = require('serve-favicon');
app.use(favicon(__dirname + '/public/favicon.ico'));
var bodyParser = require('body-parser');
app.use(bodyParser.urlencoded());
var methodOverride = require('method-override');
app.use(methodOverride('X-HTTP-Method-Override'));
var playerArray=new Array();

//WebSocket连接监听
io.on('connection', function (socket) {
  var address = socket.handshake.address;
  var client = {
    socket:socket,
    name:false
  };
  //不设定同一个ip只能连一个
  socket.emit('open');//通知客户端已连接

  //同一个ip只能连接一个 注释掉上面一行代码才能运行
  //var existsPlayer=getPlayerByAddress(address);
  //if(!existsPlayer){
  //  console.log("getPlayerByAddress(address)");
  //  socket.emit('open');//通知客户端已连接
  //}else{
  //  console.log("已经建立连接！");
  //  socket.emit('existsPlayer', existsPlayer);//通知客户端不重复连接
  //  client.id=existsPlayer.id;
  //}

  // 打印握手信息
   console.log(socket.handshake);

  // 构造客户端对象

  // 对message事件的监听
  socket.on('message', function(msg){
    var obj = {time:getTime()};

    if(!client.id) {
      client.id=msg.id;
      obj['id']=msg.id;
      obj['x']=msg.x;
      obj['y']=msg.y;
      obj['status']=msg.status;
      obj['forward'] = msg.forward;
      obj['author'] = 'System';
      obj['type'] = 'welcome';
      obj['address']=address;
      playerArray[playerArray.length]=obj;
      //返回欢迎语
      //广播新用户已登陆
      socket.broadcast.emit('system', obj);
      socket.emit('system', playerArray);
    }else{
        if(msg.type=='player') {
          obj['id'] = msg.id;
          obj['x'] = msg.x;
          obj['y'] = msg.y;
          obj['type'] = 'message';
          obj['forward'] = msg.forward;
          obj['status']=msg.status;
          var player = getPlayerFromArray(msg.id);
          player["x"] = msg.x;
          player["y"] = msg.y;
          player["forward"] = msg.forward;
          // 返回消息（可以省略）
          socket.emit('message', obj);
          // 广播向其他用户发消息
          socket.broadcast.emit('message', obj);
        }else{
          //子弹信息发布
          if(msg.type=='bullet') {
            obj['id'] = msg.id;
            obj['x'] = msg.x;
            obj['y'] = msg.y;
            obj['playerId']=msg.playerId;
            obj['forward']=msg.forward;
            socket.emit('shoot', obj);
            // 广播向其他用户发消息
            socket.broadcast.emit('shoot', obj);
          }else {
            //被击中信息发布
            if (msg.type === 'attMsg'){
              var id=msg.attackedId;
              removePlayer(id);
              socket.emit('attackedPlayer', id);
              // 广播向其他用户发消息
              socket.broadcast.emit('attackedPlayer', id);
            }
          }
        }
    }
  });

  function getPlayerByAddress(add){
    var i;
    for(i=0;i<playerArray.length;i++){
      if(playerArray[i].address===add){
        console.log(playerArray[i]);
        return playerArray[i];
      }
    }
    console.log(false);
    return false;
  }
  function getPlayerFromArray(id){
    var i;
    for(i=0;i<playerArray.length;i++){
      if(playerArray[i].id===id){
        return playerArray[i];
      }
    }
  }
  //监听出退事件
  socket.on('disconnect', function () {
    var obj = {
      time:getTime(),
      author:'System',
      text:client.name,
      type:'disconnect',
      id:client.id
    };
    removePlayer(client.id);
    // 广播用户已退出
    socket.broadcast.emit('system',obj);
    console.log(client.id + 'Disconnect');
  });

});

function removePlayer(id){
  var i;
  for(i=0;i<playerArray.length;i++){
    var player=playerArray[i];
    if(player&&player.id===id){
      var j;
      playerArray[i]=null;
      for(j=i+1;j<playerArray.length;j++){
        var temp=playerArray[j];
        playerArray[j]=null;
        playerArray[j-1]=temp;
      }
      playerArray.length-=1;
      break;
    }
  }
}
//express基本配置
app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
//app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

var errorhandler = require('errorhandler')
if (process.env.NODE_ENV === 'development') {
  // only use in development
  app.use(errorhandler())
}

// 指定webscoket的客户端的html文件
app.get('/', function(req, res){
  res.sendfile('views/playground.html');
});

server.listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});


var getTime=function(){
  var date = new Date();
  return date.getHours()+":"+date.getMinutes()+":"+date.getSeconds();
}
