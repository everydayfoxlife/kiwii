var Map      = require('TileMap');
var Texture  = require('Texture');
var tiles    = require('./tiles');
var entities = require('./entity/entities')

var TILE_WIDTH  = settings.tileSize.width  || settings.tileSize[0];
var TILE_HEIGHT = settings.tileSize.height || settings.tileSize[1];


//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
var t = exports;

t.width  = 20;
t.height = 18;

t.background = null;
t.layer      = new Texture(t.width * TILE_WIDTH, t.height * TILE_HEIGHT);
t.geometry   = new Map(t.width, t.height);

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/**
 * @param {string} levelId - id of the level. maps will have ids "name/G", "name/L0", "name/L1", "name/B"
 */
exports.load = function (levelId) {
	// var id = levelDef.id;
	var path = levelId + '/';

	// geometry
	t.geometry = getMap(path + 'G');
	if (!t.geometry) console.error('Could not find map', path + 'G');

	// resize
	t.width  = t.geometry.width;
	t.height = t.geometry.height;
	var w = t.width  * TILE_WIDTH;
	var h = t.height * TILE_HEIGHT;

	// background
	t.background = getMap(path + 'B');

	// design
	t.layer.resize(w, h);
	t.layer.clear();

	var l = 0;
	var layer = getMap(path + 'L' + l); // TODO: animated layers
	while (layer) {
		t.layer.draw(layer);
		layer = getMap(path + 'L' + (++l));
	}

	// add entities
	for (var x = 0; x < t.width;  x++) {
	for (var y = 0; y < t.height; y++) {
		// TODO
		var item = t.geometry.get(x, y);
		if (!item) continue;
		entities.createEntityfromMapItem(item);
	}}

	return t;
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
exports.drawBackground = function () {
	if (t.background) draw(t.background, 0, 0);
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
exports.draw = function () {
	draw(t.layer, 0, 0);
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
exports.getTileAt = function (x, y) {
	x = ~~(x / TILE_WIDTH);
	y = ~~(y / TILE_HEIGHT);
	// clamp position in level bondaries
	if (x < 0) x = 0; else if (x >= t.width)  x = t.width  - 1;
	if (y < 0) y = 0; else if (y >= t.height) y = t.height - 1;
	// if (x < 0 || y < 0 || x >= t.width || y >= t.height) return EMPTY;
	return tiles.getTileFromMapItem(t.geometry.get(x, y));
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
exports.getTile = function (i, j) {
	// clamp position in level bondaries
	if (i < 0) i = 0; else if (i >= t.width)  i = t.width  - 1;
	if (j < 0) j = 0; else if (j >= t.height) j = t.height - 1;
	return tiles.getTileFromMapItem(t.geometry.get(i, j));
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
exports.getEntryPoints = function () {
	var entries   = t.geometry.find(255); // TODO
	var exits     = t.geometry.find(16); // TODO
	
	if (entries.length !== 1 || exits.length !== 1) {
		console.log('Level entry points miss configured');
	}

	return { entry: entries[0], exit: exits[0] }; // TODO
};
