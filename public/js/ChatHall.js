/**
 * Created by shaolu on 2016/10/18.
 */
var app= angular.module("ChatHall",[]);

// socket service
app.factory('socket',function ($rootScope) {
    var socket=io();  //connect the server which deploys the webapp by default
    return {
        on:function (eventName,callback) {
            socket.on(eventName,function () {
               var args =arguments;
                $rootScope.apply(function () {
                    callback.apply(socket,args);
                });
            });//手动执行脏检查，将原对象复制一份快照，在某个时间，比较现在对象与快照的值
        },
        emit:function(eventName,data,callback){
            socket.emit(eventName,data,function () {
                var args=arguments;
                $rootScope.apply(function () {
                    callback.apply(socket,args);
                });
            });
        }
    };
})

// randomRole service
//todo  修改改变角色的factory
app.factory('randomRole',function (rootScope) {
    return {
        newRole:function () {
            return '#'+('00000'+Math.random()*0x1000000<<0).toString(16).slice(-6);
        }
    };

})

app.factory('userService',function ($rootScope) {
    return{
        get:function(users,nickname){
            if(users instanceof Array){
                for(var i=0;i<users.length;i++)
                {
                    if(users[i].nickname==nickname){
                        return users[i];
                    }
                }
            }
            else{
                return null;
            }

        }
    }

})
app.controller("ChatCtrl",['$scope','socket','randomRole',function($scope,socket,randomRole){
    var messageWrapper=$('.message-wrapper');
    $scope.islogined=false;
    $scope.receiver="";//Group chat by default
    $scope.publicMessage =[]; //Group chat message
    $scope.privateMessage={};//personal chat message
    $scope.messages=$scope.publicMessage;// display the Group chat by default
    $scope.users=[];
    $scope.role=randomRole.newRole();//deploy the role

    $scope.login=function () {  //log into the ChatHall  //todo 加入动漫角色，加入对应的关系
        socket.emit('addUser',{nickname:$scope.nickname,role:$scope.role})
    }

    $scope.scrollToBottom=function(){
        messageWrapper.scrollTop(messageWrapper[0].scrollHeight);
    }

    $scope.postMessage = function () {
        $scope.words = "";
        var msg={text:$scope.words,type:"normal",color:$scope.color,from:$scope.nickname,to:$scope.receiver};
        var rec=$scope.receiver;
        if(rec){   //personal message
            if(!$scope.privateMessage[rec]){
                $scope.privateMessage[rec]=[];
            }
            $scope.privateMessage[rec].push(msg);
        }
        else{  //group chat
            $scope.publicMessage.push(msg);
        }
        //exclude the situation that the user send to itself
        if(msg.to!=$scope.nickname){
            io.emit("addMessage",msg);
        }
    }
    $scope.setReceiver=function (receiver) {
        $scope.receiver=receiver;
        if(receiver){ //privater letter
             if(!$scope.privateMessage[receiver]){
                 $scope.privateMessage[receiver]=[];
             }
             $scope.messages=$scope.privateMessage[receiver];
        }
        else{ //broadcast
             $scope.messages=$scope.publicMessage;
        }
        //userServer.get
        var user =userService.get($scope.users,receiver);
        if(user){ //init
            user.hasNewMessage=false;
        }
    }

    //receive the login result
    socket.on('userAddingResult',function (data) {
        if(data.result){
            $scope.userExisted=false;
            $scope.islogined=true;
        }
        else{
            $scope.islogined=false;
            $scope.userExisted=false;
        }
    })
     //initialize  the online  list when receive all users message
    socket.on('allUser',function (data) {
         if(!$scope.islogined) return;
         $scope.users.push(data);
    });
    //display the welcome form and refresh the online list when receive the new user message
    socket.on('userAdded',function (data) {
        if(!$scope.islogined) return;
        $scope.publicMessage.push({text:data.nickname,type:"welcome"});
        $scope.users.push(data);
    });
    //refresh the online list  when receive the new user exit message
    socket.on('userRemoved',function(data){
        if(!$scope.islogined) return;
        $scope.publicMessage.push({text:data.nickname,type:"bye"});
        for(var i=0;i<$scope.users.length;i++){
            if(data.nickname==users[i].nickname){
                $scope.users.splice(i,1);
            }
        }
    });

    //add to chat record when receive the new message
    socket.on('messageAdded',function (data) {
          if(!$scope.islogined) return;
        //from
          if(data.to){ //private letter
              if(!$scope.privateMessage[data.from]){
                  $scope.privateMessage[data.from]=[];
              }
              $scope.privateMessage[data.from].push(data);
          }
          else{  //broadcast
              $scope.publicMessage.push(data);
          }
        //distinguish whether the message is private letter
          var fromUser = userService.get($scope.users,data.from);
          var toUser  = userService.get($scope.users,data.to);
          //Prompt new message unless they are not chatting
          if($scope.receiver!=data.to){
              if(fromUser && toUser.nickname){
                  fromUser.hasNewMessage=true;//private letter
              }else{
                  toUser.hasNewMessage = true;//broadcast
              }
          }
    });
}]); //Inline injection

app.directive('message', ['$timeout',function($timeout) {
    return {
        restrict: 'E',
        templateUrl: 'message.html',
        scope:{
            info:"=",
            self:"=",
            scrolltothis:"&"
        },
        link:function(scope, elem, attrs){
                scope.time=new Date();
                $timeout(scope.scrolltothis);
                $timeout(function(){
                    elem.find('.avatar').css('background',scope.info.color);
                });
        }
    };
}])

app.directive('user',['$timeout',function($timeout){
    return {
            restrict: 'E',
            templateUrl: 'user.html',
            scope:{
                info:"=",
                iscurrentreceiver:"=",
                setreceiver:"&"
            },
        link:function (scope,elem,attrs,ChatCtrl) {
            $timeout(function(){
                elem.find('avatar').css('background',scope.info.color)
            })
        }
    }
}]);
