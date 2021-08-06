// Name any p5.js functions we use in `global` so Glitch can recognize them.
/* global
 *    createCanvas, colorMode, HSB, frameRate, background, width, height, stroke,
 *    noFill, rect, noStroke, keyCode, UP_ARROW, DOWN_ARROW, RIGHT_ARROW, LEFT_ARROW,
 *    fill, text, collideRectRect, round, random, loop, noLoop, key, color, io
 *    loadImage, tint, image
 */

let backgroundColor, playerSnake, currentApple, score, player2Snake, deadApples;
let Apples, Snakes;

let socket;
let snakeHeadUp, snakeHeadDown, snakeHeadLeft, snakeHeadRight;

function preload() {
  snakeHeadUp = loadImage(
    "https://cdn.glitch.com/579fd83f-fca5-4491-b6fa-255c38f172fe%2FsnakeUp.png?v=1628120434628"
  );
  snakeHeadDown = loadImage(
    "https://cdn.glitch.com/579fd83f-fca5-4491-b6fa-255c38f172fe%2FsnakeDown.png?v=1628120440720"
  );
  snakeHeadLeft = loadImage(
    "https://cdn.glitch.com/579fd83f-fca5-4491-b6fa-255c38f172fe%2FsnakeLeft.png?v=1628120430645"
  );
  snakeHeadRight = loadImage(
    "https://cdn.glitch.com/579fd83f-fca5-4491-b6fa-255c38f172fe%2FsnakeRight.png?v=1628120448307"
  );
}
function setup() {
  // Canvas & color settings
  createCanvas(800, 800);
  colorMode(HSB, 360, 100, 100);
  backgroundColor = 95;
  frameRate(12);
  Apples = new Map();
  score = 0;
  Snakes = new Map();
  deadApples = [];

  socket = io.connect("https://snake-w-friends.glitch.me");
  socket.on("startGameEvent", handleStartGame);
  socket.on("playerAdded", handlePlayerAdded);
  socket.on("disconnectedPlayer", handlePlayerRemoved);
  socket.on("changeDirection", handleDirectionChange);
  socket.on("getCollision", handleCollisions);
  socket.on("collideApple", handleAppleCollision);
  socket.on("addNewApple", addApple);

  socket.on("updateLocation", handleUpdateLocation);
  socket.on("newTail", handleNewTail);
  socket.on("updateTailLocation", handleUpdateTailLocation)

  // HINT: add handlers for all other message types that you need to send to other players
  
  socket.emit("addNewApple");
}

function addApple(data){
  console.log("New Apple: " + data.appleId)
  Apples.set(data.appleId, new Apple(data.appleId, data.apple.x, data.apple.y))
}


function handleAppleCollision(data){
  console.log("Removing Apple: " + data.id)
  Apples.delete(data.id);
  
}

function handleUpdateLocation(data) {
  Snakes.get(data.id).x = data.x;
  Snakes.get(data.id).y = data.y;
  
}

function handleUpdateTailLocation(data) {
  let currentSnake = Snakes.get(data.id);
  currentSnake.tail = [];
  for (let tailSegment of data.tail) {
    currentSnake.tail.push(new TailSegment(tailSegment.x, tailSegment.y, currentSnake.color))
  }
  
}
function handleDirectionChange(data) {
  Snakes.get(data.id).direction = data.direction;
  if (data.direction == "N") {
    Snakes.get(data.id).snakeHead = snakeHeadUp;
  } else if (data.direction == "S") {
    Snakes.get(data.id).snakeHead = snakeHeadDown;
  } else if (data.direction == "W") {
    Snakes.get(data.id).snakeHead = snakeHeadLeft;
  } else if (data.direction == "E") {
    Snakes.get(data.id).snakeHead = snakeHeadRight;
  }
}

function handleNewTail(data) {
  let currentSnake = Snakes.get(data.id);
  currentSnake.tail.push(new TailSegment(data.tailX, data.tailY, currentSnake.color));
}
function handleCollisions(data) {
  Snakes.get(data.id).isAlive = false;
  Snakes.get(data.id).speed = 0;
  
}

function handleStartGame(data) {
  print(data);
  let newPlayerData = data.newPlayer;
  playerSnake = new Snake(
    newPlayerData.id,
    newPlayerData.size,
    newPlayerData.x,
    newPlayerData.y,
    newPlayerData.direction,
    newPlayerData.speed,
    newPlayerData.color
  );

  for (let otherPlayer of data.otherPlayers) {
    let createdSnake = new Snake(
      otherPlayer.id,
      otherPlayer.size,
      otherPlayer.x,
      otherPlayer.y,
      otherPlayer.direction,
      otherPlayer.speed,
      otherPlayer.color
    );
    Snakes.set(createdSnake.id, createdSnake);
  }
}

