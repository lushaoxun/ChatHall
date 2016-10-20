
var app=angular.module("chatHall",[]);

app.factory('socket', function($rootScope) {
    var socket = io(); //connect the server which deploys the webapp by default
    return {
        on: function(eventName, callback) {
            socket.on(eventName, function() {
                var args = arguments;
                $rootScope.$apply(function() {   //手动执行脏检查，将原对象复制一份快照，在某个时间，比较现在对象与快照的值
                    callback.apply(socket, args);
                });
            });
        },
        emit: function(eventName, data, callback) {
            socket.emit(eventName, data, function() {
                var args = arguments;
                $rootScope.$apply(function() {
                    if(callback) {
                        callback.apply(socket, args);
                    }
                });
            });
        }
    };
});

app.factory('randomColor', function($rootScope) {
    return {
        newColor: function() {
            return '#'+('00000'+(Math.random()*0x1000000<<0).toString(16)).slice(-6);
        }
    };
});
//randomRole service
//todo  修改改变角色的factory
app.factory('randomRole',function ($rootScope) {
    return {
        newRole:function () {
            return '#'+('00000'+Math.random()*0x1000000<<0).toString(16).slice(-6);
        }
    };

})

app.factory('userService', function($rootScope) {
    return {
        get: function(users,nickname) {
            if(users instanceof Array){
                for(var i=0;i<users.length;i++){
                    if(users[i].nickname===nickname){
                        return users[i];
                    }
                }
            }else{
                return null;
            }
        }
    };
});

app.controller("chatCtrl",['$scope','socket','randomColor','randomRole','userService',function($scope,socket,randomColor,randomRole,userService){
//app.controller("chatCtrl",['$scope','socket','randomColor','userService',function($scope,socket,randomColor,userService){
    var messageWrapper= $('.message-wrapper');
    $scope.hasLogined=false;
    $scope.receiver="";//Group chat by default
    $scope.publicMessages=[];//Group chat message
    $scope.privateMessages={};//personal chat message
    $scope.messages=$scope.publicMessages;//display the Group chat by default
    $scope.users=[];//
    $scope.color=randomColor.newColor();//deploy the role
//     $scope.role=randomRole.newRole();//
    $scope.login=function(){   //log into the ChatHall
       socket.emit("addUser",{nickname:$scope.nickname,color:$scope.color});
     // socket.emit("addUser",{nickname:$scope.nickname,role:$scope.role});
    }
    $scope.scrollToBottom=function(){
        messageWrapper.scrollTop(messageWrapper[0].scrollHeight);
    }

    $scope.postMessage=function(){
        var msg={text:$scope.words,type:"normal",color:$scope.color,from:$scope.nickname,to:$scope.receiver};
       // var msg={text:$scope.words,type:"normal",role:$scope.role,from:$scope.nickname,to:$scope.receiver};
        var rec=$scope.receiver;
        if(rec){  //personal message
           if(!$scope.privateMessages[rec]){
               $scope.privateMessages[rec]=[];
           }
            $scope.privateMessages[rec].push(msg);
        }else{ //group chat
            $scope.publicMessages.push(msg);
        }
        $scope.words="";
        if(rec!==$scope.nickname) { //exclude the situation that the user send to itself
            socket.emit("addMessage", msg);
        }
    }
    $scope.setReceiver=function(receiver){
        $scope.receiver=receiver;
        if(receiver){ //privater letter
            if(!$scope.privateMessages[receiver]){
                $scope.privateMessages[receiver]=[];
            }
            $scope.messages=$scope.privateMessages[receiver];
        }else{//broadcast
            $scope.messages=$scope.publicMessages;
        }
        var user=userService.get($scope.users,receiver);
        if(user){
            user.hasNewMessage=false;
        }
    }

    //receive the login result
    socket.on('userAddingResult',function(data){
        if(data.result){
            $scope.userExisted=false;
            $scope.hasLogined=true;
        }else{//nickname haa been used
            $scope.userExisted=true;
        }
    });

    //display the welcome form and refresh the online list when receive the new user message
    socket.on('userAdded', function(data) {
        if(!$scope.hasLogined) return;
        $scope.publicMessages.push({text:data.nickname,type:"welcome"});
        $scope.users.push(data);
    });

    //initialize  the online  list when receive all users message
    socket.on('allUser', function(data) {
        if(!$scope.hasLogined) return;
        $scope.users=data;
    });

    //refresh the online list  when receive the new user exit message
    socket.on('userRemoved', function(data) {
        if(!$scope.hasLogined) return;
        $scope.publicMessages.push({text:data.nickname,type:"bye"});
        for(var i=0;i<$scope.users.length;i++){
            if($scope.users[i].nickname==data.nickname){
                $scope.users.splice(i,1);
                return;
            }
        }
    });

    //add to chat record when receive the new message
    socket.on('messageAdded', function(data) {
        if(!$scope.hasLogined) return;
        if(data.to){ //private letter
            if(!$scope.privateMessages[data.from]){
                $scope.privateMessages[data.from]=[];
            }
            $scope.privateMessages[data.from].push(data);
        }else{//broadcast
            $scope.publicMessages.push(data);
        }
        var fromUser=userService.get($scope.users,data.from);
        var toUser=userService.get($scope.users,data.to);
        if($scope.receiver!==data.to) {//Prompt new message unless they are not chatting
            if (fromUser && toUser.nickname) {
                fromUser.hasNewMessage = true;//private letter
            } else {
                toUser.hasNewMessage = true;//broadcast
            }
        }
    });



}]);

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
                //    elem.find('.avatar').css('background',scope.info.role);
                     elem.find('.avatar').css('background',scope.info.color);
                });
        }
    };
}])
    .directive('user', ['$timeout',function($timeout) {
        return {
            restrict: 'E',
            templateUrl: 'user.html',
            scope:{
                info:"=",
                iscurrentreceiver:"=",
                setreceiver:"&"
            },
            link:function(scope, elem, attrs,chatCtrl){
                $timeout(function(){
                 //    elem.find('.avatar').css('background',scope.info.role);
                    elem.find('.avatar').css('background',scope.info.color);
                });
            }
        };
    }]);
