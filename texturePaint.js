import * as THREE from 'three';

class TPBrush{
    constructor(radius = 5, hardnress = 1)
    {
        this.r              = radius;
        this.s              = radius * 2 - 1;
        this.hard           = hardnress; 
        this.col            = new THREE.Color( 0xffffffff ); 
        this.alpha          = 255;
        this.buf            = new Uint8Array(this.s*this.s).fill(255);
    }
    
    #changeColor(color = this.col){
        color.isColor ? this.col = color : this.col = new THREE.Color(color);    
        this.col.a = this.alpha; 
    }
    changeOpacity(opacity = 255){
        (opacity > 255 || opacity < 0) ? this.alpha = 255 : this.alpha = opacity;
        this.col.a = opacity;
    }
    #setPixel(d, r, hard){
        if (d > r)
            return 0;
        else {
            let out = ((r - d) / (d - d / hard)) * 255;
            (out > 255) ? out = 255 : out = Math.floor(out);
            return out; 
        }
    }
    changeBrush(radius = this.r, hardnress = this.hard)
    {
        (radius > 0 && radius < 128) ? this.r = radius : this.r = 3;
        (hardnress > 0 && hardnress < 1) ? this.hard = hardnress : this.hard = 1; 
        this.s = this.r * 2 - 1; 
        let shift, d, k; 
        this.buf = new Uint8Array(this.s*this.s*4).fill(0);
        for (let i = 1; i < this.s + 1; i++)
            for (let j = 1; j < this.s + 1; j++){
                shift = i + (j - 1) * this.s - 1;
                d = Math.sqrt(Math.pow((i - this.r), 2) + Math.pow((j - this.r), 2));
                this.buf[shift] = this.#setPixel(d, this.r, this.hard);
            }
    }
}

class TPMarker{
    constructor(texelSize = 1, texture){
        this.mesh           = new THREE.Mesh();
        this.texture        = new THREE.Texture();
        this.texel          = texelSize;
    }
    init(){
        let texdata = new Image(); 
        texdata.src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAMAAACdt4HsAAAAGFBMVEX29vbIyMibm5vn5+djY2MuLi79/f0AAACXmgHHAAAB/UlEQVR42uyX25aDIAxFT276/388hItaRFvirNV5GJ6kq2xCEg4J1vEwVdZtwqxm4z9ivJpJBDsAEKEE+QhgllZjWZYjwKdCNECcAG35CVAYJwR640mWOmQHSCNA+oOg237fi9gOVtHGIL4GmJXtRTq3m7uVCkL47gia/pT9bcPQOILs1okqMg5XQQj27LiIgl4trwj7JJFuhq0PAesvAuwAMLbp5dVZKBOhWYKCdAMopfDq1HqWBdlstASWqVOotMuCasCkBRkAPzfcAJ/MubHcOjfBATJtQLXaTUAKwbQHNhPStglAAQPcC/CDO8BPEEikHDoyrPlDA4AcSUOOwfwJqhtF4S7A/AnW4jtwArjURgBJnpAASTDNYtc5j28Kyj/gDwGSPKuGMimv1IepLJxvY/AyuaJo0YMn1zkrtAQALihwRQoKQpa0tA5rUJLa24TyGZB1ae9CNgGhh8ULNrTSLPC0tbcxYkI1oAGKF2ZdmA2oFQqf6sf3BUotxlEt4tk4as0dNIkOqPpDPbAvKdLbUteeFtt81Z21joHvAUze7QwRteHo8wVnmSqIvuXR2jbJbcNhpXBZSt9zMGzvBUXtjRNb47bQ/mNrBV2/7V3j6Z1R6e/WvvEcOQejHPXWOZV+L4C0OY8SHhd5rswHAPVe/SQTX6NwmV0/AgwA4QtmFnE3MNgAAAAASUVORK5CYII="
        texdata.onload = () => { this.texture.needsUpdate = true };
        this.mesh = new THREE.Mesh(
            new THREE.CircleGeometry(1,16),
            new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, side: THREE.DoubleSide, alphaTest: 0.5, depthTest: false })
        )
        this.mesh.renderOrder = 999; 
        this.texture.image = texdata; 
        this.texture.minFilter = THREE.LinearMipmapLinearFilter;
        this.texture.magFilter = THREE.LinearFilter;
        this.mesh.material.alphaMap = this.texture; 
        this.mesh.scale.set(this.texel, this.texel, this.texel);
        return(this.mesh); 
    }
    place(intersect){
        this.mesh.lookAt(intersect.face.normal)
        this.mesh.position.x = intersect.point.x; 
        this.mesh.position.y = intersect.point.y; 
        this.mesh.position.z = intersect.point.z; 
    }
}