function handlePlayerAdded(newPlayerData) {
  let newSnake = new Snake(
    newPlayerData.id,
    newPlayerData.size,
    newPlayerData.x,
    newPlayerData.y,
    newPlayerData.direction,
    newPlayerData.speed,
    newPlayerData.color
  );
  Snakes.set(newSnake.id, newSnake);
}

function handlePlayerRemoved(removedPlayerId) {
  Snakes.delete(removedPlayerId);
}

function draw() {
  background(backgroundColor);
  if (playerSnake) {
    playerSnake.moveSelf();
    if (playerSnake.isAlive == true){
      playerSnake.showSelf();
    }
    
    // playerSnake.checkCollisions();
    playerSnake.checkPlayerCollisions();
    playerSnake.checkApples();
  }

  // The snake performs the following four methods:
  for (let snake of Snakes.values()) {
    //snake.moveSelf();
    if (snake.isAlive == true){
      snake.showSelf();
    }
    
    // snake.checkCollisions();
    // snake.checkPlayerCollisions();
    // snake.checkApples();
  }
  
  // The apple needs fewer methods to show up on screen.
  for (let apple of Apples.values()) {
    apple.showSelf();
  }
  // We put the score in its own function for readability.
  displayScore();

  if (playerSnake && !playerSnake.isAlive) {
    gameOver();
  }
}

function displayScore() {
  fill(0);
  noStroke();
  text(`Score: ${score}`, 20, 20);
}

class Snake {
  constructor(id, size, x, y, direction, speed, colorValue) {
    this.size = size;
    this.x = x;
    this.y = y;
    this.direction = direction;
    this.speed = speed;
    this.color = color("hsb("+ colorValue + ")") //color(random(0, 360), 100, 100);
    this.tail = [new TailSegment(this.x, this.y, this.color)];
    this.isAlive = true;
    this.id = id;
    this.snakeHead = snakeHeadUp;
  }

  moveSelf() {
    if (this.isAlive) {
      if (this.direction === "N" && this.y > this.size) {
        this.y -= this.speed;
        //this.snakeHead = snakeHeadUp
      } else if (this.direction === "S" && this.y < height - this.size * 2) {
        this.y += this.speed;
        //this.snakeHead = snakeHeadDown
        //for some reason this.size * 2 works idk why
      } else if (this.direction === "E" && this.x < width - this.size * 2) {
        this.x += this.speed;
        //this.snakeHead = snakeHeadRight
      } else if (this.direction === "W" && this.x > this.size) {
        //this.snakeHead = snakeHeadLeft
        this.x -= this.speed;
      } else {
        //  console.log("Error: invalid direction");
      }
      this.tail.unshift(new TailSegment(this.x, this.y, this.color));
      this.tail.pop();
      
      let location = {
        id: this.id,
        x: this.x,
        y: this.y
      };
      socket.emit("updateLocation", location);
      
      let tailLocation = {
        id: this.id,
        tail: this.tail
      }
      socket.emit("updateTailLocation", tailLocation)
    }
  }

  showSelf() {
    stroke(this.color);
    fill(this.color);
    tint(this.color);
    image(
      this.snakeHead,
      this.x - this.size,
      this.y - this.size,
      20 + this.size,
      20 + this.size
    );
    //rect(this.x, this.y, this.size, this.size);
    //noStroke();
    for (let i = 1; i < this.tail.length; i++) {
      this.tail[i].showSelf();
    }
  }

  checkApples() {
    // If the head of the snake collides with the apple...
    for (let appleId of Apples.keys()) {
      let currentApple = Apples.get(appleId);
      let hit = collideRectRect(
        this.x,
        this.y,
        this.size,
        this.size,
        currentApple.x,
        currentApple.y,
        currentApple.size,
        currentApple.size
      );
      if (
        collideRectRect(
          this.x,
          this.y,
          this.size,
          this.size,
          currentApple.x,
          currentApple.y,
          currentApple.size,
          currentApple.size
        )
      ) {
        // Make a new apple, increment the score, and extend the tail.
        score += 1;
        Apples.delete(appleId)
        let collisionData = {id: appleId}
        socket.emit("collideApple", collisionData);
        socket.emit("addNewApple");
        this.extendTail();
      }
    }
  }

  checkCollisions() {
    if (this.tail.length > 2) {
      for (let i = 1; i < this.tail.length; i++) {
        if (this.x == this.tail[i].x && this.y == this.tail[i].y) {
          this.speed = 0;
          this.isAlive = false;
        }
        // This helper text will show the index of each tail segment.
        // text(i, this.tail[i].x, this.tail[i].y)
      }
    }
  }

