/*

1) Installed node.js by creating a package.json
2) added our first dependency to package.json - express
3) Used express in our server.js to serve up our static resources
4) set up our socket connection code on the server
5) Set up a socket connection on our client
6) Send draw data to the server
7) Forward the draw data to the clients

*/

console.log("MY socket server is running");

// express allows us to SERVE our files to our client
let express = require("express");

// let's make an instance of an express app
let app = express();

// Create a server that listens o glitch's allowed user port
let server = app.listen(process.env.PORT);

console.log(`Your app is running on port: ${server.address().port}`);

// tell express to serve our index.html when port 3000 is hit
app.use(express.static("public"));

// grab a reference to our downloaded socket.io library.
let socket = require("socket.io");

// Make an instance of the socket.io library
let io = socket(server);

// "connection" happens to be a predefined EVENT TYPE emmitted by socket.io
io.sockets.on("connection", newConnection);

// this will hold a list of players, keyed by their connection ID
let players = new Map();

class Apple {
  constructor() {
    this.x = Math.random()*390
    this.y = Math.random()*390
    this.size = 10;
  }
  
  resetPosition(){
    this.x = Math.random()*390
    this.y = Math.random()*390
  }
}


let appleId = 1;

let apples = new Map();


function newConnection(playerConnection) {
  playerConnection.on("disconnect", handleDisconnect);
  
  function handleDisconnect() {
    console.log(`Disconnected ${playerConnection.id}`);
    players.delete(playerConnection.id);
    io.sockets.emit("disconnectedPlayer", playerConnection.id);
    
  }
  
  playerConnection.on("changeDirection", handleDirectionChange);
  
  function handleDirectionChange(data){  
    players.get(data.id).direction = data.direction;
    playerConnection.broadcast.emit("changeDirection", data)
  }
  
  playerConnection.on("getCollision", handleCollisions);

  function handleCollisions(data){
      players.get(data.deadSnakeId).isAlive = false;
      players.get(data.deadSnakeId).speed = 0;
      let collisionData = {
        id: data.deadSnakeId
      }
      playerConnection.broadcast.emit("getCollision", collisionData)
  }

  console.log(`New Connection recieved ${playerConnection.id}`);
  
  // assign the new player its ID and starting position
  let newPlayer = new Player(
    10,
    Math.floor(Math.random() * 400),
    Math.floor(Math.random() * 400),
    "N", // do you want them all to start in the same direction?
    10,
    1,  // populate this with the real data necessary for a tail segment
    true,
    playerConnection.id
  );
  
  // send the new player where to initialize itself, along with the rest of the players
  let startingData = {
    "newPlayer": newPlayer,
    "otherPlayers": Array.from(players.values())
  }  

  playerConnection.emit("startGameEvent", startingData);
  players.set(newPlayer.id, newPlayer);
  
  
  playerConnection.broadcast.emit("playerAdded", newPlayer);
  
  playerConnection.on("updateLocation", handleUpdateLocation);
  playerConnection.on("collideApple", handleAppleCollision)
  

  function handleUpdateLocation(data) {
    //console.log("Array is: " + Array.from(players.keys()) + " looking for: " + data.id);
    players.get(data.id).x = data.x;
    players.get(data.id).y = data.y;
    playerConnection.broadcast.emit("updateLocation", players.get(data.id));
  }
  
  playerConnection.on("newTail", handleNewTail)
  
  function handleNewTail(data) {
    playerConnection.broadcast.emit("newTail", data)
    
  }
  
  playerConnection.on("updateTailLocation", handleUpdateTail)
  
  function handleUpdateTail(data) {
    playerConnection.broadcast.emit("updateTailLocation", data); 
   
  }
  
  function handleAppleCollision(data){
    console.log(data);
    apples.delete(data.id);
    let oldId = data.id;
    appleId++;
    playerConnection.broadcast.emit("collideApple", data);
  }
  
  playerConnection.on("addNewApple", addNewApple)
  
  function addNewApple() {
    let appleData = {appleId: appleId, apple: new Apple()}
    apples.set(appleId, appleData.apple)
    console.log("Hello")
    console.log(apples);
    io.sockets.emit("addNewApple", appleData);
  }
  
  io.sockets.emit("addNewApple", {appleId: appleId, apple: apples.get(appleId)});
  

  
}



class Player {
  constructor(size, x, y, direction, speed, tail, isAlive, id) {
    this.size = size;
    this.x = x;
    this.y = y;
    this.direction = direction;
    this.speed = speed;
    this.tail = [{
      "x": this.x,
      "y": this.y
    }];
    this.isAlive = true;
    this.id = id;
    this.color = getRandomInt(0, 360) + ", 70%, 100%"
  }
}

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min) + min); //The maximum is exclusive and the minimum is inclusive
}
