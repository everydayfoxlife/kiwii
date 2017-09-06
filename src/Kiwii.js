var viewManager = require('./viewManager');
var gameView    = require('./view/gameView');
var level       = require('./level');
var AABB        = require('./AABBcollision');
var tiles       = require('./tiles');

var ASSET = assets.entity.kiwii;

var TILE_WIDTH  = settings.tileSize.width  || settings.tileSize[0];
var TILE_HEIGHT = settings.tileSize.height || settings.tileSize[1];

var GRAVITY     = 0.5;
var MAX_GRAVITY = 3;
var SPEED_WALK  = 1;
var SPEED_RUN   = 2;
var THROW_SPEED = 4;

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
function Kiwii(gamepadIndex) {
	this.x  = 0;
	this.y  = 0;
	this.w  = TILE_WIDTH;
	this.h  = TILE_HEIGHT;

	this.gamepadIndex = gamepadIndex || 0;
	
	this.maxLife = 4;
	this.lifePoints = this.maxLife;

	// rendering
	this.sprite = gamepadIndex * 16;

	this.reset();
}

module.exports = Kiwii;

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
Kiwii.prototype.reset = function () {
	this.sx = 0;
	this.sy = 0;
	this.dx = 0;
	this.dy = 0;

	// inventory
	this.hasKey = false;

	// state
	this.onTile = tiles.EMPTY;

	// flags
	this.aiming   = false;
	this.jumping  = false;
	this.grounded = false;
	this.isLocked = false;
	this.isHit    = false;

	// counters
	this.jumpCounter = 0;
	this.hitCounter  = 0;

	// rendering
	this.frame = 0;
	this.flipH = false;
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
Kiwii.prototype.draw = function () {
	// idle
	var img = ASSET.idle;

	// hit
	if (this.isHit && this.isLocked) img = ASSET.hit;

	//jumping
	else if (this.jumping) img = ASSET.jump;

	//running
	else if (this.sx > 0.5 || this.sx < -0.5) {
		this.frame += 0.3;
		if (this.frame >= 3) this.frame = 0;
		img = ASSET['run' + ~~this.frame];
	}

	draw(img, this.x - 1, this.y - 1, this.flipH);
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
Kiwii.prototype.update = function (gamepad) {
	this._updateControls(gamepad);

	// movement, gravity, friction
	this.sx *= this.isHit ? 0.99 : 0.8;

	if (!this.grounded) {
		this.sy += GRAVITY;
		this.sy = Math.min(this.sy, MAX_GRAVITY);
	}

	// hit
	if (this.isHit) {
		this.hitCounter++;
		if (this.hitCounter > 16) {
			if (this.lifePoints <= 0) this.death();
			this.isLocked = false;
		}
		// keep Kiwii invulnerable for few more frames
		if (this.hitCounter > 50) this.isHit = false;
	}

	this.levelCollisions();
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
Kiwii.prototype.aim = function (gamepad) {
	if (this.banana.flying) return;

	this.aiming = true;

	// throw direction
	this.dx = 0;
	this.dy = 0;
	if (gamepad.btn.right) { this.dx += 1; this.flipH = false; }
	if (gamepad.btn.left)  { this.dx -= 1; this.flipH = true;  }
	if (gamepad.btn.down)  this.dy += 1;
	if (gamepad.btn.up)    this.dy -= 1;

	// orient monkey in aiming direction
	if (this.dx === 0 && this.dy === 0) this.dx = this.flipH ? -1 : 1;
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
Kiwii.prototype.startJump = function () {
	if (!this.grounded) return;

	// sfx('jump');

	// if there is a ceiling directly on top of Kiwii's head, cancel jump.
	// if (level.getTileAt(this.x + 1, this.y - 2).isSolid || level.getTileAt(this.x + 6, this.y - 2).isSolid) return;
	this.grounded    = false;
	this.jumping     = true;
	this.jumpCounter = 0;
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
Kiwii.prototype.jump = function () {
	if (!this.jumping) return;
	if (this.jumpCounter++ > 12) this.jumping = false;
	this.sy = -3 + this.jumpCounter * 0.08;
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
Kiwii.prototype._updateControls = function (gamepad) {
	if (this.isLocked) return;

	// throw banana
	if (gamepad.btnr.B && !this.banana.flying) {
		this.aiming = false;
		this.banana.fire(this.dx * THROW_SPEED, this.dy * THROW_SPEED);
	}

	// jump
	if (gamepad.btnp.A) this.startJump();
	if (gamepad.btnr.A) this.jumping = false;
	if (gamepad.btn.A)  this.jump();

	// move
	if (gamepad.btn.right && !gamepad.btn.left)  { this.sx =  SPEED_WALK; this.flipH = false; } // going right
	if (gamepad.btn.left  && !gamepad.btn.right) { this.sx = -SPEED_WALK; this.flipH = true;  } // going left

	// door & interactive
	if (gamepad.btnp.up && !gamepad.btn.right && !gamepad.btn.left && this.onTile.interactive) {
		this.useInteractive();
	}

	// check tile
	var tile = this.onTile = level.getTileAt(this.x + 4, this.y + 4);
	if (tile.kill) return this.death();
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
Kiwii.prototype.levelCollisions = function () {
	// round speed
	this.sx = ~~(this.sx * 100) / 100;
	this.sy = ~~(this.sy * 100) / 100;

	var x = this.x + this.sx; // TODO dt
	var y = this.y + this.sy; // TODO dt

	// check level boundaries
	var maxX = level.width  * TILE_WIDTH - this.w; // TODO don't need to be calculated each frames
	var maxY = level.height * TILE_HEIGHT + 64; // give monkey 8 more tiles for chnce to teleport
	if (x < 0)    x = 0;
	if (x > maxX) x = maxX;
	if (y > maxY) {
		// sfx('fall');
		this.death();
		return;
	}

	var front       = this.w;
	var frontOffset = 0;
	if (this.sx < 0) { front = 0; frontOffset = this.w; }

	//---------------------------------------------------------
	// horizontal collisions (check 2 front point)
	if (this.sx !== 0) {
		if (level.getTileAt(x + front, this.y + 1).isSolid || level.getTileAt(x + front, this.y + this.h - 1).isSolid) {
			this.sx = 0;
			x = ~~(x / TILE_WIDTH) * TILE_WIDTH + frontOffset;
		}
	} else {
		// if no horizontal speed, round position to avoid flickering
		x = Math.round(x);
	}

	//---------------------------------------------------------
	// vertical collisions
	if (this.grounded) {
		// check if there is still floor under Kiwii's feets
		var tileDL = level.getTileAt(x + 1,          y + this.h + 1);
		var tileDR = level.getTileAt(x + this.w - 2, y + this.h + 1);
		if (tileDL.isEmpty && tileDR.isEmpty) this.grounded = false;
	} else if (this.sy > 0) {
		// Kiwii is falling. Check what is underneath
		var tileDL = level.getTileAt(x + 1,          y + this.h);
		var tileDR = level.getTileAt(x + this.w - 2, y + this.h);
		if (tileDL.isSolid || tileDR.isSolid) {
			// collided with solid ground
			this._ground();
			y = ~~(y / TILE_HEIGHT) * TILE_HEIGHT;
		} else if (tileDL.isTopSolid || tileDR.isTopSolid) {
			// collided with one-way thru platform. Check if Kiwii where over the edge the frame before.
			var targetY = ~~(y / TILE_HEIGHT) * TILE_HEIGHT;
			if (this.y <= targetY) {
				this._ground();
				y = targetY;
			}
		}
	} else if (this.sy < 0) {
		// Kiwii is moving upward. Check for ceiling collision
		var tileUL = level.getTileAt(x + 1,          y);
		var tileUR = level.getTileAt(x + this.w - 2, y);
		if (tileUL.isSolid || tileUR.isSolid) {
			this.sy = 0;
			y = ~~(y / TILE_HEIGHT) * TILE_HEIGHT + this.w;
		}
	}

	// fetch position
	this.x = x;
	this.y = y;
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
Kiwii.prototype._ground = function () {
	this.grounded = true;
	this.jumping  = false;
	this.sy = 0;
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
Kiwii.prototype.checkCollisionWithEntity = function (entity) {
	if (entity.collisionKiwii && AABB(this, entity)) entity.collisionKiwii(this);
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
Kiwii.prototype.hit = function (entity) {
	if (this.isHit) return;

	// sfx('hit');

	this.sx = entity.x < this.x ? 1.6 : -1.6;
	this.sy = entity.y < this.y ? 2 : -3;

	// TODO
	this.aiming     = false;
	this.grounded   = false;
	this.isLocked   = true;
	this.isHit      = true;
	this.hitCounter = 0;

	this.lifePoints -= 1;
	gameView.shakeCamera(3);
	// gameView.updateHealthHUD();
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
Kiwii.prototype.death = function () {
	// TODO animation
	this.lifePoints = this.maxLife;
	this.isHit      = true;
	this.isLocked   = true;
	// viewManager.open('gameover');
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
Kiwii.prototype.useInteractive = function () {
	// if (this.onTile.door) gameView.gotoNextLevel();
};