  checkPlayerCollisions() {
    for (let snakeId of Snakes.keys()) {
      let snake = Snakes.get(snakeId);
      for (let i = 0; i < snake.tail.length; i++) {
        let snakeTail = snake.tail[i];
        //collideRectRect(x, y, width, height, x2, y2, width2, height2 )
        if (
          collideRectRect(
            this.x,
            this.y,
            this.size,
            this.size,
            snakeTail.x,
            snakeTail.y,
            snakeTail.size,
            snakeTail.size
          ) &&
          this.isAlive &&
          snake.isAlive
        ) {
          //deadApples.unshift(new DeadApple(this.x, this.y))
          this.speed = 0;
          this.isAlive = false;
          this.color = color(0,0,0,0)

          let collisionData = {
            deadSnakeId: this.id
          };

          socket.emit("getCollision", collisionData);
        }
      }
    }
  }

  extendTail() {
    // Add a new segment by duplicating whatever you find at the end of the tail.
    let lastTailSegment = this.tail[this.tail.length - 1];
    // Push a new tail segment to the end, using the same position as the
    // current last segment of the tail.
    this.tail.push(
      new TailSegment(
        lastTailSegment.x,
        lastTailSegment.y,
        lastTailSegment.color
      )
    );
    let data = {
      id: playerSnake.id,
      tailX: lastTailSegment.x,
      tailY: lastTailSegment.y
    };
    socket.emit("newTail", data);
  }
}

class TailSegment {
  constructor(x, y, color) {
    this.x = x;
    this.y = y;
    this.size = 10;
    this.color = color;
  }

  showSelf() {
    fill(this.color);
    stroke(0);
    rect(this.x, this.y, this.size, this.size);
  }
}

class Apple {
  constructor(id, x, y) {
    this.x = x;
    this.y = y;
    this.size = 10;
    this.id = id;
  }

  showSelf() {
    noStroke();
    fill(0, 80, 80);
    rect(this.x, this.y, this.size, this.size);
  }
}

class DeadApple {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.size = 10;
  }
  showSelf() {
    fill(0, 80, 80);
    rect(this.x, this.y, this.size, this.size);
  }
}

function keyPressed() {
  console.log("key pressed: ", keyCode);
  if (keyCode === UP_ARROW && playerSnake.direction != "S") {
    playerSnake.direction = "N";
    playerSnake.snakeHead = snakeHeadUp;
    let data = { id: playerSnake.id, direction: playerSnake.direction };
    socket.emit("changeDirection", data);
  } else if (keyCode === DOWN_ARROW && playerSnake.direction != "N") {
    playerSnake.direction = "S";
    let data = { id: playerSnake.id, direction: playerSnake.direction };
    playerSnake.snakeHead = snakeHeadDown;
    socket.emit("changeDirection", data);
  } else if (keyCode === RIGHT_ARROW && playerSnake.direction != "W") {
    playerSnake.direction = "E";
    playerSnake.snakeHead = snakeHeadRight;
    let data = { id: playerSnake.id, direction: playerSnake.direction };
    socket.emit("changeDirection", data);
  } else if (keyCode === LEFT_ARROW && playerSnake.direction != "E") {
    playerSnake.direction = "W";
    playerSnake.snakeHead = snakeHeadLeft;
    let data = { id: playerSnake.id, direction: playerSnake.direction };
    socket.emit("changeDirection", data);
  } else if (keyCode === 32) {
    restartGame();
  } else {
    console.log("wrong key");
  }
}
// function keyTyped() {
//   if (key === 'w' && player2Snake.direction != 'S') {
//     player2Snake.direction = "N"

//   } else if (key === 's' && player2Snake.direction != 'N') {
//     player2Snake.direction = "S";
//   } else if (key === 'd' && player2Snake.direction != 'W') {
//     player2Snake.direction = "E";
//   } else if (key === 'a' && player2Snake.direction != 'E') {
//     player2Snake.direction = "W";
//   }  else {
//     console.log("wrong key");
//   }
//   // prevent any default behavior
//   return false;
// }
function restartGame() {
  score = 0;
  playerSnake = new Snake();
  currentApple = new Apple();
  loop();
}

function gameOver() {
  stroke(0);
  noFill();
  text("GAME OVER", 50, 50);

  // if (winner != "Tie") {
  //   text(`Player ${winner} Wins`, 50, 60)
  // }
  // else {
  //   text("Tie", 50, 60);
  // }
}
