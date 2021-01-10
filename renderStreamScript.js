// JavaScript source code
"use strict";

const TICK_INTERVAL = 0.0334;  // milliseconds, frame time, approx: 30fps
const URL_SERVER_STREAM = "";
var GLOBAL_INTERVAL_HANDLE = null;
var GLOBAL_IS_FETCHING = false;
var GLOBAL_FRAME_QUEUE = null;

class JPEG_Frame {
    constructor(encoded, frame) {
        this.b64 = encoded;
        this.frameid = frame;
        this.img = null;
    }
    get GetFrame() {
        if (this.img === null) {
            this.img = new Image();
            this.img.src = "data:image/jpg;base64," + this.b4;
        }
        return this.img;
    }
    get IsValid() {
        if (this.img === null) {
            return false;
        }
        return true;
    }
}

class Stream_Queue {
    constructor() {
        this.q = [];
        this.cur_frame = 0;
    }
    GetNextFrame() {
        if ((this.cur_frame + 1) < this.q.length) {
            this.cur_frame++;
            return this.q[this.cur_frame];
        }
        return null;
    }
    SeekFrame(frameID) {
        if (frameID < this.q.length) {
            this.cur_frame = frameID;
            return this.q[this.cur_frame];
        }
        return null;
    }
    AddFrame(frame) {
        this.q.push(frame);
    }
    get GetStreamStats() {
        return null;
    }
}

function DrawFrame() {

}

function CB_FetchFrame_Pass(res) {
    if (res.status !== 200) {
        return 1;
    }
    return 0;
}

function CB_FetchFrame_Fail(err) {
    console.log(`Error on frame fetch:\n ${err.responseText}`);
}

function FetchFrame() {
    if (GLOBAL_IS_FETCHING) {
        return 1;
    }
    GLOBAL_IS_FETCHING = true;
    JQuery.ajax({
        url: URL_SERVER_STREAM,
        method: 'POST',
        data = '{}',
        dataType: 'JSON',
        success: function (res) {
            GLOBAL_IS_FETCHING = false;
            CB_FetchFrame_Pass(res);
        },
        error: function (err) {
            GLOBAL_IS_FETCHING = false;
            CB_FetchFrame_Fail(err);
        }
    });
    return 0;
}

function CB_RenderStreamLoop() {
    console.log("stream running.");
    return 0;
}

function main(ev) {
    console.log("Stream script started.");
    // starting to ticking loop
    //GLOBAL_INTERVAL_HANDLE = setInterval(CB_RenderStreamLoop, TICK_INTERVAL);
    return 0;
}

document.addEventListener("DOMContentLoaded", function (ev) {
    main(ev);
});

console.log("loaded.");