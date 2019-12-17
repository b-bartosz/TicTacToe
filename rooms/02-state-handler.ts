import { Room, Client } from "colyseus";
import { Schema, type, MapSchema, ArraySchema } from "@colyseus/schema";

export class Player extends Schema {
    @type("string")
    id = "";

    @type("string")
    name = "";

    @type("string")
    sign = " ";

    @type("string")
    status = "ready";

    @type("number")
    score = 0;
}

export class Block extends Schema {
    @type("number")
    field: number;

    @type("boolean")
    winningField = false;

    @type("string")
    value = "";
}

export class State extends Schema {
    @type({ map: Block })
    blocks = new MapSchema<Block>();

    @type("number")
    playerCount = 0;

    @type ( "string" )
    currentPlayer = "";

    @type ( "string" )
    currentPlayerName = "";

    @type ( "string" )
    winner = "";

    @type ( "string" )
    playerOne = "";

    @type ( "string" )
    playerTwo = "";

    @type ( "boolean" )
    gameOver = false;

    @type ( "boolean" )
    draw = false;

    @type ( "boolean" )
    restart = false;
    
    @type({ map: Player })
    players = new MapSchema<Player>();

    
    createField () {
        for (let i = 0; i < 9; i++) {
            this.blocks[i] = new Block();
            this.blocks[i].field = i;
            this.blocks[i].value = i.toString();
        }
    }

    clearAll () {
        for (let i = 0; i < 9; i++) {
            this.blocks[i].winningField = false;
            this.blocks[i].field = i;
            this.blocks[i].value = i.toString();
        }

        for (let id in this.players) this.players[id].score = 0;

        this.gameOver = false;
        this.draw = false;
        this.restart = false;
        this.currentPlayer = "";
        this.currentPlayerName = "";
    }

    createPlayer (id: string) {
        this.players[ id ] = new Player();
        this.players[ id ].id = id;
        ++this.playerCount;

        if (this.playerCount == 2) {
            let tmpList = Object.keys(this.players);
            this.playerOne = this.players[tmpList[0]].id;
            this.playerTwo = this.players[tmpList[1]].id;
            this.players[tmpList[0]].sign = "$";            
            this.players[tmpList[1]].sign = "#";
        }
    }

    drawCurrentPlayer () {
        let tmpList = Object.keys(this.players);
        let randomPlayer = tmpList[Math.floor(Math.random()*tmpList.length)];
        this.currentPlayer = randomPlayer;
        this.currentPlayerName = this.players[randomPlayer].name;
    }

    removePlayer (id: string) {
        delete this.players[ id ];
        --this.playerCount;
    }

    setUsername (sessionId, data) {
        let clearString = data.userName.replace(/\/|\\|\||\*|\"|\'|\<|\>|\(|\)|\[|\]|\{|\}|\;|\:|\,|\./gi, "");
        this.players[sessionId].name = clearString.slice(0,10);
        if (this.playerCount == 2) this.drawCurrentPlayer();
    }


    checkTable () {
        if ((this.blocks[0].value).includes(this.blocks[4].value) && (this.blocks[4].value).includes(this.blocks[8].value)) {
            this.blocks[0].winningField = true;
            this.blocks[4].winningField = true;
            this.blocks[8].winningField = true;
            return true;
        }
        if ((this.blocks[2].value).includes(this.blocks[4].value) && (this.blocks[4].value).includes(this.blocks[6].value)) {
            this.blocks[2].winningField = true;
            this.blocks[4].winningField = true;
            this.blocks[6].winningField = true;
            return true;
        }
        for (let i = 0; i < 7; i+=3) {
            if ((this.blocks[i].value).includes(this.blocks[i+1].value) && (this.blocks[i+1].value).includes(this.blocks[i+2].value)) {
                this.blocks[i].winningField = true;
                this.blocks[i+1].winningField = true;
                this.blocks[i+2].winningField = true;
                return true;
            }
        }
        for (let i = 0; i < 3; i++) {
            if ((this.blocks[i].value).includes(this.blocks[i+3].value) && (this.blocks[i+3].value).includes(this.blocks[i+6].value)) {
                this.blocks[i].winningField = true;
                this.blocks[i+3].winningField = true;
                this.blocks[i+6].winningField = true;
                return true;
            }
        }

        var j = 0;
        for (let i = 0; i < 9; i++) {
            if (this.blocks[i].value == "$" || this.blocks[i].value == "#") j++;
        }
        if (j == 9) return this.draw = true;

        return false;
    }


    movePlayer (id: string, data) {
        if (this.blocks[data.fieldId].value != "$" && this.blocks[data.fieldId].value != "#") {
            this.blocks[data.fieldId].value = this.players[id].sign;
        } else {
            return false;
        }

        this.blocks[data.fieldId].field = data.fieldId;

        if (this.checkTable()) {
            this.gameOver = true;            
            for (let id in this.players) {
                this.players[id].status = "notReady";
            }
            if (!this.draw) this.players[id].score++;
            this.winner = this.currentPlayerName;
            this.currentPlayer = "";
            this.currentPlayerName = "";
        }
        return true;
    }

    switchPlayer (sessionId, data) {
        if (this.playerCount == 2 && sessionId == this.currentPlayer) {
            if (this.movePlayer(sessionId, data) && this.gameOver == false) {
                if (this.currentPlayer == this.playerTwo) {
                    this.currentPlayer = this.playerOne;
                    this.currentPlayerName = this.players[this.playerOne].name;
                } else {
                    this.currentPlayer = this.playerTwo;
                    this.currentPlayerName = this.players[this.playerTwo].name;
                }
            }
        }
    }

    restartGame (sessionId) {
        this.players[sessionId].status = "restart";
        if (this.playerCount == 2) {
            var restartCount = 0;
            for (let id in this.players) {
                if (this.players[id].status == "restart") restartCount++;
            }
            if (restartCount == 2) {
                for (let i = 0; i < 9; i++) {
                    this.blocks[i].winningField = false;
                    this.blocks[i].field = i;
                    this.blocks[i].value = i.toString();
                }
                for (let id in this.players) {
                    this.players[id].status = "ready";
                }
                this.draw = false;
                this.gameOver = false;
                this.drawCurrentPlayer();
                this.restart = true;
            }
        }
    }
}

export class StateHandlerRoom extends Room<State> {
    maxClients = 2;

    onCreate (options) {
        console.log("StateHandlerRoom created!", options);
        this.setState(new State());
        this.state.createField();
    }

    onJoin (client: Client) {
        this.state.createPlayer(client.sessionId);
    }

    onLeave (client) {
        this.state.removePlayer(client.sessionId);
        this.state.clearAll();
        console.log("Cleared all.");
        console.log("Player count: ", this.state.playerCount);
    }

    onMessage (client, data) {
        console.log("StateHandlerRoom received message from", client.sessionId, ":", data);
        if (data.userName && this.state.playerCount < 3) {
            this.state.setUsername(client.sessionId, data);            
            return;
        } else if (data.button == "restart" && this.state.restart == false) {
            this.state.restartGame(client.sessionId);
        } else if (!this.state.gameOver) {
            this.state.switchPlayer(client.sessionId, data);
            this.state.restart = false;
        }
    }

    onDispose () {
        console.log("Dispose StateHandlerRoom");
    }

}
