import { FullScreenUtils } from "webgl-framework";
import { DunesRenderer } from "./DunesRenderer";
import { FreeMovement } from "./FreeMovement";

function ready(fn: () => void) {
    if (document.readyState !== "loading") {
        fn();
    } else {
        document.addEventListener("DOMContentLoaded", fn);
    }
}

ready(() => {
    initUI();

    const renderer = new DunesRenderer();
    renderer.init("canvasGL", true);
    const canvas = document.getElementById("canvasGL")!;
    new FreeMovement(
        renderer,
        {
            canvas,
            movementSpeed: 1200,
            rotationSpeed: 0.006
        }
    );

    const fullScreenUtils = new FullScreenUtils();

    const toggleFullscreenElement = document.getElementById("toggleFullscreen")!;
    toggleFullscreenElement.addEventListener("click", () => {
        if (document.body.classList.contains("fs")) {
            fullScreenUtils.exitFullScreen();
        } else {
            fullScreenUtils.enterFullScreen();
        }
        fullScreenUtils.addFullScreenListener(function () {
            if (fullScreenUtils.isFullScreen()) {
                document.body.classList.add("fs");
            } else {
                document.body.classList.remove("fs");
            }
        });
    });

    canvas.addEventListener("click", () => renderer.changeTimeOfDay());
});

function initUI(): void { }
