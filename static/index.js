var userName;
var rButton = false;

function firstStage(callback) {
    document.getElementById('nameButton').onclick = function (event) {
        userName = document.getElementById('nameField').value;
        console.log("Username: ", userName);

        if(userName != "") {        
            document.querySelector('.header').classList.add('moveHeader');
            document.querySelector('.container').classList.add('up');

            document.querySelector('#content').removeChild(form);

            var namesField = document.createElement("div");
            namesField.id = "names";
            document.querySelector('#content').appendChild(namesField);

            namesField = document.createElement("div");

            namesField.innerHTML += '<div class=\"nameInfo\">Player</div>';
            namesField.innerHTML += '<div class=\"scoreInfo\">Score</div>';

            document.querySelector("#names").appendChild(namesField);

            var tableField = document.createElement("div");
            tableField.id = "tableHere";
            tableField.innerHTML = 
            '<table id="playTable">\
                <tbody>\
                    <tr>\
                        <td id="0"></td>\
                        <td id="1"></td>\
                        <td id="2"></td>\
                    </tr>\
                    <tr>\
                        <td id="3"></td>\
                        <td id="4"></td>\
                        <td id="5"></td>\
                    </tr>\
                    <tr>\
                        <td id="6"></td>\
                        <td id="7"></td>\
                        <td id="8"></td>\
                    </tr>\
                </tbody>\
            </table>';
            if(document.querySelector('#content').appendChild(tableField)) console.log("Table created.");

            var currentPfield = document.createElement("div");
            currentPfield.id = "currentP";
            currentPfield.innerHTML = "Waiting for opponent.";
            document.querySelector('#content').appendChild(currentPfield);

            currentPfield = document.createElement("div");
            currentPfield.id = "extraInfo";
            currentPfield.innerHTML = "";
            document.querySelector('#content').appendChild(currentPfield);

            callback();
        }
    };
}


function secondStage() {           
    var host = window.document.location.host.replace(/:.*/, '');

    var client = new Colyseus.Client(location.protocol.replace("http", "ws") + "//" + host + (location.port ? ':' + location.port : ''));
    var room;
    client.joinOrCreate("state_handler").then(room_instance => {
        room = room_instance

        var players = {};

        room.state.players.onAdd = function (player, sessionId) {

            var dom = document.createElement("div");

            dom.innerHTML = '<div class=\"sign\">' + player.sign + '</div>';
            dom.innerHTML += '<div class=\"name\">' + player.name + '</div>';
            dom.innerHTML += '<div class=\"score\">' + player.score + '</div>';

            dom.id = sessionId;

            players[sessionId] = dom;
            document.querySelector("#names").appendChild(dom);
        }

        room.state.players.onRemove = function (player, sessionId) {
            document.querySelector("#names").removeChild(players[sessionId]);
            delete players[sessionId];

            for (let id in room.state.blocks){
                document.getElementById(id).innerHTML = "";
                if (room.state.blocks[id].winningField) document.getElementById(id).classList.remove('winner');
            }

            document.getElementById("currentP").innerHTML = "Waiting for opponent.";
            document.getElementById("extraInfo").innerHTML = "";
        }

        room.state.blocks.onChange = function (block) {
            if (block.value == "$" || block.value == "#") document.getElementById(block.field).innerHTML = '<span>' + block.value + '</span>';                
        }

        room.state.players.onChange = function (player, sessionId) {
            var dom = document.querySelector("#" + CSS.escape(sessionId) + " .name");
            dom.innerHTML = player.name;
            dom = document.querySelector("#" + CSS.escape(sessionId) + " .sign");
            dom.innerHTML = player.sign;
            dom = document.querySelector("#" + CSS.escape(sessionId) + " .score");
            dom.innerHTML = player.score;

            if (player.status == "restart" && rButton == false) {
                document.getElementById("extraInfo").innerHTML = player.name + " wants to start a new game";
            }
        }

        room.state.onChange = function () {
            
            if (room.state.gameOver && rButton == false) {
                for (let i = 0; i < 9; i++) {
                    document.getElementById(i).classList.remove('tdActive');
                }      
                document.getElementById("currentP").innerHTML = "";
                var dom = document.createElement("div");
                if (room.state.draw) {
                    dom.innerHTML = "Nobody won!";
                } else {
                    document.querySelector('.header').classList.add('smallFont');
                    document.querySelector('.header').classList.remove('bigFont');
                    dom.innerHTML = room.state.winner + " won!";
                    for (let id in room.state.blocks) {
                        if (room.state.blocks[id].winningField) {
                            document.getElementById(id).classList.add('winner');
                        }
                    }
                }
                dom.id = "winnerText";
                document.getElementById("currentP").appendChild(dom);
                
                dom = document.createElement("div");
                dom.innerHTML = '<button id="restartButton" class="restartButton">Restart <span id="arrowSign">&#x21ba;</span></button>';
                dom.id = "restartB";
                document.getElementById("currentP").appendChild(dom);

                let restartB = document.getElementById('restartButton');
                restartB.onclick = function(event) {
                    rButton = true;
                    room.send({ button: "restart" });
                    restartB.classList.add('restartButtonDisabled');
                    restartB.classList.remove('restartButton');
                    document.getElementById("arrowSign").classList.add('rotationOn');
                    document.getElementById("extraInfo").innerHTML = "Waiting for second player...";
                };
            } else if (room.state.restart) {
                for (let id in room.state.blocks) {
                    document.getElementById(id).innerHTML = "";
                    document.getElementById(id).classList.remove('winner');
                }
                if (room.state.currentPlayer == room.sessionId) {
                    for (let i = 0; i < 9; i++) {
                        document.getElementById(i).classList.add('tdActive');
                    }                    
                } else {
                    for (let i = 0; i < 9; i++) {
                        document.getElementById(i).classList.remove('tdActive');
                    }       
                }
                rButton = false;
                document.getElementById("extraInfo").innerHTML = "";
                document.getElementById("currentP").innerHTML = "Current player: " + room.state.currentPlayerName;
            } else if (room.state.currentPlayerName != "" && !room.state.gameOver) {
                if (room.state.currentPlayer == room.sessionId) {
                    for (let i = 0; i < 9; i++) {
                        if (this.blocks[i].value != "$" && this.blocks[i].value != "#") document.getElementById(i).classList.add('tdActive');
                    }                    
                } else {
                    for (let i = 0; i < 9; i++) {
                        document.getElementById(i).classList.remove('tdActive');
                    }       
                }
                document.getElementById("currentP").innerHTML = "Current player: " + room.state.currentPlayerName;
            }              
        }

        room.send({ userName: userName });

        let table = document.getElementById('playTable');

        table.onclick = function(event) {

        let target = event.target.closest('td');
        if (!table.contains(target)) return;

        room.send({ fieldId: parseInt(target.getAttribute("id")) });
        };
    });
}

function initiate() {
    firstStage(function() {
        secondStage();
        });  
}

initiate();