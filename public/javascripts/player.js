 $(function () {
    var playground = $('#playground');
    var maxHeight=playground.height();
    var maxWidth=playground.width();
    var moveStep=8;
    //玩家
    var playerArray=new Array();
    var self=new player();
    function player(){
        this.x=Math.random()*maxWidth;
        this.y=Math.random()*maxHeight;
        this.id="player"+new Date().getTime()+Math.random();
        this.forward="lt";
        this.type="player";
        this.status=1;
        this.shoot=function(){
            var b = new bullet(self.x,self.y,self.id,self.forward);
            socket.send(b)
            b.fly(b);
        }
    }
    function attackSB(bullet){
        //捕捉盘上所有的元素 得到class为player的
        var i ;
        for(i=0;i<playerArray.length;i++){
            var player=playerArray[i];
            //判断是否有人被子弹打中
            // 子弹的x元素在player的 正负5内   y元素在正负5内
            console.log("flying")
            if(Math.abs(bullet.x-player.x)<=5 && Math.abs(bullet.y-player.y)<=5){
                 //该player被击中
                if(bullet.playerId==player.id){
                    return false;
                }
                var id=player.id;
                var b = document.getElementById(id);
                b.parentNode.removeChild(b);
                removePlayer(id);
                //if(id==self.id){
                //    //通知所有人 我中枪了
                //    var msg={};
                //    msg['attackedId']=id;
                //    msg['type']='attMsg';
                //    socket.send(msg);
                //    self.status=0;
                //    alert("you die!")
                //}
                if(bullet.playerId==self.id){
                    var msg={};
                    msg['attackedId']=id;
                    msg['type']='attMsg';
                    socket.send(msg);
                }
                return true;
            }
        }
        return false;
    }
    //子弹 每次只捕捉玩家的shoot事件 子弹的飞行事件由每个客户端自己完成 如果击中目标则进行全局通告
    function bullet(x,y,playerId,forward){
        this.x=x;
        this.y=y;
        this.id="bullet"+new Date().getTime()+Math.random();
        this.playerId=playerId;
        this.type="bullet";
        this.forward=forward;
        this.fly=function(obj){
            var intId=setInterval(function(){
                if(obj.forward==="lt") {
                    if(obj.x>=10) {
                        obj.x -= 10;
                    }
                    else{
                        obj.explode(obj);
                        clearInterval(intId);
                        return;
                    }
                }
                if(obj.forward==="rt") {
                    if(obj.x<= maxWidth-10) {
                        obj.x += 10;
                    }
                    else{
                        obj.explode(obj);
                        clearInterval(intId);
                        return;
                    }
                }
                //判断是否打到人
                if(attackSB(obj)){
                    obj.explode(obj);
                    clearInterval(intId);
                    return;
                }
                var b = document.getElementById(obj.id)
                if(b)
                    b.parentNode.removeChild(b);
                b=obj.getBullet();
                playground.prepend(b);
            },100);
        }

        this.explode=function(obj){
            var b = document.getElementById(obj.id);
            b.parentNode.removeChild(b);
        }

        this.getBullet=function(){
            return '<div class="bullet" id="'+this.id+'" style="margin-top:' + this.y + 'px;margin-left:' + this.x + 'px;">-</div>';
        }
        return this;
    }
    //建立websocket连接
    socket = io.connect('localhost:3000',{
        'force new connection': true,
        reconnect: true,
        'reconnection delay': 200,
        'max reconnection attempts': 10
    });
    //收到server的连接确认
    socket.on('open',function(){
        //status.text('Choose a name:');
        //获取当前广场上的玩家及其位置
        //将玩家们添加到playground
        socket.send(self);
    });
     //收到server的连接确认
     socket.on('existsPlayer',function(json){
         self.id=json.id;
         self.x=json.x;
         self.y=json.y;
         self.forward=json.forward;
         self.status=json.status;
         playerArray[playerArray.length]=json;
         var p = getPlayerFromJson(json);
         playground.prepend(p);
     });

    //监听system事件，判断welcome或者disconnect，打印系统消息信息
    socket.on('system',function(json){
        if(json&&json.length){
            var i;
            for(i=0;i<json.length;i++){
                if(json[i]){
                    if(!document.getElementById(json[i].id)) {
                        playerArray[playerArray.length]=json[i]
                        var p = getPlayerFromJson(json[i]);
                        playground.prepend(p);
                    }
                }
            }
        }else {
            if (json.type === 'welcome') {
                //通知广场上的玩家 多了一个人来玩
                if(!document.getElementById(json.id)) {
                    playerArray[playerArray.length] = json;
                    var p = getPlayerFromJson(json);
                    playground.prepend(p);
                }
            } else if (json.type == 'disconnect') {
                //通知广场上的玩家 少了一个人玩
                var p = document.getElementById(json.id)
                if(p) {
                    p.parentNode.removeChild(p);
                }
                removePlayer(json.id);
            }
        }
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
    function getPlayerFromJson(json){
        var p='';
        if(json){
            if(json.id===self.id) {
                if (json.forward === 'lt') {
                   p = '<div class="player" id="' + json.id + '" style="background-color:blue;margin-top:' + json.y + 'px;margin-left:' + json.x + 'px;"><div class="leftArrow"> &lt; </div></div>';
                } else {
                    p = '<div class="player" id="' + json.id + '" style="background-color:blue;margin-top:' + json.y + 'px;margin-left:' + json.x + 'px;"><div class="rightArrow"> &gt; </div></div>';
                }
            }else{
                if (json.forward === 'lt') {
                    p ='<div class="player" id="' + json.id + '" style="margin-top:' + json.y + 'px;margin-left:' + json.x + 'px;"><div class="leftArrow"> &lt; </div></div>';
                } else {
                    p ='<div class="player" id="' + json.id + '" style="margin-top:' + json.y + 'px;margin-left:' + json.x + 'px;"><div class="rightArrow"> &gt; </div></div>';
                }
            }
        }
        return p;
    }
    socket.on("attackedPlayer",function(id){
        var p = document.getElementById(id);
        if(p) {
            p.parentNode.removeChild(p);
        }
        removePlayer(id);
        if(id==self.id){
            self.status=0;
            alert("you die!");
        }
    });
    socket.on('message',function(json){
        //获取位置移动信息
        var p = document.getElementById(json.id)
        p.parentNode.removeChild(p);
        p=getPlayerFromJson(json);
        playground.prepend(p);
        //修改player队列里面的信息
        var player=getPlayerFromArray(json.id);
        player["x"]=json.x;
        player["y"]=json.y;
        player["forward"]=json.forward;
        if(json.id==self.id){
            self.x=json.x;
            self.y=json.y;
            self.forward=json.forward;
        }
    });
    socket.on('shoot',function(json){
        //获取位置移动信息
        var b = new bullet(json.x,json.y,json.playerId,json.forward);
        b.fly(b)
    });

     function getPlayerFromArray(id){
         var i;
         for(i=0;i<playerArray.length;i++){
             if(playerArray[i].id===id){
                 return playerArray[i];
             }
         }
     }
    //通过“回车”提交聊天信息
     document.onkeydown=function(e){
         var sendMsg=false;
         //监听键盘事件 将位置移动等信息传递给所有人
         //左
         if (e.keyCode === 37||e.keyCode === 65) {
             self.forward='lt';
             if(self.x>=moveStep)
                 self.x-=moveStep;
             else
                 return;
             sendMsg=true;
         }
         //上
         if (e.keyCode === 38||e.keyCode === 87) {
             if(self.y>=moveStep)
                 self.y-=moveStep;
             else
                return;
             sendMsg=true;
         }
         //右
         if (e.keyCode === 39||e.keyCode === 68) {
             self.forward='rt';
             if(self.x<=maxWidth-moveStep)
                 self.x+=moveStep;
             else
                 return;
             sendMsg=true;
         }
         //下
         if (e.keyCode === 40||e.keyCode === 83) {
             if(self.y<=maxHeight-moveStep)
                 self.y+=moveStep;
             else
                 return;
             sendMsg=true;
         }
         if (e.keyCode === 13) {
             sendMsg=true;
             if(self.status==1)
                 self.shoot();
         }
         if(sendMsg) {
             if(self.status==0){//你已经死了
                 console.log("死人是不能动的！")
                 return;
             }else {
                 socket.send(self)
             }
         }
     };
});