export class TexurePaint{
    constructor( mesh = null, raycaster = null, resolution = 128, historySize = 20 )
    {
        this.raycaster              = raycaster;
        this.intersects             = null;
        this.onpaint                = false; 
        this.res                    = resolution; 
        this.brush                  = new TPBrush(); 
        this.mesh                   = mesh;
        this.marker                 = null;  
        this.data                   = new Uint8Array(this.res*this.res*4).fill(192);
        this.texture                = new THREE.DataTexture(this.data, this.res, this.res);
        this.texture.needsUpdate    = true; 
        this.texture.minFilter      = THREE.LinearMipmapLinearFilter;
        this.texture.magFilter      = THREE.LinearFilter;
        this.texture.format         = THREE.RGBAFormat; 
        this.history                = [];
        this.historySize            = historySize; 
        this.history.push(this.data); 
    }
    mouse(key = "LEFT", context = document){
        if (typeof(key) != "string"){
            console.warn(`Mouse key must be string - "LEFT", "RIGHT" or "MIDDLE"`);
            return; 
        }
        let keyIndex = 0;
        switch(key){
            case "LEFT": keyIndex = 0;
            break;
            case "RIGHT": keyIndex = 1;
            break;
            case "MIDDLE": keyIndex = 2;
            break;
        }
        context.addEventListener("mousedown", (e) => {
            if (e.button == keyIndex) 
                this.startPaint(); 
        })
        context.addEventListener("mouseup", (e) => {
            if (e.button == keyIndex) 
                this.stopPaint(); 
        })
    }

    startPaint(){
        if (this.raycaster.intersectObject(this.mesh).length)
            this.onpaint = true;
    }
    stopPaint(){
        this.onpaint = false;
    }
    changeColor( color ){
        this.brush.changeColor(color);
    }
    getMarker(){
        this.marker = new TPMarker();
        this.marker.init();
        return(this.marker.mesh);
    }
    undo(){
        if (this.history[0])
            for (let i = 0; i < this.data.length; i++ )
                this.data[i] = this.history[this.history.length - 1][i];
        this.history.pop();
        this.texture.needsUpdate = true;
    }
    stage(){
        if ( this.historySize >= this.history.length )
            this.history.push(new Uint8Array( this.data ));
        else {
            this.history.shift(); 
            this.history.push(new Uint8Array( this.data ));
        }
    }
    #blendAlphaColor ( c1 = 0, c2 = 0, a1 = 255, a2 = 255 ){
        return Math.floor(c1 * a1 / 255) + (c2 * a2 * (255 - a1) / (255*255));
       // return Math.floor( (c1));
    }
    #blendBoolColor  ( c1 = 0, c2 = 0, a2 = 255 ){
        if (!a2) 
            return(c1) 
        else 
            return(c2); 
    }
    #draw( uv ){ 
        console.log("DRRRRRAW")
        /*
        let ax = Math.floor(uv.x * this.res) - this.brush.r;
        let ay = Math.floor(uv.y * this.res) - this.brush.r;
        let shift1, shift2;     
        for (let i = 1; i < this.brush.s + 1; i++)
            for (let j = 1; j < this.brush.s + 1; j++){
                shift1 = ((i + ax - 1) + (j + ay - 1) * this.res - 1) * 4; 
                shift2 = i - 1 + (j - 1) * this.brush.s;
                this.data[shift1]     = this.#blendBoolColor(this.data[shift1], this.brush.col.r*255, this.brush.buf[shift2]);
                this.data[shift1 + 1] = this.#blendBoolColor(this.data[shift1 + 1], this.brush.col.g*255, this.brush.buf[shift2]);
                this.data[shift1 + 2] = this.#blendBoolColor(this.data[shift1 + 2], this.brush.col.b*255, this.brush.buf[shift2]);
                this.data[shift1 + 3] = this.brush.buf[shift2]; 
            } */
        this.texture.needsUpdate = true; 
    }
    update(){
        this.intersects = this.raycaster.intersectObject(this.mesh);
        if (this.intersects.length){
            if (this.onpaint)
                this.#draw(this.intersects[0].uv);
            if (this.marker){
                document.body.style.cursor = 'none'
                this.marker.place(this.intersects[0]);
            }
        } else {
            document.body.style.cursor = 'default';
        }
    }
}