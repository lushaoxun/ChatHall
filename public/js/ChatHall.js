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
app.controller("ChatCtrl",['$scope','socket','randomRole',function($scope,socket,randomRole){
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
    

    from:$scope.nickname,to:$scope.nickname
}]); //Inline injection
app.direction('message',['$timeout',function($timeout){}])
app.direction('user',['$timeout',function($timeout){}])
