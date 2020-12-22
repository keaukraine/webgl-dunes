"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const webgl_framework_1 = require("webgl-framework");
const DunesRenderer_1 = require("./DunesRenderer");
const FreeMovement_1 = require("./FreeMovement");
function ready(fn) {
    if (document.readyState !== "loading") {
        fn();
    }
    else {
        document.addEventListener("DOMContentLoaded", fn);
    }
}
ready(() => {
    initUI();
    const renderer = new DunesRenderer_1.DunesRenderer();
    renderer.init("canvasGL", true);
    const canvas = document.getElementById("canvasGL");
    new FreeMovement_1.FreeMovement(renderer, {
        canvas,
        movementSpeed: 1200,
        rotationSpeed: 0.006
    });
    const fullScreenUtils = new webgl_framework_1.FullScreenUtils();
    const toggleFullscreenElement = document.getElementById("toggleFullscreen");
    toggleFullscreenElement.addEventListener("click", () => {
        if (document.body.classList.contains("fs")) {
            fullScreenUtils.exitFullScreen();
        }
        else {
            fullScreenUtils.enterFullScreen();
        }
        fullScreenUtils.addFullScreenListener(function () {
            if (fullScreenUtils.isFullScreen()) {
                document.body.classList.add("fs");
            }
            else {
                document.body.classList.remove("fs");
            }
        });
    });
    canvas.addEventListener("click", () => renderer.changeTimeOfDay());
});
function initUI() { }
//# sourceMappingURL=index.js.map