/**
 * http://www.johannes-raida.de/tutorials/three.js/tutorial13/tutorial13.htm
 */

/**
 * Generates a textSprite (essentially a 2D html canvas) based on model coordinates
 * that can be embedded in our WebGLRenderer scene.
 * @param message - {string} to display
 * @param x - station.pos.x
 * @param y - station.pos.y
 * @param z - station.pox.z
 * @param parameters - JSON of parameters determine the size and shape of the textSprite
 * @returns {THREE.Sprite} - our textSprite that we will render to the scene
 */
function makeTextSprite(message, x,y,z, parameters) {
    if (parameters === undefined) parameters = {};

    var fontface = parameters.hasOwnProperty("fontface") ? parameters['fontface'] : 18;

    var fontsize = parameters.hasOwnProperty("fontsize") ?
        parameters["fontsize"] : 18;

    var borderThickness = parameters.hasOwnProperty("borderThickness") ?
        parameters["borderThickness"] : 4;

    var borderColor = parameters.hasOwnProperty("borderColor") ?
        parameters["borderColor"] : { r:0, g:0, b:0, a:1.0 };

    var fillColor = parameters.hasOwnProperty("fillColor") ?
        parameters["fillColor"] : undefined;

    var textColor = parameters.hasOwnProperty("textColor") ?
        parameters["textColor"] : { r:0, g:0, b:255, a:1.0 };

    var radius = parameters.hasOwnProperty("radius") ?
                parameters["radius"] : 6;

    var vAlign = parameters.hasOwnProperty("vAlign") ?
                        parameters["vAlign"] : "center";

    var hAlign = parameters.hasOwnProperty("hAlign") ?
                        parameters["hAlign"] : "center";

    var canvas = document.createElement('canvas');
    var context = canvas.getContext('2d');

    // set a large-enough fixed-size canvas
    canvas.width = 100;
    canvas.height = 50;

    context.font = fontsize + "px " + fontface;
    context.textBaseline = "alphabetic";
    context.textAlign = "left";

    // get size data (height depends only on font size)
    var metrics = context.measureText( message );
    var textWidth = metrics.width;

 // find the center of the canvas and the half of the font width and height
    // we do it this way because the sprite's position is the CENTER of the sprite
    var cx = canvas.width / 2;
    var cy = canvas.height / 2;
    var tx = textWidth/ 2.0;
    var ty = fontsize / 2.0;

    // then adjust for the justification
    if ( vAlign == "bottom")
        ty = 0;
    else if (vAlign == "top")
        ty = fontsize;

    if (hAlign == "left")
        tx = textWidth;
    else if (hAlign == "right")
        tx = 0;
    var DESCENDER_ADJUST = 1;
    // the DESCENDER_ADJUST is extra height factor for text below baseline: g,j,p,q. since we don't know the true bbox
    roundRect(context, cx - tx , cy + ty + 0.28 * fontsize,
            textWidth, fontsize * DESCENDER_ADJUST, radius, borderThickness, borderColor, fillColor);

    // text color.  Note that we have to do this AFTER the round-rect as it also uses the "fillstyle" of the canvas
    context.fillStyle = getCanvasColor(textColor);

    context.fillText( message, cx - tx, cy + ty);

    // canvas contents will be used for a texture
    var texture = new THREE.Texture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    texture.needsUpdate = true;

    var spriteMaterial = new THREE.SpriteMaterial( { map: texture } );
    var sprite = new THREE.Sprite( spriteMaterial );

    // we MUST set the scale to 2:1.  The canvas is already at a 2:1 scale,
    // but the sprite itself is square: 1.0 by 1.0
    // Note also that the size of the scale factors controls the actual size of the text-label
    //sprite.scale.set(4,2,1);
    sprite.scale.set(6,3,1);
    //sprite.scale.set(500*2,250*2,1);
    // set the sprite's position.  Note that this position is in the CENTER of the sprite
    sprite.position.set(x, y, z);

    return sprite;

}

/**
 * Helper function for drawing rounded rectangles
 *  @param ctx - 2D canvas context
 *  @param x
 *  @param y
 *  @param w
 *  @param h
 *  @param r
 *  @param borderThickness
 *  @param borderColor
 *  @param fillColor
 */
function roundRect(ctx, x, y, w, h, r, borderThickness, borderColor, fillColor)
{
    // no point in drawing it if it isn't going to be rendered
    if (fillColor == undefined && borderColor == undefined)
        return;

    x -= borderThickness + r;
    y += borderThickness + r;
    w += borderThickness * 2 + r * 2;
    h += borderThickness * 2 + r * 2;

    ctx.beginPath();
    ctx.moveTo(x+r, y);
    ctx.lineTo(x+w-r, y);
    ctx.quadraticCurveTo(x+w, y, x+w, y-r);
    ctx.lineTo(x+w, y-h+r);
    ctx.quadraticCurveTo(x+w, y-h, x+w-r, y-h);
    ctx.lineTo(x+r, y-h);
    ctx.quadraticCurveTo(x, y-h, x, y-h+r);
    ctx.lineTo(x, y-r);
    ctx.quadraticCurveTo(x, y, x+r, y);
    ctx.closePath();

    ctx.lineWidth = borderThickness;

    // background color
    // border color

    // if the fill color is defined, then fill it
    if (fillColor != undefined) {
        ctx.fillStyle = getCanvasColor(fillColor);
        ctx.fill();
    }

    if (borderThickness > 0 && borderColor != undefined) {
        ctx.strokeStyle = getCanvasColor(borderColor);
        ctx.stroke();
    }
}

/**
 * Helper function for converting JSON color to rgba that canvas wants
 * Be nice to handle different forms (e.g. no alpha, CSS style, etc.)
 * @param color - the RGBA color value we want to show
 * @returns {string} - rgba string acceptable by THREE.Color (inside of THREE.SpriteMaterial)
 */
function getCanvasColor ( color ) {
    return "rgba(" + color.r + "," + color.g + "," + color.b + "," + color.a + ")";
}